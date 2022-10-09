import React, { useState, useEffect } from "react";
import { useQuery } from '@apollo/client';
import { readAssetsQuery } from 'graphql/query/readAssets';
import ReactMarkdown from 'react-markdown';
import { PolicyBreadcrumbs } from 'components';
import { convertToDot, valueFromDot } from "utils";

const useStyles = makeStyles((theme) => ({
    root: {
        '& a': {
            color: theme.palette.secondary.light,
        },
    },
}));

export const TermsPage = ({
    business
}) => {
    const { palette } = useTheme();

    const [terms, setTerms] = useState(null);
    const { data: termsData } = useQuery(readAssetsQuery, { variables: { files: ['terms.md'] } });

    useEffect(() => {
        if (termsData === undefined) return;
        let data = termsData.readAssets[0];
        // Replace variables
        const business_fields = Object.keys(convertToDot(business));
        business_fields.forEach(f => data = data.replaceAll(`<${f}>`, valueFromDot(business, f) || ''));
        setTerms(data);
    }, [termsData, business])

    return (
        <Box id="page" className={classes.root}>
            <PolicyBreadcrumbs textColor={theme.palette.secondary.dark} />
            <ReactMarkdown>{ terms }</ReactMarkdown>
        </Box>
    );
}