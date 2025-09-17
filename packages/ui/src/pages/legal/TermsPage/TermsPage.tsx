import { useQuery } from "@apollo/client";
import { Box, styled } from "@mui/material";
import { readAssetsQuery } from "api/query/readAssets";
import { LazyMarkdown, PageContainer } from "components";
import { PolicyTabOption, PolicyTabs } from "components/breadcrumbs/PolicyTabs/PolicyTabs";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { BusinessContext } from "contexts/BusinessContext";
import { useContext, useEffect, useState } from "react";
import { convertToDot, valueFromDot } from "utils";

const OuterBox = styled(Box)(({ theme }) => ({
    // eslint-disable-next-line no-magic-numbers
    padding: theme.spacing(4),
    borderRadius: "12px",
    overflow: "overlay",
    background: theme.palette.background.paper,
    color: theme.palette.background.textPrimary,
    marginTop: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
        marginTop: 0,
        borderRadius: 0,
    },
}));

export const TermsPage = () => {
    const business = useContext(BusinessContext);

    const [terms, setTerms] = useState<string>("");
    const { data: termsData } = useQuery(readAssetsQuery, { variables: { input: { files: ["terms.md"] } } });

    useEffect(() => {
        if (termsData === undefined) return;
        let data = termsData.readAssets[0];
        // Replace variables
        const business_fields = Object.keys(convertToDot(business || {} as any));
        business_fields.forEach(f => data = data.replaceAll(`<${f}>`, valueFromDot(business || {} as any, f) || ""));
        setTerms(data);
    }, [termsData, business]);

    return (
        <PageContainer>
            <TopBar
                display="page"
                title="Terms & Conditions"
                below={<PolicyTabs defaultTab={PolicyTabOption.Terms} />}
            />
            <OuterBox>
                <LazyMarkdown>{terms}</LazyMarkdown>
            </OuterBox>
        </PageContainer>
    );
};
