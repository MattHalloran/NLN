import type { Page, Response } from "@playwright/test";

type RuntimeIssue = {
    kind: "console" | "pageerror" | "requestfailed" | "response";
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
    /Failed to load resource: the server responded with a status of 401/i,
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
];

const isAllowedConsoleMessage = (message: string) =>
    ALLOWED_CONSOLE_PATTERNS.some((pattern) => pattern.test(message));

const isAllowedResponseFailure = (response: Response) =>
    ALLOWED_RESPONSE_FAILURES.some(
        ({ status, pattern }) => response.status() === status && pattern.test(response.url()),
    );

const isMonitoredDataOrMediaUrl = (url: string) => {
    const pathname = new URL(url).pathname;

    return (
        pathname.startsWith("/api/") ||
        /\/rest\/v\d+(?:\/|$)/.test(pathname) ||
        pathname.startsWith("/images/") ||
        /\.(?:avif|br|css|gif|ico|jpe?g|js|json|png|svg|webmanifest|webp)(?:$|\?)/i.test(pathname)
    );
};

const isAllowedRequestFailure = (url: string, errorText = "") => {
    const { hostname, pathname } = new URL(url);

    if (errorText !== "net::ERR_ABORTED") return false;

    if (hostname !== "localhost" && hostname !== "127.0.0.1") return true;

    return (
        pathname.endsWith("/service-worker.js") ||
        pathname.startsWith("/api/images/") ||
        pathname.endsWith("/auth/session") ||
        /\/variants\/[^/]+\/track$/.test(pathname)
    );
};

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
        const contentType = response.headers()["content-type"] ?? "";

        if (status >= 400 && !isAllowedResponseFailure(response)) {
            issues.push({
                kind: "response",
                message: `${status} ${response.url()}`,
            });
        }

        if (
            status < 400 &&
            contentType.includes("text/html") &&
            isMonitoredDataOrMediaUrl(response.url())
        ) {
            issues.push({
                kind: "response",
                message: `${status} ${contentType} for data/media URL ${response.url()}`,
            });
        }
    });

    page.on("requestfailed", (request) => {
        const errorText = request.failure()?.errorText ?? "failed";
        if (isAllowedRequestFailure(request.url(), errorText)) return;
        if (!isMonitoredDataOrMediaUrl(request.url())) return;

        issues.push({
            kind: "requestfailed",
            message: `${request.url()} ${errorText}`,
        });
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
