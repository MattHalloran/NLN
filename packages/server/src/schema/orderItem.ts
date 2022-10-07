import { gql } from 'apollo-server-express';
import { CODE, ORDER_STATUS } from '@shared/consts';
import { CustomError } from '../error';
import { PrismaSelect } from '@paljs/plugins';
import { IWrap, RecursivePartial } from '../types';
import { Context } from '../context';
import { GraphQLResolveInfo } from 'graphql';

const _model = 'order_item'

export const typeDef = gql`

    input OrderItemInput {
        id: ID!
        quantity: Int
    }

    input UpsertOrderItemInput {
        quantity: Int!
        orderId: ID
        skuId: ID!
    }

    type OrderItem {
        id: ID!
        quantity: Int!
        order: Order!
        sku: Sku!
    }

    extend type Mutation {
        upsertOrderItem(input: UpsertOrderItemInput!): OrderItem!
        deleteOrderItems(input: DeleteManyInput!): Count!
    }
`

export const resolvers = {
    Mutation: {
        upsertOrderItem: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be signed in
            if (!req.customerId) throw new CustomError(CODE.Unauthorized);
            // If no orderId, find or create a new order
            let order;
            if (!input.orderId) {
                const cartData = { customerId: req.customerId, status: ORDER_STATUS.Draft };
                // Find current cart
                const matchingOrders = await prisma.order.findMany({ where: {
                    AND: [
                        { customerId: cartData.customerId },
                        { status: cartData.status}
                    ]
                }})
                // If cart not found, create a new one
                if (matchingOrders.length > 0) order = matchingOrders[0];
                else order = await prisma.order.create({ data: cartData});
            } else {
                order = await prisma.order.findUnique({ where: { id: input.orderId } });
            }
            // Must be admin, or updating your own
            if (!req.isAdmin && req.customerId !== order.customerId) throw new CustomError(CODE.Unauthorized);
            if (!req.isAdmin) {
                // Customers can only update their own orders in certain states
                const editable_order_statuses = [ORDER_STATUS.Draft, ORDER_STATUS.Pending];
                if (!editable_order_statuses.includes(order.status)) throw new CustomError(CODE.Unauthorized);
            }
            // Add to existing order item, or create a new one
            return await prisma[_model].upsert({
                where: { order_item_orderid_skuid_unique: { orderId: order.id, skuId: input.skuId } },
                create: { orderId: order.id, skuId: input.skuId, quantity: input.quantity },
                update: { quantity: { increment: input.quantity } },
                ...(new PrismaSelect(info).value)
            })
        },
        deleteOrderItems: async (_parent: undefined, { input }: IWrap<any>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or deleting your own
            let customer_ids = await db('order')
                .select(`order.customerId`)
                .leftJoin('order_item', 'order.id', 'order_item.orderId')
                .whereIn('order_item.id', input.ids)
            customer_ids = [...new Set(customer_ids)];
            if (!req.isAdmin && (customer_ids.length > 1 || req.customerId !== customer_ids[0])) throw new CustomError(CODE.Unauthorized);
            return await prisma[_model].deleteMany({ where: { id: { in: input.ids } } });
        },
    }
}