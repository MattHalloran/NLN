export interface PageTitleProps {
    helpText?: string;
    title: string;
    sxs?: { 
        stack?: { [x: string]: any; };
        text?: { [x: string]: any; };
    }
}