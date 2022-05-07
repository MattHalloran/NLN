import { SvgProps } from './types.d';

export const HeartFilledIcon = (props: SvgProps) => (
    <svg xmlns="http://www.w3.org/2000/svg"
        style={props.style}
        viewBox="0 0 16 16"
        className={props.className}
        aria-labelledby="heartfilled-title"
        width={props.width}
        height={props.height}
        onClick={() => typeof props.onClick === 'function' && props.onClick()}>
        <title id="heartfilled-title">{props.iconTitle ?? 'Unlike'}</title>
        <path fillRule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z" />
    </svg>
)