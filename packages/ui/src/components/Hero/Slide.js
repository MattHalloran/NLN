import { memo } from 'react'
import { makeStyles } from '@material-ui/styles';

const useStyles = makeStyles({
    slide: props => ({
        height: '100%',
        width: `${props.width}px`,
        objectFit: 'cover',
        overflow: 'hidden',
    }),
});

const Slide = memo(({ content, width }) => {
    const classes = useStyles({width});
    return (
        <img className={classes.slide} src={content} alt='' />
    )
})

export { Slide };