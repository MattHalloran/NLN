import { ROLES } from "../consts";

export interface SessionRoleLike {
    role?: {
        title?: string | null;
    } | null;
}

export interface SessionLike {
    roles?: readonly SessionRoleLike[] | null;
}

export const ADMIN_ROLE_TITLES = [ROLES.Owner, ROLES.Admin] as const;

export const hasSession = (session: unknown): session is SessionLike => {
    return typeof session === "object" && session !== null && Object.keys(session).length > 0;
};

export const hasRole = (
    session: SessionLike | null | undefined,
    roleTitles: readonly string[],
): boolean => {
    const roles = session?.roles;
    return (
        Array.isArray(roles) &&
        roles.some((entry) => {
            const title = entry?.role?.title;
            return typeof title === "string" && roleTitles.includes(title);
        })
    );
};

export const isAdminSession = (session: SessionLike | null | undefined): boolean =>
    hasRole(session, ADMIN_ROLE_TITLES);
