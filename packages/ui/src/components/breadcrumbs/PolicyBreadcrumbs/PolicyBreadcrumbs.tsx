import { APP_LINKS } from '@shared/consts';
import { BreadcrumbsBase } from '../BreadcrumbsBase/BreadcrumbsBase';

const paths = [
    ['Privacy', APP_LINKS.PrivacyPolicy],
    ['Terms', APP_LINKS.Terms]
]

export const PolicyBreadcrumbs = ({...props}) => BreadcrumbsBase({
    paths: paths,
    ariaLabel: 'Policies breadcrumb',
    ...props
})