import { COMPANY_INFO } from "../consts";

export const EXTERNAL_LINKS = {
    availability: "https://newlife.online-orders.sbiteam.com/",
    orders: "https://newlife.online-orders.sbiteam.com/orders",
    backOffice: "https://horizon.sbiteam.com/portal/webclient/#/home",
} as const;

export const BUSINESS_CONTACT_DEFAULTS = {
    companyName: COMPANY_INFO.Name,
    address: {
        label: "106 S Woodruff Rd, Bridgeton, NJ 08302",
        shortLabel: "106 S Woodruff Rd, Bridgeton, NJ",
        fullLabel: "106 South Woodruff Road Bridgeton, NJ 08302",
        mapsUrl: "https://maps.google.com/?q=106+S+Woodruff+Rd+Bridgeton+NJ+08302",
    },
    phone: {
        label: "(856) 455-3601",
        link: "tel:+18564553601",
    },
    email: {
        label: "info@newlifenurseryinc.com",
        link: "mailto:info@newlifenurseryinc.com",
    },
} as const;
