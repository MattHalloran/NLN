import { BoxProps } from '@mui/material';

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

export interface SelectorProps extends SelectProps {
    options: any[];
    getOptionLabel?: (option: any) => string;
    selected: any;
    handleChange: (change: any) => any;
    fullWidth?: boolean;
    multiple?: boolean;
    inputAriaLabel?: string;
    noneOption?: boolean;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    color?: string;
    sx?: any;
}