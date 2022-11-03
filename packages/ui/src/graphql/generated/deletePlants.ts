/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { DeleteManyInput } from "./globalTypes";

// ====================================================
// GraphQL mutation operation: deletePlants
// ====================================================

export interface deletePlants_deletePlants {
  __typename: "Count";
  count: number | null;
}

export interface deletePlants {
  deletePlants: deletePlants_deletePlants;
}

export interface deletePlantsVariables {
  input: DeleteManyInput;
}
