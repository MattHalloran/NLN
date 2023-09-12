import { SKU_SORT_OPTIONS } from "@local/shared";
import { skusQuery } from "api/query";
import { initializeApollo } from "api/utils/initialize";
import Logo from "assets/img/nln-logo-colorized.png";
import { SnackSeverity } from "components";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Session } from "types";
import { PubSub, showPrice } from "utils";
import { getPlantTrait } from "./plantTools";

const TITLE_FONT_SIZE = 26;
const SUBTITLE_FONT_SIZE = 18;
const TEXT_FONT_SIZE = 12;
const LIST_FONT_SIZE = 12;

const centeredText = (text: string, doc, y) => {
    const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    const textOffset = (doc.internal.pageSize.width - textWidth) / 2;
    doc.text(textOffset, y, text);
};

const leftText = (text: string, doc, y) => {
    const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    const textOffset = 10;
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

export const printAvailability = (
    session: Session | undefined,
    title: string | null | undefined,
    phone: string | null | undefined,
    email: string | null | undefined,
) => {
    const client = initializeApollo();
    client.query({
        query: skusQuery,
        variables: { input: { sortBy: SKU_SORT_OPTIONS.AZ } },
    }).then(response => {
        const data = response.data.skus;
        const priceVisible = false;//session !== null;
        const table_data = skusToTable(data, priceVisible);
        let currentY = 10;
        // Default export is a4 paper, portrait, using millimeters for units
        const doc: any = new jsPDF();
        if (title) {
            const logoWidth = 14;
            const logoHeight = 14;
            const spacing = 0;
            // Calculate title width
            doc.setFontSize(TITLE_FONT_SIZE);
            const titleWidth = doc.getStringUnitWidth(title) * doc.internal.getFontSize() / doc.internal.scaleFactor;
            // Calculate combined width
            const combinedWidth = logoWidth + spacing + titleWidth;
            // Calculate offset to center the combined unit
            const offsetX = (doc.internal.pageSize.width - combinedWidth) / 2;
            // Add logo
            doc.addImage(Logo, "PNG", offsetX, 4, logoWidth, logoHeight);
            // Add title next to the logo
            doc.text(title, offsetX + logoWidth + spacing, 14);
            currentY += 14;
        }
        const date = new Date();
        doc.setFontSize(SUBTITLE_FONT_SIZE);
        centeredText("Availability List", doc, currentY);
        currentY += 10;
        doc.setFontSize(TEXT_FONT_SIZE);
        leftText(date.toDateString(), doc, currentY);
        currentY += 8;
        if (phone) {
            leftText(`Phone: ${phone}`, doc, currentY);
            currentY += 8;
        }
        if (email) {
            leftText(`Email: ${email}`, doc, currentY);
            currentY += 8;
        }
        doc.setFontSize(LIST_FONT_SIZE);
        const header = priceVisible ? [["Plant", "Size", "Availability", "Price"]] : [["Plant", "Size", "Availability"]];
        doc.autoTable({
            margin: { top: currentY },
            head: header,
            body: table_data,
            headStyles: {
                fillColor: [27, 94, 32],
                textColor: [255, 255, 255],
            },
        });
        // Generate a filename based on the current date.
        const filename = `availability-${date.toISOString().split("T")[0]}.pdf`;
        // Convert the PDF to a Blob and then use it to create an Object URL.
        const pdfBlob = new Blob([doc.output("blob")], { type: "application/pdf" });
        const objectURL = window.URL.createObjectURL(pdfBlob);
        // Create an anchor element and set the Object URL as its href.
        const a = document.createElement("a");
        a.href = objectURL;
        a.download = filename;  // Set the desired filename here.
        // Programmatically "click" the anchor element to start the download.
        a.click();
        // Clean up: Revoke the Object URL to free up resources.
        window.URL.revokeObjectURL(objectURL);
        //// Open in new tab
        //doc.output("dataurlnewwindow");
    }).catch(error => {
        PubSub.get().publishSnack({ message: "Failed to load inventory.", severity: SnackSeverity.Error, data: error });
    });
};
