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

export interface BusinessHoursStatus {
    isOpen: boolean;
    message: string;
    nextOpenTime?: string;
}

/**
 * Helper function to parse time string to minutes since midnight
 */
const parseTimeToMinutes = (timeStr: string): number | null => {
    const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i);
    if (!timeParts) return null;

    let hours = parseInt(timeParts[1]);
    const minutes = parseInt(timeParts[2]);
    const period = timeParts[3].toUpperCase();

    // Convert to 24-hour format
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
};

/**
 * Helper function to parse day range (e.g., "MON-FRI" returns ["MON", "TUE", "WED", "THU", "FRI"])
 */
const parseDayRange = (dayStr: string): string[] => {
    const dayMap: { [key: string]: number } = {
        SUN: 0,
        MON: 1,
        TUE: 2,
        WED: 3,
        THU: 4,
        FRI: 5,
        SAT: 6,
    };

    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const upperDayStr = dayStr.toUpperCase().trim();

    // Check if it's a range (e.g., "MON-FRI")
    if (upperDayStr.includes("-")) {
        const parts = upperDayStr.split("-").map((p) => p.trim());
        if (
            parts.length === 2 &&
            dayMap[parts[0]] !== undefined &&
            dayMap[parts[1]] !== undefined
        ) {
            const start = dayMap[parts[0]];
            const end = dayMap[parts[1]];
            const result: string[] = [];

            if (start <= end) {
                for (let i = start; i <= end; i++) {
                    result.push(dayNames[i]);
                }
            } else {
                // Wrap around (e.g., SAT-MON)
                for (let i = start; i < 7; i++) {
                    result.push(dayNames[i]);
                }
                for (let i = 0; i <= end; i++) {
                    result.push(dayNames[i]);
                }
            }
            return result;
        }
    }

    // Single day
    if (dayMap[upperDayStr] !== undefined) {
        return [upperDayStr];
    }

    return [];
};

/**
 * Checks if the current time is within business hours
 * Handles ranges like "MON-FRI" and split shifts like "8:00 AM to 12:00 PM and 1:00 PM to 5:00 PM"
 */
