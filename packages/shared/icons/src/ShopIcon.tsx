import { SvgPath } from './base';
import { SvgProps } from './types';

export const ShopIcon = (props: SvgProps) => (
    <SvgPath
        props={props}
        d="M16 6V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H2v13c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6h-6zm-6-2h4v2h-4V4zM9 18V9l7.5 4L9 18z"
    />
)