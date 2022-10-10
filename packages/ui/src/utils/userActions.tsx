import { APP_LINKS, ROLES } from '@shared/consts';
import { CreateAccountIcon, ProfileIcon, SettingsIcon, SvgComponent } from '@shared/icons';
import _ from 'lodash';

// Returns user actions, in a list of this format:
//  [
//      label: str,
//      value: str,
//      link: str,
//      onClick: func,
//      icon: Material-UI Icon,
//      number of notifications: int,
//  ]
export function getUserActions(session, userRoles, cart) {
    let actions: [string, string, string, (() => any) | null, SvgComponent, number][] = [];

    // If someone is not logged in, display sign up/log in APP_LINKS
    if (!_.isObject(session) || Object.entries(session).length === 0) {
        actions.push(['Log In', 'login', APP_LINKS.LogIn, null, CreateAccountIcon, 0]);
    } else {
        // If an owner admin is logged in, display owner APP_LINKS
        const haveArray = Array.isArray(userRoles) ? userRoles : [userRoles];
        if (userRoles && haveArray.some(r => [ROLES.Owner, ROLES.Admin].includes(r?.role?.title))) {
            actions.push(['Manage Site', 'admin', APP_LINKS.Admin, null, SettingsIcon, 0]);
        }
        actions.push(['Availability', 'availability', APP_LINKS.Shopping, null, ShopIcon, 0],
            ['Profile', 'profile', APP_LINKS.Profile, null, ProfileIcon, 0],
            ['Cart', 'cart', APP_LINKS.Cart, null, ShoppingCartIcon, cart?.items?.length ?? 0]);
    }

    return actions;
}