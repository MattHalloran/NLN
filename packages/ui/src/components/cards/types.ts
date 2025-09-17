import { customers_customers } from "api/generated/customers";
import { orders_orders } from "api/generated/orders";
import { plants_plants, plants_plants_skus } from "api/generated/plants";

export interface CustomerCardProps {
    customer: customers_customers;
    isMobile: boolean;
    onEdit: (customer: customers_customers) => void;
}

export interface OrderCardProps {
    order: orders_orders;
    onEdit?: (order: orders_orders) => void;
}

export interface PlantCardProps {
    plant: plants_plants;
    onEdit?: (plant: plants_plants) => void;
    isAdminPage?: boolean;
    isMobile?: boolean;
    onClick?: (data: { plant: plants_plants; selectedSku?: plants_plants_skus }) => void;
}
