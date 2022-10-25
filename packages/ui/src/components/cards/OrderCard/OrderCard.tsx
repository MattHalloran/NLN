import { useState } from 'react';
import {
    Button,
    Card,
    CardActions,
    CardContent,
    IconButton,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material';
import { ListDialog } from 'components';
import { emailLink, mapIfExists, phoneLink, showPhone } from 'utils';
import { EmailIcon, PhoneIcon } from '@shared/icons';

export const OrderCard = ({
    onEdit,
    order,
}) => {
    const { palette } = useTheme();

    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);

    const callPhone = (phoneLink: string) => {
        setPhoneDialogOpen(false);
        if (phoneLink) window.location.href = phoneLink;
    }

    const sendEmail = (emailLink: string) => {
        setEmailDialogOpen(false);
        if (emailLink) window.open(emailLink, '_blank', 'noopener,noreferrer')
    }

    // Phone and email [label, value] pairs
    const phoneList = mapIfExists(order, 'customer.phones', (p) => ([showPhone(p.number), phoneLink(p.number)]));
    const emailList = mapIfExists(order, 'customer.emails', (e) => ([e.emailAddress, emailLink(e.emailAddress)]));

    return (
        <Card sx={{
            backgroundColor: palette.primary.main,
            color: palette.primary.contrastText,
            borderRadius: 2,
            margin: 3,
            padding: 1,
            minWidth: 150,
            minHeight: 50,
            cursor: 'pointer',
        }}>
            {phoneDialogOpen ? (
                <ListDialog
                    title={`Call ${order?.customer?.fullName}`}
                    data={phoneList}
                    onClose={callPhone} />
            ) : null}
            {emailDialogOpen ? (
                <ListDialog
                    title={`Email ${order?.customer?.fullName}`}
                    data={emailList}
                    onClose={sendEmail} />
            ) : null}
            <CardContent onClick={onEdit}>
                <Typography variant="h6" component="h3" gutterBottom>
                    {order?.customer?.fullName ?? ''}
                </Typography>
                <Typography variant="body1" component="h4">
                    Status: {order?.status}
                </Typography>
                <Typography variant="body1" component="h4">
                    Requested Date: {order?.desiredDeliveryDate ? new Date(order?.desiredDeliveryDate).toLocaleDateString('en-US') : 'Unset'}
                </Typography>
                <Typography variant="body1" component="h4">
                    Items: {order?.items?.length ?? 0}
                </Typography>
            </CardContent>
            <CardActions>
                <Button variant="text" onClick={onEdit} sx={{ color: palette.secondary.light }}>View</Button>
                {phoneList && phoneList.length &&
                    (<Tooltip title="View phone numbers" placement="bottom">
                        <IconButton onClick={() => setPhoneDialogOpen(true)}>
                            <PhoneIcon fill={palette.secondary.light} />
                        </IconButton>
                    </Tooltip>)
                }
                {emailList && emailList.length > 0 &&
                    (<Tooltip title="View emails" placement="bottom">
                        <IconButton onClick={() => setEmailDialogOpen(true)}>
                            <EmailIcon fill={palette.secondary.light} />
                        </IconButton>
                    </Tooltip>)
                }
            </CardActions>
        </Card>
    );
}