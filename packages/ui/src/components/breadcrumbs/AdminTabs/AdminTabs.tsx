import { APP_LINKS } from "@local/shared";
import { PageTab, useTabs } from "hooks/useTabs";
import { ChangeEvent, useCallback } from "react";
import { useLocation } from "route";
import { PageTabs } from "../PageTabs/PageTabs";
import { 
    ShoppingCart as OrdersIconMui,
    People as CustomersIconMui,
    Inventory as InventoryIconMui,
    Photo as HeroIconMui,
    PhotoLibrary as GalleryIconMui,
    ContactMail as ContactIconMui,
    Home as HomeIconMui
} from "@mui/icons-material";
import { SvgProps } from "icons/types";

// Wrapper components to adapt Material-UI icons to SvgProps interface
const OrdersIcon = ({ fill, width = 24, height = 24, ...props }: SvgProps) => (
    <OrdersIconMui sx={{ color: fill, fontSize: width }} {...props} />
);

const CustomersIcon = ({ fill, width = 24, height = 24, ...props }: SvgProps) => (
    <CustomersIconMui sx={{ color: fill, fontSize: width }} {...props} />
);

const InventoryIcon = ({ fill, width = 24, height = 24, ...props }: SvgProps) => (
    <InventoryIconMui sx={{ color: fill, fontSize: width }} {...props} />
);

const HeroIcon = ({ fill, width = 24, height = 24, ...props }: SvgProps) => (
    <HeroIconMui sx={{ color: fill, fontSize: width }} {...props} />
);

const HomeIcon = ({ fill, width = 24, height = 24, ...props }: SvgProps) => (
    <HomeIconMui sx={{ color: fill, fontSize: width }} {...props} />
);

const GalleryIcon = ({ fill, width = 24, height = 24, ...props }: SvgProps) => (
    <GalleryIconMui sx={{ color: fill, fontSize: width }} {...props} />
);

const ContactIcon = ({ fill, width = 24, height = 24, ...props }: SvgProps) => (
    <ContactIconMui sx={{ color: fill, fontSize: width }} {...props} />
);

export enum AdminTabOption {
    Orders = "Orders",
    Customers = "Customers",
    Inventory = "Inventory",
    Hero = "Hero",
    Gallery = "Gallery",
    ContactInfo = "ContactInfo",
}

export const adminTabParams = [
    {
        title: "Orders",
        href: APP_LINKS.AdminOrders,
        tabType: AdminTabOption.Orders,
        Icon: OrdersIcon,
    }, {
        title: "Customers",
        href: APP_LINKS.AdminCustomers,
        tabType: AdminTabOption.Customers,
        Icon: CustomersIcon,
    },
    {
        title: "Inventory",
        href: APP_LINKS.AdminInventory,
        tabType: AdminTabOption.Inventory,
        Icon: InventoryIcon,
    },
    {
        title: "Homepage",
        href: APP_LINKS.AdminHero,
        tabType: AdminTabOption.Hero,
        Icon: HomeIcon,
    },
    {
        title: "Gallery",
        href: APP_LINKS.AdminGallery,
        tabType: AdminTabOption.Gallery,
        Icon: GalleryIcon,
    },
    {
        title: "Contact Info",
        href: APP_LINKS.AdminContactInfo,
        tabType: AdminTabOption.ContactInfo,
        Icon: ContactIcon,
    },
];

export const AdminTabs = ({
    defaultTab,
}: {
    defaultTab: AdminTabOption;
}) => {
    const [, setLocation] = useLocation();

    const { currTab, tabs } = useTabs<AdminTabOption, false>({ id: "privacy-tabs", tabParams: adminTabParams, defaultTab, display: "page" });
    const handleTabChange = useCallback((event: ChangeEvent<unknown>, tab: PageTab<AdminTabOption, false>) => {
        event.preventDefault();
        setLocation(tab.href ?? "", { replace: true });
    }, [setLocation]);

    return (
        <PageTabs
            ariaLabel="admin tabs"
            currTab={currTab}
            fullWidth
            onChange={handleTabChange}
            tabs={tabs}
        />
    );
};
