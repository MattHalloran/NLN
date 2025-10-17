export const parseBusinessHours = (hoursMarkdown: string): string[] => {
    try {
        if (!hoursMarkdown) return [];

        const lines = hoursMarkdown.split("\n").slice(2);
        const hours: string[] = [];

        for (const line of lines) {
            if (line.trim() && line.includes("|")) {
                const parts = line
                    .split("|")
                    .map((part) => part.trim())
                    .filter((part) => part !== "");
                if (parts.length >= 2) {
                    hours.push(`${parts[0]}: ${parts[1]}`);
                }
            }
        }

        return hours;
    } catch (error) {
        console.error("Failed to parse business hours", error);
        return [];
    }
};

export const getShortBusinessHours = (hoursMarkdown: string): string => {
    try {
        if (!hoursMarkdown) return "Contact us for hours";

        const lines = hoursMarkdown.split("\n").slice(2);
        const workingDays: string[] = [];
        const notes: string[] = [];

        for (const line of lines) {
            if (line.trim() && line.includes("|")) {
                const parts = line
                    .split("|")
                    .map((part) => part.trim())
                    .filter((part) => part !== "");
                if (parts.length >= 2) {
                    const day = parts[0];
                    const hours = parts[1];

                    if (day.toLowerCase().includes("note")) {
                        notes.push(hours);
                    } else if (!hours.toLowerCase().includes("closed")) {
                        workingDays.push(`${day} ${hours}`);
                    }
                }
            }
        }

        let result = workingDays.join(" | ");
        if (notes.length > 0) {
            result += ` | ${notes.join(" | ")}`;
        }

        return result || "Contact us for hours";
    } catch (error) {
        console.error("Failed to generate short business hours", error);
        return "Contact us for hours";
    }
};

export const getEarliestOpeningTime = (hoursMarkdown: string): string | null => {
    try {
        if (!hoursMarkdown) return null;

        const lines = hoursMarkdown.split("\n").slice(2);
        let earliestTime: Date | null = null;
        let earliestTimeStr: string | null = null;

        for (const line of lines) {
            if (line.trim() && line.includes("|")) {
                const parts = line
                    .split("|")
                    .map((part) => part.trim())
                    .filter((part) => part !== "");
                if (parts.length >= 2) {
                    const day = parts[0];
                    const hours = parts[1];

                    // Skip notes and closed days
                    if (
                        day.toLowerCase().includes("note") ||
                        hours.toLowerCase().includes("closed")
                    ) {
                        continue;
                    }

                    // Extract opening time (e.g., "8:00 AM" from "8:00 AM to 5:00 PM")
                    const timeMatch = hours.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i);
                    if (timeMatch) {
                        const timeStr = timeMatch[1].trim();
                        // Parse time to compare
                        const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i);
                        if (timeParts) {
                            let hours = parseInt(timeParts[1]);
                            const minutes = parseInt(timeParts[2]);
                            const period = timeParts[3].toUpperCase();

                            // Convert to 24-hour format for comparison
                            if (period === "PM" && hours !== 12) hours += 12;
                            if (period === "AM" && hours === 12) hours = 0;

                            const currentTime = new Date();
                            currentTime.setHours(hours, minutes, 0, 0);

                            if (!earliestTime || currentTime < earliestTime) {
                                earliestTime = currentTime;
                                earliestTimeStr = timeStr;
                            }
                        }
                    }
                }
            }
        }

        return earliestTimeStr;
    } catch (error) {
        console.error("Failed to extract earliest opening time", error);
        return null;
    }
};
