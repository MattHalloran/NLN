import { TableCell, TableHead, TableRow, Checkbox, useTheme } from '@mui/material';

const exampleCells = [
    { id: 'name', align: 'left', disablePadding: true, label: 'Dessert (100g serving)' },
    { id: 'calories', align: 'right', disablePadding: false, label: 'Calories' },
    { id: 'fat', align: 'right', disablePadding: false, label: 'Fat (g)' },
    { id: 'carbs', align: 'right', disablePadding: false, label: 'Carbs (g)' },
    { id: 'protein', align: 'right', disablePadding: false, label: 'Protein (g)' },
];

export const EnhancedTableHead = ({
    headCells = exampleCells,
    numSelected = 0,
    rowCount,
    onSelectAllClick,
}) => {
    const { palette } = useTheme();

    return (
        <TableHead sx={{
            background: palette.primary.main,
            color: palette.primary.contrastText,
        }}>
            <TableRow>
                <TableCell padding="checkbox">
                    <Checkbox
                        indeterminate={numSelected > 0 && numSelected < rowCount}
                        checked={rowCount > 0 && numSelected === rowCount}
                        onChange={onSelectAllClick}
                        inputProps={{ 'aria-label': 'select all desserts' }}
                        sx={{ color: palette.primary.contrastText }}
                    />
                </TableCell>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={(headCell.align ?? 'left') as any}
                        padding={headCell.disablePadding ? 'none' : 'default' as any}
                        sx={{ color: palette.primary.contrastText }}
                    >
                        {headCell.label}
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}