import type { Page } from "@playwright/test";
import { createRequire } from "module";
import { readFileSync } from "fs";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

type AxeViolation = {
    id: string;
    impact: string | null;
    description: string;
    nodes: Array<{
        target: string[];
        failureSummary?: string;
    }>;
};

export const expectNoSeriousAccessibilityViolations = async (page: Page) => {
    await page.addScriptTag({ content: axeSource });

    const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
            resultTypes: ["violations"],
        });

        return result.violations.filter((violation) =>
            ["serious", "critical"].includes(violation.impact ?? ""),
        );
    });

    if (violations.length === 0) return;

    const details = violations
        .map((violation: AxeViolation) => {
            const nodes = violation.nodes
                .slice(0, 3)
                .map(
                    (node) =>
                        `    ${node.target.join(" ")}${node.failureSummary ? `: ${node.failureSummary}` : ""}`,
                )
                .join("\n");
            return `- ${violation.id} (${violation.impact}): ${violation.description}\n${nodes}`;
        })
        .join("\n");

    throw new Error(`Serious accessibility violations detected:\n${details}`);
};

declare global {
    interface Window {
        axe: {
            run: (
                context: Document,
                options: { resultTypes: string[] },
            ) => Promise<{ violations: AxeViolation[] }>;
        };
    }
}
