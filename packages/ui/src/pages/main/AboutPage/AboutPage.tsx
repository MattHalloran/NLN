import { Box, Divider, Grid, IconButton, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import GianarisSignature from "assets/img/gianaris-signature.png";
import { InformationalTabOption, InformationalTabs } from "components/breadcrumbs/InformationalTabs/InformationalTabs";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { BusinessContext } from "contexts/BusinessContext";
import { FacebookIcon, InstagramIcon } from "icons";
import { useContext } from "react";

export const AboutPage = () => {
    const business = useContext(BusinessContext);
    const theme = useTheme();

    const SocialLink = ({ platform, Icon, url }) => (
        <Tooltip title={`Follow us on ${platform}`} placement="top">
            <IconButton href={url} target="_blank" rel="noopener noreferrer">
                <Icon width="75px" height="75px" fill={theme.palette.secondary.main} />
            </IconButton>
        </Tooltip>
    );

    return (
        <>
            <TopBar
                display="page"
                hideTitleOnDesktop
                title="Our Story"
                below={<InformationalTabs defaultTab={InformationalTabOption.About} />}
            />
            <Stack direction="column" spacing={2} p={2} margin="auto" maxWidth="min(100%, 700px)">
                <Grid item xs={12} lg={8} pb={4}>
                    <Typography variant="body1" paragraph>
                        For 40 years, New Life Nursery, Inc has been striving to grow the most beautiful, healthy, and consistent plant material at competitive prices. Family-owned and operated by the Gianaris Family, we continue to hold to our original motto: "Growing top quality material for buyers who are interested in the best."
                    </Typography>
                    <Typography variant="body1" paragraph>As wholesale growers, we are always looking ahead to the next season with anticipation for something new. In addition to the wonderful trees and shrubs you have come to expect from New Life Nursery, Inc, we look forward to offering many new varieties as we head into each new season. Feel free to contact us for access to our updated availability list. As always, we encourage our customers to send us their comments and suggestions.</Typography>
                    <Typography variant="body1" paragraph>With over 70 acres in production, New Life Nursery, Inc has the trees and shrubs you need, when you need them. All sizes, from 3-gallon shrubs to 25-gallon trees, are grown here on our farm in Southern New Jersey. Browse our Availability List, and contact us if you would like more information, or to speak with one of our experts at <a href={business?.PHONE?.Link}>{business?.PHONE?.Label}</a>.</Typography>
                    <Typography variant="body1" paragraph>
                        Warmest Wishes,
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <img src={GianarisSignature} alt="Gianaris Signature" />
                    </Box>
                </Grid>
                <Divider />
                <Grid item xs={12} lg={4} pt={4}>
                    <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h4" gutterBottom>Check out our socials💚</Typography>
                        <SocialLink platform="Facebook" Icon={FacebookIcon} url={business?.SOCIAL?.Facebook} />
                        <SocialLink platform="Instagram" Icon={InstagramIcon} url={business?.SOCIAL?.Instagram} />
                    </Box>
                </Grid>
            </Stack>
        </>
    );
};
