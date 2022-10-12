import React from 'react';
import {  
    BottomNavigation, 
    BottomNavigationAction, 
    IconButton, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead,
    TableRow, 
    Tooltip, 
    useTheme
} from '@mui/material';
import { EmailIcon, PhoneIcon, PinIcon, SvgComponent } from '@shared/icons';

makeStyles((theme) => ({
    tableHead: {
        background: palette.primary.main,
    },
    tableHeadCell: {
        color: palette.primary.contrastText,
    },
    tableRow: {
        background: palette.background.paper,
    },
    nav: {
        alignItems: 'baseline',
        background: 'transparent',
        height: 'fit-content',
    },
    navAction: {
        alignItems: 'center',
        color: palette.primary.contrastText,
        overflowWrap: 'anywhere',
    },
    iconButton: {
        background: palette.secondary.main,
        fill: palette.secondary.contrastText,
    },
}));

export const ContactInfo = ({
    business,
    ...props
}) => {
    const { palette } = useTheme();

    const openLink = (e, link) => {
        window.location = link;
        e.preventDefault();
    }

    // Parse business hours markdown into 2D array, remove |'s, and reduce to 1D array
    let hours;
    try {
        hours = business?.hours ? 
            business.hours.split('\n').slice(2).map(row => row.split('|').map(r => r.trim()).filter(r => r !== '')) :
            [];
        hours = hours.map(row => `${row[0]}: ${row[1]}`)
    } catch (error) {
        console.error('Failed to read business hours', error);
    }

    const contactInfo: [string, string | undefined, string | undefined, SvgComponent][] = [
        ['Open in Google Maps', business?.ADDRESS?.Label, business?.ADDRESS?.Link, PinIcon],
        ['Call Us', business?.PHONE?.Label, business?.PHONE?.Link, PhoneIcon],
        ['Email Us', business?.EMAIL?.Label, business?.EMAIL?.Link, EmailIcon]
    ]

    return (
        <div style={{ minWidth: 'fit-content', height: 'fit-content'}} {...props}>
            <TableContainer>
                <Table aria-label="contact-hours-table" size="small">
                    <TableHead className={classes.tableHead}>
                        <TableRow>
                            <TableCell className={classes.tableHeadCell}>Hours</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {hours.map((row, index) => (
                            <TableRow key={index} className={classes.tableRow}>
                                <TableCell>
                                    {row}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <BottomNavigation className={classes.nav} showLabels>
                {contactInfo.map(([tooltip, label, link, Icon]) => (
                    <Tooltip title={tooltip} placement="top">
                        <BottomNavigationAction className={classes.navAction} label={label} onClick={(e) => openLink(e, link)} icon={
                            <IconButton className={classes.iconButton}>
                                <Icon />
                            </IconButton>
                        } />
                    </Tooltip>
                ))}
            </BottomNavigation>
        </div>
    );
}