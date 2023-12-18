import { useMutation } from "@apollo/client";
import { Box, Button, Grid, TextField, useTheme } from "@mui/material";
import { writeAssetsMutation } from "api/mutation";
import { graphqlWrapperHelper } from "api/utils";
import { AdminTabOption, AdminTabs, PageContainer } from "components";
import { BottomActionsGrid } from "components/buttons/BottomActionsGrid/BottomActionsGrid";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { BusinessContext } from "contexts/BusinessContext";
import { CancelIcon, SaveIcon } from "icons";
import Markdown from "markdown-to-jsx";
import { useContext, useEffect, useState } from "react";
import { pagePaddingBottom } from "styles";

const helpText = `This page allows you to edit the contact info displayed on the site. 

The information is stored in Markdown. You can learn more about how to write Markdown [here](https://www.markdownguide.org/basic-syntax/).

NOTE: This will not update Google My Business information. You must do that manually by logging into your Google My Business account.`;

export const AdminContactPage = () => {
    const { spacing } = useTheme();
    const business = useContext(BusinessContext);

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

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                help={helpText}
                title="Contact Info"
                below={<AdminTabs defaultTab={AdminTabOption.ContactInfo} />}
            />
            <Grid container spacing={2} padding={2} direction="row" sx={{
                paddingBottom: pagePaddingBottom
            }}>
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
            <BottomActionsGrid display="page">
                <Grid item xs={6} p={1} sx={{ paddingTop: 0 }}>
                    <Button
                        fullWidth
                        onClick={applyHours}
                        startIcon={<SaveIcon />}
                        variant="contained"
                    >Apply</Button>
                </Grid>
                <Grid item xs={6} p={1} sx={{ paddingTop: 0 }}>
                    <Button
                        fullWidth
                        onClick={revertHours}
                        startIcon={<CancelIcon />}
                        variant="outlined"
                    >Revert</Button>
                </Grid>
            </BottomActionsGrid>
        </PageContainer>
    );
};
