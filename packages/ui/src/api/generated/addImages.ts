/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { AddImagesInput } from "./globalTypes";

// ====================================================
// GraphQL mutation operation: addImages
// ====================================================

export interface addImages_addImages {
    __typename: "AddImageResponse";
    success: boolean;
    src: string | null;
    hash: string | null;
    width: number | null;
    height: number | null;
}

export interface addImages {
    addImages: addImages_addImages[];
}

export interface addImagesVariables {
    input: AddImagesInput;
}
