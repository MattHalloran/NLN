import React from 'react';
import { LINKS } from 'utils';
import { BreadcrumbsBase } from '../BreadcrumbsBase/BreadcrumbsBase';

const paths = [
    ['About Us', LINKS.About],
    ['Gallery', LINKS.Gallery]
]

export const InformationalBreadcrumbs = ({...props}) => BreadcrumbsBase({
    paths: paths,
    ariaLabel: 'About us breadcrumb',
    ...props
})