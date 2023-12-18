import _ from "lodash";
import { Image, ImageFile, ImageInfo } from "types";

export const getImageFiles = (data: ImageInfo | Image | null | undefined): ImageFile[] => {
    if (!data) return [];
    if ((data as Image).__typename === "Image") return (data as Image).files ?? [];
    return getImageFiles((data as ImageInfo).image);
}

// Return the image name with the best-match size
// Size is measured by width
// Priority:
// 0. largest size if none requested
// 1. exact size match
// 2. smallest size greater than requested
// 3. largest size smaller than requested
export function getImageSrc(image: ImageInfo | Image, size?: any) {
    // Create copy of image files, to prevent any problems with sorting
    const files = [...getImageFiles(image)];
    if (files.length === 0) return null;
    // Return largest size if size not specified
    if (!_.isNumber(size)) return files.sort((a, b) => b.width - a.width)[0].src;
    // Determine sizes >= requested
    const largerSizes = files.filter(f => f.width >= size);
    // If any images match, return the smallest one
    if (largerSizes.length > 0) return largerSizes.sort((a, b) => a.width - b.width)[0].src;
    // Determine sizes < requested
    const smallerSizes = files.filter(f => f.width < size);
    // If any images match, return the largest one
    if (smallerSizes.length > 0) return smallerSizes.sort((a, b) => b.width - a.width)[0].src;
    // This code is reached if the files contain no size data. In that case, return the first image
    return files[0].src;
}
