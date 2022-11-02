import { BoxProps, SelectChangeEvent, SelectProps } from '@mui/material';

export interface PasswordTextFieldProps extends TextFieldProps {
    autoComplete?: string;
    autoFocus?: boolean;
    error?: boolean;
    helperText?: string | null | undefined;
    fullWidth?: boolean;
    id?: string;
    label?: string;
    name?: string;
    onBlur?: (event: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>) => void;
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

export interface SelectorProps<T extends string | number | { [x: string]: any }> extends SelectProps {
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