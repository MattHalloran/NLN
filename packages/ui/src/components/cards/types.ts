import { customers_customers } from "api/generated/customers";

export interface CustomerCardProps {
    customer: customers_customers;
    isMobile: boolean;
    onEdit: (customer: customers_customers) => void;
}
