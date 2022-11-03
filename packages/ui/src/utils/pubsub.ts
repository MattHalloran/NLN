/**
 * Simple pub/sub implementation, with typescript support. 
 * Uses a singleton instance to publish and subscribe to events.
 * example:
 *      import { PubSub } from 'utils';
 *      PubSub.get().publishSnack({ message: 'Hello World' });
 */
import { COOKIE, ValueOf } from '@shared/consts';
import { AlertDialogState, SnackSeverity } from 'components';
import { Session } from 'types';

export const Pubs = {
    ...COOKIE,
    BurgerMenu: 'BurgerMenu',
    Business: 'Business',
    Loading: "loading",
    LogOut: "logout",
    AlertDialog: "alertDialog",
    Session: "session",
    Snack: "snack",
    ArrowMenuOpen: "arrowMenuOpen",
    Theme: "theme",
}
export type Pubs = ValueOf<typeof Pubs>;

export type SnackPub = {
    message?: string;
    severity: SnackSeverity;
    data?: any;
    buttonText?: string;
    buttonClicked?: (event?: any) => any;
    autoHideDuration?: number;
}

export class PubSub {
    private static instance: PubSub;
    private subscribers: { [key: string]: [symbol, Function][] } = {};
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
    publishBurgerMenu(to: boolean | 'toggle') {
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
    publishSnack(data: SnackPub) {
        this.publish(Pubs.Snack, data);
    }
    publishArrowMenuOpen(data: boolean | 'toggle') {
        this.publish(Pubs.ArrowMenuOpen, data);
    }
    publishTheme(theme: 'light' | 'dark') {
        this.publish(Pubs.Theme, theme);
    }

    subscribe(key: Pubs, subscriber: Function): symbol {
        // Create unique token, so we can unsubscribe later
        const token = Symbol(key);
        if (!this.subscribers[key]) {
            this.subscribers[key] = [];
        }
        this.subscribers[key].push([token, subscriber]);
        return token;
    }
    subscribeBurgerMenu(subscriber: (to: boolean | 'toggle') => void) {
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
    subscribeSnack(subscriber: (data: SnackPub) => void) {
        return this.subscribe(Pubs.Snack, subscriber);
    }
    subscribeArrowMenuOpen(subscriber: (data: boolean | 'toggle') => void) {
        return this.subscribe(Pubs.ArrowMenuOpen, subscriber);
    }
    subscribeTheme(subscriber: (theme: 'light' | 'dark') => void) {
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
