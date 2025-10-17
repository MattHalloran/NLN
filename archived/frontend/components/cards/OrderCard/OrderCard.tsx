import { Button, Card, CardActions, CardContent, IconButton, Tooltip, Typography, useTheme } from "@mui/material";
import { ListDialog } from "components";
import { EmailIcon, PhoneIcon } from "icons";
import { useState } from "react";
import { emailLink, mapIfExists, phoneLink, showPhone } from "utils";
import { OrderCardProps } from "../types";

export const OrderCard = ({
    onEdit,
    order,
}: OrderCardProps) => {
    const { palette } = useTheme();

    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);

    const callPhone = (phoneLink?: string): void => {
        setPhoneDialogOpen(false);
        if (phoneLink) window.location.href = phoneLink;
    };

    const sendEmail = (emailLink?: string): void => {
        setEmailDialogOpen(false);
        if (emailLink) window.open(emailLink, "_blank", "noopener,noreferrer");
    };

    // Phone and email [label, value] pairs
    const phoneList = mapIfExists(order as unknown as Record<string, unknown>, "customer.phones", (p: any) => [showPhone(p.number), phoneLink(p.number)] as [string, string]) as [string, string][] | null;
    const emailList = mapIfExists(order as unknown as Record<string, unknown>, "customer.emails", (e: any) => [e.emailAddress, emailLink(e.emailAddress)] as [string, string]) as [string, string][] | null;

    return (
        <Card sx={{
            backgroundColor: palette.primary.main,
            color: palette.primary.contrastText,
            borderRadius: 2,
            margin: 1,
            padding: 1,
            minWidth: 150,
            minHeight: 50,
            cursor: "pointer",
        }}>
            {phoneDialogOpen ? (
                <ListDialog
                    title={`Call ${order?.customer?.firstName} ${order?.customer?.lastName}`}
                    data={phoneList ?? undefined}
                    onClose={callPhone} />
            ) : null}
            {emailDialogOpen ? (
                <ListDialog
                    title={`Email ${order?.customer?.firstName} ${order?.customer?.lastName}`}
                    data={emailList ?? undefined}
                    onClose={sendEmail} />
            ) : null}
            <CardContent onClick={() => onEdit?.(order)}>
                <Typography variant="h6" component="h3" gutterBottom>
                    {order?.customer?.firstName} {order?.customer?.lastName}
                </Typography>
                <Typography variant="body1" component="h4">
                    Status: {order?.status}
                </Typography>
                <Typography variant="body1" component="h4">
                    Requested Date: {order?.desiredDeliveryDate ? new Date(order?.desiredDeliveryDate).toLocaleDateString("en-US") : "Unset"}
                </Typography>
                <Typography variant="body1" component="h4">
                    Items: {order?.items?.length ?? 0}
                </Typography>
            </CardContent>
            <CardActions>
                <Button variant="text" onClick={() => onEdit?.(order)} sx={{ color: palette.secondary.light }}>View</Button>
                {phoneList?.length &&
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
};
