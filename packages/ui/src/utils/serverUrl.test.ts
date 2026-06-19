import { API_PREFIX, DEFAULT_PORTS, DEFAULT_SERVER_URLS } from "@local/shared";
import { getServerUrlForLocation } from "./serverUrl";

type TestLocation = Parameters<typeof getServerUrlForLocation>[0];

function locationFor(overrides: Partial<TestLocation>): TestLocation {
    return {
        host: "example.com",
        hostname: "example.com",
        origin: "https://example.com",
        port: "",
        protocol: "https:",
        ...overrides,
    };
}

describe("serverUrl", () => {
    it("uses nginx proxy routing for local standard ports", () => {
        expect(
            getServerUrlForLocation(
                locationFor({
                    host: "localhost",
                    hostname: "localhost",
                    origin: "http://localhost",
                    port: "",
                    protocol: "http:",
                }),
            ),
        ).toBe(`http://localhost${API_PREFIX}`);
    });

    it("uses the shared local API default for localhost dev", () => {
        expect(
            getServerUrlForLocation(
                locationFor({
                    host: `localhost:${DEFAULT_PORTS.ui}`,
                    hostname: "localhost",
                    origin: `http://localhost:${DEFAULT_PORTS.ui}`,
                    port: String(DEFAULT_PORTS.ui),
                    protocol: "http:",
                }),
            ),
        ).toBe(DEFAULT_SERVER_URLS.localApi);
    });

    it("uses an explicit server port for LAN development hosts", () => {
        expect(
            getServerUrlForLocation(
                locationFor({
                    host: "192.168.0.44:3001",
                    hostname: "192.168.0.44",
                    origin: "http://192.168.0.44:3001",
                    port: "3001",
                    protocol: "http:",
                }),
                "7000",
            ),
        ).toBe(`http://192.168.0.44:7000${API_PREFIX}`);
    });

    it("uses the current origin for production hosts", () => {
        expect(
            getServerUrlForLocation(
                locationFor({
                    host: "newlifenursery.example",
                    hostname: "newlifenursery.example",
                    origin: "https://newlifenursery.example",
                    protocol: "https:",
                }),
            ),
        ).toBe(`https://newlifenursery.example${API_PREFIX}`);
    });
});
