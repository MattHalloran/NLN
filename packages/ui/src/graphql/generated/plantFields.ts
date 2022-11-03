/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL fragment: plantFields
// ====================================================

export interface plantFields_traits {
  __typename: "PlantTrait";
  name: string;
  value: string;
}

export interface plantFields_images_image_files {
  __typename: "ImageFile";
  src: string;
  width: number;
  height: number;
}

export interface plantFields_images_image {
  __typename: "Image";
  hash: string;
  alt: string | null;
  description: string | null;
  files: plantFields_images_image_files[] | null;
}

export interface plantFields_images {
  __typename: "PlantImage";
  index: number;
  isDisplay: boolean;
  image: plantFields_images_image;
}

export interface plantFields {
  __typename: "Plant";
  id: string;
  latinName: string;
  traits: plantFields_traits[] | null;
  images: plantFields_images[] | null;
}
