import { TextFieldProps } from "@mui/material";
import { ChangeEvent } from "react";

export interface PasswordTextFieldProps {
    autoComplete?: string;
    autoFocus?: boolean;
    error?: boolean;
    helperText?: string | null | undefined;
    fullWidth?: boolean;
    id?: string;
    label?: string;
    name?: string;
    onBlur?: TextFieldProps["onBlur"];
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    value: string;
}
