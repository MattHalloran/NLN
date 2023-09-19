import { SKU_STATUS } from "@local/shared";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;

const prisma = new PrismaClient();

/** Helper function to find the index of a column based on potential names */
function findColumnIndex(header: string[], potentialNames: string[]): number {
    for (const potentialName of potentialNames) {
        const index = header.findIndex(h => h.trim().toLowerCase() === potentialName.toLowerCase());
        if (index !== -1) return index;
    }
    return -1;
}

// Reads an .xls availability file into the database.
// SKUs of plants not in the availability file will be hidden
export async function uploadAvailabilityProcess(job: any) {
    console.info("📊 Updating availability...");

    const rows: any[] = job.data.rows;
    const header = rows[0];
    const content = rows.slice(1, rows.length);
    // Determine which columns data is in
    const columnIndex: { [x: string]: number } = {
        latinName: findColumnIndex(header, ["Botanical Name", "Botanical", "Latin Name", "Latin"]),
        commonName: findColumnIndex(header, ["Common Name", "Common", "Name", "Description"]),
        size: findColumnIndex(header, ["Size"]),
        note: findColumnIndex(header, ["Notes", "Note", "Comments", "Comment"]),
        price: findColumnIndex(header, ["Price 10+", "Price", "Cost"]),
        sku: findColumnIndex(header, ["Plant Code", "Code", "SKU"]),
        availability: findColumnIndex(header, ["Quantity", "Availability", "Available", "Avail", "Amount"]),
    };
    // Hide all existing SKUs, so only the SKUs in this file can be set to visible
    await prisma.sku.updateMany({ data: { status: SKU_STATUS.Inactive } });
    for (const row of content) {
        // Insert or update plant data from row
        const latinName = row[columnIndex.latinName];
        let plant = await prisma.plant.findUnique({
            where: { latinName }, select: {
                id: true,
                traits: { select: { id: true, name: true, value: true } },
            },
        });
        if (!plant) {
            console.info(`Creating new plant: ${latinName}`);
            const newPlant = await prisma.plant.create({ data: { latinName } });
            plant = { id: newPlant.id, traits: [] };
        }
        // If traits don't exist, replace with empty array
        if (!Array.isArray(plant.traits)) plant.traits = [];
        // Upsert traits
        for (const key of ["latinName", "commonName"]) {
            if (row[columnIndex[key]]) {
                try {
                    const updateData = { plantId: plant.id, name: key, value: row[columnIndex[key]] };
                    await prisma.plant_trait.upsert({
                        where: { plant_trait_plantid_name_unique: { plantId: plant.id, name: key } },
                        update: updateData,
                        create: updateData,
                    });
                } catch (error) { console.error(error); }
            }
        }
        // Insert or update SKU data from row
        const sku_data = {
            sku: row[columnIndex.sku] ?? "",
            size: parseFloat((row[columnIndex.size] + "").replace(/\D/g, "")) || undefined, //'#3.5' -> 3.5
            price: parseFloat((row[columnIndex.price] + "").replace(/[^\d.-]/g, "")) || undefined, //'$23.32' -> 23.32
            note: row[columnIndex.note],
            availability: parseInt(row[columnIndex.availability]) || 0,
            plantId: plant.id,
            status: SKU_STATUS.Active,
        };
        if (!sku_data.sku) {
            console.error("⛔️ Cannot update rows without a SKU");
            continue;
        }
        try {
            await prisma.sku.upsert({
                where: { sku: sku_data.sku },
                update: sku_data,
                create: sku_data,
            });
        } catch (error) { console.error(error); }
    }

    console.info("✅ Availability updated!");
}
