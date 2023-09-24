/**
 * Simple pub/sub implementation, with typescript support. 
 * Uses a singleton instance to publish and subscribe to events.
 * example:
 *      import { PubSub } from 'utils';
 *      PubSub.get().publishSnack({ message: 'Hello World' });
 */
import { COOKIE, ValueOf } from "@local/shared";
import { AlertDialogState, SnackSeverity } from "components";
import { Session } from "types";

export const Pubs = {
    ...COOKIE,
    BurgerMenu: "BurgerMenu",
    Business: "Business",
    Loading: "loading",
    LogOut: "logout",
    AlertDialog: "alertDialog",
    Session: "session",
    SideMenu: "sideMenu",
    Snack: "snack",
    Theme: "theme",
};
export type Pubs = ValueOf<typeof Pubs>;

export type SnackPub = {
    message?: string;
    severity: SnackSeverity;
    data?: any;
    buttonText?: string;
    buttonClicked?: (event?: any) => any;
    autoHideDuration?: number;
}

export type SideMenuPub = {
    id: "shopping-filter-side-menu" | "side-menu";
    isOpen: boolean;
}

export class PubSub {
    private static instance: PubSub;
    // eslint-disable-next-line @typescript-eslint/ban-types
    private subscribers: { [key: string]: [symbol, Function][] } = {};
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor() { }
    static get(): PubSub {
        if (!PubSub.instance) {
            PubSub.instance = new PubSub();
        }
        return PubSub.instance;
    }

    publish(key: Pubs, data?: any) {
        if (this.subscribers[key]) {
            this.subscribers[key].forEach(subscriber => subscriber[1](data));
        }
    }
    publishBurgerMenu(to: boolean | "toggle") {
        this.publish(Pubs.BurgerMenu, to);
    }
    publishBusiness(data: any) {
        this.publish(Pubs.Business, data);
    }
    publishLoading(spinnerDelay: number | false) {
        this.publish(Pubs.Loading, spinnerDelay);
    }
    publishLogOut() {
        this.publish(Pubs.LogOut);
    }
    publishAlertDialog(data: AlertDialogState) {
        this.publish(Pubs.AlertDialog, data);
    }
    publishSession(session: Session | undefined) {
        this.publish(Pubs.Session, session);
    }
    publishSideMenu(data: SideMenuPub) {
        this.publish("SideMenu", data);
    }
    publishSnack(data: SnackPub) {
        this.publish(Pubs.Snack, data);
    }
    publishTheme(theme: "light" | "dark") {
        this.publish(Pubs.Theme, theme);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    subscribe(key: Pubs, subscriber: Function): symbol {
        // Create unique token, so we can unsubscribe later
        const token = Symbol(key);
        if (!this.subscribers[key]) {
            this.subscribers[key] = [];
        }
        this.subscribers[key].push([token, subscriber]);
        return token;
    }
    subscribeBurgerMenu(subscriber: (to: boolean | "toggle") => void) {
        return this.subscribe(Pubs.BurgerMenu, subscriber);
    }
    subscribeBusiness(subscriber: (data: any) => void) {
        return this.subscribe(Pubs.Business, subscriber);
    }
    subscribeLoading(subscriber: (spinnerDelay: number | false) => void) {
        return this.subscribe(Pubs.Loading, subscriber);
    }
    subscribeLogOut(subscriber: () => void) {
        return this.subscribe(Pubs.LogOut, subscriber);
    }
    subscribeAlertDialog(subscriber: (data: AlertDialogState) => void) {
        return this.subscribe(Pubs.AlertDialog, subscriber);
    }
    subscribeSession(subscriber: (session: Session | undefined) => void) {
        return this.subscribe(Pubs.Session, subscriber);
    }
    subscribeSideMenu(subscriber: (data: SideMenuPub) => void) {
        return this.subscribe("SideMenu", subscriber);
    }
    subscribeSnack(subscriber: (data: SnackPub) => void) {
        return this.subscribe(Pubs.Snack, subscriber);
    }
    subscribeTheme(subscriber: (theme: "light" | "dark") => void) {
        return this.subscribe(Pubs.Theme, subscriber);
    }

    unsubscribe(token: symbol) {
        for (const key in this.subscribers) {
            const subscribers = this.subscribers[key];
            const index = subscribers.findIndex(subscriber => subscriber[0] === token);
            if (index > -1) {
                subscribers.splice(index, 1);
            }
        }
    }
}
