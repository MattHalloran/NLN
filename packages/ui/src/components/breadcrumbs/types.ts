export interface BreadcrumbsBaseProps {
    paths: { text: string; link: string; }[];
    separator?: string;
    ariaLabel?: string;
    textColor?: string;
    sx?: any;
}

export type CopyrightBreadcrumbsProps = Omit<BreadcrumbsBaseProps, "paths" | "ariaLabel"> & { business: { [key: string]: any; }; };

export type PolicyBreadcrumbsProps = Omit<BreadcrumbsBaseProps, "paths" | "ariaLabel">
