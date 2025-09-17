import { Button, Container, Paper, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * Test component to demonstrate and verify error boundary functionality.
 * This component intentionally throws different types of errors for testing.
 */

interface ErrorGeneratorProps {
    errorType: string;
}

const ErrorGenerator = ({ errorType }: ErrorGeneratorProps) => {
    switch (errorType) {
        case "runtime":
            // Intentional runtime error
            throw new Error("This is a test runtime error");
        
        case "network":
            // Simulate network error
            throw new Error("Network request failed - connection timeout");
        
        case "chunk":
            // Simulate chunk loading error
            throw new Error("ChunkLoadError: Loading chunk 5 failed");
        
        case "permission":
            // Simulate permission error
            throw new Error("Permission denied - unauthorized access");
        
        case "reference":
            // Simulate reference error
            const obj: any = null;
            return <div>{obj.nonExistentProperty.value}</div>;
        
        default:
            return (
                <Typography color="success.main">
                    ✅ No error thrown - component rendered successfully!
                </Typography>
            );
    }
};

export const ErrorBoundaryTest = () => {
    const [errorType, setErrorType] = useState<string>("none");
    const [key, setKey] = useState(0);

    const triggerError = (type: string) => {
        setErrorType(type);
        // Force re-render to trigger error
        setKey(prev => prev + 1);
    };

    const resetTest = () => {
        setErrorType("none");
        setKey(prev => prev + 1);
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper elevation={2} sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>
                    🧪 Error Boundary Test
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    Use the buttons below to test different error scenarios and see how the enhanced error boundary handles them.
                </Typography>

                <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 4 }}>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => triggerError("runtime")}
                    >
                        Runtime Error
                    </Button>
                    <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => triggerError("network")}
                    >
                        Network Error
                    </Button>
                    <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => triggerError("chunk")}
                    >
                        Chunk Error
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => triggerError("permission")}
                    >
                        Permission Error
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => triggerError("reference")}
                    >
                        Reference Error
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={resetTest}
                    >
                        Reset Test
                    </Button>
                </Stack>

                <Paper 
                    variant="outlined" 
                    sx={{ 
                        p: 3, 
                        minHeight: 100, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        bgcolor: 'background.default'
                    }}
                >
                    <ErrorBoundary
                        key={key}
                        enableReporting={false} // Disable reporting for tests
                        onError={(error, errorInfo) => {
                            console.log("🧪 Test Error Caught:", { error, errorInfo });
                        }}
                    >
                        <ErrorGenerator errorType={errorType} />
                    </ErrorBoundary>
                </Paper>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                    💡 Open your browser's developer console to see detailed error logging.
                </Typography>
            </Paper>
        </Container>
    );
};