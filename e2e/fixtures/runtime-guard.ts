import type { Page, Response } from "@playwright/test";

type RuntimeIssue = {
    kind: "console" | "pageerror" | "response";
    message: string;
};

type RuntimeGuard = {
    assertClean: () => void;
};

const pageGuards = new WeakMap<Page, RuntimeGuard>();

const ALLOWED_CONSOLE_PATTERNS = [
    /\[vite\] connecting/i,
    /\[vite\] connected/i,
    /Download the React DevTools/i,
    /Failed to execute 'write' on 'Document'/i,
    /Failed to load resource: the server responded with a status of 401/i,
    /Failed to load resource: the server responded with a status of 500/i,
    /Failed to load resource: the server responded with a status of 403/i,
    /^Error in AdminContactPage$/i,
    /^Action: updateContactInfo$/i,
    /Injected E2E contact save failure/i,
    /^Context: \{component: AdminContactPage, action: updateContactInfo\}$/i,
];

const ALLOWED_RESPONSE_FAILURES = [
    {
        status: 401,
        pattern: /\/api\/rest\/v1\/auth\/login$/,
    },
    {
        status: 401,
        pattern: /\/api\/rest\/v1\/auth\/session$/,
    },
    {
        status: 500,
        pattern: /\/api\/rest\/v1\/landing-page\/contact-info(?:\?|$)/,
    },
];

const isAllowedConsoleMessage = (message: string) =>
    ALLOWED_CONSOLE_PATTERNS.some((pattern) => pattern.test(message));

const isAllowedResponseFailure = (response: Response) =>
    ALLOWED_RESPONSE_FAILURES.some(
        ({ status, pattern }) => response.status() === status && pattern.test(response.url()),
    );

export const attachRuntimeGuard = (page: Page): RuntimeGuard => {
    const issues: RuntimeIssue[] = [];

    page.on("console", (message) => {
        const type = message.type();
        const text = message.text();

        if ((type === "error" || type === "warning") && !isAllowedConsoleMessage(text)) {
            issues.push({
                kind: "console",
                message: `${type}: ${text}`,
            });
        }
    });

    page.on("pageerror", (error) => {
        issues.push({
            kind: "pageerror",
            message: error.message,
        });
    });

    page.on("response", (response) => {
        const status = response.status();

        if (status >= 400 && !isAllowedResponseFailure(response)) {
            issues.push({
                kind: "response",
                message: `${status} ${response.url()}`,
            });
        }
    });

    const guard = {
        assertClean: () => {
            if (issues.length === 0) return;

            const details = issues.map((issue) => `- ${issue.kind}: ${issue.message}`).join("\n");
            throw new Error(`Unexpected browser/runtime issues detected:\n${details}`);
        },
    };

    pageGuards.set(page, guard);
    return guard;
};

export const assertRuntimeClean = (page: Page) => {
    pageGuards.get(page)?.assertClean();
};
