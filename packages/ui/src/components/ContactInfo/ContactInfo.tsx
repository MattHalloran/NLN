import {
    BottomNavigation,
    BottomNavigationAction,
    Box,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    useTheme,
} from "@mui/material";
import { EmailIcon, PhoneIcon, PinIcon } from "icons";
import { SvgComponent } from "icons/types";

export const ContactInfo = ({
    business,
    ...props
}) => {
    const { palette } = useTheme();

    const openLink = (e, link) => {
        window.location = link;
        e.preventDefault();
    };

    // Parse business hours markdown into 2D array, remove |'s, and reduce to 1D array
    let hours;
    try {
        hours = business?.hours ?
            business.hours.split("\n").slice(2).map(row => row.split("|").map(r => r.trim()).filter(r => r !== "")).filter(r => r.length > 0) :
            [];
        hours = hours.map(row => `${row[0]}: ${row[1]}`);
    } catch (error) {
        console.error("Failed to read business hours", error);
    }

    const contactInfo: [string, string | undefined, string | undefined, SvgComponent][] = [
        ["Open in Google Maps", business?.ADDRESS?.Label, business?.ADDRESS?.Link, PinIcon],
        ["Call Us", business?.PHONE?.Label, business?.PHONE?.Link, PhoneIcon],
        ["Email Us", business?.EMAIL?.Label, business?.EMAIL?.Link, EmailIcon],
    ];

    return (
        <Box sx={{ minWidth: "fit-content", height: "fit-content" }} {...props}>
            <TableContainer>
                <Table aria-label="contact-hours-table" size="small">
                    <TableHead sx={{ background: palette.primary.main }}>
                        <TableRow>
                            <TableCell sx={{ color: palette.primary.contrastText }}>Hours</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {hours.map((row, index) => (
                            <TableRow key={index} sx={{ background: palette.background.paper }}>
                                <TableCell>
                                    {row}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <BottomNavigation
                showLabels
                sx={{
                    alignItems: "baseline",
                    background: "transparent",
                    height: "fit-content",
                    marginTop: 1,
                }}
            >
                {contactInfo.map(([tooltip, label, link, Icon]) => (
                    <Tooltip title={tooltip} placement="top">
                        <BottomNavigationAction
                            label={label}
                            onClick={(e) => openLink(e, link)}
                            icon={
                                <IconButton sx={{ background: palette.secondary.main }}>
                                    <Icon fill={palette.secondary.contrastText} />
                                </IconButton>
                            }
                            sx={{
                                alignItems: "center",
                                color: palette.background.textPrimary,
                                overflowWrap: "anywhere",
                            }}
                        />
                    </Tooltip>
                ))}
            </BottomNavigation>
        </Box>
    );
};
