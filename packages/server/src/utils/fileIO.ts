import path from 'path';
import fs from 'fs';
import { genErrorCode, logger, LogLevel } from '../logger';
import pkg from '@prisma/client';
import convert from 'heic-convert';
import probe from 'probe-image-size';
import imghash from 'imghash';
import sharp from 'sharp';
import { IMAGE_EXTENSION, IMAGE_SIZE } from '@shared/consts';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// How many times a file name should be checked before giving up
// ex: if 'billy.png' is taken, tries 'billy-1.png', 'billy-2.png', etc.
const MAX_FILE_NAME_ATTEMPTS = 100;
// Max size of a file buffer (how large of a file are you willing to download?)
const MAX_BUFFER_SIZE = 1000000000;
// Location of persistent storage directory
const UPLOAD_DIR = `${process.env.PROJECT_DIR}/data/uploads`;

/**
 * Replaces any invalid characters from a file name
 * @param file Name of file (e.g. 'boop.png', 'images/boop.png')
 * @param defaultFolder Default for file's location (e.g. 'images')
 * @returns Object of shape:
 * - name - name of file, excluding extension and location
 * - ext - extension of file
 * - folder - path of file
 */
export function clean(file: string, defaultFolder?: string): {
    name?: string,
    ext?: string,
    folder?: string,
} {
    const pathRegex = /([^a-z0-9 \.\-\_\/]+)/gi;
    // First, remove any invalid characters
    const cleanPath = file.replace(pathRegex, '');
    const folder = path.dirname(cleanPath)?.replace('.', '') || defaultFolder?.replace(pathRegex, '')?.replace('.', '');
    if (!cleanPath || cleanPath.length === 0) return { };
    // If a directory was passed in, instead of a file
    if (!cleanPath.includes('.')) return { folder: folder ?? defaultFolder };
    const { name, ext } = path.parse(path.basename(cleanPath));
    return { name, ext, folder: folder ?? defaultFolder };
}

/**
 * Finds a filename that can be used at the specified path
 * @param file The preferred file name
 * @param defaultFolder Directory the file will be in, if not already part of file name
 * @returns The preferred file name, or the name with the lowest available number appended to it
 * (starting from 0)
 */
export async function findFileName(file: string, defaultFolder?: string): Promise<{
    name?: string,
    ext?: string,
    folder?: string,
}> {
    const { name, ext, folder } = clean(file, defaultFolder);
    // If file name is available, no need to append a number
    if (!fs.existsSync(`${UPLOAD_DIR}/${folder}/${name}${ext}`)) return { name, ext, folder };
    // If file name was not available, start appending a number until one works
    let curr = 0;
    while (curr < MAX_FILE_NAME_ATTEMPTS) {
        let currName = `${name}-${curr}${ext}`;
        if (!fs.existsSync(`${UPLOAD_DIR}/${folder}/${currName}`)) return { name: `${currName}`, ext: ext, folder: folder };
        curr++;
    }
    // If no valid name found after max tries, return null
    return { };
}

/**
 * Convert a file stream into a buffer
 * @param stream File stream
 * @param numBytes Maximum number of bytes to read from stream
 * @returns Buffer of file's contents
 */
function streamToBuffer(stream: fs.ReadStream, numBytes: number = MAX_BUFFER_SIZE): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        let _buf: Buffer[] = [];

        stream.on('data', (chunk: Buffer) => {
            _buf.push(chunk);
            if (_buf.length >= numBytes) stream.destroy();
        })
        stream.on('end', () => resolve(Buffer.concat(_buf)))
        stream.on('error', err => reject(err))

    })
}

/**
 * Finds all image sizes smaller or equal to the image size
 * @param width Width of image
 * @param height Height of image
 * @returns Object with same shape as IMAGE_SIZE, but with invalid sizes removed
 */
function resizeOptions(width: number, height: number): { [key: string]: number } {
    let sizes: { [key: string]: number } = { };
    for (const [key, value] of Object.entries(IMAGE_SIZE)) {
        if (width >= value || height >= value) sizes[key] = value;
    }
    return sizes;
}

