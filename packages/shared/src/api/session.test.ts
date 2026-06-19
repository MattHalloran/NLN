import { describe, expect, it } from "vitest";
import { ROLES } from "../consts";
import { hasRole, hasSession, isAdminSession } from "./session";

describe("session helpers", () => {
    it("detects non-empty session-like objects", () => {
        expect(hasSession(null)).toBe(false);
        expect(hasSession({})).toBe(false);
        expect(hasSession({ id: "customer-1" })).toBe(true);
    });

    it("matches role titles safely through nullable session shapes", () => {
        expect(hasRole(undefined, [ROLES.Admin])).toBe(false);
        expect(
            hasRole(
                {
                    roles: [{ role: null }, { role: { title: ROLES.Admin } }],
                },
                [ROLES.Admin],
            ),
        ).toBe(true);
    });

    it("treats owner and admin roles as admin sessions", () => {
        expect(isAdminSession({ roles: [{ role: { title: ROLES.Owner } }] })).toBe(true);
        expect(isAdminSession({ roles: [{ role: { title: ROLES.Customer } }] })).toBe(false);
    });
});
