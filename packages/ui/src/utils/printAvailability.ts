import { SKU_SORT_OPTIONS } from "@local/shared";
import { skusQuery } from "api/query";
import { initializeApollo } from "api/utils/initialize";
import { SnackSeverity } from "components";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Session } from "types";
import { PubSub, showPrice } from "utils";
import { getPlantTrait } from "./plantTools";

const TITLE_FONT_SIZE = 30;
const LIST_FONT_SIZE = 24;

const centeredText = (text: string, doc, y) => {
    const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    const textOffset = (doc.internal.pageSize.width - textWidth) / 2;
    doc.text(textOffset, y, text);
};

const skusToTable = (skus, priceVisible: boolean) => {
    return skus.map(sku => {
        const displayName = sku.plant?.latinName ?? getPlantTrait("commonName", sku.plant) ?? sku.sku;
        const size = isNaN(sku.size) ? sku.size : `#${sku.size}`;
        const availability = sku.availability ?? "N/A";
        const price = showPrice(sku.price);
        if (priceVisible) return [displayName, size, availability, price];
        return [displayName, size, availability];
    });
};

export const printAvailability = (session: Session, title: string | null) => {
    const client = initializeApollo();
    client.query({
        query: skusQuery,
        variables: { input: { sortBy: SKU_SORT_OPTIONS.AZ } },
    }).then(response => {
        const data = response.data.skus;
        const priceVisible = false;//session !== null;
        const table_data = skusToTable(data, priceVisible);
        // Default export is a4 paper, portrait, using millimeters for units
        const doc: any = new jsPDF();
        if (title) {
            doc.setFontSize(TITLE_FONT_SIZE);
            centeredText(title, doc, 10);
        }
        const date = new Date();
        centeredText(`Availability: ${date.toDateString()}`, doc, 20);
        doc.setFontSize(LIST_FONT_SIZE);
        const header = priceVisible ? [["Plant", "Size", "Availability", "Price"]] : [["Plant", "Size", "Availability"]];
        doc.autoTable({
            margin: { top: 30 },
            head: header,
            body: table_data,
        });
        // Open in new tab
        doc.output("dataurlnewwindow");
        // let windowReference = window.open();
        // let blob = doc.output('blob', { filename: `availability_${date.getDay()}-${date.getMonth()}-${date.getFullYear()}.pdf` });
        // (windowReference as any).location = URL.createObjectURL(blob);
    }).catch(error => {
        PubSub.get().publishSnack({ message: "Failed to load inventory.", severity: SnackSeverity.Error, data: error });
    });
};
