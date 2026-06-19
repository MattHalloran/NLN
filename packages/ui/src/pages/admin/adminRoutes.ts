import { ADMIN_ROLE_TITLES, APP_LINKS, EXTERNAL_LINKS } from "@local/shared";
import {
    BusinessCenter as BackOfficeIcon,
    ContactMail as ContactIcon,
    ListAlt as LogsIcon,
    Mail as NewsletterIcon,
    Photo as HeroIcon,
    PhotoLibrary as GalleryIcon,
    Storage as StorageIcon,
} from "@mui/icons-material";
import type { ComponentType } from "react";

export const ADMIN_ROUTE_IDS = {
    dashboard: "dashboard",
    contactInfo: "contactInfo",
    gallery: "gallery",
    homepage: "homepage",
    homepageSections: "homepageSections",
    homepageABTesting: "homepageABTesting",
    homepageAbout: "homepageAbout",
    homepageHeroBanner: "homepageHeroBanner",
    homepageSeasonal: "homepageSeasonal",
    homepageNewsletter: "homepageNewsletter",
    homepageServices: "homepageServices",
    homepageSocialProof: "homepageSocialProof",
    homepageLocation: "homepageLocation",
    homepageBranding: "homepageBranding",
    storage: "storage",
    newsletterSubscribers: "newsletterSubscribers",
    logs: "logs",
} as const;

export type AdminRouteId = (typeof ADMIN_ROUTE_IDS)[keyof typeof ADMIN_ROUTE_IDS];

export interface AdminRouteMeta {
    id: AdminRouteId;
    path: string;
    requiredRoles: string[];
}

export interface AdminDashboardCardData {
    title: string;
    description: string;
    link: string;
    icon: ComponentType;
    color: string;
    stats?: string;
    badge?: string;
    isExternal?: boolean;
}

const ADMIN_REQUIRED_ROLES = [...ADMIN_ROLE_TITLES];
const ADMIN_CARD_COLOR = "#546e7a";

export const ADMIN_ROUTES: AdminRouteMeta[] = [
    { id: ADMIN_ROUTE_IDS.dashboard, path: APP_LINKS.Admin, requiredRoles: ADMIN_REQUIRED_ROLES },
    {
        id: ADMIN_ROUTE_IDS.contactInfo,
        path: APP_LINKS.AdminContactInfo,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.gallery,
        path: APP_LINKS.AdminGallery,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.homepage,
        path: APP_LINKS.AdminHomepage,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.homepageSections,
        path: APP_LINKS.AdminHomepageSections,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.homepageABTesting,
        path: APP_LINKS.AdminHomepageABTesting,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.homepageAbout,
        path: APP_LINKS.AdminHomepageAbout,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.homepageHeroBanner,
        path: APP_LINKS.AdminHomepageHeroBanner,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.homepageSeasonal,
        path: APP_LINKS.AdminHomepageSeasonal,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.homepageNewsletter,
        path: APP_LINKS.AdminHomepageNewsletter,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.homepageServices,
        path: APP_LINKS.AdminHomepageServices,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.homepageSocialProof,
        path: APP_LINKS.AdminHomepageSocialProof,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.homepageLocation,
        path: APP_LINKS.AdminHomepageLocation,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.homepageBranding,
        path: APP_LINKS.AdminHomepageBranding,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.storage,
        path: APP_LINKS.AdminStorage,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    {
        id: ADMIN_ROUTE_IDS.newsletterSubscribers,
        path: APP_LINKS.AdminNewsletterSubscribers,
        requiredRoles: ADMIN_REQUIRED_ROLES,
    },
    { id: ADMIN_ROUTE_IDS.logs, path: APP_LINKS.AdminLogs, requiredRoles: ADMIN_REQUIRED_ROLES },
];

export const ADMIN_DASHBOARD_CARDS: AdminDashboardCardData[] = [
    {
        title: "Back Office",
        description: "View and manage orders in Horizon back office system",
        link: EXTERNAL_LINKS.backOffice,
        icon: BackOfficeIcon,
        color: ADMIN_CARD_COLOR,
        stats: "View orders",
        isExternal: true,
    },
    {
        title: "Homepage",
        description: "Manage hero banner, seasonal content, and other homepage elements",
        link: APP_LINKS.AdminHomepage,
        icon: HeroIcon,
        color: ADMIN_CARD_COLOR,
        stats: "Manage content",
    },
    {
        title: "Gallery",
        description: "Add, remove, and rearrange gallery images",
        link: APP_LINKS.AdminGallery,
        icon: GalleryIcon,
        color: ADMIN_CARD_COLOR,
        stats: "Manage images",
    },
    {
        title: "Contact Info",
        description: "Edit business hours and other contact information",
        link: APP_LINKS.AdminContactInfo,
        icon: ContactIcon,
        color: ADMIN_CARD_COLOR,
        stats: "Update info",
    },
    {
        title: "Newsletter Subscribers",
        description: "View and manage newsletter subscription list for lead generation",
        link: APP_LINKS.AdminNewsletterSubscribers,
        icon: NewsletterIcon,
        color: ADMIN_CARD_COLOR,
        stats: "View subscribers",
    },
    {
        title: "Storage Management",
        description: "Monitor image storage, view cleanup status, and manage retention",
        link: APP_LINKS.AdminStorage,
        icon: StorageIcon,
        color: ADMIN_CARD_COLOR,
        stats: "Monitor storage",
    },
    {
        title: "System Logs",
        description: "View server logs, filter by level, search errors, and export logs",
        link: APP_LINKS.AdminLogs,
        icon: LogsIcon,
        color: ADMIN_CARD_COLOR,
        stats: "View logs",
    },
];
