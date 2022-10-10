import React, { useState, useEffect } from "react";
import { useQuery } from '@apollo/client';
import { readAssetsQuery } from 'graphql/query/readAssets';
import ReactMarkdown from 'react-markdown';
import { PolicyBreadcrumbs } from 'components';
import { convertToDot, valueFromDot } from "utils";

makeStyles((theme) => ({
    root: {
        '& a': {
            color: palette.secondary.light,
        },
    },
}));

export const PrivacyPolicyPage = ({
    business
}) => {
    const { palette } = useTheme();

    const [privacy, setPrivacy] = useState(null);
    const { data: privacyData } = useQuery(readAssetsQuery, { variables: { files: ['privacy.md'] } });

    useEffect(() => {
        if (privacyData === undefined) return;
        let data = privacyData.readAssets[0];
        // Replace variables
        const business_fields = Object.keys(convertToDot(business));
        business_fields.forEach(f => data = data.replaceAll(`<${f}>`, valueFromDot(business, f) || ''));
        setPrivacy(data);
    }, [privacyData, business])

    return (
        <Box id="page" className={classes.root}>
            <PolicyBreadcrumbs textColor={palette.secondary.dark} />
            <ReactMarkdown>{ privacy }</ReactMarkdown>
        </Box>
    );
}