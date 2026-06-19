import { describe, expect, it } from "vitest";
import {
    MAX_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
    addCustomerSchema,
    profileSchema,
    requestPasswordChangeSchema,
    resetPasswordSchema,
    signUpSchema,
} from "./index";

describe("validation schemas", () => {
    it("accepts a valid signup payload and applies default pronouns", async () => {
        const result = await signUpSchema.validate({
            firstName: "Ada",
            lastName: "Lovelace",
            business: "Analytical Engines",
            email: "ada@example.com",
            phone: "555-1234",
            accountApproved: false,
            marketingEmails: true,
            password: "password123",
        });

        expect(result.pronouns).toBeDefined();
        expect(result.email).toBe("ada@example.com");
    });

    it("rejects invalid email and short password values", async () => {
        await expect(
            signUpSchema.validate({
                firstName: "Ada",
                lastName: "Lovelace",
                business: "Analytical Engines",
                email: "not-an-email",
                phone: "555-1234",
                accountApproved: false,
                marketingEmails: true,
                password: "short",
            }),
        ).rejects.toThrow();

        expect(MIN_PASSWORD_LENGTH).toBe(8);
        expect(MAX_PASSWORD_LENGTH).toBeGreaterThan(MIN_PASSWORD_LENGTH);
    });

    it("validates customer and password reset forms", async () => {
        await expect(
            addCustomerSchema.validate({
                firstName: "Grace",
                lastName: "Hopper",
                business: "Compiler Co",
                email: "grace@example.com",
                phone: "555-0100",
            }),
        ).resolves.toMatchObject({ email: "grace@example.com" });

        await expect(requestPasswordChangeSchema.validate({ email: "bad" })).rejects.toThrow();
        await expect(
            resetPasswordSchema.validate({
                newPassword: "password123",
                confirmNewPassword: "different",
            }),
        ).rejects.toThrow("Passwords must match");
    });

    it("requires current password only when changing profile password", async () => {
        const baseProfile = {
            firstName: "Katherine",
            lastName: "Johnson",
            business: "NASA",
            email: "katherine@example.com",
            phone: "555-0001",
            theme: "light",
            accountApproved: true,
        };

        await expect(profileSchema.validate(baseProfile)).resolves.toMatchObject(baseProfile);
        await expect(
            profileSchema.validate({ ...baseProfile, newPassword: "password123" }),
        ).rejects.toThrow();
    });
});
