import { Box, styled, Typography, useTheme } from "@mui/material";
import { useReadAssets } from "api/rest/hooks";
import { LazyMarkdown, PageContainer } from "components";
import { PolicyTabOption, PolicyTabs } from "components/breadcrumbs/PolicyTabs/PolicyTabs";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { BusinessContext } from "contexts/BusinessContext";
import { useContext, useEffect, useState } from "react";
import { convertToDot, valueFromDot } from "utils";

const OuterBox = styled(Box)(({ theme }) => ({
    padding: theme.spacing(6, 8),
    borderRadius: "16px",
    overflow: "overlay",
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    marginTop: theme.spacing(3),
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    border: `1px solid ${theme.palette.divider}`,

    // Enhanced typography styles for markdown content
    "& h1, & h2, & h3, & h4, & h5, & h6": {
        color: theme.palette.primary.main,
        fontWeight: 600,
        marginTop: theme.spacing(4),
        marginBottom: theme.spacing(2),
        lineHeight: 1.3,
    },
    "& h1": {
        fontSize: "2.2rem",
        borderBottom: `2px solid ${theme.palette.primary.main}`,
        paddingBottom: theme.spacing(1),
        marginBottom: theme.spacing(3),
    },
    "& h2": {
        fontSize: "1.6rem",
        marginTop: theme.spacing(5),
    },
    "& h3": {
        fontSize: "1.3rem",
        marginTop: theme.spacing(4),
    },
    "& p": {
        fontSize: "1rem",
        lineHeight: 1.7,
        marginBottom: theme.spacing(2.5),
        color: theme.palette.text.primary,
        maxWidth: "75ch", // Optimal reading width
    },
    "& ul, & ol": {
        marginBottom: theme.spacing(3),
        paddingLeft: theme.spacing(3),
        "& li": {
            fontSize: "1rem",
            lineHeight: 1.7,
            marginBottom: theme.spacing(1),
            color: theme.palette.text.primary,
        },
    },
    "& a": {
        color: theme.palette.primary.main,
        textDecoration: "none",
        fontWeight: 500,
        "&:hover": {
            textDecoration: "underline",
            color: theme.palette.primary.dark,
        },
    },
    "& strong": {
        color: theme.palette.primary.dark,
        fontWeight: 600,
    },

    // Add visual sections for better content organization
    "& > *:first-child": {
        marginTop: 0,
    },

    [theme.breakpoints.down("md")]: {
        padding: theme.spacing(4, 3),
        "& p": {
            maxWidth: "none",
        },
    },
    [theme.breakpoints.down("sm")]: {
        marginTop: 0,
        borderRadius: 0,
        padding: theme.spacing(3, 2),
        boxShadow: "none",
        border: "none",
    },
}));

const ContentHeader = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(4),
    padding: theme.spacing(3, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
    "& .last-updated": {
        color: theme.palette.text.secondary,
        fontSize: "0.9rem",
        fontStyle: "italic",
        marginTop: theme.spacing(1),
    },
}));

export const PrivacyPolicyPage = () => {
    const { palette } = useTheme();
    const business = useContext(BusinessContext);

    const [privacy, setPrivacy] = useState<string | null>(null);
    const { data: privacyData } = useReadAssets(["privacy.md"]);

    useEffect(() => {
        if (!privacyData || !privacyData["privacy.md"]) return;
        let data = privacyData["privacy.md"];
        // Replace variables
        const business_fields = Object.keys(convertToDot(business || {} as any));
        business_fields.forEach(f => data = data.replaceAll(`<${f}>`, valueFromDot(business || {} as any, f) || ""));
        setPrivacy(data);
    }, [privacyData, business]);

    return (
        <PageContainer>
            <TopBar
                display="page"
                title="Privacy Policy"
                below={<PolicyTabs defaultTab={PolicyTabOption.Privacy} />}
            />
            <OuterBox>
                <ContentHeader>
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                            color: palette.primary.main,
                            fontWeight: 600,
                            marginBottom: 1,
                        }}
                    >
                        Privacy Policy
                    </Typography>
                    <Typography
                        variant="body2"
                        className="last-updated"
                        sx={{ color: palette.text.secondary }}
                    >
                        This document outlines how we collect, use, and protect your personal information when you use our services.
                    </Typography>
                </ContentHeader>
                <LazyMarkdown>{privacy ?? ""}</LazyMarkdown>
            </OuterBox>
        </PageContainer>
    );
};
