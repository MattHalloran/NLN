import { APP_LINKS } from '@shared/consts';
import { BreadcrumbsBase } from '../BreadcrumbsBase/BreadcrumbsBase';

const paths = [
    ['Privacy', APP_LINKS.PrivacyPolicy],
    ['Terms', APP_LINKS.Terms]
]

export const PolicyBreadcrumbs = ({...props}) => BreadcrumbsBase({
    paths: paths.map((path) => ({
        text: path[0],
        link: path[1]
    })),
    ariaLabel: 'Policies breadcrumb',
    ...props
})