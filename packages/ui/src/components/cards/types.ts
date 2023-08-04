import { customers_customers } from "api/generated/customers";

export interface CustomerCardProps {
    customer: customers_customers;
    onEdit: (customer: customers_customers) => void;
}
