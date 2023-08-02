export interface PageProps {
    title?: string;
    sessionChecked: boolean;
    redirect?: string;
    userRoles: string[];
    restrictedToRoles?: string[];
    children: JSX.Element;
}
