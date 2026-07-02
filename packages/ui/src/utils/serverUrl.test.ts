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
    it("uses an explicit API base URL before inferred location rules", () => {
        expect(
            getServerUrlForLocation(
                locationFor({
                    host: `localhost:${DEFAULT_PORTS.ui}`,
                    hostname: "localhost",
                    origin: `http://localhost:${DEFAULT_PORTS.ui}`,
                    port: String(DEFAULT_PORTS.ui),
                    protocol: "http:",
                }),
                String(DEFAULT_PORTS.server),
                "/api",
            ),
        ).toBe(API_PREFIX);

        expect(
            getServerUrlForLocation(
                locationFor({
                    host: "app.example.com",
                    hostname: "app.example.com",
                    origin: "https://app.example.com",
                    protocol: "https:",
                }),
                String(DEFAULT_PORTS.server),
                "https://api.example.com/api/",
            ),
        ).toBe("https://api.example.com/api");
    });

    it("uses VITE_SERVER_URL when it is compatible with the current host", () => {
        expect(
            getServerUrlForLocation(
                locationFor({
                    host: `localhost:${DEFAULT_PORTS.ui}`,
                    hostname: "localhost",
                    origin: `http://localhost:${DEFAULT_PORTS.ui}`,
                    port: String(DEFAULT_PORTS.ui),
                    protocol: "http:",
                }),
                String(DEFAULT_PORTS.server),
                undefined,
                "http://localhost:7000/api",
            ),
        ).toBe("http://localhost:7000/api");

        expect(
            getServerUrlForLocation(
                locationFor({
                    host: "app.example.com",
                    hostname: "app.example.com",
                    origin: "https://app.example.com",
                    protocol: "https:",
                }),
                String(DEFAULT_PORTS.server),
                undefined,
                "https://api.example.com/api",
            ),
        ).toBe("https://api.example.com/api");
    });

    it("does not let a public VITE_SERVER_URL redirect localhost builds to production", () => {
        expect(
            getServerUrlForLocation(
                locationFor({
                    host: `localhost:${DEFAULT_PORTS.ui}`,
                    hostname: "localhost",
                    origin: `http://localhost:${DEFAULT_PORTS.ui}`,
                    port: String(DEFAULT_PORTS.ui),
                    protocol: "http:",
                }),
                String(DEFAULT_PORTS.server),
                undefined,
                "https://newlifenursery.example/api",
            ),
        ).toBe(DEFAULT_SERVER_URLS.localApi);
    });

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

    it("uses the local API port for 127.0.0.1 dev", () => {
        expect(
            getServerUrlForLocation(
                locationFor({
                    host: `127.0.0.1:${DEFAULT_PORTS.ui}`,
                    hostname: "127.0.0.1",
                    origin: `http://127.0.0.1:${DEFAULT_PORTS.ui}`,
                    port: String(DEFAULT_PORTS.ui),
                    protocol: "http:",
                }),
            ),
        ).toBe(`http://127.0.0.1:${DEFAULT_PORTS.server}${API_PREFIX}`);
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
