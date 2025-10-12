import { IMAGE_USE } from "@local/shared";
import AdapterDateFns from "@mui/lab/AdapterDateFns";
import DatePicker from "@mui/lab/DatePicker";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import { Box, Grid, IconButton, Palette, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, useTheme } from "@mui/material";
import { QuantityBox, Selector, SnackSeverity } from "components";
import { CloseIcon, NoImageIcon } from "icons";
import { useCallback } from "react";
import { Cart } from "types";
import { PubSub, deleteArrayIndex, getImageSrc, getPlantTrait, getServerUrl, showPrice, updateArray } from "utils";

interface CartTableProps {
    cart: Cart;
    onUpdate: (cart: Cart) => void;
    editable?: boolean;
    sx?: any;
}

const tableColumnStyle = (palette: Palette) => ({
    verticalAlign: "middle",
    "& > *": {
        height: "fit-content",
        color: palette.primary.contrastText,
    },
});

const DELIVERY_OPTIONS = [
    {
        label: "Pickup",
        value: false,
    },
    {
        label: "Delivery",
        value: true,
    },
];

export const CartTable = ({
    cart,
    onUpdate,
    editable = true,
    ...props
}: CartTableProps) => {
    const { palette } = useTheme();

    const all_total = Array.isArray(cart?.items) ? cart.items.map((i: any) => (+i.sku.price) * (+i.quantity)).reduce((a: number, b: number) => (+a) + (+b), 0) : -1;

    const setNotes = (notes: string) => onUpdate({ ...cart, specialInstructions: notes });
    const setDeliveryDate = (date: Date) => onUpdate({ ...cart, desiredDeliveryDate: +date });
    const handleDeliveryChange = (change: { label: string, value: boolean }) => onUpdate({ ...cart, isDelivery: change.value });

    const updateItemQuantity = useCallback((sku: string, quantity: number) => {
        const index = cart.items.findIndex((i: any) => i.sku.sku === sku);
        if (index < 0 || index >= (cart.items.length)) {
            PubSub.get().publishSnack({ message: "Failed to update item quantity", severity: SnackSeverity.Error, data: { index } });
            return;
        }
        onUpdate({ ...cart, items: updateArray(cart.items, index, { ...cart.items[index], quantity }) });
    }, [cart, onUpdate]);

    const deleteCartItem = useCallback((sku: { sku: string }) => {
        const index = cart.items.findIndex(i => i.sku.sku === sku.sku);
        if (index < 0) {
            PubSub.get().publishSnack({ message: `Failed to remove item for ${sku.sku}`, severity: SnackSeverity.Error, data: sku });
            return;
        }
        const changed_item_list = deleteArrayIndex(cart.items, index);
        onUpdate({ ...cart, items: changed_item_list });
    }, [cart, onUpdate]);

    const cart_item_to_row = useCallback((data: any, key: string) => {
        const commonName = getPlantTrait("commonName", data.sku.plant);
        const quantity = data.quantity;
        let price: string | number = +data.sku.price;
        let total;
        if (isNaN(price)) {
            total = "TBD";
            price = "TBD";
        } else {
            total = showPrice(quantity * price);
            price = showPrice(price);
        }

        let display;
        let display_data = data.sku.plant.images.find((image: any) => image.usedFor === IMAGE_USE.PlantDisplay)?.image;
        if (!display_data && data.sku.plant.images.length > 0) display_data = data.sku.plant.images[0].image;
        if (display_data) {
            display = <Box
                component="img"
                src={`${getServerUrl()}/${getImageSrc(display_data) ?? ""}`}
                alt={display_data.alt || ""}
                title={commonName ?? ""}
                sx={{
                    minHeight: 100,
                    maxHeight: 100,
                }}
            />;
        } else {
            display = <NoImageIcon style={{
                width: "100px",
                height: "100px",
                maxHeight: 200,
            }} />;
        }

        return (
            <TableRow key={key}>
                {editable ? (<TableCell padding="checkbox">
                    <IconButton onClick={() => deleteCartItem(data.sku)}>
                        <CloseIcon fill={palette.background.textPrimary} />
                    </IconButton>
                </TableCell>) : null}
                <TableCell padding="none" component="th" scope="row" align="center" sx={tableColumnStyle(palette)}>
                    {display}
                </TableCell>
                <TableCell align="left" sx={tableColumnStyle(palette)}>{getPlantTrait("commonName", data.sku.plant)}</TableCell>
                <TableCell align="right" sx={tableColumnStyle(palette)}>{price}</TableCell>
                <TableCell align="right" sx={tableColumnStyle(palette)}>
                    {editable ? (<QuantityBox
                        id={`cart-item-quantity-${data.sku.sku}`}
                        min={0}
                        max={data.sku?.availability ?? 100}
                        value={quantity}
                        handleChange={(q) => updateItemQuantity(data.sku.sku, q)} />) : quantity}
                </TableCell>
                <TableCell align="right" sx={tableColumnStyle(palette)}>{total}</TableCell>
            </TableRow>
        );
    }, [deleteCartItem, editable, palette, updateItemQuantity]);

    const headCells = [
        { id: "productImage", align: "left", disablePadding: true, label: "Product" },
        { id: "productName", disablePadding: true, label: "" },
        { id: "price", align: "right", disablePadding: false, label: "Price" },
        { id: "quantity", align: "right", disablePadding: false, label: "Quantity" },
        { id: "total", align: "right", disablePadding: false, label: "Total" },
    ];
    // Only show x button if cart is editable
    if (editable) headCells.unshift({ id: "close", align: "left", disablePadding: true, label: "" });

    return (
        <Box {...props} >
            <TableContainer component={Paper} sx={{ background: palette.background.paper }}>
                <Table aria-label="cart table">
                    <TableHead sx={{ background: palette.primary.main }}>
                        <TableRow>
                            {headCells.map(({ id, align, disablePadding, label }, index) => (
                                <TableCell
                                    key={id}
                                    id={id}
                                    align={align as any}
                                    padding={disablePadding ? "none" : "normal"}
                                    sx={{
                                        paddingLeft: index === 0 ? 1 : 0,
                                        color: palette.primary.contrastText,
                                    }}
                                >{label}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Array.isArray(cart?.items) && cart.items.length > 0
                            ? cart.items.map((c, index) => cart_item_to_row(c, index.toString()))
                            : (
                                <TableRow>
                                    <TableCell colSpan={headCells.length} align="center">
                                        Your cart is empty.
                                    </TableCell>
                                </TableRow>
                            )
                        }
                    </TableBody>
                </Table>
            </TableContainer>
            <p>Total: {showPrice(all_total) ?? "N/A"}</p>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                    <Selector
                        color={undefined}
                        fullWidth
                        disabled={!editable}
                        required
                        options={DELIVERY_OPTIONS}
                        getOptionLabel={(o) => o.label}
                        selected={cart?.isDelivery ? DELIVERY_OPTIONS[1] : DELIVERY_OPTIONS[0]}
                        handleChange={(c) => handleDeliveryChange(c)}
                        inputAriaLabel='delivery-selector-label'
                        label="Shipping Method" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                            label="Delivery Date"
                            disabled={!editable}
                            value={cart?.desiredDeliveryDate ? new Date(cart.desiredDeliveryDate) : +(new Date())}
                            onChange={(date: Date | null) => {
                                if (date) setDeliveryDate(date);
                            }}
                            renderInput={(params: any) => <TextField fullWidth {...params} />}
                        />
                    </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField
                        id="special-instructions"
                        label="Special Instructions"
                        disabled={!editable}
                        fullWidth
                        multiline
                        value={cart?.specialInstructions ?? ""}
                        onChange={e => setNotes(e.target.value)}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};
