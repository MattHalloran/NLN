import { useCallback } from 'react';
import {
    QuantityBox,
    Selector,
    SnackSeverity
} from 'components';
import { deleteArrayIndex, showPrice, PubSub, getImageSrc, getPlantTrait, updateArray, getServerUrl } from 'utils';
import { IconButton, Palette, useTheme } from '@mui/material';
import { Box, Paper, Grid, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, TextField } from '@mui/material';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import DatePicker from '@mui/lab/DatePicker';
import { IMAGE_USE } from '@shared/consts';
import { CloseIcon, NoImageIcon } from '@shared/icons';

const tableColumnStyle = (palette: Palette) => ({
    verticalAlign: 'middle',
    '& > *': {
        height: 'fit-content',
        color: palette.primary.contrastText
    }
})

const DELIVERY_OPTIONS = [
    {
        label: 'Pickup',
        value: false,
    },
    {
        label: 'Delivery',
        value: true,
    },
]

export const CartTable = ({
    cart,
    onUpdate,
    editable = true,
    ...props
}) => {
    const { palette } = useTheme();

    let all_total = Array.isArray(cart?.items) ? cart.items.map(i => (+i.sku.price) * (+i.quantity)).reduce((a, b) => (+a) + (+b), 0) : -1;

    const setNotes = (notes) => onUpdate({ ...cart, specialInstructions: notes });
    const setDeliveryDate = (date) => onUpdate({ ...cart, desiredDeliveryDate: +date });
    const handleDeliveryChange = (value) => onUpdate({ ...cart, isDelivery: value });

    const updateItemQuantity = useCallback((sku, quantity) => {
        let index = cart.items.findIndex(i => i.sku.sku === sku);
        if (index < 0 || index >= (cart.items.length)) {
            PubSub.get().publishSnack({ message: 'Failed to update item quantity', severity: SnackSeverity.Error, data: { index: index } });
            return;
        }
        onUpdate({ ...cart, items: updateArray(cart.items, index, { ...cart.items[index], quantity: quantity }) });
    }, [cart, onUpdate])

    const deleteCartItem = useCallback((sku) => {
        let index = cart.items.findIndex(i => i.sku.sku === sku.sku);
        if (index < 0) {
            PubSub.get().publishSnack({ message: `Failed to remove item for ${sku.sku}`, severity: SnackSeverity.Error, data: sku });
            return;
        }
        let changed_item_list = deleteArrayIndex(cart.items, index);
        onUpdate({ ...cart, items: changed_item_list });
    }, [cart, onUpdate])

    const cart_item_to_row = useCallback((data, key: string) => {
        const commonName = getPlantTrait('commonName', data.sku.plant);
        const quantity = data.quantity;
        let price: string | number = +data.sku.price;
        let total;
        if (isNaN(price)) {
            total = 'TBD';
            price = 'TBD';
        } else {
            total = showPrice(quantity * price);
            price = showPrice(price);
        }

        let display;
        let display_data = data.sku.plant.images.find(image => image.usedFor === IMAGE_USE.PlantDisplay)?.image;
        if (!display_data && data.sku.plant.images.length > 0) display_data = data.sku.plant.images[0].image;
        if (display_data) {
            display = <Box
                component="img"
                src={`${getServerUrl()}/${getImageSrc(display_data)}`}
                alt={display_data.alt}
                title={commonName}
                sx={{
                    minHeight: 100,
                    maxHeight: 100,
                }}
            />
        } else {
            display = <NoImageIcon style={{
                width: '100px',
                height: '100px',
            }} />
        }

        return (
            <TableRow key={key}>
                {editable ? (<TableCell padding="checkbox">
                    <IconButton onClick={() => deleteCartItem(data.sku)}>
                        <CloseIcon />
                    </IconButton>
                </TableCell>) : null}
                <TableCell padding="none" component="th" scope="row" align="center" sx={tableColumnStyle(palette)}>
                    {display}
                </TableCell>
                <TableCell align="left" sx={tableColumnStyle(palette)}>{getPlantTrait('commonName', data.sku.plant)}</TableCell>
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
    }, [deleteCartItem, editable, palette, updateItemQuantity])

    let headCells = [
        { id: 'productImage', align: 'left', disablePadding: true, label: 'Product' },
        { id: 'productName', disablePadding: true, label: '' },
        { id: 'price', align: 'right', disablePadding: false, label: 'Price' },
        { id: 'quantity', align: 'right', disablePadding: false, label: 'Quantity' },
        { id: 'total', align: 'right', disablePadding: false, label: 'Total' },
    ]
    // Only show x button if cart is editable
    if (editable) headCells.unshift({ id: 'close', align: 'left', disablePadding: true, label: '' });

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
                                    padding={disablePadding ? 'none' : 'normal'}
                                >{label}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Array.isArray(cart?.items) ? cart.items.map((c, index) => cart_item_to_row(c, index)) : null}
                    </TableBody>
                </Table>
            </TableContainer>
            <p>Total: {showPrice(all_total) ?? 'N/A'}</p>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                    <Selector
                        color={undefined}
                        fullWidth
                        disabled={!editable}
                        required
                        options={DELIVERY_OPTIONS}
                        selected={cart?.isDelivery ? DELIVERY_OPTIONS[1].value : DELIVERY_OPTIONS[0].value}
                        handleChange={(e) => handleDeliveryChange(e.target.value)}
                        inputAriaLabel='delivery-selector-label'
                        label="Shipping Method" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                            label="Delivery Date"
                            disabled={!editable}
                            value={cart?.desiredDeliveryDate ? new Date(cart.desiredDeliveryDate) : +(new Date())}
                            onChange={(date) => {
                                setDeliveryDate(date)
                            }}
                            renderInput={(params) => <TextField fullWidth {...params} />}
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
                        value={cart?.specialInstructions ?? ''}
                        onChange={e => setNotes(e.target.value)}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}