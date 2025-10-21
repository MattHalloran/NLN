import React, { useEffect, useState } from "react";
import { Alert, AlertTitle, Box, Button } from "@mui/material";
import { useLocation } from "route";
import { restApi, ABTest } from "api/rest/client";

interface QueryParams {
    abTestId?: string;
    variant?: "variantA" | "variantB";
}

/**
 * Banner component that displays when editing an A/B test variant.
 * Shows the test name and variant being edited.
 * Reads abTestId and variant from URL query params.
 */
export const ABTestEditingBanner: React.FC = () => {
    const [location, navigate] = useLocation();
    const [testInfo, setTestInfo] = useState<{ test: ABTest; variant: "variantA" | "variantB" } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.split('?')[1] || '');
        const abTestId = searchParams.get("abTestId");
        const variant = searchParams.get("variant") as "variantA" | "variantB" | null;

        if (abTestId && variant) {
            setLoading(true);
            restApi
                .getABTest(abTestId)
                .then((test) => {
                    setTestInfo({ test, variant });
                })
                .catch((error) => {
                    console.error("Error fetching A/B test info:", error);
                    setTestInfo(null);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setTestInfo(null);
        }
    }, [location]);

    const handleExitVariantEditing = () => {
        // Remove abTestId and variant from URL
        const [pathname, search] = location.split('?');
        const searchParams = new URLSearchParams(search || '');
        searchParams.delete("abTestId");
        searchParams.delete("variant");

        const newSearch = searchParams.toString();
        const newPath = newSearch ? `${pathname}?${newSearch}` : pathname;
        navigate(newPath);
    };

    if (!testInfo || loading) {
        return null;
    }

    const variantName = testInfo.variant === "variantA" ? "Variant A" : "Variant B";

    return (
        <Box sx={{ mb: 2 }}>
            <Alert
                severity="info"
                action={
                    <Button color="inherit" size="small" onClick={handleExitVariantEditing}>
                        Exit Variant Editing
                    </Button>
                }
            >
                <AlertTitle>Editing A/B Test Variant</AlertTitle>
                <strong>{testInfo.test.name}</strong> - {variantName}
                {testInfo.test.description && <> • {testInfo.test.description}</>}
            </Alert>
        </Box>
    );
};
