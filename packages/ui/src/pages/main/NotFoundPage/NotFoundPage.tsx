import { APP_LINKS } from "@local/shared";
import { Box, Button, Container, Stack, Typography, useTheme } from "@mui/material";
import { PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { Home, Search, ShoppingBag as _ShoppingBag } from "lucide-react";
import { Link } from "route";
import PageNotFoundGif from "assets/img/PageNotFound.gif";

export const NotFoundPage = () => {
    const { palette } = useTheme();

    return (
        <PageContainer>
            <TopBar
                display="page"
                title="Page Not Found"
            />
            <Container
                maxWidth="sm"
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "calc(100vh - 200px)",
                    textAlign: "center",
                    py: 4,
                }}
            >
                {/* Sad Plant Illustration */}
                <Box
                    component="img"
                    src={PageNotFoundGif}
                    alt="Sad plant in pot"
                    sx={{
                        width: { xs: 120, sm: 150 },
                        height: "auto",
                        mb: 3,
                        opacity: 0.9,
                    }}
                />

                {/* Error Code */}
                <Typography
                    variant="h1"
                    sx={{
                        fontSize: { xs: "4rem", sm: "6rem" },
                        fontWeight: 700,
                        color: palette.primary.main,
                        lineHeight: 1,
                        mb: 1,
                    }}
                >
                    404
                </Typography>

                {/* Main Message */}
                <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                        color: palette.text.primary,
                        fontWeight: 500,
                        mb: 2,
                        fontSize: { xs: "1.5rem", sm: "2rem" },
                    }}
                >
                    Oops! This page seems to have wilted away
                </Typography>

                {/* Description */}
                <Typography
                    variant="body1"
                    sx={{
                        color: palette.text.secondary,
                        mb: 4,
                        maxWidth: "500px",
                        lineHeight: 1.6,
                        fontSize: "1.1rem",
                    }}
                >
                    Like a plant that couldn't find the right soil, this page doesn't exist.
                    Don't worry though – let's help you find what you're looking for!
                </Typography>

                {/* Action Buttons */}
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{ width: "100%", maxWidth: "400px" }}
                >
                    <Link to={APP_LINKS.Home} style={{ textDecoration: "none", flex: 1 }}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<Home size={20} />}
                            fullWidth
                            sx={{
                                py: 1.5,
                                fontWeight: 500,
                                borderRadius: 2,
                            }}
                        >
                            Go Home
                        </Button>
                    </Link>

                    <Button
                        variant="outlined"
                        size="large"
                        startIcon={<Search size={20} />}
                        fullWidth
                        onClick={() => window.open("https://newlife.online-orders.sbiteam.com/", "_blank")}
                        sx={{
                            py: 1.5,
                            fontWeight: 500,
                            borderRadius: 2,
                            borderColor: palette.primary.main,
                            color: palette.primary.main,
                            "&:hover": {
                                borderColor: palette.primary.dark,
                                backgroundColor: `${palette.primary.main}10`,
                            },
                        }}
                    >
                        Shop Plants
                    </Button>
                </Stack>

                {/* Additional Help Text */}
                <Typography
                    variant="caption"
                    sx={{
                        color: palette.text.secondary,
                        mt: 3,
                        fontSize: "0.9rem",
                    }}
                >
                    Still can't find what you're looking for?
                    <Link
                        to={APP_LINKS.Home}
                        style={{
                            color: palette.primary.main,
                            textDecoration: "none",
                            marginLeft: "4px",
                        }}
                    >
                        Contact us for help
                    </Link>
                </Typography>
            </Container>
        </PageContainer>
    );
};
