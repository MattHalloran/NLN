import { describe, expect, it, vi } from "vitest";
import { requireAdmin, type AuthenticatedRequest } from "./middlewares";

describe("landing page middlewares", () => {
    it("rejects non-admin requests", () => {
        const status = vi.fn().mockReturnThis();
        const json = vi.fn();
        const next = vi.fn();

        requireAdmin({ isAdmin: false } as AuthenticatedRequest, { status, json } as never, next);

        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith({ error: "Admin access required" });
        expect(next).not.toHaveBeenCalled();
    });

    it("continues admin requests", () => {
        const status = vi.fn().mockReturnThis();
        const json = vi.fn();
        const next = vi.fn();

        requireAdmin({ isAdmin: true } as AuthenticatedRequest, { status, json } as never, next);

        expect(status).not.toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledOnce();
    });
});
