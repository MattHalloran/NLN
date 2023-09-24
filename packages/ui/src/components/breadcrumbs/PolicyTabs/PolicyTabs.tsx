import { APP_LINKS } from "@local/shared";
import { PageTab, useTabs } from "hooks/useTabs";
import { ChangeEvent, useCallback } from "react";
import { useLocation } from "route";
import { PageTabs } from "../PageTabs/PageTabs";

export enum PolicyTabOption {
    Privacy = "Privacy",
    Terms = "Terms",
}

export const policyTabParams = [
    {
        title: "Privacy",
        href: APP_LINKS.PrivacyPolicy,
        tabType: PolicyTabOption.Privacy,
    }, {
        title: "Terms",
        href: APP_LINKS.Terms,
        tabType: PolicyTabOption.Terms,
    },
];

export const PolicyTabs = ({
    defaultTab,
}: {
    defaultTab: PolicyTabOption;
}) => {
    const [, setLocation] = useLocation();

    const { currTab, tabs } = useTabs<PolicyTabOption, false>({ id: "policy-tabs", tabParams: policyTabParams, defaultTab, display: "page" });
    const handleTabChange = useCallback((event: ChangeEvent<unknown>, tab: PageTab<PolicyTabOption, false>) => {
        event.preventDefault();
        setLocation(tab.href ?? "", { replace: true });
    }, [setLocation]);

    return (
        <PageTabs
            ariaLabel="policy tabs"
            currTab={currTab}
            fullWidth
            onChange={handleTabChange}
            tabs={tabs}
        />
    );
};