/**
 * Saves a file in the specified folder, that folder being located in UPLOAD_DIR
 * @param stream Data stream of file
 * @param filename Name of file, including extension and folder (ex: 'public/boop.png')
 * @param mimetype Mime type of file (e.g. 'image/png', 'application/vnd.ms-excel')
 * @param overwrite Boolean indicating if existing files can be overwritten
 * @param acceptedTypes String or array of accepted file types, in mimetype form (e.g. 'image/png', 'application/vnd.ms-excel')
 * @returns An object containing:
 * - success - True if successful
 * - filename - Name of file that was saved (since naming conflicts might mean that a number was appended)
 */
export async function saveFile(stream: any, filename: string, mimetype: any, overwrite?: boolean, acceptedTypes?: string[]) {
    try {
        const { name, ext, folder } = await (overwrite ? clean(filename, 'public') : findFileName(filename));
        if (name === null) throw Error('Could not create a valid file name');
        if (acceptedTypes) {
            if (Array.isArray(acceptedTypes) && !acceptedTypes.some(type => mimetype.startsWith(type) || ext === type)) {
                throw Error('File type not accepted');
            }
        }
        // Download the file
        await stream.pipe(fs.createWriteStream(`${UPLOAD_DIR}/${folder}/${name}${ext}`));
        return {
            success: true,
            filename: `${folder}/${name}${ext}`
        }
    } catch (error) {
        logger.log(LogLevel.error, 'Failed to save file.', { code: genErrorCode('0008'), error });
        return {
            success: false,
            filename: filename ?? ''
        }
    }
}

/**
 * Deletes the specified file from the specified folder (in UPLOAD_DIR)
 * @param file Name of file, including extension (ex: 'boop.png')
 * @returns True if successful
 */
export async function deleteFile(file: string) {
    try {
        const { name, ext, folder } = clean(file);
        fs.unlinkSync(`${UPLOAD_DIR}/${folder}/${name}${ext}`);
        return true;
    } catch (error) {
        logger.log(LogLevel.error, 'Failed to delete file', { code: genErrorCode('0009'), error });
        return false;
    }
}

interface SaveImageProps {
    file: Promise<any>,
    alt?: string,
    description?: string,
    labels?: string[],
    errorOnDuplicate?: boolean,
}

/**
 * Saves an image file and its resizes in the specified folder at the server root directory
 * @param file File to save
 * @param alt Alt text for image
 * @param description Description of image
 * @param labels Labels for image. Similar concept to tags, but longer
 * @param errorOnDuplicate If image previously updated, throw error 
 * @returns Object of shape { success, src, hash }
 */
export async function saveImage({ file, alt, description, labels, errorOnDuplicate = false }: SaveImageProps) {
    try {
        // Destructure data. Each file upload is a promise
        const { createReadStream, filename, mimetype } = await file;
        // Make sure that the file is actually an image
        if (!mimetype.startsWith('image/')) throw Error('Invalid mimetype')
        // Make sure image type is supported
        let { ext: extCheck } = path.parse(filename)
        if (Object.values(IMAGE_EXTENSION).indexOf(extCheck.toLowerCase()) <= 0) throw Error('Image type not supported')
        // Create a read stream
        const stream = createReadStream();
        const { name, ext, folder } = await findFileName(filename, 'images')
        if (name === null) throw Error('Could not create a valid file name');
        // Determine image dimensions
        let image_buffer = await streamToBuffer(stream);
        const dimensions = probe.sync(image_buffer);
        if (dimensions === null) throw new Error('Could not determine image dimensions');
        console.log('GOT DIMENSIONS', dimensions);
        // If image is .heic or .heif, convert to jpg. Thanks, Apple
        if (['.heic', '.heif'].includes(extCheck.toLowerCase())) {
            image_buffer = await convert({ //TODO breaks for some reason
                buffer: image_buffer, // the HEIC file buffer
                format: 'JPEG',      // output format
                quality: 1           // the jpeg compression quality, between 0 and 1
            });
            extCheck = 'jpg'
        }
        // Determine image hash
        const hash = await imghash.hash(image_buffer);
        console.log('IMAGE HASH', hash)
        // Check if hash already exists (image previously uploaded)
        const previously_uploaded = await prisma.image.findUnique({ where: { hash } });
        console.log('previously uploaded', previously_uploaded);
        if (previously_uploaded && errorOnDuplicate) throw Error('File has already been uploaded');
        // Download the original image, and store metadata in database
        const full_size_filename = `${folder}/${name}-XXL${extCheck}`;
        console.log('name', full_size_filename);
        await sharp(image_buffer).toFile(`${UPLOAD_DIR}/${full_size_filename}`);
        const imageData = { hash, alt, description };
        await prisma.image.upsert({
            where: { hash },
            create: imageData,
            update: imageData
        })
        await prisma.image_file.deleteMany({ where: { hash } });
        await prisma.image_file.create({
            data: {
                hash,
                src: full_size_filename,
                width: dimensions.width,
                height: dimensions.height
            }
        })
        if (Array.isArray(labels)) {
            await prisma.image_labels.deleteMany({ where: { hash } });
            for (let i = 0; i < labels.length; i++) {
                await prisma.image_labels.create({
                    data: {
                        hash,
                        label: labels[i],
                        index: i
                    }
                })
            }
        }
        // Find resize options
        const sizes = resizeOptions(dimensions.width, dimensions.height);
        for (const [key, value] of Object.entries(sizes)) {
            // XXL reserved for original image
            if (key === 'XXL') continue;
            // Use largest dimension for resize
            const sizing_dimension = dimensions.width > dimensions.height ? 'width' : 'height';
            const resize_filename = `${folder}/${name}-${key}${extCheck}`;
            const { width, height } = await sharp(image_buffer)
                .resize({ [sizing_dimension]: value })
                .toFile(`${UPLOAD_DIR}/${resize_filename}`);
            await prisma.image_file.create({
                data: {
                    hash,
                    src: resize_filename,
                    width: width,
                    height: height
                }
            });
        }
        return {
            success: true,
            src: full_size_filename,
            hash: hash
        }
    } catch (error) {
        console.error(error);
        return {
            success: false,
            src: null,
            hash: null,
        }
    }
}

