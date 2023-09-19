import { useQuery } from "@apollo/client";
import { Box } from "@mui/material";
import { readAssetsQuery } from "api/query/readAssets";
import { PolicyTabOption, PolicyTabs } from "components/breadcrumbs/PolicyTabs/PolicyTabs";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { BusinessContext } from "contexts/BusinessContext";
import MarkdownInput from "markdown-to-jsx";
import { useContext, useEffect, useState } from "react";
import { convertToDot, valueFromDot } from "utils";

export const TermsPage = () => {
    const business = useContext(BusinessContext);

    const [terms, setTerms] = useState<string>("");
    const { data: termsData } = useQuery(readAssetsQuery, { variables: { input: { files: ["terms.md"] } } });

    useEffect(() => {
        if (termsData === undefined) return;
        let data = termsData.readAssets[0];
        // Replace variables
        const business_fields = Object.keys(convertToDot(business));
        business_fields.forEach(f => data = data.replaceAll(`<${f}>`, valueFromDot(business, f) || ""));
        setTerms(data);
    }, [termsData, business]);

    return (
        <>
            <TopBar
                display="page"
                title="Terms & Conditions"
                below={<PolicyTabs defaultTab={PolicyTabOption.Terms} />}
            />
            <Box p={2}>
                <MarkdownInput>{terms}</MarkdownInput>
            </Box>
        </>
    );
};
