import { APP_LINKS } from "@local/shared";
import { PageTab, useTabs } from "hooks/useTabs";
import { ChangeEvent, useCallback } from "react";
import { useLocation } from "route";
import { PageTabs } from "../PageTabs/PageTabs";

export enum InformationalTabOption {
    About = "About",
    Gallery = "Gallery",
}

export const policyTabParams = [
    {
        title: "About Us",
        href: APP_LINKS.About,
        tabType: InformationalTabOption.About,
    }, {
        title: "Gallery",
        href: APP_LINKS.Gallery,
        tabType: InformationalTabOption.Gallery,
    },
];

export const InformationalTabs = ({
    defaultTab,
}: {
    defaultTab: InformationalTabOption;
}) => {
    const [, setLocation] = useLocation();

    const { currTab, tabs } = useTabs<InformationalTabOption, false>({ id: "informational-tabs", tabParams: policyTabParams, defaultTab, display: "page" });
    const handleTabChange = useCallback((event: ChangeEvent<unknown>, tab: PageTab<InformationalTabOption, false>) => {
        event.preventDefault();
        setLocation(tab.href ?? "", { replace: true });
    }, [setLocation]);

    return (
        <PageTabs
            ariaLabel="informational tabs"
            currTab={currTab}
            fullWidth
            onChange={handleTabChange}
            tabs={tabs}
        />
    );
};
