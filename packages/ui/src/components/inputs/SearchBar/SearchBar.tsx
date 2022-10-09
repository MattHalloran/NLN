import React from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import { SearchIcon } from '@shared/icons';

export const SearchBar = ({
    label = 'Search...',
    value,
    onChange,
    debounce,
    ...props
}) => {

    const onChangeDebounced = AwesomeDebouncePromise(
        onChange,
        debounce ?? 0,
    );

    return (
        <TextField
            label={label}
            value={value}
            onChange={onChangeDebounced}
            InputProps={{
                endAdornment: (
                    <InputAdornment>
                        <IconButton>
                            <SearchIcon />
                        </IconButton>
                    </InputAdornment>
                )
            }}
            {...props}
        />
    );
}