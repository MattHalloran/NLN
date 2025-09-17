import { gql } from "@apollo/client";

export const seasonalContentQuery = gql`
    query SeasonalContent($onlyActive: Boolean) {
        seasonalContent(onlyActive: $onlyActive) {
            plants {
                id
                name
                description
                season
                careLevel
                icon
                displayOrder
                isActive
            }
            tips {
                id
                title
                description
                category
                season
                displayOrder
                isActive
            }
        }
    }
`;

export const upsertSeasonalPlantMutation = gql`
    mutation UpsertSeasonalPlant($input: SeasonalPlantInput!) {
        upsertSeasonalPlant(input: $input) {
            id
            name
            description
            season
            careLevel
            icon
            displayOrder
            isActive
        }
    }
`;

export const deleteSeasonalPlantMutation = gql`
    mutation DeleteSeasonalPlant($id: ID!) {
        deleteSeasonalPlant(id: $id)
    }
`;

export const reorderSeasonalPlantsMutation = gql`
    mutation ReorderSeasonalPlants($ids: [ID!]!) {
        reorderSeasonalPlants(ids: $ids) {
            id
            displayOrder
        }
    }
`;

export const upsertPlantTipMutation = gql`
    mutation UpsertPlantTip($input: PlantTipInput!) {
        upsertPlantTip(input: $input) {
            id
            title
            description
            category
            season
            displayOrder
            isActive
        }
    }
`;

export const deletePlantTipMutation = gql`
    mutation DeletePlantTip($id: ID!) {
        deletePlantTip(id: $id)
    }
`;

export const reorderPlantTipsMutation = gql`
    mutation ReorderPlantTips($ids: [ID!]!) {
        reorderPlantTips(ids: $ids) {
            id
            displayOrder
        }
    }
`;

export const updateSeasonalContentMutation = gql`
    mutation UpdateSeasonalContent($plants: [SeasonalPlantInput!]!, $tips: [PlantTipInput!]!) {
        updateSeasonalContent(plants: $plants, tips: $tips) {
            plants {
                id
                name
                description
                season
                careLevel
                icon
                displayOrder
                isActive
            }
            tips {
                id
                title
                description
                category
                season
                displayOrder
                isActive
            }
        }
    }
`;