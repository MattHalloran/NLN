import { Box, Card, CardContent, Stack, Typography, useTheme } from "@mui/material";
import { BusinessContext } from "contexts/BusinessContext";
import { Clock, MapPin, Phone, Mail } from "lucide-react";
import { useContext } from "react";
import { parseBusinessHours } from "utils/businessHours";

export const ContactInfo = ({
    ...props
}) => {
    const { palette } = useTheme();
    const business = useContext(BusinessContext);

    const openLink = (e: React.MouseEvent, link: string) => {
        window.location.href = link;
        e.preventDefault();
    };

    const hours = parseBusinessHours(business?.hours || "");

    const contactInfo = [
        {
            tooltip: "Open in Google Maps",
            label: business?.ADDRESS?.Label,
            link: business?.ADDRESS?.Link,
            icon: <MapPin size={16} />,
        },
        {
            tooltip: "Call Us",
            label: business?.PHONE?.Label,
            link: business?.PHONE?.Link,
            icon: <Phone size={16} />,
        },
        {
            tooltip: "Email Us",
            label: business?.EMAIL?.Label,
            link: business?.EMAIL?.Link,
            icon: <Mail size={16} />,
        },
    ];

    return (
        <Stack spacing={2} sx={{ width: "100%" }} {...props}>
            {/* Hours Section */}
            <Card
                sx={{
                    backgroundColor: palette.background.paper,
                    border: `1px solid ${palette.divider}`,
                    borderRadius: 1,
                    boxShadow: "none",
                }}
            >
                <CardContent sx={{ padding: 2 }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            marginBottom: 1.5,
                            paddingBottom: 1,
                            borderBottom: `1px solid ${palette.divider}`,
                        }}
                    >
                        <Clock
                            size={18}
                            color={palette.text.secondary}
                        />
                        <Typography
                            variant="h6"
                            sx={{
                                color: palette.text.primary,
                                fontWeight: 500,
                                fontSize: "0.95rem",
                            }}
                        >
                            Hours
                        </Typography>
                    </Box>
                    <Stack spacing={0.5}>
                        {hours?.map((row: string, index: number) => {
                            // The row is already formatted like "MON-FRI: 8:00 am to 3:00 pm"
                            const [day, time] = row.includes(": ")
                                ? row.split(": ")
                                : [row, ""];

                            return (
                                <Box
                                    key={index}
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        paddingY: 0.25,
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: palette.text.primary,
                                            fontSize: "0.85rem",
                                            fontWeight: time?.toUpperCase().includes("CLOSED") ? 400 : 500,
                                            opacity: time?.toUpperCase().includes("CLOSED") ? 0.7 : 1,
                                        }}
                                    >
                                        {day}
                                    </Typography>
                                    {time && (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: palette.text.secondary,
                                                fontSize: "0.8rem",
                                            }}
                                        >
                                            {time}
                                        </Typography>
                                    )}
                                </Box>
                            );
                        })}
                        {business?.hours?.includes("Note:") && (
                            <Typography
                                variant="caption"
                                sx={{
                                    color: palette.text.secondary,
                                    fontSize: "0.75rem",
                                    fontStyle: "italic",
                                    marginTop: 1,
                                    lineHeight: 1.3,
                                }}
                            >
                                {business.hours.split("Note:")[1]?.trim()}
                            </Typography>
                        )}
                    </Stack>
                </CardContent>
            </Card>

            {/* Contact Methods */}
            <Stack spacing={1}>
                {contactInfo.map(({ tooltip, label, link, icon }, index) => (
                    label && link ? (
                        <Card
                            key={index}
                            onClick={(e) => openLink(e, link)}
                            sx={{
                                cursor: "pointer",
                                backgroundColor: palette.background.paper,
                                border: `1px solid ${palette.divider}`,
                                borderRadius: 1,
                                boxShadow: "none",
                                transition: "background-color 0.2s ease",
                                "&:hover": {
                                    backgroundColor: palette.mode === "light"
                                        ? "rgba(0, 0, 0, 0.02)"
                                        : "rgba(255, 255, 255, 0.02)",
                                },
                            }}
                        >
                            <CardContent
                                sx={{
                                    padding: 1.5,
                                    "&:last-child": { paddingBottom: 1.5 },
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: 32,
                                        height: 32,
                                        backgroundColor: palette.mode === "light"
                                            ? "rgba(0, 0, 0, 0.06)"
                                            : "rgba(255, 255, 255, 0.06)",
                                        borderRadius: 1,
                                        color: palette.text.secondary,
                                    }}
                                >
                                    {icon}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: palette.text.secondary,
                                            fontSize: "0.75rem",
                                            display: "block",
                                            lineHeight: 1,
                                            marginBottom: 0.25,
                                        }}
                                    >
                                        {tooltip}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: palette.text.primary,
                                            fontSize: "0.85rem",
                                            fontWeight: 400,
                                            wordBreak: "break-word",
                                            overflowWrap: "break-word",
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        {label}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    ) : null
                ))}
            </Stack>
        </Stack>
    );
};
