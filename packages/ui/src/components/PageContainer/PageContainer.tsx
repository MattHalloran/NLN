import { Box } from "@mui/material"
import { PageContainerProps } from "components/types"

/**
 * Container which can be wrapped around most pages to provide a consistent layout.
 */
export const PageContainer = ({
    children,
    sx,
}: PageContainerProps) => {
    return (
        <Box id="page" sx={{
            minWidth: '100vw',
            minHeight: '100vh',
            width: 'min(100%, 700px)',
            margin: 'auto',
            paddingTop: { xs: '64px', md: '80px' },
            paddingBottom: 'calc(56px + env(safe-area-inset-bottom))',
            paddingLeft: { xs: '16px', sm: 'max(1em, calc(15% - 75px))' },
            paddingRight: { xs: '16px', sm: 'max(1em, calc(15% - 75px))' },
            ...(sx ?? {}),
        }}>
            {children}
        </Box>
    )
}