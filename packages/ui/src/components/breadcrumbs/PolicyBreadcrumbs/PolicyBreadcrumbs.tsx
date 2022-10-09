import React from 'react';
import { LINKS } from 'utils';
import { BreadcrumbsBase } from '../BreadcrumbsBase/BreadcrumbsBase';

const paths = [
    ['Privacy', LINKS.PrivacyPolicy],
    ['Terms', LINKS.Terms]
]

export const PolicyBreadcrumbs = ({...props}) => BreadcrumbsBase({
    paths: paths,
    ariaLabel: 'Policies breadcrumb',
    ...props
})