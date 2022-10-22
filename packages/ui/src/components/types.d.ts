export interface PageContainerProps {
    children: boolean | null | undefined | JSX.Element | (boolean | null | undefined | JSX.Element)[];
    sx?: { [x: string]: any };
}