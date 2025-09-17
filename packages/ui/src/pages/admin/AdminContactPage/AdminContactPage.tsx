import { useMutation } from "@apollo/client";
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
    Alert
} from "@mui/material";
import {
    AccessTime,
    Business,
    Delete,
    Email,
    LocationOn,
    Phone,
    Schedule,
    Add
} from "@mui/icons-material";
import { writeAssetsMutation } from "api/mutation";
import { graphqlWrapperHelper } from "api/utils";
import { AdminTabOption, AdminTabs, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { BusinessContext } from "contexts/BusinessContext";
import { CancelIcon, SaveIcon } from "icons";
import { useContext, useEffect, useState } from "react";

const helpText = `This page allows you to edit the contact info and business hours displayed on the site. 

Simply fill in the form fields below - no technical knowledge required!

NOTE: This will not update Google My Business information. You must do that manually by logging into your Google My Business account.`;

interface DayHours {
    day: string;
    enabled: boolean;
    openTime: string;
    closeTime: string;
    closed: boolean;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_OPTIONS = [
    '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
    '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM'
];

export const AdminContactPage = () => {
    const { palette } = useTheme();
    const business = useContext(BusinessContext);
    const [updateHours] = useMutation(writeAssetsMutation);
    
    const [dayHours, setDayHours] = useState<DayHours[]>([]);
    const [showAdvancedMode, setShowAdvancedMode] = useState(false);
    const [markdownHours, setMarkdownHours] = useState("");
    
    // Parse existing hours from markdown on load
    useEffect(() => {
        if (!business?.hours) {
            // Initialize with default hours
            const defaultHours = DAYS_OF_WEEK.map(day => ({
                day,
                enabled: day !== 'Sunday',
                openTime: '8:00 AM',
                closeTime: '5:00 PM',
                closed: false
            }));
            setDayHours(defaultHours);
            return;
        }
        
        setMarkdownHours(business.hours);
        
        // Parse markdown table into structured data
        try {
            const lines = business.hours.split('\n').filter(line => line.trim());
            const parsedHours: DayHours[] = [];
            
            for (const line of lines) {
                if (line.includes('|') && !line.includes('---')) {
                    const parts = line.split('|').map(p => p.trim()).filter(p => p);
                    if (parts.length >= 2) {
                        const day = parts[0];
                        const hours = parts[1];
                        
                        if (DAYS_OF_WEEK.includes(day)) {
                            if (hours.toLowerCase() === 'closed') {
                                parsedHours.push({
                                    day,
                                    enabled: true,
                                    openTime: '8:00 AM',
                                    closeTime: '5:00 PM',
                                    closed: true
                                });
                            } else {
                                const timeParts = hours.split(' - ');
                                if (timeParts.length === 2) {
                                    parsedHours.push({
                                        day,
                                        enabled: true,
                                        openTime: timeParts[0].trim(),
                                        closeTime: timeParts[1].trim(),
                                        closed: false
                                    });
                                }
                            }
                        }
                    }
                }
            }
            
            // Fill in any missing days
            const finalHours = DAYS_OF_WEEK.map(day => {
                const existing = parsedHours.find(h => h.day === day);
                return existing || {
                    day,
                    enabled: false,
                    openTime: '8:00 AM',
                    closeTime: '5:00 PM',
                    closed: false
                };
            });
            
            setDayHours(finalHours);
        } catch (error) {
            console.error('Error parsing hours:', error);
            // Fallback to default hours
            const defaultHours = DAYS_OF_WEEK.map(day => ({
                day,
                enabled: false,
                openTime: '8:00 AM',
                closeTime: '5:00 PM',
                closed: false
            }));
            setDayHours(defaultHours);
        }
    }, [business]);
    
    const updateDayHours = (index: number, field: keyof DayHours, value: any) => {
        const newHours = [...dayHours];
        newHours[index] = { ...newHours[index], [field]: value };
        setDayHours(newHours);
    };
    
    const applyAllDays = () => {
        const mondayHours = dayHours[0];
        const newHours = dayHours.map(h => ({
            ...h,
            enabled: true,
            openTime: mondayHours.openTime,
            closeTime: mondayHours.closeTime,
            closed: mondayHours.closed
        }));
        setDayHours(newHours);
    };
    
    const generateMarkdown = () => {
        let markdown = '| Day | Hours |\n';
        markdown += '|-----|-------|\n';
        
        for (const hours of dayHours) {
            if (hours.enabled) {
                if (hours.closed) {
                    markdown += `| ${hours.day} | Closed |\n`;
                } else {
                    markdown += `| ${hours.day} | ${hours.openTime} - ${hours.closeTime} |\n`;
                }
            }
        }
        
        return markdown;
    };
    
    const applyHours = () => {
        const markdown = showAdvancedMode ? markdownHours : generateMarkdown();
        const blob = new Blob([markdown], { type: "text/plain" });
        const file = new File([blob], "hours.md", { type: blob.type });
        
        graphqlWrapperHelper({
            call: () => updateHours({ variables: { files: [file] } }),
            successCondition: (success: any) => success === true,
            successMessage: () => "Contact information updated successfully!",
            errorMessage: () => "Failed to update contact information.",
        });
    };
    
    const revertHours = () => {
        if (business?.hours) {
            // Re-parse from original business hours
            const lines = business.hours.split('\n').filter(line => line.trim());
            const parsedHours: DayHours[] = [];
            
            for (const line of lines) {
                if (line.includes('|') && !line.includes('---')) {
                    const parts = line.split('|').map(p => p.trim()).filter(p => p);
                    if (parts.length >= 2) {
                        const day = parts[0];
                        const hours = parts[1];
                        
                        if (DAYS_OF_WEEK.includes(day)) {
                            if (hours.toLowerCase() === 'closed') {
                                parsedHours.push({
                                    day,
                                    enabled: true,
                                    openTime: '8:00 AM',
                                    closeTime: '5:00 PM',
                                    closed: true
                                });
                            } else {
                                const timeParts = hours.split(' - ');
                                if (timeParts.length === 2) {
                                    parsedHours.push({
                                        day,
                                        enabled: true,
                                        openTime: timeParts[0].trim(),
                                        closeTime: timeParts[1].trim(),
                                        closed: false
                                    });
                                }
                            }
                        }
                    }
                }
            }
            
            const finalHours = DAYS_OF_WEEK.map(day => {
                const existing = parsedHours.find(h => h.day === day);
                return existing || {
                    day,
                    enabled: false,
                    openTime: '8:00 AM',
                    closeTime: '5:00 PM',
                    closed: false
                };
            });
            
            setDayHours(finalHours);
            setMarkdownHours(business.hours);
        }
    };

    return (
        <PageContainer sx={{ minHeight: "100vh" }}>
            <TopBar
                display="page"
                help={helpText}
                title="Contact Information"
                below={<AdminTabs defaultTab={AdminTabOption.ContactInfo} />}
            />
            
            <Box sx={{ p: 3 }}>
                {/* Header with mode toggle */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5" fontWeight="600" color="text.primary">
                        Business Hours Management
                    </Typography>
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

                {!showAdvancedMode ? (
                    <Grid container spacing={3}>
                        {/* Visual Hours Editor */}
                        <Grid item xs={12} lg={7}>
                            <Card sx={{ 
                                bgcolor: palette.background.paper,
                                border: `1px solid ${palette.divider}`,
                                borderRadius: 1
                            }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
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
                                        >
                                            Apply Monday to All Days
                                        </Button>
                                    </Box>
                                    
                                    <Divider sx={{ mb: 3 }} />
                                    
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {dayHours.map((hours, index) => (
                                            <Paper 
                                                key={hours.day} 
                                                elevation={0}
                                                sx={{ 
                                                    p: 2, 
                                                    border: `1px solid ${palette.divider}`,
                                                    borderRadius: 1,
                                                    bgcolor: hours.enabled ? palette.background.paper : palette.action.disabledBackground
                                                }}
                                            >
                                                <Grid container spacing={2} alignItems="center">
                                                    <Grid item xs={12} sm={3}>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    checked={hours.enabled}
                                                                    onChange={(e) => updateDayHours(index, 'enabled', e.target.checked)}
                                                                    color="primary"
                                                                />
                                                            }
                                                            label={
                                                                <Typography fontWeight={hours.day === 'Saturday' || hours.day === 'Sunday' ? 500 : 600}>
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
                                                                            onChange={(e) => updateDayHours(index, 'closed', e.target.checked)}
                                                                            color="error"
                                                                        />
                                                                    }
                                                                    label="Closed"
                                                                />
                                                            </Grid>
                                                            
                                                            {!hours.closed && (
                                                                <>
                                                                    <Grid item xs={12} sm={3}>
                                                                        <Select
                                                                            fullWidth
                                                                            value={hours.openTime}
                                                                            onChange={(e) => updateDayHours(index, 'openTime', e.target.value)}
                                                                            size="small"
                                                                            startAdornment={
                                                                                <InputAdornment position="start">
                                                                                    <AccessTime sx={{ fontSize: 18 }} />
                                                                                </InputAdornment>
                                                                            }
                                                                        >
                                                                            {TIME_OPTIONS.map(time => (
                                                                                <MenuItem key={time} value={time}>{time}</MenuItem>
                                                                            ))}
                                                                        </Select>
                                                                    </Grid>
                                                                    
                                                                    <Grid item xs={12} sm={3}>
                                                                        <Select
                                                                            fullWidth
                                                                            value={hours.closeTime}
                                                                            onChange={(e) => updateDayHours(index, 'closeTime', e.target.value)}
                                                                            size="small"
                                                                            startAdornment={
                                                                                <InputAdornment position="start">
                                                                                    <AccessTime sx={{ fontSize: 18 }} />
                                                                                </InputAdornment>
                                                                            }
                                                                        >
                                                                            {TIME_OPTIONS.map(time => (
                                                                                <MenuItem key={time} value={time}>{time}</MenuItem>
                                                                            ))}
                                                                        </Select>
                                                                    </Grid>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </Grid>
                                            </Paper>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        
                        {/* Preview Section */}
                        <Grid item xs={12} lg={5}>
                            <Card sx={{ 
                                bgcolor: palette.background.paper,
                                border: `1px solid ${palette.divider}`,
                                borderRadius: 1,
                                position: 'sticky',
                                top: 20
                            }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Box display="flex" alignItems="center" gap={1} mb={3}>
                                        <Schedule sx={{ color: palette.primary.main }} />
                                        <Typography variant="h6" fontWeight="600">
                                            Preview
                                        </Typography>
                                    </Box>
                                    
                                    <Alert severity="info" sx={{ mb: 3 }}>
                                        This is how your business hours will appear on the website.
                                    </Alert>
                                    
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: palette.primary.main }}>
                                                    <TableCell sx={{ color: palette.primary.contrastText, fontWeight: 600 }}>
                                                        Day
                                                    </TableCell>
                                                    <TableCell sx={{ color: palette.primary.contrastText, fontWeight: 600 }}>
                                                        Hours
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {dayHours.filter(h => h.enabled).map((hours) => (
                                                    <TableRow key={hours.day}>
                                                        <TableCell>{hours.day}</TableCell>
                                                        <TableCell>
                                                            {hours.closed ? (
                                                                <Typography color="error" fontWeight={500}>Closed</Typography>
                                                            ) : (
                                                                `${hours.openTime} - ${hours.closeTime}`
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {dayHours.filter(h => h.enabled).length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={2} align="center">
                                                            <Typography color="text.secondary">
                                                                No hours set. Please select days to display.
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
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
                            <Card sx={{ 
                                bgcolor: palette.background.paper,
                                border: `1px solid ${palette.divider}`,
                                borderRadius: 1
                            }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" fontWeight="600" mb={2}>
                                        Markdown Editor
                                    </Typography>
                                    <Alert severity="warning" sx={{ mb: 2 }}>
                                        Advanced mode: Edit the raw markdown directly. Use the format:
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
                                        sx={{ fontFamily: 'monospace' }}
                                    />
                                </CardContent>
                            </Card>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                            <Card sx={{ 
                                bgcolor: palette.background.paper,
                                border: `1px solid ${palette.divider}`,
                                borderRadius: 1
                            }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" fontWeight="600" mb={2}>
                                        Preview
                                    </Typography>
                                    <Box sx={{
                                        border: `1px solid ${palette.divider}`,
                                        borderRadius: 1,
                                        p: 2,
                                        bgcolor: palette.background.default
                                    }}>
                                        {/* This would render the markdown preview - using a simple table for now */}
                                        <div dangerouslySetInnerHTML={{ 
                                            __html: markdownHours.replace(/\n/g, '<br>').replace(/\|/g, ' | ') 
                                        }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}
                
                {/* Action Buttons */}
                <Box 
                    sx={{ 
                        display: 'flex', 
                        gap: 2, 
                        justifyContent: 'flex-end', 
                        mt: 4,
                        p: 3,
                        bgcolor: palette.background.paper,
                        border: `1px solid ${palette.divider}`,
                        borderRadius: 1
                    }}
                >
                    <Button
                        onClick={revertHours}
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        sx={{
                            minWidth: 120,
                            borderRadius: 1
                        }}
                    >
                        Revert Changes
                    </Button>
                    <Button
                        onClick={applyHours}
                        variant="contained"
                        startIcon={<SaveIcon />}
                        sx={{
                            minWidth: 120,
                            borderRadius: 1,
                            bgcolor: palette.primary.main,
                            '&:hover': {
                                bgcolor: palette.primary.dark
                            }
                        }}
                    >
                        Save Changes
                    </Button>
                </Box>
            </Box>
        </PageContainer>
    );
};
