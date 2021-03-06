import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import PropTypes from 'prop-types';
import { PUBS, PubSub } from 'utils';
import { Button, Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';

const useStyles = makeStyles((theme) => ({
    gridPad: {
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
    },
    itemPad: {
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(1),
    },
}));

const dropContainer = {
    background: 'white',
    border: '3px dashed gray',
    borderRadius: '5px'
}

const thumbsContainer = {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16
};

const thumb = {
    display: 'inline-flex',
    borderRadius: 2,
    border: '1px solid #eaeaea',
    marginBottom: 8,
    marginRight: 8,
    width: 100,
    height: 100,
    padding: 4,
    boxSizing: 'border-box'
};

const thumbInner = {
    display: 'flex',
    minWidth: 0,
    overflow: 'hidden'
};

const img = {
    display: 'block',
    width: 'auto',
    height: '100%'
};


function Dropzone({
    acceptedFileTypes = ['image/*'],
    dropzoneText = 'Drag \'n\' drop files here or click',
    onUpload,
    showThumbs = true,
    maxFiles = 100,
    uploadText = 'Upload file(s)',
    cancelText = 'Cancel upload'
}) {
    const classes = useStyles();
    const [files, setFiles] = useState([]);
    const { getRootProps, getInputProps } = useDropzone({
        accept: acceptedFileTypes,
        maxFiles: maxFiles,
        onDrop: acceptedFiles => {
            console.log('IN ON DROPPP', acceptedFiles)
            if (acceptedFiles.length <= 0) {
                PubSub.publish(PUBS.Snack, { message: 'Files not accepted', severity: 'error' });
                return;
            }
            setFiles(acceptedFiles.map(file => Object.assign(file, {
                preview: URL.createObjectURL(file)
            })));
        }
    });

    const upload = () => {
        if (files.length === 0) {
            PubSub.publish(PUBS.Snack, { message: 'No files selected', severity: 'error' });
            return;
        }
        onUpload(files);
        setFiles([]);
    }

    const thumbs = files.map(file => (
        <div style={thumb} key={file.name}>
            <div style={thumbInner}>
                <img
                    src={file.preview}
                    style={img}
                    alt="Dropzone preview"
                />
            </div>
        </div>
    ));

    useEffect(() => () => {
        // Make sure to revoke the data uris to avoid memory leaks
        files.forEach(file => URL.revokeObjectURL(file.preview));
    }, [files]);

    return (
        <section style={dropContainer}>
            <div style={{textAlign: 'center'}} {...getRootProps({ className: 'dropzone' })}>
                <input {...getInputProps()} />
                <p>{dropzoneText}</p>
            </div>
            {showThumbs && 
            <aside style={thumbsContainer}>
                {thumbs}
            </aside>}
            <Grid className={classes.gridPad} container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <Button className={classes.itemPad} fullWidth onClick={upload} disabled={files.length === 0}>{uploadText}</Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Button className={classes.itemPad} fullWidth onClick={() => setFiles([])}>{cancelText}</Button>
                </Grid>
            </Grid>
        </section>
    );
}

Dropzone.propTypes = {
    acceptedFileTypes: PropTypes.array,
    dropzoneText: PropTypes.string,
    onUpload: PropTypes.func.isRequired,
    showThumbs: PropTypes.bool,
    maxFiles: PropTypes.number,
    uploadText: PropTypes.string,
    cancelText: PropTypes.string
}

export default Dropzone;