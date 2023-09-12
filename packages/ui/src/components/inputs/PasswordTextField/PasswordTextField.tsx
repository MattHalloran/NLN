import { FormControl, FormHelperText, IconButton, InputAdornment, InputLabel, LinearProgress, OutlinedInput, useTheme } from "@mui/material";
import { InvisibleIcon, VisibleIcon } from "icons";
import { useCallback, useState } from "react";
import zxcvbn from "zxcvbn";
import { PasswordTextFieldProps } from "../types";

export const PasswordTextField = ({
    autoComplete = "current-password",
    autoFocus = false,
    error = false,
    fullWidth = true,
    helperText = undefined,
    id = "password",
    label,
    name = "password",
    onBlur = () => { },
    onChange,
    value,
    ...props
}: PasswordTextFieldProps) => {
    const { palette } = useTheme();

    const [showPassword, setShowPassword] = useState<boolean>(false);

    const handleClickShowPassword = useCallback(() => {
        setShowPassword(!showPassword);
    }, [showPassword]);

    const getPasswordStrengthProps = useCallback((password) => {
        const result = zxcvbn(password);
        const score = result.score;
        switch (score) {
            case 0:
            case 1:
                return { label: "Weak", color: palette.error.main, score };
            case 2:
                return { label: "Moderate", color: palette.warning.main, score };
            case 3:
                return { label: "Strong", color: palette.success.main, score };
            case 4:
                return { label: "Very Strong", color: palette.success.dark, score };
            default:
                return { label: "N/A", color: palette.info.main, score };
        }
    }, [palette]);
    const strengthProps = getPasswordStrengthProps(value);

    return (
        <FormControl fullWidth={fullWidth} variant="outlined" {...props as any}>
            <InputLabel htmlFor={name}>{label ?? "Password"}</InputLabel>
            <OutlinedInput
                id={name}
                name={name}
                type={showPassword ? "text" : "password"}
                value={value}
                onBlur={onBlur}
                onChange={onChange}
                autoComplete={autoComplete}
                autoFocus={autoFocus}
                error={!!error}
                endAdornment={
                    <InputAdornment position="end">
                        <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            edge="end"
                        >
                            {
                                showPassword ?
                                    <InvisibleIcon fill={palette.background.textSecondary} /> :
                                    <VisibleIcon fill={palette.background.textSecondary} />
                            }
                        </IconButton>
                    </InputAdornment>
                }
                label={label ?? "Password"}
            />
            {
                autoComplete === "new-password" && (
                    <LinearProgress
                        value={strengthProps.score * 25}  // Convert score to percentage
                        variant="determinate"
                        sx={{
                            marginTop: 1,
                            "& .MuiLinearProgress-bar": {
                                backgroundColor: strengthProps.color,
                            },
                        }}
                    />
                )
            }
            <FormHelperText id="adornment-password-error-text" sx={{ color: palette.error.main }}>{helperText}</FormHelperText>
        </FormControl>
    );
};
