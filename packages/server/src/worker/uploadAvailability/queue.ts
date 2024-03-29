import Bull from "bull";
import XLSX from "xlsx";
import { uploadAvailabilityProcess } from "./process";

export type UploadAvailabilityPayload = {
    rows: unknown[][];
}

const split = (process.env.REDIS_CONN || "redis:6379").split(":");
export const HOST = split[0];
export const PORT = Number(split[1]);

const uploadAvailabilityQueue = new Bull<UploadAvailabilityPayload>("uploadAvailability", { redis: { port: PORT, host: HOST } });
uploadAvailabilityQueue.process(uploadAvailabilityProcess);

export async function uploadAvailability(filename: string) {
    // Wait to make sure file has been fully downloaded and is ready to read
    await new Promise(r => setTimeout(r, 1000));
    // Parse file
    const workbook = XLSX.readFile(`${process.env.PROJECT_DIR}/assets/${filename}`);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // Send to queue, with array of row data (array of arrays)
    uploadAvailabilityQueue.add({
        rows: XLSX.utils.sheet_to_json(sheet, { header: 1 }),
    });
}
