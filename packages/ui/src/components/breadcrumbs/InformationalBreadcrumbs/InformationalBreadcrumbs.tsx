import { APP_LINKS } from "@local/shared";
import { BreadcrumbsBase } from "../BreadcrumbsBase/BreadcrumbsBase";

const paths = [
    ["About Us", APP_LINKS.About],
    ["Gallery", APP_LINKS.Gallery],
];

export const InformationalBreadcrumbs = ({ ...props }) => BreadcrumbsBase({
    paths: paths.map((path) => ({
        text: path[0],
        link: path[1],
    })),
    ariaLabel: "About us breadcrumb",
    ...props,
});
