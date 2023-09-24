import { useQuery } from "@apollo/client";
import { Box } from "@mui/material";
import { readAssetsQuery } from "api/query/readAssets";
import { PolicyTabOption, PolicyTabs } from "components/breadcrumbs/PolicyTabs/PolicyTabs";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { BusinessContext } from "contexts/BusinessContext";
import MarkdownInput from "markdown-to-jsx";
import { useContext, useEffect, useState } from "react";
import { convertToDot, valueFromDot } from "utils";

export const PrivacyPolicyPage = () => {
    const business = useContext(BusinessContext);

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
        <>
            <TopBar
                display="page"
                title="Privacy Policy"
                below={<PolicyTabs defaultTab={PolicyTabOption.Privacy} />}
            />
            <Box p={2}>
                <MarkdownInput>{privacy ?? ""}</MarkdownInput>
            </Box>
        </>
    );
};
