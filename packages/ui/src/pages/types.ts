export interface PageProps {
    title?: string;
    redirect?: string;
    restrictedToRoles?: string[];
    children: JSX.Element;
}
