import { DialogTitle } from "components/dialogs/DialogTitle/DialogTitle";
import { TitleProps } from "components/text/types";
import { forwardRef } from "react";
import { ViewDisplayType } from "types";
import { Navbar } from "../Navbar/Navbar";

interface TopBarProps extends TitleProps {
    display: ViewDisplayType
    onClose?: () => void,
    below?: JSX.Element | boolean
    hideTitleOnDesktop?: boolean,
    startComponent?: JSX.Element;
    tabTitle?: string,
    titleId?: string
}


/**
 * Generates an app bar for both pages and dialogs
 */
export const TopBar = forwardRef(({
    display,
    hideTitleOnDesktop,
    ...titleData
}: TopBarProps, ref) => {

    if (display === "dialog") return (
        <DialogTitle
            ref={ref}
            id={titleData?.titleId ?? Math.random().toString(36).substring(2, 15)}
            {...titleData}
        />
    );
    return (
        <Navbar
            ref={ref}
            shouldHideTitle={hideTitleOnDesktop}
            {...titleData}
        />
    );
});
