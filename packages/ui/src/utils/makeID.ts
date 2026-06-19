import { createRandomId } from "@local/shared";

export function makeID(length: number): string {
    return createRandomId(length);
}
