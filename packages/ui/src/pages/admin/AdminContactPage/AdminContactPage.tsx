import { APP_LINKS } from "@local/shared";
import {
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    FormControlLabel,
    Grid,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Select,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useTheme,
    Divider,
    Alert,
} from "@mui/material";
import { AccessTime, Business, Delete, Schedule, Add } from "@mui/icons-material";
import { useLandingPage } from "hooks/useLandingPage";
import { useABTestQueryParams } from "hooks/useABTestQueryParams";
import { handleError } from "utils/errorLogger";
import { useUpdateContactInfo } from "api/rest/hooks";
import { BackButton, PageContainer } from "components";
import { ABTestEditingBanner } from "components/admin/ABTestEditingBanner";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { CancelIcon, SaveIcon } from "icons";
import { useEffect, useState } from "react";
import { PubSub } from "utils/pubsub";
import { SnackSeverity } from "components/dialogs/Snack/Snack";

const helpText = `This page allows you to edit the contact info and business hours displayed on the site. 

Simply fill in the form fields below - no technical knowledge required!

NOTE: This will not update Google My Business information. You must do that manually by logging into your Google My Business account.`;

interface DayHours {
    day: string;
    enabled: boolean;
    openTime: string;
    closeTime: string;
    closed: boolean;
    isSplitShift: boolean;
    splitShiftHours: string; // Full text like "8:00 AM to 12:00 PM, 1:00 PM to 3:00 PM"
}

