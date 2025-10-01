import {
    FieldNode,
    FragmentDefinitionNode,
    FragmentSpreadNode,
    GraphQLResolveInfo,
    InlineFragmentNode,
    SelectionNode,
} from "graphql";

type SelectObject = { [key: string]: boolean | SelectObject | string };
type ParseResult = boolean | SelectObject;

/**
 * Parses a GraphQL FieldNode type
 * @param node Field node
 * @param fragments All fragments in GraphQL info
 * @returns Either true, or a select object with fields as keys and "true" as values
 */
export function parseFieldNode(
    node: FieldNode,
    fragments: { [x: string]: FragmentDefinitionNode }
): ParseResult {
    // Check if it's a primitive or object
    // If it has the "selectionSet" property, it's an object
    if (node.selectionSet) {
        // Call parseSelectionNode for each item in selection set
        let results: SelectObject = {};
        node.selectionSet.selections.forEach((selection: SelectionNode) => {
            results = parseSelectionNode(results, selection, fragments);
        });
        return results;
    }
    // If it doesn't have the "selectionSet" property, it's a primitive.
    else {
        return true;
    }
}

/**
 * Parses a GraphQL FragmentSpreadNode type
 * @param node FragmentSpread node
 * @param fragments All fragments in GraphQL info
 * @returns Select object with fields as keys and "true" as values
 */
export function parseFragmentSpreadNode(
    node: FragmentSpreadNode,
    fragments: { [x: string]: FragmentDefinitionNode }
): SelectObject {
    // Get fragment
    const fragment: FragmentDefinitionNode = fragments[node.name.value];
    // Create result object
    let result: SelectObject = {};
    // Loop through each selection
    fragment.selectionSet.selections.forEach((selection: SelectionNode) => {
        // Parse selection
        result = parseSelectionNode(result, selection, fragments);
    });
    // Find __typename
    result.__typename = fragment.typeCondition.name.value;
    // Return result
    return result;
}

/**
 * Parses a GraphQL InlineFragmentNode (union) type. Each type is its own field
 * @param node InlineFragment node
 * @param fragments All fragments in GraphQL info
 * @returns Select object with fields as keys and "true" as values
 */
export function parseInlineFragmentNode(
    node: InlineFragmentNode,
    fragments: { [x: string]: FragmentDefinitionNode }
): SelectObject {
    // Create result object
    let result: SelectObject = {};
    // Loop through each selection (deconstructed union type)
    node.selectionSet.selections.forEach((selection: SelectionNode) => {
        // Parse selection
        result = parseSelectionNode(result, selection, fragments);
    });
    // Return result
    return result;
}

/**
 * Parses any GraphQL SelectionNode type and returns an object with
 * the formatted select fields as keys and "true" as values
 * @param parsed Current result object
 * @param node Current selection node
 * @param fragments All fragments in GraphQL info
 * @param typename If this is a root query, the typename is the name of the query. This cannot be found in
 * @returns Select object with fields as keys and "true" as values
 */
export function parseSelectionNode(
    parsed: SelectObject,
    node: SelectionNode,
    fragments: { [x: string]: FragmentDefinitionNode }
): SelectObject {
    const result = parsed;
    // Determine which helper function to use
    switch (node.kind) {
        case "Field":
            result[node.name.value] = parseFieldNode(node, fragments);
            break;
        case "FragmentSpread": {
            const spread = parseFragmentSpreadNode(node, fragments);
            for (const key in spread) {
                result[key] = spread[key];
            }
            break;
        }
        case "InlineFragment":
            result[`${node.typeCondition?.name.value}`] = parseInlineFragmentNode(node, fragments);
            break;
    }
    // Return result
    return result;
}

/**
 * Converts a GraphQL resolve info object into an object that:
 * - Is in the shape of the GraphQL response object
 * - Has "true" for every key's value, except for the __typename key
 * @param info - GraphQL resolve info object
 */
export const resolveGraphQLInfo = (info: GraphQLResolveInfo): SelectObject => {
    // Get selected nodes
    const selectionNodes = info.fieldNodes[0].selectionSet?.selections;
    if (!selectionNodes) {
        return {};
    }
    // Create result object
    let result: SelectObject = {};
    // Loop through each selection node
    selectionNodes.forEach((selectionNode: SelectionNode) => {
        // Parse selection
        result = parseSelectionNode(result, selectionNode, info.fragments);
    });
    return result;
};
