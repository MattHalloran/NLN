import { SvgProps } from './types.d';

export const ChevronRightIcon = (props: SvgProps) => (
    <svg xmlns="http://www.w3.org/2000/svg"
        style={props.style}
        viewBox="0 0 16 16"
        className={props.className}
        aria-labelledby="chevronright-title"
        width={props.width}
        height={props.height}
        onClick={() => typeof props.onClick === 'function' && props.onClick()}>
        <title id="chevronright-title">{props.iconTitle ?? 'Next'}</title>
        <path fillRule="evenodd" d="M4.6 1.6a.5.5 0 01.8 0l6 6a.5.5 0 010 .8l-6 6a.5.5 0 01-.8-.8L10.3 8 4.6 2.4a.5.5 0 010-.8z" />
    </svg>
)