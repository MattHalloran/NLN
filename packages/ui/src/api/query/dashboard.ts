import { gql } from "graphql-tag";

// Query to get dashboard statistics
export const dashboardStatsQuery = gql`
    query dashboardStats {
        # Get total customers
        customers {
            id
            accountApproved
        }
        
        # Get all orders to count pending orders
        orders(input: {}) {
            id
            status
        }
        
        # Get all plants to count total products
        plants(input: {}) {
            id
            skus {
                id
            }
        }
    }
`;

// Query to get quick counts for performance (lightweight version)
export const dashboardQuickStatsQuery = gql`
    query dashboardQuickStats {
        customers {
            id
            accountApproved
        }
        orders(input: { status: Pending }) {
            id
        }
        plants(input: { active: true }) {
            id
            skus {
                id
            }
        }
    }
`;
