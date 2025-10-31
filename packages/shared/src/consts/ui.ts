import { ValueOf } from ".";

export const APP_LINKS = {
    About: "/about",
    Admin: "/admin",
    AdminContactInfo: "/admin/contact-info",
    AdminCustomers: "/admin/customers",
    AdminGallery: "/admin/gallery",
    AdminHomepage: "/admin/homepage",
    AdminHomepageAbout: "/admin/homepage/about",
    AdminHomepageABTesting: "/admin/homepage/ab-testing",
    AdminHomepageBranding: "/admin/homepage/branding",
    AdminHomepageHeroBanner: "/admin/homepage/hero-banner",
    AdminHomepageNewsletter: "/admin/homepage/newsletter",
    AdminHomepageSeasonal: "/admin/homepage/seasonal",
    AdminHomepageSections: "/admin/homepage/sections",
    AdminHomepageServices: "/admin/homepage/services",
    AdminInventory: "/admin/inventory",
    AdminLayout: "/admin/layout",
    AdminNewsletterSubscribers: "/admin/newsletter-subscribers",
    AdminOrders: "/admin/orders",
    AdminStorage: "/admin/storage",
    AdminLogs: "/admin/logs",
    Cart: "/cart",
    ForgotPassword: "/forgot-password",
    Gallery: "/gallery",
    Home: "/",
    LogIn: "/login",
    PrivacyPolicy: "/privacy-policy",
    Register: "/register",
    ResetPassword: "/password-reset",
    Shopping: "/shopping",
    Terms: "/terms-and-conditions",
};

export const THEME = {
    Light: "light",
    Dark: "dark",
};
export type THEME = ValueOf<typeof THEME>;
