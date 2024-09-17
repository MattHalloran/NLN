import { FormControl, FormHelperText, IconButton, InputAdornment, InputLabel, LinearProgress, OutlinedInput, useTheme } from "@mui/material";
import { InvisibleIcon, LockIcon, VisibleIcon } from "icons";
import { useCallback, useEffect, useState } from "react";
import { noop } from "utils";
import { PasswordTextFieldProps } from "../types";

type PasswordStrengthProps = {
    label: string;
    primary: string;
    secondary: string;
    score: number;
};

const passwordStartAdornment = (
    <InputAdornment position="start">
        <LockIcon />
    </InputAdornment>
);

export const PasswordTextField = ({
    autoComplete = "current-password",
    autoFocus = false,
    error = false,
    fullWidth = true,
    helperText = undefined,
    id = "password",
    label,
    name = "password",
    onBlur = noop,
    onChange,
    value,
    ...props
}: PasswordTextFieldProps) => {
    const { palette } = useTheme();

    const [showPassword, setShowPassword] = useState<boolean>(false);

    const handleClickShowPassword = useCallback(() => {
        setShowPassword(!showPassword);
    }, [showPassword]);

    const getPasswordStrengthProps = useCallback(async (password: string) => {
        const defaultProps = { label: "N/A", primary: palette.info.main, secondary: palette.info.light };
        if (!password) {
            return { ...defaultProps, score: 0 };
        }
        const zxcvbn = (await import("zxcvbn")).default;
        const result = zxcvbn(password);
        const score = result.score;
        switch (score) {
            case 0:
            case 1:
                return { label: "Weak", primary: palette.error.main, secondary: palette.error.light, score };
            case 2:
                return { label: "Moderate", primary: palette.warning.main, secondary: palette.warning.light, score };
            case 3:
                return { label: "Strong", primary: palette.success.main, secondary: palette.success.light, score };
            case 4:
                return { label: "Very Strong", primary: palette.success.dark, secondary: palette.success.light, score };
            default:
                return { ...defaultProps, score };
        }
    }, [palette]);

    const [strengthProps, setStrengthProps] = useState<PasswordStrengthProps>({ label: "N/A", primary: palette.info.main, secondary: palette.info.light, score: 0 });
    useEffect(() => {
        getPasswordStrengthProps(value).then(setStrengthProps);
    }, [value, getPasswordStrengthProps]);

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
                startAdornment={passwordStartAdornment}
                endAdornment={
                    <InputAdornment position="end">
                        <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            edge="end"
                            sx={{
                                "&:focus": {
                                    border: `2px solid ${palette.background.textPrimary}`,
                                },
                                borderRadius: "2px",
                            }}
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
                            marginTop: 0,
                            height: "6px",
                            borderRadius: "0 0 4px 4px",
                            backgroundColor: value.length === 0 ? "transparent" : strengthProps.secondary,
                            "& .MuiLinearProgress-bar": {
                                backgroundColor: strengthProps.primary,
                            },
                        }}
                    />
                )
            }
            <FormHelperText id="adornment-password-error-text" sx={{ color: palette.error.main }}>{helperText}</FormHelperText>
        </FormControl>
    );
};
