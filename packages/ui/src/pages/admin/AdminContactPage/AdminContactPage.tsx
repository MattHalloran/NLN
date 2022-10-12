import { useState, useEffect } from 'react';
import { AdminBreadcrumbs, PageContainer, PageTitle } from 'components';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import {
    Button,
    Grid,
    TextField,
    useTheme
} from '@mui/material';
import { useMutation } from '@apollo/client';
import { writeAssetsMutation } from 'graphql/mutation';
import { mutationWrapper } from 'graphql/utils';
import { writeAssetsVariables } from 'graphql/generated/writeAssets';

makeStyles((theme) => ({
    header: {
        textAlign: 'center',
    },
    tall: {
        height: '100%',
    },
    hoursPreview: {
        border: '1px solid gray',
        borderRadius: '2px',
        width: '100%',
        height: '100%',
    },
    pad: {
        marginBottom: spacing(2),
        marginTop: spacing(2)
    },
    gridItem: {
        display: 'flex',
    },
}));

export const AdminContactPage = ({
    business
}) => {
    const { palette, spacing } = useTheme();

    const [hours, setHours] = useState('');
    const [updateHours] = useMutation(writeAssetsMutation);

    useEffect(() => {
        setHours(business?.hours);
    }, [business])

    const applyHours = () => {
        // Data must be sent as a file to use writeAssets
        const blob = new Blob([hours], { type: 'text/plain' });
        const file = new File([blob], 'hours.md', { type: blob.type });
        mutationWrapper<any, writeAssetsVariables>({
            mutation: updateHours,
            input: { files: [file] },
            successCondition: (success) => success === true,
            successMessage: () => 'Hours updated.',
            errorMessage: () => 'Failed to update hours.',
        })
    }

    const revertHours = () => {
        setHours(business?.hours);
    }

    let options = (
        <Grid classes={{ container: classes.pad }} container spacing={2}>
            <Grid className={classes.gridItem} justifyContent="center" item xs={12} sm={6}>
                <Button fullWidth disabled={business?.hours === hours} onClick={applyHours}>Apply Changes</Button>
            </Grid>
            <Grid className={classes.gridItem} justifyContent="center" item xs={12} sm={6}>
                <Button fullWidth disabled={business?.hours === hours} onClick={revertHours}>Revert Changes</Button>
            </Grid>
        </Grid>
    )

    return (
        <PageContainer>
            <AdminBreadcrumbs textColor={palette.secondary.dark} />
            <PageTitle title="Manage Contact Info" />
            {options}
            <Grid container spacing={2} direction="row">
                <Grid item sm={12} md={6}>
                    <TextField
                        id="filled-multiline-static"
                        label="Hours edit"
                        className={classes.tall}
                        InputProps={{ classes: { input: classes.tall, root: classes.tall } }}
                        fullWidth
                        multiline
                        rows={4}
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                    />
                </Grid>
                <Grid item sm={12} md={6}>
                    <ReactMarkdown plugins={[gfm]} className={classes.hoursPreview}>
                        {hours}
                    </ReactMarkdown>
                </Grid>
            </Grid>
            <Grid container spacing={2}>

            </Grid>
            {options}
        </PageContainer>
    );
}