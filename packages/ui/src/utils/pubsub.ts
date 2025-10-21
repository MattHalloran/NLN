/**
 * Simple pub/sub implementation, with typescript support.
 * Uses a singleton instance to publish and subscribe to events.
 * example:
 *      import { PubSub } from 'utils';
 *      PubSub.get().publishSnack({ message: 'Hello World' });
 */
import React from "react";
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
    LandingPageUpdated: "landingPageUpdated",
};
export type PubsKey = ValueOf<typeof Pubs>;

export type SnackPub = {
    message?: string;
    severity: SnackSeverity;
    data?: unknown;
    buttonText?: string;
    buttonClicked?: (event?: React.MouseEvent) => unknown;
    autoHideDuration?: number;
}

export type SideMenuPub = {
    id: "side-menu";
    isOpen: boolean;
}

export class PubSub {
    private static instance: PubSub;
    private subscribers: { [key: string]: [symbol, (data?: any) => void][] } = {};
     
    private constructor() { }
    static get(): PubSub {
        if (!PubSub.instance) {
            PubSub.instance = new PubSub();
        }
        return PubSub.instance;
    }

    publish(key: PubsKey, data?: unknown) {
        if (this.subscribers[key]) {
            this.subscribers[key].forEach(subscriber => subscriber[1](data));
        }
    }
    publishBurgerMenu(to: boolean | "toggle") {
        this.publish(Pubs.BurgerMenu, to);
    }
    publishBusiness(data: unknown) {
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
    publishLandingPageUpdated() {
        this.publish(Pubs.LandingPageUpdated);
    }

    subscribe(key: PubsKey, subscriber: (data?: any) => void): symbol {
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
    subscribeBusiness(subscriber: (data: unknown) => void) {
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
    subscribeLandingPageUpdated(subscriber: () => void) {
        return this.subscribe(Pubs.LandingPageUpdated, subscriber);
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
