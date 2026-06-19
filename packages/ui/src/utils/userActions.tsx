import { APP_LINKS, hasSession, isAdminSession } from "@local/shared";
import { CreateAccountIcon, SettingsIcon } from "icons";
import { SvgComponent } from "icons/types";
import { Session } from "types";

export type UserActions = [
    string,
    string,
    string,
    (() => unknown) | null,
    SvgComponent | null,
    number,
][];

// Returns user actions, in a list of this format:
//  [
//      label: str,
//      value: str,
//      link: str,
//      onClick: func,
//      icon: Material-UI Icon,
//      number of notifications: int,
//  ]
export function getUserActions(session: Session | undefined): UserActions {
    const actions: [string, string, string, (() => unknown) | null, SvgComponent | null, number][] =
        [];

    // If someone is not logged in, display sign up/log in APP_LINKS
    if (!hasSession(session)) {
        actions.push(["Log In", "login", APP_LINKS.LogIn, null, CreateAccountIcon, 0]);
    } else {
        // If an owner admin is logged in, display owner APP_LINKS
        if (isAdminSession(session)) {
            actions.push(["Manage", "admin", APP_LINKS.Admin, null, SettingsIcon, 0]);
        }
    }

    return actions;
}
