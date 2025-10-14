// Customer type for archived CustomerCard component (kept for backwards compatibility)
type Customer = {
    id: string;
    firstName: string;
    lastName: string;
    emails?: Array<{ emailAddress: string }>;
    phones?: Array<{ number: string }>;
};

export interface CustomerCardProps {
    customer: Customer;
    isMobile: boolean;
    onEdit: (customer: Customer) => void;
}

// ARCHIVED: OrderCard component moved to /archived
// export interface OrderCardProps {
//     order: orders_orders;
//     onEdit?: (order: orders_orders) => void;
// }

// ARCHIVED: PlantCard component moved to /archived
// export interface PlantCardProps {
//     plant: plants_plants;
//     onEdit?: (plant: plants_plants) => void;
//     isAdminPage?: boolean;
//     isMobile?: boolean;
//     onClick?: (data: { plant: plants_plants; selectedSku?: plants_plants_skus }) => void;
// }
