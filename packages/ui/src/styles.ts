import { SxProps } from "@mui/material"

export const clickSize: SxProps = {
    minHeight: '48px',
};

/**
 * Disables text highlighting
 */
export const noSelect: SxProps = {
    WebkitTouchCallout: 'none', /* iOS Safari */
    WebkitUserSelect: 'none', /* Safari */
    MozUserSelect: 'none',
    msUserSelect: 'none', /* Internet Explorer/Edge */
    userSelect: 'none', /* Non-prefixed version, currently
    supported by Chrome, Edge, Opera and Firefox */
};