import { APP_LINKS } from "@local/shared";
import { BreadcrumbsBase } from "../BreadcrumbsBase/BreadcrumbsBase";
import { CopyrightBreadcrumbsProps } from "../types";

export const CopyrightBreadcrumbs = ({
    business,
    sx,
    ...props
}: CopyrightBreadcrumbsProps) => {
    const paths = [
        [`© ${new Date().getFullYear()} ${business?.BUSINESS_NAME?.Long ?? business?.BUSINESS_NAME?.Short ?? "Home"}`, APP_LINKS.Home],
        ["Privacy", APP_LINKS.PrivacyPolicy],
        ["Terms", APP_LINKS.Terms],
    ].map(row => ({ text: row[0], link: row[1] }));
    return BreadcrumbsBase({
        paths,
        ariaLabel: "Copyright breadcrumb",
        sx: {
            ...sx,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
        },
        ...props,
    });
};
