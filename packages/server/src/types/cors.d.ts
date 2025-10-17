declare module 'cors' {
    import { RequestHandler } from 'express';

    interface CorsOptions {
        origin?: boolean | string | RegExp | (string | RegExp)[] | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
        credentials?: boolean;
        methods?: string | string[];
        allowedHeaders?: string | string[];
        exposedHeaders?: string | string[];
        maxAge?: number;
        preflightContinue?: boolean;
        optionsSuccessStatus?: number;
    }

    function cors(options?: CorsOptions): RequestHandler;
    export = cors;
}