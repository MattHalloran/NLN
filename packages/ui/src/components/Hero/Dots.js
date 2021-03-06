import { makeStyles } from '@material-ui/styles';

const useStyles = makeStyles((theme) => ({
    dotContainer: {
        position: 'absolute',
        bottom: '25px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    dot: {
        padding: '10px',
        marginRight: '5px',
        cursor: 'pointer',
        borderRadius: '50%',
        opacity: '80%',
        border: '1px solid black',
    },
    active: {
        background: theme.palette.primary.main,
        opacity: '0.9',
    },
    inactive: {
        background: 'white',
    }
}));

const Dots = ({
    slides,
    activeSlide
}) => {
    const classes = useStyles();
    return (
        <div className={classes.dotContainer}>
            {slides?.map((slide, i) => (
                <div key={slide} className={`${classes.dot} ${activeSlide === i ? classes.active : classes.inactive}`} />
            ))}
        </div>
    )
}

export { Dots };