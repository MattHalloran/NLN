import { customers_customers } from "api/generated/customers";
// ARCHIVED: import { orders_orders } from "api/generated/orders";
// ARCHIVED: import { plants_plants, plants_plants_skus } from "api/generated/plants";

export interface CustomerCardProps {
    customer: customers_customers;
    isMobile: boolean;
    onEdit: (customer: customers_customers) => void;
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
