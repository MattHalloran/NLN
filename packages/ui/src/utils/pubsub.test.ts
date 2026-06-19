import { PubSub, Pubs } from "./pubsub";

describe("PubSub", () => {
    it("returns the same singleton instance", () => {
        expect(PubSub.get()).toBe(PubSub.get());
    });

    it("publishes to subscribers and stops after unsubscribe", () => {
        const pubsub = PubSub.get();
        const subscriber = vi.fn();
        const token = pubsub.subscribe(Pubs.Business, subscriber);

        pubsub.publishBusiness({ status: "ready" });
        pubsub.unsubscribe(token);
        pubsub.publishBusiness({ status: "ignored" });

        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(subscriber).toHaveBeenCalledWith({ status: "ready" });
    });

    it("supports convenience publishers", () => {
        const pubsub = PubSub.get();
        const burgerMenu = vi.fn();
        const loading = vi.fn();
        const logout = vi.fn();
        const landingPageUpdated = vi.fn();

        const tokens = [
            pubsub.subscribeBurgerMenu(burgerMenu),
            pubsub.subscribeLoading(loading),
            pubsub.subscribeLogOut(logout),
            pubsub.subscribeLandingPageUpdated(landingPageUpdated),
        ];

        pubsub.publishBurgerMenu("toggle");
        pubsub.publishLoading(false);
        pubsub.publishLogOut();
        pubsub.publishLandingPageUpdated();
        tokens.forEach((token) => pubsub.unsubscribe(token));

        expect(burgerMenu).toHaveBeenCalledWith("toggle");
        expect(loading).toHaveBeenCalledWith(false);
        expect(logout).toHaveBeenCalledTimes(1);
        expect(landingPageUpdated).toHaveBeenCalledTimes(1);
    });
});
