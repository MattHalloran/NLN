import { CODE, ORDER_STATUS } from "@local/shared";
import { PrismaSelect } from "@paljs/plugins";

import { GraphQLResolveInfo } from "graphql";
import { Context } from "../context.js";
import { CustomError } from "../error.js";
import { IWrap, RecursivePartial } from "../types.js";
import { orderNotifyAdmin } from "../worker/email/queue.js";
import { DeleteManyInput, FindByIdInput, OrderInput, OrdersInput } from "./types.js";

export const typeDef = /* GraphQL */ `
    enum OrderStatus {
        CanceledByAdmin
        CanceledByCustomer
        PendingCancel
        Rejected
        Draft
        Pending
        Approved
        Scheduled
        InTransit
        Delivered
    }

    input OrderInput {
        id: ID
        status: OrderStatus
        specialInstructions: String
        desiredDeliveryDate: Date
        isDelivery: Boolean
        items: [OrderItemInput!]
    }

    input OrdersInput {
        ids: [ID!]
        status: OrderStatus
        searchString: String
    }

    type Order {
        id: ID!
        status: OrderStatus!
        specialInstructions: String
        desiredDeliveryDate: Date
        expectedDeliveryDate: Date
        isDelivery: Boolean
        address: Address
        customer: Customer!
        items: [OrderItem!]!
    }

    extend type Query {
        orders(input: OrdersInput!): [Order!]!
    }

    extend type Mutation {
        updateOrder(input: OrderInput): Order!
        submitOrder(input: FindByIdInput!): Boolean
        cancelOrder(input: FindByIdInput!): OrderStatus
        deleteOrders(input: DeleteManyInput!): Count!
    }
`;

const STATUS_TO_SORT = {
    [ORDER_STATUS.CanceledByAdmin]: { updated_at: "desc" },
    [ORDER_STATUS.CanceledByCustomer]: { updated_at: "desc" },
    [ORDER_STATUS.PendingCancel]: { updated_at: "desc" },
    [ORDER_STATUS.Rejected]: { updated_at: "desc" },
    [ORDER_STATUS.Draft]: { updated_at: "desc" },
    [ORDER_STATUS.Pending]: { updated_at: "desc" },
    [ORDER_STATUS.Approved]: { expectedDeliveryDate: "desc" },
    [ORDER_STATUS.Scheduled]: { expectedDeliveryDate: "desc" },
    [ORDER_STATUS.InTransit]: { expectedDeliveryDate: "desc" },
    [ORDER_STATUS.Delivered]: { expectedDeliveryDate: "desc" },
};

