import { BoxProps, SelectChangeEvent, TextFieldProps } from "@mui/material";
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
    onChange: (e: ChangeEvent<any>) => any;
    value: string;
}

export interface QuantityBoxProps extends BoxProps {
    autoFocus?: boolean;
    disabled?: boolean;
    error?: boolean;
    handleChange: (newValue: number) => any;
    helperText?: string | null | undefined;
    id: string;
    key?: string;
    initial?: number;
    label?: string;
    max?: number;
    min?: number;
    step?: number;
    tooltip?: string;
    value: number;
}

export interface SelectorProps<T extends string | number | { [x: string]: any }> {
    color?: string;
    disabled?: boolean;
    fullWidth?: boolean;
    getOptionLabel: (option: T) => string;
    handleChange: (selected: T, event: SelectChangeEvent<any>) => any;
    inputAriaLabel?: string;
    label?: string;
    multiple?: false;
    noneOption?: boolean;
    options: T[];
    required?: boolean;
    selected: T | null | undefined;
    sx?: { [x: string]: any };
}
