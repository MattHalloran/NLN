import type { Page, Response } from "@playwright/test";

type RuntimeIssue = {
    kind: "console" | "pageerror" | "response";
    message: string;
};

type RuntimeIssueMatcher = (issue: RuntimeIssue) => boolean;

type RuntimeGuard = {
    allowIssue: (matcher: RuntimeIssueMatcher) => void;
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
    /Injected E2E landing page save failure/i,
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
    {
        status: 500,
        pattern: /\/api\/rest\/v1\/landing-page(?:\?|$)/,
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
    const allowedIssueMatchers: RuntimeIssueMatcher[] = [];

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
        allowIssue: (matcher: RuntimeIssueMatcher) => {
            allowedIssueMatchers.push(matcher);
        },
        assertClean: () => {
            const unexpectedIssues = issues.filter(
                (issue) => !allowedIssueMatchers.some((matcher) => matcher(issue)),
            );
            if (unexpectedIssues.length === 0) return;

            const details = unexpectedIssues
                .map((issue) => `- ${issue.kind}: ${issue.message}`)
                .join("\n");
            throw new Error(`Unexpected browser/runtime issues detected:\n${details}`);
        },
    };

    pageGuards.set(page, guard);
    return guard;
};

export const assertRuntimeClean = (page: Page) => {
    pageGuards.get(page)?.assertClean();
};

export const allowRuntimeIssue = (page: Page, matcher: RuntimeIssueMatcher) => {
    const guard = pageGuards.get(page);
    if (!guard) {
        throw new Error("Runtime guard is not attached to this page");
    }
    guard.allowIssue(matcher);
};
