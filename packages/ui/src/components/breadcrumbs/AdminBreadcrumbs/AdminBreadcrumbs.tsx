import { APP_LINKS } from "@local/shared";
import { BreadcrumbsBase } from "../BreadcrumbsBase/BreadcrumbsBase";

const paths = [
    ["Orders", APP_LINKS.AdminOrders],
    ["Customers", APP_LINKS.AdminCustomers],
    ["Inventory", APP_LINKS.AdminInventory],
    ["Hero", APP_LINKS.AdminHero],
    ["Gallery", APP_LINKS.AdminGallery],
    ["Contact Info", APP_LINKS.AdminContactInfo],
];

export const AdminBreadcrumbs = ({ ...props }) => BreadcrumbsBase({
    paths: paths.map((path) => ({
        text: path[0],
        link: path[1],
    })),
    ariaLabel: "Admin breadcrumb",
    ...props,
});
