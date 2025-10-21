import { snakeCase, uuid } from "@local/shared";

interface PrismaSelect {
    [key: string]: boolean | PrismaSelect | { select?: PrismaSelect };
}
type WhereCondition = {
    equals?: unknown;
    mode?: "insensitive";
    in?: unknown[];
    contains?: string;
    [key: string]: unknown;
};
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type WhereClause = Record<string, unknown | WhereCondition>;

function mockFindUnique<T extends Record<string, unknown>>(
    records: T[],
    args: { where: WhereClause; select?: PrismaSelect }
): Promise<T | null> {
    const whereKeys = Object.keys(args.where);
    const item = records.find((record) =>
        whereKeys.every((key) => record[key] === args.where[key])
    );

    if (!item) {
        return Promise.resolve(null);
    }

    // Return only the fields that are requested in the select clause
    const result = constructSelectResponse(item, args.select);
    return Promise.resolve(result as T);
}

function mockFindMany<T extends Record<string, unknown>>(
    records: T[],
    args: { where: WhereClause; select?: PrismaSelect }
): Promise<T[]> {
    const whereKeys = Object.keys(args.where);
    const filteredItems = records.filter((record) =>
        whereKeys.every((key) => {
            const condition = args.where[key];
            if (typeof condition === "object" && condition !== null) {
                const whereCondition = condition as WhereCondition;
                // Handle case-insensitive equality
                if ("equals" in whereCondition) {
                    const valueToCompare = record[key];
                    if ("mode" in whereCondition && whereCondition.mode === "insensitive") {
                        if (
                            typeof valueToCompare === "string" &&
                            typeof whereCondition.equals === "string"
                        ) {
                            return (
                                valueToCompare.toLowerCase() === whereCondition.equals.toLowerCase()
                            );
                        }
                        return valueToCompare === whereCondition.equals;
                    } else {
                        return valueToCompare === whereCondition.equals;
                    }
                }
                // Add more conditions here as needed
                return false; // Default case for other conditions not yet implemented
            } else {
                // Direct equality
                return record[key] === condition;
            }
        })
    );

    const results = filteredItems.map((item) => constructSelectResponse(item, args.select));
    return Promise.resolve(results as T[]);
}

function mockCreate<T>(records: T[], args: { data: T }): Promise<T> {
    const newItem = { id: uuid(), ...args.data };
    records.push(newItem);
    return Promise.resolve(newItem);
}

function constructSelectResponse<T extends Record<string, unknown>>(
    item: T,
    select?: PrismaSelect
): Partial<T> {
    if (!select) {
        return item;
    } // If no select clause, return the whole item

    function constructNestedResponse(
        nestedItem: Record<string, unknown>,
        nestedSelect: PrismaSelect
    ): Record<string, unknown> {
        return Object.keys(nestedSelect).reduce(
            (acc: Record<string, unknown>, key) => {
                if (nestedSelect[key] === true) {
                    if (nestedItem[key] !== undefined) {
                        acc[key] = nestedItem[key];
                    }
                } else if (typeof nestedSelect[key] === "object" && nestedItem[key] !== undefined) {
                    // Check for Prisma pattern where relations are wrapped in "select"
                    const nestedSelectValue = nestedSelect[key] as PrismaSelect & {
                        select?: PrismaSelect;
                    };
                    if (nestedSelectValue.select) {
                        if (Array.isArray(nestedItem[key])) {
                            // Handle array of relations
                            const nestedArray = nestedItem[key] as Record<string, unknown>[];
                            acc[key] = nestedArray.map((item) =>
                                constructNestedResponse(item, nestedSelectValue.select!)
                            );
                        } else {
                            // Handle single relation object
                            acc[key] = constructNestedResponse(
                                nestedItem[key] as Record<string, unknown>,
                                nestedSelectValue.select
                            );
                        }
                    } else {
                        acc[key] = constructNestedResponse(
                            nestedItem[key] as Record<string, unknown>,
                            nestedSelectValue
                        );
                    }
                }
                return acc;
            },
            {} as Record<string, unknown>
        );
    }

    const result = constructNestedResponse(item, select);
    return result as Partial<T>;
}

function mockUpdate<T extends Record<string, unknown>>(
    records: T[],
    args: { where: WhereClause; data: Partial<T> }
): Promise<T> {
    const whereKeys = Object.keys(args.where);
    const index = records.findIndex((record) =>
        whereKeys.every((key) => record[key] === args.where[key])
    );

    if (index === -1) {
        throw new Error("Record not found");
    }

    records[index] = { ...records[index], ...args.data };
    return Promise.resolve(records[index]);
}

function mockUpsert<T extends Record<string, unknown>>(
    records: T[],
    args: { where: WhereClause; create: T; update: Partial<T> }
): Promise<T> {
    const existingItem = mockFindUnique(records, { where: args.where });
    return existingItem.then((item) => {
        if (item) {
            return mockUpdate(records, { where: args.where, data: args.update });
        } else {
            return mockCreate(records, { data: args.create });
        }
    });
}

/**
 * Instead of mocking the prisma package directly, this
 * returns a mock object which can be passed in as a PrismaType
 */
export const mockPrisma = (data: Record<string, Array<Record<string, unknown>>>) => {
    const prismaMock: Record<string, Record<string, jest.Mock>> = {};

    Object.entries(data).forEach(([modelType, records]) => {
        const modelName = snakeCase(modelType);

        prismaMock[modelName] = {
            findUnique: jest.fn((args: { where: WhereClause; select?: PrismaSelect }) =>
                mockFindUnique(records, args)
            ),
            findMany: jest.fn((args: { where: WhereClause; select?: PrismaSelect }) =>
                mockFindMany(records, args)
            ),
            create: jest.fn((args: { data: Record<string, unknown> }) =>
                mockCreate(records, args as { data: (typeof records)[0] })
            ),
            update: jest.fn((args: { where: WhereClause; data: Record<string, unknown> }) =>
                mockUpdate(
                    records,
                    args as { where: WhereClause; data: Partial<(typeof records)[0]> }
                )
            ),
            upsert: jest.fn(
                (args: {
                    where: WhereClause;
                    create: Record<string, unknown>;
                    update: Record<string, unknown>;
                }) =>
                    mockUpsert(
                        records,
                        args as {
                            where: WhereClause;
                            create: (typeof records)[0];
                            update: Partial<(typeof records)[0]>;
                        }
                    )
            ),
            // Add other methods here as needed
        };
    });

    return prismaMock;
};
