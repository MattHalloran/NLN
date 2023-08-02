import { useQuery } from "@apollo/client";
import { useTheme } from "@mui/material";
import { PageContainer, PolicyBreadcrumbs } from "components";
import { readAssetsQuery } from "graphql/query/readAssets";
import MarkdownInput from "markdown-to-jsx";
import { useEffect, useState } from "react";
import { convertToDot, valueFromDot } from "utils";

export const TermsPage = ({
    business,
}) => {
    const { palette } = useTheme();

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
        <PageContainer>
            <PolicyBreadcrumbs textColor={palette.secondary.dark} />
            <MarkdownInput>{terms}</MarkdownInput>
        </PageContainer>
    );
};
