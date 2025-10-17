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


