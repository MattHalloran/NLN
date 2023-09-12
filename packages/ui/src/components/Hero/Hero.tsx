// Code inspired by https://github.com/rmolinamir/hero-slider
import { useQuery } from "@apollo/client";
import { APP_LINKS } from "@local/shared";
import { Box, Button, Typography } from "@mui/material";
import { imagesByLabelQuery } from "api/query";
import { useEffect, useState } from "react";
import { useLocation } from "route";
import { Slider } from "./Slider";

const textPopStyle = ({
    padding: "0",
    color: "white",
    textAlign: "center",
    fontWeight: "600",
    textShadow:
        `-1px -1px 0 black,  
            1px -1px 0 black,
            -1px 1px 0 black,
            1px 1px 0 black`,
});

export const Hero = ({
    text,
    subtext,
}) => {
    const [, setLocation] = useLocation();

    const [images, setImages] = useState([]);
    const { data } = useQuery(imagesByLabelQuery, { variables: { input: { label: "hero" } } });
    useEffect(() => {
        setImages(data?.imagesByLabel);
    }, [data]);

    return (
        <Box sx={{
            position: "relative",
            overflow: "hidden",
            pointerEvents: "none",
        }}>
            <Slider images={images} autoPlay={true} />
            <Box sx={{
                position: "absolute",
                top: "0",
                left: "0",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexFlow: "column",
                width: "100%",
                height: "100%",
                margin: "0",
                padding: "0",
                pointerEvents: "none",
                backgroundColor: "rgba(0, 0, 0, 0.1)",
            }}>
                <Typography variant='h2' component='h1' sx={{
                    margin: "0 auto",
                    width: "90%",
                    ...textPopStyle,
                }}>{text}</Typography>
                <Typography variant='h4' component='h2' sx={{
                    margin: "24px auto 0",
                    width: "80%",
                    ...textPopStyle,
                }}>{subtext}</Typography>
                <Button
                    type="submit"
                    color="secondary"
                    onClick={() => setLocation(APP_LINKS.Shopping)}
                    sx={{ pointerEvents: "auto", marginTop: 2 }}
                    variant="contained"
                >
                    Request Quote
                </Button>
            </Box>
        </Box>
    );
};
