import { IconButton, InputAdornment, TextField, TextFieldProps, useTheme } from "@mui/material";
import { SearchIcon } from "icons";
import { useState } from "react";
import { useDebounce } from "utils";

export const SearchBar = ({
    label = "Search...",
    value,
    onChange,
    debounce = 0,
    ...props
}: Omit<TextFieldProps, "label" | "value" | "onChange"> & {
    label?: string,
    value: string,
    onChange: (updatedString: string) => unknown,
    debounce?: number,
}) => {
    const { palette } = useTheme();

    const [internalValue, setInternalValue] = useState(value);
    const onChangeDebounce = useDebounce(onChange, debounce ?? 100);

    return (
        <TextField
            label={label}
            value={internalValue}
            onChange={(e) => {
                const updatedString = e.target.value;
                setInternalValue(updatedString);
                onChangeDebounce(updatedString);
            }}
            InputProps={{
                endAdornment: (
                    <InputAdornment position="end">
                        <IconButton>
                            <SearchIcon fill={palette.background.textSecondary} />
                        </IconButton>
                    </InputAdornment>
                ),
            }}
            {...props}
        />
    );
};
