import React, { useEffect, useState } from "react";
import { Alert, AlertTitle, Box, Button, Chip } from "@mui/material";
import { Star as StarIcon } from "@mui/icons-material";
import { useLocation } from "route";
import { restApi, LandingPageVariant } from "api/rest/client";

/**
 * Banner component that displays when editing a variant.
 * Shows variant name and official badge if applicable.
 */
export const ABTestEditingBanner: React.FC = () => {
    const [location, navigate] = useLocation();
    const [variantInfo, setVariantInfo] = useState<LandingPageVariant | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.split("?")[1] || "");
        const variantId = searchParams.get("variantId");

        // Use a flag to prevent state updates if component unmounts
        let isSubscribed = true;

        const fetchVariant = async () => {
            if (!variantId) {
                // Early return case - reset state
                if (isSubscribed) {
                    setVariantInfo(null);
                    setLoading(false);
                }
                return;
            }

            try {
                if (isSubscribed) {
                    setLoading(true);
                }
                const variant = await restApi.getVariant(variantId);
                if (isSubscribed) {
                    setVariantInfo(variant);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error fetching variant info:", error);
                if (isSubscribed) {
                    setVariantInfo(null);
                    setLoading(false);
                }
            }
        };

        fetchVariant();

        return () => {
            isSubscribed = false;
        };
    }, [location]);

    const handleExitEditing = () => {
        // Remove variantId from URL
        const [pathname, search] = location.split("?");
        const searchParams = new URLSearchParams(search || "");
        searchParams.delete("variantId");

        const newSearch = searchParams.toString();
        const newPath = newSearch ? `${pathname}?${newSearch}` : pathname;
        navigate(newPath);
    };

    if (loading || !variantInfo) {
        return null;
    }

    return (
        <Box sx={{ mb: 2 }}>
            <Alert
                severity="warning"
                action={
                    <Button color="inherit" size="small" onClick={handleExitEditing}>
                        Exit Editing
                    </Button>
                }
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <AlertTitle sx={{ mb: 0 }}>Editing Variant</AlertTitle>
                    <strong>{variantInfo.name}</strong>
                    {variantInfo.isOfficial && (
                        <Chip
                            label="OFFICIAL"
                            color="warning"
                            icon={<StarIcon />}
                            size="small"
                            sx={{ height: 20 }}
                        />
                    )}
                    {variantInfo.description && <span> • {variantInfo.description}</span>}
                </Box>
            </Alert>
        </Box>
    );
};