export const checkBusinessHoursStatus = (
    hoursMarkdown: string,
    currentDate: Date = new Date(),
): BusinessHoursStatus => {
    try {
        if (!hoursMarkdown) {
            return {
                isOpen: false,
                message: "Business hours unavailable.",
            };
        }

        const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        const currentDay = dayNames[currentDate.getDay()];
        const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

        const lines = hoursMarkdown.split("\n").slice(2);
        let todayHours: string | null = null;
        let nextOpenDay: string | null = null;
        let nextOpenTime: string | null = null;

        // Parse all days and find today's hours
        for (const line of lines) {
            if (line.trim() && line.includes("|")) {
                const parts = line
                    .split("|")
                    .map((part) => part.trim())
                    .filter((part) => part !== "");

                if (parts.length >= 2) {
                    const dayStr = parts[0];
                    const hours = parts[1];

                    // Skip notes
                    if (dayStr.toLowerCase().includes("note")) {
                        continue;
                    }

                    const daysInRange = parseDayRange(dayStr);

                    // Check if today matches this entry
                    if (daysInRange.includes(currentDay)) {
                        todayHours = hours;
                    }
                }
            }
        }

        // Check if we're open today
        if (!todayHours || todayHours.toLowerCase().includes("closed")) {
            // Find next open day
            for (let i = 1; i <= 7; i++) {
                const checkDayIndex = (currentDate.getDay() + i) % 7;
                const checkDay = dayNames[checkDayIndex];

                for (const line of lines) {
                    if (line.trim() && line.includes("|")) {
                        const parts = line
                            .split("|")
                            .map((part) => part.trim())
                            .filter((part) => part !== "");

                        if (parts.length >= 2) {
                            const dayStr = parts[0];
                            const hours = parts[1];

                            if (dayStr.toLowerCase().includes("note")) continue;

                            const daysInRange = parseDayRange(dayStr);

                            if (
                                daysInRange.includes(checkDay) &&
                                !hours.toLowerCase().includes("closed")
                            ) {
                                const timeMatch = hours.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i);
                                if (timeMatch) {
                                    nextOpenDay = checkDay;
                                    nextOpenTime = timeMatch[1].trim();
                                    break;
                                }
                            }
                        }
                    }
                    if (nextOpenDay) break;
                }
                if (nextOpenDay) break;
            }

            const dayLabel =
                nextOpenDay && nextOpenDay === dayNames[(currentDate.getDay() + 1) % 7]
                    ? "tomorrow"
                    : nextOpenDay;

            return {
                isOpen: false,
                message: nextOpenTime
                    ? `We're currently closed. We open ${dayLabel} at ${nextOpenTime}.`
                    : "We're currently closed.",
                nextOpenTime: nextOpenTime || undefined,
            };
        }

        // Parse today's hours - handle "and" for split shifts
        const timeRanges: Array<{ start: number; end: number }> = [];

        // Split by "and" to handle split shifts
        const shifts = todayHours.split(/\s+and\s+/i);

        for (const shift of shifts) {
            // Match pattern like "8:00 AM to 5:00 PM"
            const rangeMatch = shift.match(
                /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\s+(?:to|-)\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i,
            );

            if (rangeMatch) {
                const startMinutes = parseTimeToMinutes(rangeMatch[1]);
                const endMinutes = parseTimeToMinutes(rangeMatch[2]);

                if (startMinutes !== null && endMinutes !== null) {
                    timeRanges.push({ start: startMinutes, end: endMinutes });
                }
            }
        }

        // Check if current time falls within any of the time ranges
        for (const range of timeRanges) {
            if (currentMinutes >= range.start && currentMinutes < range.end) {
                return {
                    isOpen: true,
                    message: "We're open now!",
                };
            }
        }

        // We're outside business hours today - check if we open later today
        let laterToday: string | null = null;
        for (const range of timeRanges) {
            if (currentMinutes < range.start) {
                const hours = Math.floor(range.start / 60);
                const minutes = range.start % 60;
                const period = hours >= 12 ? "PM" : "AM";
                const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
                laterToday = `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
                break;
            }
        }

        if (laterToday) {
            return {
                isOpen: false,
                message: `We're currently closed. We open later today at ${laterToday}.`,
                nextOpenTime: laterToday,
            };
        }

        // Closed for the day - find next open day
        for (let i = 1; i <= 7; i++) {
            const checkDayIndex = (currentDate.getDay() + i) % 7;
            const checkDay = dayNames[checkDayIndex];

            for (const line of lines) {
                if (line.trim() && line.includes("|")) {
                    const parts = line
                        .split("|")
                        .map((part) => part.trim())
                        .filter((part) => part !== "");

                    if (parts.length >= 2) {
                        const dayStr = parts[0];
                        const hours = parts[1];

                        if (dayStr.toLowerCase().includes("note")) continue;

                        const daysInRange = parseDayRange(dayStr);

                        if (
                            daysInRange.includes(checkDay) &&
                            !hours.toLowerCase().includes("closed")
                        ) {
                            const timeMatch = hours.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i);
                            if (timeMatch) {
                                nextOpenDay = checkDay;
                                nextOpenTime = timeMatch[1].trim();
                                break;
                            }
                        }
                    }
                }
                if (nextOpenDay) break;
            }
            if (nextOpenDay) break;
        }

        const dayLabel =
            nextOpenDay && nextOpenDay === dayNames[(currentDate.getDay() + 1) % 7]
                ? "tomorrow"
                : nextOpenDay;

        return {
            isOpen: false,
            message: nextOpenTime
                ? `We're currently closed. We open ${dayLabel} at ${nextOpenTime}.`
                : "We're currently closed.",
            nextOpenTime: nextOpenTime || undefined,
        };
    } catch (error) {
        console.error("Failed to check business hours status", error);
        return {
            isOpen: false,
            message: "Business hours unavailable.",
        };
    }
};
