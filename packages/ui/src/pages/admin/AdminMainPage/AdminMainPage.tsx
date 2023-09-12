import { APP_LINKS } from "@local/shared";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { CardGrid, PageContainer, PageTitle } from "components";
import { useLocation } from "route";

const card_data: [string, string, string][] = [
    ["Orders", "Approve, create, and edit customer's orders", APP_LINKS.AdminOrders],
    ["Customers", "Approve new customers, edit customer information", APP_LINKS.AdminCustomers],
    ["Inventory", "Add, remove, and update inventory", APP_LINKS.AdminInventory],
    ["Hero", "Add, remove, and rearrange hero (home page) images", APP_LINKS.AdminHero],
    ["Gallery", "Add, remove, and rearrange gallery images", APP_LINKS.AdminGallery],
    ["Contact Info", "Edit business hours and other contact information", APP_LINKS.AdminContactInfo],
];

const AdminPageCard = ({
    description,
    key,
    onClick,
    title,
}: {
    description: string;
    key: string | number;
    onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    title: string;
}) => {
    const { breakpoints, palette } = useTheme();

    return (
        <Box
            key={key}
            onClick={onClick}
            sx={{
                width: "100%",
                boxShadow: { xs: 0, sm: 4 },
                padding: 2,
                borderRadius: { xs: 0, sm: 2 },
                cursor: "pointer",
                background: palette.primary.main,
                color: palette.primary.contrastText,
                "&:hover": {
                    filter: "brightness(1.05)",
                },
                display: "flex",
                flexDirection: "column",
                gap: 1,
                [breakpoints.down("sm")]: {
                    borderBottom: `1px solid ${palette.divider}`,
                },
            }}>
            <Typography variant='h6' component='div' sx={{ overflowWrap: "anywhere" }}>
                {title}
            </Typography>
            <Typography variant='body2' sx={{ overflowWrap: "anywhere" }}>
                {description}
            </Typography>
            {/* Bottom of card is button */}
            <Button
                size='small'
                sx={{
                    marginLeft: "auto",
                    alignSelf: "flex-end",
                }}
                variant="text"
            >Open</Button>
        </Box>
    );
};


export const AdminMainPage = () => {
    const [, setLocation] = useLocation();

    return (
        <PageContainer sx={{ paddingLeft: "0!important", paddingRight: "0!important" }}>
            <PageTitle title="Manage Site" />
            <CardGrid minWidth={300}>
                {card_data.map(([title, description, link], index) => (
                    <AdminPageCard
                        description={description}
                        key={index}
                        onClick={() => setLocation(link)}
                        title={title}
                    />
                ))}
            </CardGrid>
        </PageContainer>
    );
};
