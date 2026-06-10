import { API_PREFIX } from "./routes";

export const DEFAULT_PORTS = {
    ui: 3001,
    server: 5331,
} as const;

export const LOCAL_DEV_ORIGINS = [
    `http://localhost:${DEFAULT_PORTS.ui}`,
    "http://localhost:3000",
    `http://127.0.0.1:${DEFAULT_PORTS.ui}`,
    "http://127.0.0.1:3000",
] as const;

export const PRODUCTION_ORIGINS = [
    "https://newlifenurseryinc.com",
    "https://www.newlifenurseryinc.com",
] as const;

export const STATIC_API_PATHS = {
    publicAssets: API_PREFIX,
    privateAssets: `${API_PREFIX}/private`,
    images: `${API_PREFIX}/images`,
} as const;

export const DEFAULT_SERVER_URLS = {
    localOrigin: `http://localhost:${DEFAULT_PORTS.server}`,
    localApi: `http://localhost:${DEFAULT_PORTS.server}${API_PREFIX}`,
    productionApi: `${PRODUCTION_ORIGINS[0]}${API_PREFIX}`,
    localHealthcheck: `http://localhost:${DEFAULT_PORTS.server}/healthcheck`,
} as const;
