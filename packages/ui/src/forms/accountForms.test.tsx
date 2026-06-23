import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChangeEventHandler, FocusEventHandler } from "react";
import userEvent from "@testing-library/user-event";
import { BusinessContext } from "contexts/BusinessContext";
import { PubSub, Pubs } from "utils/pubsub";
import { renderWithProviders, screen, waitFor } from "../test/render";
import { ForgotPasswordForm } from "./ForgotPasswordForm/ForgotPasswordForm";
import { LogInForm } from "./LogInForm/LogInForm";
import { SignUpForm } from "./SignUpForm/SignUpForm";

const hookMocks = vi.hoisted(() => ({
    login: vi.fn(),
    requestPasswordChange: vi.fn(),
    signUp: vi.fn(),
}));

const locationMocks = vi.hoisted(() => ({
    setLocation: vi.fn(),
}));

vi.mock("api/rest/hooks", async (importOriginal) => ({
    ...(await importOriginal<typeof import("api/rest/hooks")>()),
    useLogin: () => ({ mutate: hookMocks.login, loading: false }),
    useRequestPasswordChange: () => ({
        mutate: hookMocks.requestPasswordChange,
        loading: false,
    }),
    useSignUp: () => ({ mutate: hookMocks.signUp, loading: false }),
}));

vi.mock("components", () => ({
    BreadcrumbsBase: () => <nav aria-label="form links" />,
    SnackSeverity: {
        Error: "error",
        Info: "info",
        Success: "success",
    },
}));

vi.mock("components/inputs/PasswordTextField/PasswordTextField", () => ({
    PasswordTextField: ({
        id,
        label,
        name,
        onBlur,
        onChange,
        value,
    }: {
        id?: string;
        label?: string;
        name?: string;
        onBlur?: FocusEventHandler<HTMLInputElement>;
        onChange?: ChangeEventHandler<HTMLInputElement>;
        value: string;
    }) => (
        <label>
            {label}
            <input
                id={id}
                name={name}
                type="password"
                value={value}
                onBlur={onBlur}
                onChange={onChange}
            />
        </label>
    ),
}));

vi.mock("icons/common", () => ({
    EmailIcon: () => <span aria-hidden="true" />,
}));

vi.mock("icons", () => ({
    InvisibleIcon: () => <span aria-hidden="true" />,
    LockIcon: () => <span aria-hidden="true" />,
    VisibleIcon: () => <span aria-hidden="true" />,
}));

vi.mock("hooks", async (importOriginal) => ({
    ...(await importOriginal<typeof import("hooks")>()),
    useABTestTracking: () => ({ trackConversion: vi.fn(async () => undefined) }),
}));

vi.mock("route", async (importOriginal) => ({
    ...(await importOriginal<typeof import("route")>()),
    useLocation: () => ["/", locationMocks.setLocation],
    parseSearchParams: () => ({}),
}));

const business = {
    BUSINESS_NAME: { Short: "NLN", Long: "New Life Nursery" },
    ADDRESS: { Label: "", Link: "" },
    PHONE: { Label: "", Link: "" },
    EMAIL: { Label: "", Link: "" },
    hours: "",
};

const pasteField = async (
    user: ReturnType<typeof userEvent.setup>,
    label: RegExp,
    value: string,
) => {
    await user.click(screen.getByLabelText(label));
    await user.paste(value);
};

const fillSignupContractFields = async (
    user: ReturnType<typeof userEvent.setup>,
    confirmPassword = "ValidPass123!",
) => {
    await pasteField(user, /first name/i, "Contract");
    await pasteField(user, /last name/i, "User");
    await pasteField(user, /business\/organization/i, "Contract Nursery");
    await pasteField(user, /email address/i, "contract@example.test");
    await pasteField(user, /phone number/i, "555-555-0123");
    await pasteField(user, /^password$/i, "ValidPass123!");
    await pasteField(user, /confirm password/i, confirmPassword);
};

describe("account forms", () => {
    beforeEach(() => {
        hookMocks.login.mockReset();
        hookMocks.signUp.mockReset();
        hookMocks.requestPasswordChange.mockReset();
        hookMocks.login.mockResolvedValue({
            id: "customer-1",
            emailVerified: true,
            accountApproved: true,
            status: "Unlocked",
            theme: "light",
            roles: [{ role: { title: "Customer" } }],
        });
        hookMocks.signUp.mockResolvedValue({
            id: "customer-2",
            emailVerified: false,
            accountApproved: false,
            status: "Unlocked",
            theme: "light",
            roles: [{ role: { title: "Customer" } }],
        });
        hookMocks.requestPasswordChange.mockResolvedValue({ success: true });
        locationMocks.setLocation.mockClear();
    });

    it("submits login credentials through the REST hook and publishes the session", async () => {
        const user = userEvent.setup();
        const sessionSpy = vi.fn();
        const token = PubSub.get().subscribe(Pubs.Session, sessionSpy);

        renderWithProviders(<LogInForm />);

        await user.type(screen.getByLabelText(/email address/i), "person@example.test");
        await user.type(screen.getByLabelText(/^password$/i), "ValidPass123!");
        await user.click(screen.getByRole("button", { name: /sign in/i }));

        await waitFor(() =>
            expect(hookMocks.login).toHaveBeenCalledWith({
                email: "person@example.test",
                password: "ValidPass123!",
            }),
        );
        expect(sessionSpy).toHaveBeenCalledWith(
            expect.objectContaining({ id: "customer-1", theme: "light" }),
        );

        PubSub.get().unsubscribe(token);
    });

    it("submits the current signup contract shape", async () => {
        const user = userEvent.setup();

        renderWithProviders(
            <BusinessContext.Provider value={business}>
                <SignUpForm />
            </BusinessContext.Provider>,
        );

        await fillSignupContractFields(user);
        await user.click(screen.getByRole("button", { name: /create account/i }));

        await waitFor(() =>
            expect(hookMocks.signUp).toHaveBeenCalledWith({
                firstName: "Contract",
                lastName: "User",
                pronouns: "",
                business: "Contract Nursery",
                email: "contract@example.test",
                phone: "555-555-0123",
                accountApproved: true,
                marketingEmails: true,
                password: "ValidPass123!",
            }),
        );
    });

    it("does not submit signup when password confirmation does not match", async () => {
        const user = userEvent.setup();

        renderWithProviders(
            <BusinessContext.Provider value={business}>
                <SignUpForm />
            </BusinessContext.Provider>,
        );

        await fillSignupContractFields(user, "DifferentPass123!");
        await user.click(screen.getByRole("button", { name: /create account/i }));

        await waitFor(() => expect(hookMocks.signUp).not.toHaveBeenCalled());
    });

    it("submits password reset requests and navigates home after success", async () => {
        const user = userEvent.setup();

        renderWithProviders(<ForgotPasswordForm />);

        await user.type(screen.getByLabelText(/email address/i), "person@example.test");
        await user.click(screen.getByRole("button", { name: /send reset link/i }));

        await waitFor(() =>
            expect(hookMocks.requestPasswordChange).toHaveBeenCalledWith({
                email: "person@example.test",
            }),
        );
        expect(locationMocks.setLocation).toHaveBeenCalledWith("/");
    });
});
