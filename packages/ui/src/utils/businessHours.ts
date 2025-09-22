export const parseBusinessHours = (hoursMarkdown: string): string[] => {
    try {
        if (!hoursMarkdown) return [];
        
        const lines = hoursMarkdown.split("\n").slice(2);
        const hours: string[] = [];
        
        for (const line of lines) {
            if (line.trim() && line.includes("|")) {
                const parts = line.split("|").map(part => part.trim()).filter(part => part !== "");
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
                const parts = line.split("|").map(part => part.trim()).filter(part => part !== "");
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