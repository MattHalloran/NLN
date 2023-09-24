import { APP_LINKS } from "@local/shared";
import { Box, Button } from "@mui/material";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { Link } from "route";

export const NotFoundPage = () => {
    return (
        <>
            <TopBar
                display="page"
                title="Page Not Found"
            />
            <Box sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translateX(-50%) translateY(-50%)",
            }}>
                <h3>Looks like you've followed a broken link or entered a URL that doesn't exist on this site</h3>
                <br />
                <Link to={APP_LINKS.Home}>
                    <Button variant="contained">Go to Home</Button>
                </Link>
            </Box>
        </>
    );
};
