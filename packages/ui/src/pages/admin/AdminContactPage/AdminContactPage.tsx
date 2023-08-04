import { useMutation } from "@apollo/client";
import {
    Box,
    Button,
    Grid,
    TextField,
    useTheme,
} from "@mui/material";
import { writeAssetsMutation } from "api/mutation";
import { graphqlWrapperHelper } from "api/utils";
import { AdminBreadcrumbs, PageContainer, PageTitle } from "components";
import { CancelIcon, SaveIcon } from "icons";
import Markdown from "markdown-to-jsx";
import { useEffect, useState } from "react";

const helpText = `This page allows you to edit the contact info displayed on the site. 

The information is stored in Markdown. You can learn more about how to write Markdown [here](https://www.markdownguide.org/basic-syntax/).

NOTE: This will not update Google My Business information. You must do that manually by logging into your Google My Business account.`;

export const AdminContactPage = ({
    business,
}) => {
    const { palette, spacing } = useTheme();

    const [hours, setHours] = useState("");
    const [updateHours] = useMutation(writeAssetsMutation);

    useEffect(() => {
        setHours(business?.hours ?? "");
    }, [business]);

    const applyHours = () => {
        // Data must be sent as a file to use writeAssets
        const blob = new Blob([hours], { type: "text/plain" });
        const file = new File([blob], "hours.md", { type: blob.type });
        console.log("applying hours hours", hours);
        console.log("applying hours blob", blob);
        console.log("applying hours file", [file]);
        graphqlWrapperHelper({
            call: () => updateHours({ variables: { files: [file] } }),
            successCondition: (success: any) => success === true,
            successMessage: () => "Hours updated.",
            errorMessage: () => "Failed to update hours.",
        });
    };

    const revertHours = () => {
        setHours(business?.hours);
    };

    const options = (
        <Grid container spacing={2} sx={{
            marginBottom: spacing(2),
            marginTop: spacing(2),
        }}>
            <Grid display="flex" justifyContent="center" item xs={6}>
                <Button startIcon={<SaveIcon />} fullWidth disabled={business?.hours === hours} onClick={applyHours}>Apply</Button>
            </Grid>
            <Grid display="flex" justifyContent="center" item xs={6}>
                <Button startIcon={<CancelIcon />} fullWidth disabled={business?.hours === hours} onClick={revertHours}>Revert</Button>
            </Grid>
        </Grid>
    );

    return (
        <PageContainer>
            <AdminBreadcrumbs textColor={palette.secondary.dark} />
            <PageTitle title="Manage Contact Info" helpText={helpText} />
            {options}
            <Grid container spacing={2} direction="row">
                <Grid item xs={12} md={6}>
                    <TextField
                        id="filled-multiline-static"
                        label="Hours edit"
                        fullWidth
                        multiline
                        rows={14}
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <Box sx={{
                        border: "1px solid gray",
                        borderRadius: "2px",
                        width: "100%",
                        height: "100%",
                    }}>
                        <Markdown>{hours}</Markdown>
                    </Box>
                </Grid>
            </Grid>
            {options}
        </PageContainer>
    );
};
