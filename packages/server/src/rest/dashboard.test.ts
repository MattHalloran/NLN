import { describe, expect, it } from "vitest";
import { buildDashboardStats } from "./dashboard.js";

describe("buildDashboardStats", () => {
    it("counts total and approved customers while preserving archived order/product fields", () => {
        expect(
            buildDashboardStats([
                { accountApproved: true },
                { accountApproved: false },
                { accountApproved: true },
            ])
        ).toEqual({
            totalCustomers: 3,
            approvedCustomers: 2,
            pendingOrders: 0,
            totalProducts: 0,
            totalSkus: 0,
        });
    });

    it("handles an empty customer list", () => {
        expect(buildDashboardStats([])).toEqual({
            totalCustomers: 0,
            approvedCustomers: 0,
            pendingOrders: 0,
            totalProducts: 0,
            totalSkus: 0,
        });
    });
});
