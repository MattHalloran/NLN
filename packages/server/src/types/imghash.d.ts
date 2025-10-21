declare module "imghash" {
    export function hash(
        path: string | Buffer,
        bits?: number,
        format?: "hex" | "binary"
    ): Promise<string>;

    export function hashRaw(
        path: string | Buffer,
        bits?: number
    ): Promise<number[]>;
}
