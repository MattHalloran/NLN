import { IMAGE_USE, SKU_STATUS } from "@local/shared";
import { Avatar, Box, CardMedia, Chip, SxProps, Theme, Typography, useTheme } from "@mui/material";
import { NoImageIcon } from "icons";
import { useMemo } from "react";
import { getImageSrc, getPlantTrait, getServerUrl, showPrice } from "utils";

const deleted: SxProps<Theme> = {
    background: "2px solid red",
} as const;

const inactive: SxProps<Theme> = {
    background: "2px solid grey",
} as const;

const active: SxProps<Theme> = {
    background: (t) => t.palette.primary.light,
} as const;


export const PlantCard = ({
    isAdminPage,
    isMobile,
    key,
    onClick,
    plant,
}: {
    isAdminPage: boolean,
    isMobile: boolean,
    key: string | number,
    onClick: ({ plant, selectedSku }: { plant: any, selectedSku: any }) => unknown,
    plant: any,
}) => {
    const { breakpoints, palette } = useTheme();

    const SkuStatus = {
        [SKU_STATUS.Deleted]: deleted,
        [SKU_STATUS.Inactive]: inactive,
        [SKU_STATUS.Active]: active,
    };

    const openWithSku = (e, sku) => {
        e.stopPropagation();
        onClick({ plant, selectedSku: sku });
    };

    const sizes = plant.skus?.map(s => (
        <Chip
            key={s.sku}
            label={isAdminPage ? `#${s.size} | ${showPrice(s.price)} | Avail: ${s.availability}` : `#${s.size} | Avail: ${s.availability}`}
            color="secondary"
            onClick={(e) => openWithSku(e, s)}
            sx={{
                margin: 0.5,
                boxShadow: 0,
                borderRadius: 2,
                ...(SkuStatus[s.status + ""] ?? deleted),
                fontSize: "0.75rem",
            } as any}
        />
    ));

    const imgDisplay = useMemo(() => {
        let display: JSX.Element;
        let display_data = plant.images.find(image => image.usedFor === IMAGE_USE.PlantDisplay)?.image;
        if (!display_data && plant.images.length > 0) display_data = plant.images[0].image;
        // On mobile, use Avatar (best for lists)
        if (isMobile) {
            display = <Avatar
                src={`${getServerUrl()}/${getImageSrc(display_data)}`}
                alt={display_data?.alt ?? plant.latinName}
                sx={{
                    backgroundColor: palette.primary.main,
                    width: "min(120px, 20vw)",
                    height: "min(120px, 20vw)",
                    pointerEvents: "none",
                    borderRadius: 0,
                    marginTop: "auto",
                    marginBottom: "auto",
                }}
            >
                <NoImageIcon width="75%" height="75%" />
            </Avatar>;
        }
        // Otherwise, show full image (best for cards)
        else {
            if (display_data) {
                display = <CardMedia
                    component="img"
                    src={`${getServerUrl()}/${getImageSrc(display_data)}`}
                    alt={display_data.alt}
                    title={plant.latinName}
                    sx={{
                        minHeight: 200,
                        maxHeight: 200,
                    }}
                />;
            } else {
                display = <NoImageIcon style={{
                    width: "100%",
                    height: "100%",
                    maxHeight: 200,
                }} />;
            }
        }
        return display;
    }, [plant.images, plant.latinName, isMobile, palette.primary.main]);


    return (
        <Box
            key={key}
            onClick={() => onClick({ plant, selectedSku: plant.skus[0] })}
            sx={{
                background: palette.primary.main,
                color: palette.primary.contrastText,
                display: "flex",
                flexDirection: isMobile ? "row" : "column",
                gap: 1,
                cursor: "pointer",
                overflow: "hidden",
                boxShadow: isMobile ? 0 : 4,
                borderRadius: isMobile ? 0 : 2,
                [breakpoints.down("sm")]: {
                    borderBottom: `1px solid ${palette.divider}`,
                },
            }}
        >
            {imgDisplay}
            <Typography gutterBottom variant="h6" component="h3" p={1}>
                {plant.latinName ?? getPlantTrait("commonName", plant)}
            </Typography>
            <Box sx={{
                marginLeft: "auto",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
            }}>
                {sizes}
            </Box>
        </Box >
    );
};
