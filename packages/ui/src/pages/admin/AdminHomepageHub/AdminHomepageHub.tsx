import { APP_LINKS } from "@local/shared";
import { Box, Card, CardContent, Grid, Typography, useTheme, Avatar } from "@mui/material";
import {
    Settings,
    BarChart3,
    Image,
    Leaf,
    Mail,
    Palette,
    Briefcase,
    Users,
} from "lucide-react";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLocation } from "route";

interface HomepageCardData {
    title: string;
    description: string;
    link: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    color: string;
    stats?: string;
}

const getCardData = (): HomepageCardData[] => [
    {
        title: "Section Configuration",
        description: "Control which sections appear on the homepage and their display order",
        link: APP_LINKS.AdminHomepageSections,
        icon: Settings,
        color: "#546e7a",
        stats: "Manage layout",
    },
    {
        title: "A/B Testing",
        description: "Create and manage A/B tests to optimize homepage performance",
        link: APP_LINKS.AdminHomepageABTesting,
        icon: BarChart3,
        color: "#546e7a",
        stats: "View tests",
    },
    {
        title: "Hero Banner",
        description: "Upload, edit, and manage hero banner images and carousel settings",
        link: APP_LINKS.AdminHomepageHeroBanner,
        icon: Image,
        color: "#546e7a",
        stats: "Manage images",
    },
    {
        title: "Seasonal Content",
        description: "Update seasonal plants and expert care tips displayed on the homepage",
        link: APP_LINKS.AdminHomepageSeasonal,
        icon: Leaf,
        color: "#546e7a",
        stats: "Update content",
    },
    {
        title: "Services Offered",
        description: "Configure the services showcased on your homepage",
        link: APP_LINKS.AdminHomepageServices,
        icon: Briefcase,
        color: "#546e7a",
        stats: "Manage services",
    },
    {
        title: "Newsletter Settings",
        description: "Configure newsletter signup section and messaging",
        link: APP_LINKS.AdminHomepageNewsletter,
        icon: Mail,
        color: "#546e7a",
        stats: "Edit settings",
    },
    {
        title: "Newsletter Subscribers",
        description: "View and manage newsletter subscription list for lead generation",
        link: APP_LINKS.AdminNewsletterSubscribers,
        icon: Users,
        color: "#546e7a",
        stats: "View subscribers",
    },
    {
        title: "Branding & Theme",
        description: "Customize company information and brand colors",
        link: APP_LINKS.AdminHomepageBranding,
        icon: Palette,
        color: "#546e7a",
        stats: "Update branding",
    },
];

const HomepageCard = ({
    data,
    onClick,
}: {
    data: HomepageCardData;
    onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}) => {
    const { palette } = useTheme();
    const IconComponent = data.icon;

    return (
        <Card
            onClick={onClick}
            sx={{
                cursor: "pointer",
                transition: "box-shadow 0.2s ease-in-out",
                height: "100%",
                background: palette.background.paper,
                "&:hover": {
                    boxShadow: 3,
                },
                borderRadius: 1,
                boxShadow: 1,
                border: `1px solid ${palette.divider}`,
            }}
        >
            <CardContent sx={{ p: 2 }}>
                <Box display="flex" flexDirection="column" height="100%">
                    {/* Header with icon */}
                    <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                        <Avatar
                            sx={{
                                bgcolor: data.color,
                                width: 48,
                                height: 48,
                                "& > svg": {
                                    fontSize: 24,
                                    color: "white",
                                },
                            }}
                        >
                            <IconComponent size={24} color="white" />
                        </Avatar>
                    </Box>

                    {/* Title and Description */}
                    <Box flex={1}>
                        <Typography
                            variant="h6"
                            component="h3"
                            sx={{
                                fontWeight: 600,
                                mb: 1,
                                color: palette.text.primary,
                            }}
                        >
                            {data.title}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: palette.text.secondary,
                                lineHeight: 1.5,
                                mb: 2,
                            }}
                        >
                            {data.description}
                        </Typography>
                    </Box>

                    {/* Stats */}
                    {data.stats && (
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography
                                variant="body2"
                                sx={{
                                    color: palette.text.secondary,
                                    fontWeight: 500,
                                }}
                            >
                                {data.stats}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: palette.primary.main,
                                    fontWeight: 500,
                                }}
                            >
                                Manage →
                            </Typography>
                        </Box>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export const AdminHomepageHub = () => {
    const [, setLocation] = useLocation();
    const { palette } = useTheme();

    const cardData = getCardData();

    return (
        <PageContainer sx={{ paddingLeft: "0!important", paddingRight: "0!important" }}>
            <TopBar
                display="page"
                title="Homepage Management"
                startComponent={<BackButton to={APP_LINKS.Admin} ariaLabel="Back to Admin Dashboard" />}
            />

            <Box px={3} py={2}>
                {/* Main Title */}
                <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                        mb: 2,
                        fontWeight: 600,
                        color: palette.text.primary,
                    }}
                >
                    Homepage Settings
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        mb: 4,
                        color: palette.text.secondary,
                    }}
                >
                    Configure and manage different aspects of your homepage content and layout.
                </Typography>
            </Box>

            {/* Homepage Cards */}
            <Box px={3} pb={3}>
                <Grid container spacing={3}>
                    {cardData.map((card, index) => (
                        <Grid item xs={12} sm={6} lg={3} key={index}>
                            <HomepageCard
                                data={card}
                                onClick={() => setLocation(card.link)}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </PageContainer>
    );
};
