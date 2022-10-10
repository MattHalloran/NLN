import { APP_LINKS } from '@shared/consts';
import { BreadcrumbsBase } from '../BreadcrumbsBase/BreadcrumbsBase';

const paths = [
    ['About Us', APP_LINKS.About],
    ['Gallery', APP_LINKS.Gallery]
]

export const InformationalBreadcrumbs = ({...props}) => BreadcrumbsBase({
    paths: paths,
    ariaLabel: 'About us breadcrumb',
    ...props
})