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

export const PrivacyPolicyPage = () => {
    const business = useContext(BusinessContext);

    const [privacy, setPrivacy] = useState(null);
    const { data: privacyData } = useQuery(readAssetsQuery, { variables: { input: { files: ["privacy.md"] } } });

    useEffect(() => {
        if (privacyData === undefined) return;
        let data = privacyData.readAssets[0];
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
                <LazyMarkdown>{privacy ?? ""}</LazyMarkdown>
            </OuterBox>
        </PageContainer>
    );
};