export const resolvers = {
    OrderStatus: ORDER_STATUS,
    Query: {
        orders: async (_parent: undefined, { input }: IWrap<OrdersInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin (customers query SKUs)
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            let idQuery;
            if (Array.isArray(input.ids)) { idQuery = { id: { in: input.ids } }; }
            // Determine sort order
            let sortQuery: any = { updated_at: "desc" };
            if (input.status) sortQuery = STATUS_TO_SORT[input.status];
            // If search string provided, match it with customer or business name.
            // Maybe in the future, this could also be matched to sku names and such
            let searchQuery;
            if (input.searchString !== undefined && input.searchString !== null && input.searchString.length > 0) {
                // If there are two words, assume first is first name, last is last name
                const words = input.searchString.trim().split(" ");
                if (words.length === 2) {
                    searchQuery = {
                        OR: [
                            { customer: { firstName: { contains: words[0], mode: "insensitive" } } },
                            { customer: { lastName: { contains: words[1], mode: "insensitive" } } },
                            { business: { name: { contains: input.searchString.trim(), mode: "insensitive" } } },
                        ],
                    };
                }
                else {
                    searchQuery = {
                        OR: [
                            { customer: { firstName: { contains: input.searchString.trim(), mode: "insensitive" } } },
                            { customer: { lastName: { contains: input.searchString.trim(), mode: "insensitive" } } },
                            { customer: { business: { name: { contains: input.searchString.trim(), mode: "insensitive" } } } },
                        ],
                    };
                }
            }
            return await prisma.order.findMany({
                where: {
                    ...idQuery,
                    ...searchQuery,
                    status: input.status ?? undefined,
                },
                orderBy: sortQuery,
                ...(new PrismaSelect(info).value),
            });
        },
    },
    Mutation: {
        updateOrder: async (_parent: undefined, { input }: IWrap<OrderInput>, { prisma, req }: Context, info: GraphQLResolveInfo): Promise<RecursivePartial<any> | null> => {
            // Must be admin, or updating your own
            const curr: any = await prisma.order.findUnique({
                where: { id: input.id as string },
                select: { id: true, customerId: true, status: true, items: { select: { id: true } } },
            });
            if (!req.isAdmin && req.customerId !== curr.customerId) throw new CustomError(CODE.Unauthorized);
            if (!req.isAdmin) {
                // Customers can only update their own orders in certain states
                const editable_order_statuses = [ORDER_STATUS.Draft, ORDER_STATUS.Pending];
                if (!editable_order_statuses.includes(curr.status)) throw new CustomError(CODE.Unauthorized);
                // Customers cannot edit order status
                delete input.status;
            }
            // Determine which order item rows need to be updated, and which will be deleted
            if (Array.isArray(input.items)) {
                const updatedItemIds = input.items.map((i: any) => i.id);
                const deletingItemIds = curr.items.filter((i: any) => !updatedItemIds.includes(i.id)).map((i: any) => i.id);
                if (updatedItemIds.length > 0) {
                    const updateMany = input.items.map((d: any) => prisma.order_item.updateMany({
                        where: { id: d.id },
                        data: { ...d },
                    }));
                    Promise.all(updateMany);
                }
                if (deletingItemIds.length > 0) {
                    await prisma.order_item.deleteMany({ where: { id: { in: deletingItemIds } } });
                }
            }
            return await prisma.order.update({
                where: { id: curr.id },
                data: { ...input, items: undefined },
                ...(new PrismaSelect(info).value),
            });
        },
        submitOrder: async (_parent: undefined, { input }: IWrap<FindByIdInput>, { prisma, req }: Context): Promise<boolean> => {
            // Must be admin, or submitting your own
            const curr: any = await prisma.order.findUnique({ where: { id: input.id } });
            if (!req.isAdmin && req.customerId !== curr.customerId) throw new CustomError(CODE.Unauthorized);
            // Only orders in the draft state can be submitted
            if (curr.status !== ORDER_STATUS.Draft) throw new CustomError(CODE.ErrorUnknown);
            await prisma.order.update({
                where: { id: curr.id },
                data: { status: ORDER_STATUS.Pending },
            });
            orderNotifyAdmin();
            return true;
        },
        cancelOrder: async (_parent: undefined, { input }: IWrap<FindByIdInput>, { prisma, req }: Context): Promise<any> => {
            // Must be admin, or canceling your own
            const curr = await prisma.order.findUnique({ where: { id: input.id } });
            if (!curr) throw new CustomError(CODE.NotFound);
            if (!req.isAdmin && req.customerId !== curr.customerId) throw new CustomError(CODE.Unauthorized);
            let order_status = curr.status;
            // Only pending orders can be fully cancelled by customer
            if (curr.status === ORDER_STATUS.Pending) {
                order_status = ORDER_STATUS.CanceledByCustomer;
            }
            const pending_order_statuses = [ORDER_STATUS.Approved, ORDER_STATUS.Scheduled];
            if (curr.status in pending_order_statuses) {
                order_status = ORDER_STATUS.PendingCancel;
            }
            await prisma.order.update({
                where: { id: curr.id },
                data: { status: order_status },
            });
            return order_status;
        },
        deleteOrders: async (_parent: undefined, { input }: IWrap<DeleteManyInput>, { prisma, req }: Context): Promise<RecursivePartial<any> | null> => {
            // Must be admin
            if (!req.isAdmin) throw new CustomError(CODE.Unauthorized);
            return await prisma.order.deleteMany({ where: { id: { in: input.ids } } });
        },
    },
};
