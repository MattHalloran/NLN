import Bull from "bull";
import ExcelJS from "exceljs";
import { uploadAvailabilityProcess } from "./process.js";

export type UploadAvailabilityPayload = {
    rows: unknown[][];
};

const split = (process.env.REDIS_CONN || "redis:6380").split(":");
export const HOST = split[0];
export const PORT = Number(split[1]);

const uploadAvailabilityQueue = new Bull<UploadAvailabilityPayload>("uploadAvailability", {
    redis: { port: PORT, host: HOST },
});
void uploadAvailabilityQueue.process(uploadAvailabilityProcess);

export async function uploadAvailability(filename: string) {
    // Wait to make sure file has been fully downloaded and is ready to read
    await new Promise((r) => setTimeout(r, 1000));
    // Parse file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(`${process.env.PROJECT_DIR}/assets/${filename}`);
    const worksheet = workbook.getWorksheet(1);

    // Convert worksheet to array of arrays (similar to XLSX.utils.sheet_to_json with header: 1)
    const rows: unknown[][] = [];
    if (worksheet) {
        worksheet.eachRow((row, _rowNumber) => {
            const values: unknown[] = [];
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                values[colNumber - 1] = cell.value;
            });
            rows.push(values);
        });
    }

    // Send to queue, with array of row data (array of arrays)
    await uploadAvailabilityQueue.add({
        rows,
    });
}
