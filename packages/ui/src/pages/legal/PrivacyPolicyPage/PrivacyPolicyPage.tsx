import { useQuery } from "@apollo/client";
import { useTheme } from "@mui/material";
import { readAssetsQuery } from "api/query/readAssets";
import { PageContainer, PolicyBreadcrumbs } from "components";
import MarkdownInput from "markdown-to-jsx";
import { useEffect, useState } from "react";
import { convertToDot, valueFromDot } from "utils";

export const PrivacyPolicyPage = ({
    business,
}) => {
    const { palette } = useTheme();

    const [privacy, setPrivacy] = useState(null);
    const { data: privacyData } = useQuery(readAssetsQuery, { variables: { input: { files: ["privacy.md"] } } });

    useEffect(() => {
        if (privacyData === undefined) return;
        let data = privacyData.readAssets[0];
        // Replace variables
        const business_fields = Object.keys(convertToDot(business));
        business_fields.forEach(f => data = data.replaceAll(`<${f}>`, valueFromDot(business, f) || ""));
        setPrivacy(data);
    }, [privacyData, business]);

    return (
        <PageContainer>
            <PolicyBreadcrumbs textColor={palette.secondary.dark} />
            <MarkdownInput>{privacy ?? ""}</MarkdownInput>
        </PageContainer>
    );
};
