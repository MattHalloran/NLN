import { customers_customers } from "graphql/generated/customers";
import { AccountStatus } from "graphql/generated/globalTypes";

export interface CustomerCardProps {
    customer: customers_customers;
    status: AccountStatus;
    onEdit: (customer: customers_customers) => void;
}