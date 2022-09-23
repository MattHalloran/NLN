import { SvgProps } from './types.d';

export const ColorWheelIcon = (props: SvgProps) => (
    <svg viewBox="0 0 510 510"
        xmlns="http://www.w3.org/2000/svg"
        style={props.style}
        className={props.className}
        aria-labelledby="colorwheel-title"
        width={props.width}
        height={props.height}
        onClick={() => typeof props.onClick === 'function' && props.onClick()}>
        <title id="colorwheel-title">{props.iconTitle ?? 'Color Wheel'}</title>
        <path d="M108.649 194.85c-30.425 0-55.177 24.752-55.177 55.177s24.752 55.177 55.177 55.177 55.177-24.752 55.177-55.177-24.752-55.177-55.177-55.177zm0 80.356c-13.883 0-25.179-11.295-25.179-25.179s11.296-25.179 25.179-25.179 25.179 11.295 25.179 25.179-11.296 25.179-25.179 25.179zM206.358 325.171c-30.424 0-55.176 24.752-55.176 55.177 0 30.424 24.752 55.176 55.176 55.176 30.425 0 55.177-24.752 55.177-55.176 0-30.425-24.752-55.177-55.177-55.177zm0 80.355c-13.883 0-25.178-11.295-25.178-25.179s11.295-25.179 25.178-25.179c13.884 0 25.179 11.295 25.179 25.179.001 13.884-11.295 25.179-25.179 25.179z" /><path d="M496.18 324.693c-.099-.098-.198-.194-.299-.29l-51.938-49.011c29.074-21.984 42.208-60.897 30.264-96.895C417.898 8.614 201.522-45.282 72.593 81.699c-96.561 95.102-95.66 248.445-4.044 342.874 82.305 84.831 211.993 96.745 307.711 34.089 44.824-29.332 24.217-99.152-29.421-99.152-40.06 0-46.792-56.011-8.951-65.602l91.503 96.974c.096.101.192.201.291.3 18.343 18.385 48.139 18.434 66.53.042 18.389-18.388 18.389-48.152-.032-66.531zm-193.801 47.105c12.051 11.42 27.84 17.709 44.461 17.709 23.956 0 32.988 30.972 12.993 44.056-83.775 54.84-197.555 44.538-269.754-29.878-80.978-83.463-80.501-217.407 3.896-300.423C207.068-7.98 396.223 38.56 445.734 187.939c8.389 25.283-2.094 52.756-24.082 66.419l-83.314-78.619c5.044-24.218-1.942-49.749-20.246-68.052-22.973-22.974-95.346-34.425-126.711-37.832-9.513-1.036-17.568 7.006-16.533 16.533 3.435 31.487 14.819 103.696 37.833 126.711 18.316 18.314 43.86 25.286 68.059 20.243l35.094 37.192c-37.37 20.287-44.958 71.41-13.455 101.264zm-68.487-179.911c-11.303-11.303-21.402-54.292-26.734-89.723 35.432 5.331 78.421 15.431 89.723 26.734 17.404 17.404 17.407 45.58 0 62.989-17.365 17.367-45.547 17.442-62.989 0zm241.11 178.126c-6.61 6.61-17.308 6.64-23.957.107-7.678-8.137-134.279-142.308-141.333-149.783 5.918-4.395 11.222-9.699 15.623-15.623l149.784 141.343c6.539 6.656 6.503 17.335-.117 23.956z" />
    </svg>
)