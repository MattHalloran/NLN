import React from 'react';
import PropTypes from "prop-types";
import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import AwesomeDebouncePromise from 'awesome-debounce-promise';

function SearchBar({
    label = 'Search...',
    value,
    onChange,
    debounce,
    ...props
}) {

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

SearchBar.propTypes = {
    label: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    debounce: PropTypes.number,
}

export { SearchBar };