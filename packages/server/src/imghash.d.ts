type Filepath = string | Buffer;

type Format = "hex" | "binary";

// blockhash ImageData
type Data = {
    width: number;
    height: number;
    data: Uint8Array | Uint8ClampedArray | number[];
};

export declare function hash(filepath: Filepath, bits?: number, format?: Format): Promise<string>;
export declare function hashRaw(data: Data, bits: number): string;
export declare function hexToBinary(s: string): string;
export declare function binaryToHex(s: string): string;