/**
 * Deletes an image and all resizes, using its hash
 * @param hash Hash of image
 * @returns True if successful
 */
export async function deleteImage(hash: string) {
    // Find all files associated with image
    const imageData = await prisma.image.findUnique({
        where: { hash },
        select: { files: { select: { src: true } } }
    });
    if (!imageData) return false;
    // Delete database information for image
    await prisma.image.delete({ where: { hash } });
    // Delete image files
    let success = true;
    if (Array.isArray(imageData.files)) {
        for (const file of imageData.files) {
            if (!await deleteFile(file.src)) success = false;
        }
    }
    return success;
}

/**
 * Reads all lines from each file in an array of filenames
 * @param files Array of filenames
 * @returns Array of data from each file
 */
export async function readFiles(files: string[]) {
    let data = [];
    for (const file of files) {
        const { name, ext, folder } = clean(file, 'public');
        const path = `${UPLOAD_DIR}/${folder}/${name}${ext}`;
        if (fs.existsSync(path)) {
            data.push(fs.readFileSync(path, 'utf8'));
        } else {
            data.push(null);
        }
    }
    return data;
}

/**
 * Saves a list of files
 * @param files Array of filenames, including extension (ex: 'boop.png')
 * @param overwrite Boolean indicating if existing files should be overwritten
 * @param acceptedTypes String or array of accepted file types, in mimetype form (e.g. 'image/png', 'application/vnd.ms-excel')
 * @returns Array of each filename saved, or null if unsuccessful
 */
export async function saveFiles(files: any, overwrite: boolean = true, acceptedTypes: string[] = []) {
    let data = [];
    for (const file of files) {
        const { createReadStream, filename, mimetype } = await file;
        const stream = createReadStream();
        const { success, filename: finalFilename } = await saveFile(stream, filename, mimetype, overwrite, acceptedTypes);
        data.push(success ? finalFilename : null);
    }
    return data;
}

/**
 * Appends data to the end of a file. Useful for writing to a log file
 * @param file Name of file, including extension (ex: 'boop.txt')
 * @returns True if successful
 */
export async function appendToFile(file: string, data: string) {
    try {
        const { name, ext, folder } = clean(file, 'public');
        fs.appendFileSync(`${UPLOAD_DIR}/${folder}/${name}${ext}`, data);
        return true;
    } catch (error) {
        logger.log(LogLevel.error, 'Failed to append to file', { code: genErrorCode('00010'), error });
        return false;
    }
}