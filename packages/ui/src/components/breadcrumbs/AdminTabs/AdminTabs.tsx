import { APP_LINKS } from "@local/shared";
import { PageTab, useTabs } from "hooks/useTabs";
import { ChangeEvent, useCallback } from "react";
import { useLocation } from "route";
import { PageTabs } from "../PageTabs/PageTabs";

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
    }, {
        title: "Customers",
        href: APP_LINKS.AdminCustomers,
        tabType: AdminTabOption.Customers,
    },
    {
        title: "Inventory",
        href: APP_LINKS.AdminInventory,
        tabType: AdminTabOption.Inventory,
    },
    {
        title: "Hero",
        href: APP_LINKS.AdminHero,
        tabType: AdminTabOption.Hero,
    },
    {
        title: "Gallery",
        href: APP_LINKS.AdminGallery,
        tabType: AdminTabOption.Gallery,
    },
    {
        title: "Contact Info",
        href: APP_LINKS.AdminContactInfo,
        tabType: AdminTabOption.ContactInfo,
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