interface BusinessNote {
    id: string;
    text: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_OPTIONS = [
    "6:00 AM",
    "6:30 AM",
    "7:00 AM",
    "7:30 AM",
    "8:00 AM",
    "8:30 AM",
    "9:00 AM",
    "9:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "12:00 PM",
    "12:30 PM",
    "1:00 PM",
    "1:30 PM",
    "2:00 PM",
    "2:30 PM",
    "3:00 PM",
    "3:30 PM",
    "4:00 PM",
    "4:30 PM",
    "5:00 PM",
    "5:30 PM",
    "6:00 PM",
    "6:30 PM",
    "7:00 PM",
    "7:30 PM",
    "8:00 PM",
    "8:30 PM",
    "9:00 PM",
    "9:30 PM",
    "10:00 PM",
];

export const AdminContactPage = () => {
    const { palette } = useTheme();
    const { variantId: queryVariantId } = useABTestQueryParams();
    const { data: landingPageData, refetch } = useLandingPage(); // Get all data, not just active
    const { mutate: updateContactInfo, loading: updateLoading } = useUpdateContactInfo();

    // Use variantId from URL query params, or fall back to the loaded data's variant
    const variantId = queryVariantId || landingPageData?._meta?.variantId;

    const [dayHours, setDayHours] = useState<DayHours[]>([]);
    const [showAdvancedMode, setShowAdvancedMode] = useState(false);
    const [markdownHours, setMarkdownHours] = useState("");
    const [businessNotes, setBusinessNotes] = useState<BusinessNote[]>([]);
    const [useRangeGrouping, setUseRangeGrouping] = useState(true);

    // Parse existing hours from markdown on load
    useEffect(() => {
        if (!landingPageData?.contact?.hours) {
            // Initialize with default hours
            const defaultHours = DAYS_OF_WEEK.map((day) => ({
                day,
                enabled: day !== "Sunday",
                openTime: "8:00 AM",
                closeTime: "5:00 PM",
                closed: false,
                isSplitShift: false,
                splitShiftHours: "",
            }));
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDayHours(defaultHours);
            return;
        }

        setMarkdownHours(landingPageData.contact.hours);

        // Parse markdown table into structured data
        try {
            const lines = landingPageData.contact.hours
                .split("\n")
                .filter((line) => line.trim());
            const parsedHours: DayHours[] = [];
            const parsedNotes: BusinessNote[] = [];

            for (const line of lines) {
                if (line.includes("|") && !line.includes("---")) {
                    const parts = line
                        .split("|")
                        .map((p) => p.trim())
                        .filter((p) => p);
                    if (parts.length >= 2) {
                        const day = parts[0];
                        const hours = parts[1];

                        // Skip header row
                        if (day.toLowerCase() === "day" && hours.toLowerCase() === "hours") {
                            continue;
                        }

                        // Check if this is a range (e.g., "MON-FRI")
                        if (day.includes("-") && !DAYS_OF_WEEK.includes(day)) {
                            const rangeParts = day.split("-");
                            if (rangeParts.length === 2) {
                                const startDay = rangeParts[0].trim();
                                const endDay = rangeParts[1].trim();

                                // Find the day range
                                const startIndex = DAYS_OF_WEEK.findIndex((d) =>
                                    d.toUpperCase().startsWith(startDay.toUpperCase()),
                                );
                                const endIndex = DAYS_OF_WEEK.findIndex((d) =>
                                    d.toUpperCase().startsWith(endDay.toUpperCase()),
                                );

                                if (startIndex !== -1 && endIndex !== -1) {
                                    for (let i = startIndex; i <= endIndex; i++) {
                                        if (hours.toLowerCase() === "closed") {
                                            parsedHours.push({
                                                day: DAYS_OF_WEEK[i],
                                                enabled: true,
                                                openTime: "8:00 AM",
                                                closeTime: "5:00 PM",
                                                closed: true,
                                                isSplitShift: false,
                                                splitShiftHours: "",
                                            });
                                        } else if (hours.includes(",")) {
                                            // Split shift detected (e.g., "8:00 AM to 12:00 PM, 1:00 PM to 3:00 PM")
                                            parsedHours.push({
                                                day: DAYS_OF_WEEK[i],
                                                enabled: true,
                                                openTime: "8:00 AM",
                                                closeTime: "5:00 PM",
                                                closed: false,
                                                isSplitShift: true,
                                                splitShiftHours: hours.trim(),
                                            });
                                        } else {
                                            const timeParts = hours.split(" to ");
                                            if (timeParts.length === 2) {
                                                parsedHours.push({
                                                    day: DAYS_OF_WEEK[i],
                                                    enabled: true,
                                                    openTime: timeParts[0].trim(),
                                                    closeTime: timeParts[1].trim(),
                                                    closed: false,
                                                    isSplitShift: false,
                                                    splitShiftHours: "",
                                                });
                                            } else {
                                                const dashParts = hours.split(" - ");
                                                if (dashParts.length === 2) {
                                                    parsedHours.push({
                                                        day: DAYS_OF_WEEK[i],
                                                        enabled: true,
                                                        openTime: dashParts[0].trim(),
                                                        closeTime: dashParts[1].trim(),
                                                        closed: false,
                                                        isSplitShift: false,
                                                        splitShiftHours: "",
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (DAYS_OF_WEEK.includes(day)) {
                            if (hours.toLowerCase() === "closed") {
                                parsedHours.push({
                                    day,
                                    enabled: true,
                                    openTime: "8:00 AM",
                                    closeTime: "5:00 PM",
                                    closed: true,
                                    isSplitShift: false,
                                    splitShiftHours: "",
                                });
                            } else if (hours.includes(",")) {
                                // Split shift detected (e.g., "8:00 AM to 12:00 PM, 1:00 PM to 3:00 PM")
                                parsedHours.push({
                                    day,
                                    enabled: true,
                                    openTime: "8:00 AM",
                                    closeTime: "5:00 PM",
                                    closed: false,
                                    isSplitShift: true,
                                    splitShiftHours: hours.trim(),
                                });
                            } else {
                                const timeParts = hours.split(" to ");
                                if (timeParts.length === 2) {
                                    parsedHours.push({
                                        day,
                                        enabled: true,
                                        openTime: timeParts[0].trim(),
                                        closeTime: timeParts[1].trim(),
                                        closed: false,
                                        isSplitShift: false,
                                        splitShiftHours: "",
                                    });
                                } else {
                                    const dashParts = hours.split(" - ");
                                    if (dashParts.length === 2) {
                                        parsedHours.push({
                                            day,
                                            enabled: true,
                                            openTime: dashParts[0].trim(),
                                            closeTime: dashParts[1].trim(),
                                            closed: false,
                                            isSplitShift: false,
                                            splitShiftHours: "",
                                        });
                                    }
                                }
                            }
                        } else {
                            // This is likely a note (e.g., "Note", "Special")
                            parsedNotes.push({
                                id: Date.now().toString() + Math.random(),
                                text: hours,
                            });
                        }
                    }
                }
            }

            setBusinessNotes(parsedNotes);

            // Fill in any missing days
            const finalHours = DAYS_OF_WEEK.map((day) => {
                const existing = parsedHours.find((h) => h.day === day);
                return (
                    existing || {
                        day,
                        enabled: false,
                        openTime: "8:00 AM",
                        closeTime: "5:00 PM",
                        closed: false,
                        isSplitShift: false,
                        splitShiftHours: "",
                    }
                );
            });

            setDayHours(finalHours);
        } catch (error) {
            handleError(error, "AdminContactPage", "parseHours");
            // Fallback to default hours
            const defaultHours = DAYS_OF_WEEK.map((day) => ({
                day,
                enabled: false,
                openTime: "8:00 AM",
                closeTime: "5:00 PM",
                closed: false,
                isSplitShift: false,
                splitShiftHours: "",
            }));
            setDayHours(defaultHours);
        }
    }, [landingPageData?.contact?.hours]);

    const updateDayHours = (index: number, field: keyof DayHours, value: any) => {
        const newHours = [...dayHours];
        newHours[index] = { ...newHours[index], [field]: value };
        setDayHours(newHours);
    };

    const applyAllDays = () => {
        const mondayHours = dayHours[0];
        const newHours = dayHours.map((h) => ({
            ...h,
            enabled: true,
            openTime: mondayHours.openTime,
            closeTime: mondayHours.closeTime,
            closed: mondayHours.closed,
            isSplitShift: mondayHours.isSplitShift,
            splitShiftHours: mondayHours.splitShiftHours,
        }));
        setDayHours(newHours);
    };

    const groupConsecutiveDays = (hours: DayHours[]) => {
        const enabledHours = hours.filter((h) => h.enabled);
        const groups: Array<{
            days: string[];
            openTime: string;
            closeTime: string;
            closed: boolean;
            isSplitShift: boolean;
            splitShiftHours: string;
        }> = [];

        let currentGroup: DayHours[] = [];

        for (const hour of enabledHours) {
            if (currentGroup.length === 0) {
                currentGroup = [hour];
            } else {
                const lastHour = currentGroup[currentGroup.length - 1];
                // Check if this hour has the same schedule as the last one
                const sameSchedule =
                    hour.openTime === lastHour.openTime &&
                    hour.closeTime === lastHour.closeTime &&
                    hour.closed === lastHour.closed &&
                    hour.isSplitShift === lastHour.isSplitShift &&
                    hour.splitShiftHours === lastHour.splitShiftHours;

                // Check if this day is consecutive to the last day
                const lastDayIndex = DAYS_OF_WEEK.indexOf(lastHour.day);
                const currentDayIndex = DAYS_OF_WEEK.indexOf(hour.day);
                const isConsecutive = currentDayIndex === lastDayIndex + 1;

                if (sameSchedule && isConsecutive) {
                    currentGroup.push(hour);
                } else {
                    // Close current group and start new one
                    groups.push({
                        days: currentGroup.map((h) => h.day),
                        openTime: currentGroup[0].openTime,
                        closeTime: currentGroup[0].closeTime,
                        closed: currentGroup[0].closed,
                        isSplitShift: currentGroup[0].isSplitShift,
                        splitShiftHours: currentGroup[0].splitShiftHours,
                    });
                    currentGroup = [hour];
                }
            }
        }

        // Don't forget the last group
        if (currentGroup.length > 0) {
            groups.push({
                days: currentGroup.map((h) => h.day),
                openTime: currentGroup[0].openTime,
                closeTime: currentGroup[0].closeTime,
                closed: currentGroup[0].closed,
                isSplitShift: currentGroup[0].isSplitShift,
                splitShiftHours: currentGroup[0].splitShiftHours,
            });
        }

        return groups;
    };

    const formatDayRange = (days: string[]) => {
        if (days.length === 1) {
            return days[0].toUpperCase().substring(0, 3);
        } else if (days.length === 2) {
            return `${days[0].toUpperCase().substring(0, 3)}-${days[1].toUpperCase().substring(0, 3)}`;
        } else {
            return `${days[0].toUpperCase().substring(0, 3)}-${days[days.length - 1].toUpperCase().substring(0, 3)}`;
        }
    };

    const generateMarkdown = () => {
        let markdown = "| Day           | Hours |\n";
        markdown += "| ------------- |:-------------:         |\n";

        if (useRangeGrouping) {
            const groups = groupConsecutiveDays(dayHours);

            for (const group of groups) {
                const dayRange = formatDayRange(group.days);
                if (group.closed) {
                    markdown += `| ${dayRange}     | CLOSED    |\n`;
                } else if (group.isSplitShift) {
                    markdown += `| ${dayRange}      | ${group.splitShiftHours}     |\n`;
                } else {
                    markdown += `| ${dayRange}      | ${group.openTime} to ${group.closeTime}     |\n`;
                }
            }
        } else {
            for (const hours of dayHours) {
                if (hours.enabled) {
                    if (hours.closed) {
                        markdown += `| ${hours.day} | CLOSED |\n`;
                    } else if (hours.isSplitShift) {
                        markdown += `| ${hours.day} | ${hours.splitShiftHours} |\n`;
                    } else {
                        markdown += `| ${hours.day} | ${hours.openTime} to ${hours.closeTime} |\n`;
                    }
                }
            }
        }

        // Add notes
        for (const note of businessNotes) {
            markdown += `| Note          | ${note.text}    |\n`;
        }

        return markdown;
    };

    const addNote = () => {
        const newNote: BusinessNote = {
            id: Date.now().toString() + Math.random(),
            text: "",
        };
        setBusinessNotes([...businessNotes, newNote]);
    };

    const updateNote = (id: string, text: string) => {
        setBusinessNotes(businessNotes.map((note) => (note.id === id ? { ...note, text } : note)));
    };

    const removeNote = (id: string) => {
        setBusinessNotes(businessNotes.filter((note) => note.id !== id));
    };

    const applyHours = async () => {
        try {
            const markdown = showAdvancedMode ? markdownHours : generateMarkdown();

            await updateContactInfo({
                data: { hours: markdown },
                queryParams: variantId ? { variantId } : undefined,
            });

            // Refetch data FIRST to ensure UI is updated
            await refetch();

            // THEN show success message
            PubSub.get().publishSnack({
                message: "Contact information updated successfully!",
                severity: SnackSeverity.Success,
            });
        } catch (error) {
            handleError(error, "AdminContactPage", "updateContactInfo");
            PubSub.get().publishSnack({
                message: "Failed to update contact information.",
                severity: SnackSeverity.Error,
            });
        }
    };

    const revertHours = () => {
        if (landingPageData?.contact?.hours) {
            // Re-parse from original business hours using the same logic as useEffect
            const lines = landingPageData.contact.hours
                .split("\n")
                .filter((line) => line.trim());
            const parsedHours: DayHours[] = [];
            const parsedNotes: BusinessNote[] = [];

            for (const line of lines) {
                if (line.includes("|") && !line.includes("---")) {
                    const parts = line
                        .split("|")
                        .map((p) => p.trim())
                        .filter((p) => p);
                    if (parts.length >= 2) {
                        const day = parts[0];
                        const hours = parts[1];

                        // Skip header row
                        if (day.toLowerCase() === "day" && hours.toLowerCase() === "hours") {
                            continue;
                        }

                        // Check if this is a range (e.g., "MON-FRI")
                        if (day.includes("-") && !DAYS_OF_WEEK.includes(day)) {
                            const rangeParts = day.split("-");
                            if (rangeParts.length === 2) {
                                const startDay = rangeParts[0].trim();
                                const endDay = rangeParts[1].trim();

                                // Find the day range
                                const startIndex = DAYS_OF_WEEK.findIndex((d) =>
                                    d.toUpperCase().startsWith(startDay.toUpperCase()),
                                );
                                const endIndex = DAYS_OF_WEEK.findIndex((d) =>
                                    d.toUpperCase().startsWith(endDay.toUpperCase()),
                                );

                                if (startIndex !== -1 && endIndex !== -1) {
                                    for (let i = startIndex; i <= endIndex; i++) {
                                        if (hours.toLowerCase() === "closed") {
                                            parsedHours.push({
                                                day: DAYS_OF_WEEK[i],
                                                enabled: true,
                                                openTime: "8:00 AM",
                                                closeTime: "5:00 PM",
                                                closed: true,
                                                isSplitShift: false,
                                                splitShiftHours: "",
                                            });
                                        } else if (hours.includes(",")) {
                                            // Split shift detected (e.g., "8:00 AM to 12:00 PM, 1:00 PM to 3:00 PM")
                                            parsedHours.push({
                                                day: DAYS_OF_WEEK[i],
                                                enabled: true,
                                                openTime: "8:00 AM",
                                                closeTime: "5:00 PM",
                                                closed: false,
                                                isSplitShift: true,
                                                splitShiftHours: hours.trim(),
                                            });
                                        } else {
                                            const timeParts = hours.split(" to ");
                                            if (timeParts.length === 2) {
                                                parsedHours.push({
                                                    day: DAYS_OF_WEEK[i],
                                                    enabled: true,
                                                    openTime: timeParts[0].trim(),
                                                    closeTime: timeParts[1].trim(),
                                                    closed: false,
                                                    isSplitShift: false,
                                                    splitShiftHours: "",
                                                });
                                            } else {
                                                const dashParts = hours.split(" - ");
                                                if (dashParts.length === 2) {
                                                    parsedHours.push({
                                                        day: DAYS_OF_WEEK[i],
                                                        enabled: true,
                                                        openTime: dashParts[0].trim(),
                                                        closeTime: dashParts[1].trim(),
                                                        closed: false,
                                                        isSplitShift: false,
                                                        splitShiftHours: "",
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (DAYS_OF_WEEK.includes(day)) {
                            if (hours.toLowerCase() === "closed") {
                                parsedHours.push({
                                    day,
                                    enabled: true,
                                    openTime: "8:00 AM",
                                    closeTime: "5:00 PM",
                                    closed: true,
                                    isSplitShift: false,
                                    splitShiftHours: "",
                                });
                            } else if (hours.includes(",")) {
                                // Split shift detected (e.g., "8:00 AM to 12:00 PM, 1:00 PM to 3:00 PM")
                                parsedHours.push({
                                    day,
                                    enabled: true,
                                    openTime: "8:00 AM",
                                    closeTime: "5:00 PM",
                                    closed: false,
                                    isSplitShift: true,
                                    splitShiftHours: hours.trim(),
                                });
                            } else {
                                const timeParts = hours.split(" to ");
                                if (timeParts.length === 2) {
                                    parsedHours.push({
                                        day,
                                        enabled: true,
                                        openTime: timeParts[0].trim(),
                                        closeTime: timeParts[1].trim(),
                                        closed: false,
                                        isSplitShift: false,
                                        splitShiftHours: "",
                                    });
                                } else {
                                    const dashParts = hours.split(" - ");
                                    if (dashParts.length === 2) {
                                        parsedHours.push({
                                            day,
                                            enabled: true,
                                            openTime: dashParts[0].trim(),
                                            closeTime: dashParts[1].trim(),
                                            closed: false,
                                            isSplitShift: false,
                                            splitShiftHours: "",
                                        });
                                    }
                                }
                            }
                        } else {
                            // This is likely a note (e.g., "Note", "Special")
                            parsedNotes.push({
                                id: Date.now().toString() + Math.random(),
                                text: hours,
                            });
                        }
                    }
                }
            }

            const finalHours = DAYS_OF_WEEK.map((day) => {
                const existing = parsedHours.find((h) => h.day === day);
                return (
                    existing || {
                        day,
                        enabled: false,
                        openTime: "8:00 AM",
                        closeTime: "5:00 PM",
                        closed: false,
                        isSplitShift: false,
                        splitShiftHours: "",
                    }
                );
            });

            setDayHours(finalHours);
            setBusinessNotes(parsedNotes);
            setMarkdownHours(landingPageData.contact.hours);
        }
    };

    return (
        <PageContainer variant="wide" sx={{ minHeight: "100vh" }}>
            <TopBar
                display="page"
                help={helpText}
                title="Contact Information"
                startComponent={<BackButton to={APP_LINKS.Admin} ariaLabel="Back to Admin Dashboard" />}
            />

            <Box sx={{ p: 3 }}>
                <ABTestEditingBanner />

                {/* Header with mode toggle */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5" fontWeight="600" color="text.primary">
                        Business Hours Management
                    </Typography>
                    <Box display="flex" gap={2} alignItems="center">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={useRangeGrouping}
                                    onChange={(e) => setUseRangeGrouping(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Group Ranges (MON-FRI)"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={showAdvancedMode}
                                    onChange={(e) => setShowAdvancedMode(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Advanced Mode (Markdown)"
                        />
                    </Box>
                </Box>

                {!showAdvancedMode ? (
                    <Grid container spacing={3}>
                        {/* Visual Hours Editor */}
                        <Grid item xs={12} lg={7}>
                            <Card
                                sx={{
                                    bgcolor: palette.background.paper,
                                    border: `1px solid ${palette.divider}`,
                                    borderRadius: 1,
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Box
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        mb={3}
                                    >
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Schedule sx={{ color: palette.primary.main }} />
                                            <Typography variant="h6" fontWeight="600">
                                                Set Business Hours
                                            </Typography>
                                        </Box>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={applyAllDays}
                                            startIcon={<Business />}
                                            sx={{ borderRadius: 1 }}
                                            data-testid="apply-monday-to-all"
                                        >
                                            Apply Monday to All Days
                                        </Button>
                                    </Box>

                                    <Divider sx={{ mb: 3 }} />

                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                        {dayHours.map((hours, index) => (
                                            <Paper
                                                key={hours.day}
                                                elevation={0}
                                                sx={{
                                                    p: 2,
                                                    border: `1px solid ${palette.divider}`,
                                                    borderRadius: 1,
                                                    bgcolor: hours.enabled
                                                        ? palette.background.paper
                                                        : palette.action.disabledBackground,
                                                }}
                                            >
                                                <Grid container spacing={2} alignItems="center">
                                                    <Grid item xs={12} sm={3}>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    checked={hours.enabled}
                                                                    onChange={(e) =>
                                                                        updateDayHours(
                                                                            index,
                                                                            "enabled",
                                                                            e.target.checked,
                                                                        )
                                                                    }
                                                                    color="primary"
                                                                    data-testid={`day-enabled-${hours.day.toLowerCase()}`}
                                                                />
                                                            }
                                                            label={
                                                                <Typography
                                                                    fontWeight={
                                                                        hours.day === "Saturday" ||
                                                                        hours.day === "Sunday"
                                                                            ? 500
                                                                            : 600
                                                                    }
                                                                >
                                                                    {hours.day}
                                                                </Typography>
                                                            }
                                                        />
                                                    </Grid>

                                                    {hours.enabled && (
                                                        <>
                                                            <Grid item xs={12} sm={3}>
                                                                <FormControlLabel
                                                                    control={
                                                                        <Checkbox
                                                                            checked={hours.closed}
                                                                            onChange={(e) =>
                                                                                updateDayHours(
                                                                                    index,
                                                                                    "closed",
                                                                                    e.target
                                                                                        .checked,
                                                                                )
                                                                            }
                                                                            color="error"
                                                                            data-testid={`day-closed-${hours.day.toLowerCase()}`}
                                                                        />
                                                                    }
                                                                    label="Closed"
                                                                />
                                                            </Grid>

                                                            {!hours.closed && (
                                                                <>
                                                                    <Grid item xs={12} sm={2}>
                                                                        <FormControlLabel
                                                                            control={
                                                                                <Checkbox
                                                                                    checked={
                                                                                        hours.isSplitShift
                                                                                    }
                                                                                    onChange={(e) => {
                                                                                        const isChecked =
                                                                                            e.target
                                                                                                .checked;
                                                                                        const newHours = [
                                                                                            ...dayHours,
                                                                                        ];
                                                                                        newHours[index] = {
                                                                                            ...newHours[
                                                                                                index
                                                                                            ],
                                                                                            isSplitShift:
                                                                                                isChecked,
                                                                                            splitShiftHours:
                                                                                                isChecked
                                                                                                    ? `${hours.openTime} to 12:00 PM, 1:00 PM to ${hours.closeTime}`
                                                                                                    : "",
                                                                                        };
                                                                                        setDayHours(
                                                                                            newHours,
                                                                                        );
                                                                                    }}
                                                                                    color="primary"
                                                                                    data-testid={`day-split-${hours.day.toLowerCase()}`}
                                                                                />
                                                                            }
                                                                            label="Split"
                                                                            sx={{
                                                                                fontSize: 14,
                                                                            }}
                                                                        />
                                                                    </Grid>
                                                                    {hours.isSplitShift ? (
                                                                        <Grid
                                                                            item
                                                                            xs={12}
                                                                            sm={7}
                                                                        >
                                                                            <TextField
                                                                                fullWidth
                                                                                value={
                                                                                    hours.splitShiftHours
                                                                                }
                                                                                onChange={(e) =>
                                                                                    updateDayHours(
                                                                                        index,
                                                                                        "splitShiftHours",
                                                                                        e.target
                                                                                            .value,
                                                                                    )
                                                                                }
                                                                                placeholder="8:00 AM to 12:00 PM, 1:00 PM to 5:00 PM"
                                                                                size="small"
                                                                                data-testid={`split-shift-hours-${hours.day.toLowerCase()}`}
                                                                            />
                                                                        </Grid>
                                                                    ) : (
                                                                        <>
                                                                            <Grid
                                                                                item
                                                                                xs={12}
                                                                                sm={3.5}
                                                                            >
                                                                                <Select
                                                                                    fullWidth
                                                                                    value={
                                                                                        hours.openTime
                                                                                    }
                                                                                    onChange={(e) =>
                                                                                        updateDayHours(
                                                                                            index,
                                                                                            "openTime",
                                                                                            e.target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                    size="small"
                                                                                    data-testid={`open-time-${hours.day.toLowerCase()}`}
                                                                                    startAdornment={
                                                                                        <InputAdornment position="start">
                                                                                            <AccessTime
                                                                                                sx={{
                                                                                                    fontSize: 18,
                                                                                                }}
                                                                                            />
                                                                                        </InputAdornment>
                                                                                    }
                                                                                >
                                                                                    {TIME_OPTIONS.map(
                                                                                        (
                                                                                            time,
                                                                                        ) => (
                                                                                            <MenuItem
                                                                                                key={
                                                                                                    time
                                                                                                }
                                                                                                value={
                                                                                                    time
                                                                                                }
                                                                                            >
                                                                                                {
                                                                                                    time
                                                                                                }
                                                                                            </MenuItem>
                                                                                        ),
                                                                                    )}
                                                                                </Select>
                                                                            </Grid>

                                                                            <Grid
                                                                                item
                                                                                xs={12}
                                                                                sm={3.5}
                                                                            >
                                                                                <Select
                                                                                    fullWidth
                                                                                    value={
                                                                                        hours.closeTime
                                                                                    }
                                                                                    onChange={(e) =>
                                                                                        updateDayHours(
                                                                                            index,
                                                                                            "closeTime",
                                                                                            e.target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                    size="small"
                                                                                    data-testid={`close-time-${hours.day.toLowerCase()}`}
                                                                                    startAdornment={
                                                                                        <InputAdornment position="start">
                                                                                            <AccessTime
                                                                                                sx={{
                                                                                                    fontSize: 18,
                                                                                                }}
                                                                                            />
                                                                                        </InputAdornment>
                                                                                    }
                                                                                >
                                                                                    {TIME_OPTIONS.map(
                                                                                        (
                                                                                            time,
                                                                                        ) => (
                                                                                            <MenuItem
                                                                                                key={
                                                                                                    time
                                                                                                }
                                                                                                value={
                                                                                                    time
                                                                                                }
                                                                                            >
                                                                                                {
                                                                                                    time
                                                                                                }
                                                                                            </MenuItem>
                                                                                        ),
                                                                                    )}
                                                                                </Select>
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </Grid>
                                            </Paper>
                                        ))}
                                    </Box>

                                    {/* Notes Section */}
                                    <Divider sx={{ my: 3 }} />

                                    <Box
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        mb={2}
                                    >
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Schedule sx={{ color: palette.primary.main }} />
                                            <Typography variant="h6" fontWeight="600">
                                                Special Notes
                                            </Typography>
                                        </Box>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={addNote}
                                            startIcon={<Add />}
                                            sx={{ borderRadius: 1 }}
                                            data-testid="add-note-button"
                                        >
                                            Add Note
                                        </Button>
                                    </Box>

                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                        {businessNotes.map((note, index) => (
                                            <Paper
                                                key={note.id}
                                                elevation={0}
                                                sx={{
                                                    p: 2,
                                                    border: `1px solid ${palette.divider}`,
                                                    borderRadius: 1,
                                                    bgcolor: palette.background.paper,
                                                }}
                                            >
                                                <Grid container spacing={2} alignItems="center">
                                                    <Grid item xs={10}>
                                                        <TextField
                                                            fullWidth
                                                            value={note.text}
                                                            onChange={(e) =>
                                                                updateNote(note.id, e.target.value)
                                                            }
                                                            placeholder="Enter a note (e.g., 'Closed daily from 12:00 pm to 1:00 pm')"
                                                            variant="outlined"
                                                            size="small"
                                                            data-testid={`note-input-${index}`}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={2}>
                                                        <IconButton
                                                            onClick={() => removeNote(note.id)}
                                                            color="error"
                                                            size="small"
                                                            data-testid={`remove-note-${index}`}
                                                        >
                                                            <Delete />
                                                        </IconButton>
                                                    </Grid>
                                                </Grid>
                                            </Paper>
                                        ))}
                                        {businessNotes.length === 0 && (
                                            <Typography
                                                color="text.secondary"
                                                textAlign="center"
                                                py={2}
                                            >
                                                No special notes. Click "Add Note" to add
                                                information like lunch breaks or special hours.
                                            </Typography>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Preview Section */}
                        <Grid item xs={12} lg={5}>
                            <Card
                                sx={{
                                    bgcolor: palette.background.paper,
                                    border: `1px solid ${palette.divider}`,
                                    borderRadius: 1,
                                    position: "sticky",
                                    top: 20,
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Box display="flex" alignItems="center" gap={1} mb={3}>
                                        <Schedule sx={{ color: palette.primary.main }} />
                                        <Typography variant="h6" fontWeight="600">
                                            Preview
                                        </Typography>
                                    </Box>

                                    <Alert severity="info" sx={{ mb: 3 }}>
                                        This is how your business hours will appear on the website.
                                        Use "Group Ranges" to automatically combine consecutive days
                                        with identical hours (e.g., MON-FRI).
                                    </Alert>

                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: palette.primary.main }}>
                                                    <TableCell
                                                        sx={{
                                                            color: palette.primary.contrastText,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        Day
                                                    </TableCell>
                                                    <TableCell
                                                        sx={{
                                                            color: palette.primary.contrastText,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        Hours
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {useRangeGrouping ? (
                                                    <>
                                                        {groupConsecutiveDays(dayHours).map(
                                                            (group, index) => (
                                                                <TableRow key={index}>
                                                                    <TableCell>
                                                                        {formatDayRange(group.days)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {group.closed ? (
                                                                            <Typography
                                                                                color="error"
                                                                                fontWeight={500}
                                                                            >
                                                                                CLOSED
                                                                            </Typography>
                                                                        ) : group.isSplitShift ? (
                                                                            group.splitShiftHours
                                                                        ) : (
                                                                            `${group.openTime} to ${group.closeTime}`
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ),
                                                        )}
                                                        {businessNotes.map((note) => (
                                                            <TableRow key={note.id}>
                                                                <TableCell>Note</TableCell>
                                                                <TableCell>{note.text}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {groupConsecutiveDays(dayHours).length ===
                                                            0 &&
                                                            businessNotes.length === 0 && (
                                                                <TableRow>
                                                                    <TableCell
                                                                        colSpan={2}
                                                                        align="center"
                                                                    >
                                                                        <Typography color="text.secondary">
                                                                            No hours set. Please
                                                                            select days to display.
                                                                        </Typography>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {dayHours
                                                            .filter((h) => h.enabled)
                                                            .map((hours) => (
                                                                <TableRow key={hours.day}>
                                                                    <TableCell>
                                                                        {hours.day}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {hours.closed ? (
                                                                            <Typography
                                                                                color="error"
                                                                                fontWeight={500}
                                                                            >
                                                                                CLOSED
                                                                            </Typography>
                                                                        ) : hours.isSplitShift ? (
                                                                            hours.splitShiftHours
                                                                        ) : (
                                                                            `${hours.openTime} to ${hours.closeTime}`
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        {businessNotes.map((note) => (
                                                            <TableRow key={note.id}>
                                                                <TableCell>Note</TableCell>
                                                                <TableCell>{note.text}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {dayHours.filter((h) => h.enabled)
                                                            .length === 0 &&
                                                            businessNotes.length === 0 && (
                                                                <TableRow>
                                                                    <TableCell
                                                                        colSpan={2}
                                                                        align="center"
                                                                    >
                                                                        <Typography color="text.secondary">
                                                                            No hours set. Please
                                                                            select days to display.
                                                                        </Typography>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                    </>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                ) : (
                    /* Advanced Mode - Markdown Editor */
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Card
                                sx={{
                                    bgcolor: palette.background.paper,
                                    border: `1px solid ${palette.divider}`,
                                    borderRadius: 1,
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" fontWeight="600" mb={2}>
                                        Markdown Editor
                                    </Typography>
                                    <Alert severity="warning" sx={{ mb: 2 }}>
                                        Advanced mode: Edit the raw markdown directly. Use the
                                        format:
                                        <br />
                                        <code>| Day | Hours |</code>
                                        <br />
                                        <code>|-----|-------|</code>
                                        <br />
                                        <code>| Monday | 8:00 AM - 5:00 PM |</code>
                                    </Alert>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={15}
                                        value={markdownHours}
                                        onChange={(e) => setMarkdownHours(e.target.value)}
                                        variant="outlined"
                                        sx={{ fontFamily: "monospace" }}
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Card
                                sx={{
                                    bgcolor: palette.background.paper,
                                    border: `1px solid ${palette.divider}`,
                                    borderRadius: 1,
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" fontWeight="600" mb={2}>
                                        Preview
                                    </Typography>
                                    <Box
                                        sx={{
                                            border: `1px solid ${palette.divider}`,
                                            borderRadius: 1,
                                            p: 2,
                                            bgcolor: palette.background.default,
                                        }}
                                    >
                                        {/* This would render the markdown preview - using a simple table for now */}
                                        <div
                                            dangerouslySetInnerHTML={{
                                                __html: markdownHours
                                                    .replace(/\n/g, "<br>")
                                                    .replace(/\|/g, " | "),
                                            }}
                                        />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {/* Action Buttons */}
                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        justifyContent: "flex-end",
                        mt: 4,
                        p: 3,
                        bgcolor: palette.background.paper,
                        border: `1px solid ${palette.divider}`,
                        borderRadius: 1,
                    }}
                >
                    <Button
                        onClick={revertHours}
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        sx={{
                            minWidth: 120,
                            borderRadius: 1,
                        }}
                        data-testid="revert-changes-button"
                    >
                        Revert Changes
                    </Button>
                    <Button
                        onClick={applyHours}
                        variant="contained"
                        startIcon={<SaveIcon />}
                        disabled={updateLoading}
                        sx={{
                            minWidth: 120,
                            borderRadius: 1,
                            bgcolor: palette.primary.main,
                            "&:hover": {
                                bgcolor: palette.primary.dark,
                            },
                        }}
                        data-testid="save-changes-button"
                    >
                        {updateLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </Box>
            </Box>
        </PageContainer>
    );
};
