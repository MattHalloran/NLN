/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Decimal } from '@prisma/client/runtime';
import { mockPrisma } from '../../__mocks__/prismaUtils';
import { extractColumnIndices, extractLatinNameAndSize, extractSizeFromName, filterContentRows, findColumnIndex, findDuplicateSkus, generateSKU, mergeProcessedSkus, normalizeString, upsertPlantData } from './process';

jest.mock('@prisma/client');

describe('normalizeString', () => {
    test('Basic functionality', () => {
        expect(normalizeString('Hello World')).toBe('hello world');
    });

    test('Case insensitivity', () => {
        expect(normalizeString('HeLLo WoRLd')).toBe('hello world');
    });

    test('Handling emojis', () => {
        expect(normalizeString('Hello🌍 World🚀')).toBe('hello world');
    });

    test('Punctuation removal', () => {
        expect(normalizeString('Hello, World!')).toBe('hello world');
    });

    test('Quote removal', () => {
        expect(normalizeString(`"Hello" 'World'`)).toBe('hello world');
    });

    test('Empty string', () => {
        expect(normalizeString('')).toBe('');
    });

    test('Numbers and special characters', () => {
        expect(normalizeString('123 Hello_ World%')).toBe('123 hello_ world');
    });

    test('Whitespace handling', () => {
        expect(normalizeString('  Hello   World  ')).toBe('  hello   world  ');
    });

    test('Non-string inputs', () => {
        // @ts-ignore: Testing runtime scenario
        expect(() => normalizeString(123)).toThrow();
        // @ts-ignore: Testing runtime scenario
        expect(() => normalizeString(null)).toThrow();
        // @ts-ignore: Testing runtime scenario
        expect(() => normalizeString(undefined)).toThrow();
        // @ts-ignore: Testing runtime scenario
        expect(() => normalizeString({})).toThrow();
    });
});

describe('extractSizeFromName', () => {
    test('Valid name with size', () => {
        expect(extractSizeFromName('Plantae #10')).toEqual({ name: 'Plantae', size: 10 });
    });

    test('Name without size', () => {
        expect(extractSizeFromName('Plantae')).toEqual({ name: 'Plantae', size: null });
    });

    test('Empty string', () => {
        expect(extractSizeFromName('')).toEqual({ name: '', size: null });
    });

    test('Non-string inputs', () => {
        // @ts-ignore: Testing runtime scenario
        expect(extractSizeFromName(123)).toEqual({ name: 123, size: null });
        // @ts-ignore: Testing runtime scenario
        expect(extractSizeFromName(null)).toEqual({ name: null, size: null });
        // @ts-ignore: Testing runtime scenario
        expect(extractSizeFromName(undefined)).toEqual({ name: undefined, size: null });
    });

    test('Edge cases', () => {
        expect(extractSizeFromName('Plantae #10 #20')).toEqual({ name: 'Plantae', size: 10 });
        expect(extractSizeFromName('Plantae #')).toEqual({ name: 'Plantae #', size: null });
    });
});

// Mock Math.random
const mockMath = Object.create(global.Math);
mockMath.random = () => 0.5;
global.Math = mockMath;

describe('generateSKU', () => {
    test('Basic functionality', () => {
        const sku = generateSKU('Plantae', 15);
        // Expect SKU to start with 'PL', followed by 4 fixed letters (since random is mocked), and then '15'
        expect(sku).toMatch(/^PLNNNN15$/);
    });

    test('Size handling', () => {
        expect(generateSKU('Plantae', null)).toMatch(/^PLNNNN00$/);
        expect(generateSKU('Plantae', 9)).toMatch(/^PLNNNN09$/);
        expect(generateSKU('Plantae', 10)).toMatch(/^PLNNNN10$/);
    });

    test('Latin name handling', () => {
        expect(generateSKU('P', 10)).toMatch(/^PZNNNN10$/); // 'Z' is used to pad the prefix
        expect(generateSKU('', 10)).toMatch(/^ZZNNNN10$/); // 'ZZ' is used for missing Latin name characters
    });

    test('Random character generation', () => {
        // Reset Math.random to its original implementation for this test
        jest.spyOn(global.Math, 'random').mockRestore();
        const sku = generateSKU('Plantae', 10);
        expect(sku).toMatch(/^PL[A-Z]{4}10$/);
    });

    test('Edge cases', () => {
        expect(generateSKU('Èé', 10)).toMatch(/^EENNNN10$/); // Accents removed, 'E' kept
        expect(generateSKU('123$', 10)).toMatch(/^ZZNNNN10$/); // Invalid characters removed
        expect(generateSKU('12F3$G', 10)).toMatch(/^FGNNNN10$/); // Invalid characters removed
        expect(generateSKU('a1!Êb', 10)).toMatch(/^AENNNN10$/); // Keeps 'a', 'b', removes '1', '!', and normalizes 'Ê'
        expect(generateSKU('', null)).toMatch(/^ZZNNNN00$/);
        expect(generateSKU('A', null)).toMatch(/^AZNNNN00$/);
    });
});

describe('findColumnIndex', () => {
    test('Finding a column index', () => {
        const header = ['Botanical Name', 'Common Name', 'Price'];
        const potentialNames = ['Botanical Name', 'Latin Name', 'Description'];
        expect(findColumnIndex(header, potentialNames)).toBe(0);
    });

    test('Case insensitivity', () => {
        const header = ['botanical name', 'common name', 'price'];
        const potentialNames = ['Botanical Name', 'Latin Name'];
        expect(findColumnIndex(header, potentialNames)).toBe(0);
    });

    test('Trimming spaces', () => {
        const header = [' Botanical Name ', 'Common Name', 'Price'];
        const potentialNames = ['Botanical Name', 'Latin Name'];
        expect(findColumnIndex(header, potentialNames)).toBe(0);
    });

    test('Column not found', () => {
        const header = ['Botanical Name', 'Common Name', 'Price'];
        const potentialNames = ['Size', 'Quantity'];
        expect(findColumnIndex(header, potentialNames)).toBe(-1);
    });

    test('Empty header array', () => {
        const header = [];
        const potentialNames = ['Botanical Name', 'Latin Name'];
        expect(findColumnIndex(header, potentialNames)).toBe(-1);
    });

    test('Empty potential names array', () => {
        const header = ['Botanical Name', 'Common Name', 'Price'];
        const potentialNames = [];
        expect(findColumnIndex(header, potentialNames)).toBe(-1);
    });

    test('Non-string header elements', () => {
        const header = [null, undefined, 123, 'Botanical Name'];
        const potentialNames = ['Botanical Name', 'Latin Name'];
        // @ts-ignore: Testing runtime scenario
        expect(findColumnIndex(header, potentialNames)).toBe(3);
    });
});

describe('filterContentRows', () => {
    test('Filtering empty and whitespace-only rows', () => {
        const rows = [['', ' ', '   '], ['valid', 'data', 'here']];
        const filtered = filterContentRows(rows);
        expect(filtered).toEqual([['valid', 'data', 'here']]);
    });

    test('Filtering rows starting with "Column"', () => {
        const rows = [['Column1', 'Column2', 'Column3'], ['valid', 'data', 'here']];
        const filtered = filterContentRows(rows);
        expect(filtered).toEqual([['valid', 'data', 'here']]);
    });

    test('Retaining valid rows', () => {
        const rows = [['valid', 'data', 'here'], ['another', 'valid', 'row']];
        const filtered = filterContentRows(rows);
        expect(filtered).toEqual([['valid', 'data', 'here'], ['another', 'valid', 'row']]);
    });

    test('Handling mixed rows', () => {
        const rows = [['', ' ', '   '], ['valid', 'data', 'here'], ['Column1', 'Column2', 'Column3']];
        const filtered = filterContentRows(rows);
        expect(filtered).toEqual([['valid', 'data', 'here']]);
    });

    test('Empty input array', () => {
        const rows = [];
        const filtered = filterContentRows(rows);
        expect(filtered).toEqual([]);
    });

    test('Non-string cell values', () => {
        const rows = [[123, true, null], ['valid', 'data', 'here']];
        const filtered = filterContentRows(rows);
        expect(filtered).toEqual([['valid', 'data', 'here']]);
    });
});

describe('extractColumnIndices', () => {
    test('Correctly finds indices of all columns', () => {
        const header = ['Botanical Name', 'Common Name', 'Price', 'Notes'];
        const indices = extractColumnIndices(header);
        expect(indices).toEqual({
            latinName: 0,
            commonName: 1,
            size: -1,
            note: 3,
            price: 2,
            sku: -1,
            availability: -1
        });
    });

    test('Handles missing columns', () => {
        const header = ['Botanical', 'Price 10+'];
        const indices = extractColumnIndices(header);
        expect(indices).toEqual({
            latinName: 0,
            commonName: -1,
            size: -1,
            note: -1,
            price: 1,
            sku: -1,
            availability: -1
        });
    });

    test('Ignores case and extra spaces', () => {
        const header = [' botanical name ', ' COMMON NAME ', '  price '];
        const indices = extractColumnIndices(header);
        expect(indices).toEqual({
            latinName: 0,
            commonName: 1,
            size: -1,
            note: -1,
            price: 2,
            sku: -1,
            availability: -1
        });
    });

    test('Returns -1 for all columns if header is empty', () => {
        const header = [];
        const indices = extractColumnIndices(header);
        expect(indices).toEqual({
            latinName: -1,
            commonName: -1,
            size: -1,
            note: -1,
            price: -1,
            sku: -1,
            availability: -1
        });
    });

    test('Handles non-string header elements', () => {
        const header = [null, undefined, 123, 'Botanical Name'];
        // @ts-ignore: Testing runtime scenario
        const indices = extractColumnIndices(header);
        expect(indices).toEqual({
            latinName: 3,
            commonName: -1,
            size: -1,
            note: -1,
            price: -1,
            sku: -1,
            availability: -1
        });
    });
});

enum SkuStatus {
    Active = "Active",
    Deleted = "Deleted",
    Inactive = "Inactive",
}

describe('findDuplicateSkus', () => {
    test('Correctly identifies duplicate SKUs for deletion', () => {
        const existingSkus = {
            'plant1': [
                { skuId: 'sku1', size: new Decimal(2.5), availability: 10, status: SkuStatus.Active, isNew: false },
                { skuId: 'sku2', size: new Decimal(2.5), availability: 5, status: SkuStatus.Inactive, isNew: false },
                { skuId: 'sku3', size: new Decimal(5.0), availability: 15, status: SkuStatus.Active, isNew: false }
            ],
            'plant2': [
                { skuId: 'sku4', size: new Decimal(3.0), availability: 8, status: SkuStatus.Active, isNew: false },
                { skuId: 'sku5', size: new Decimal(3.0), availability: 10, status: SkuStatus.Active, isNew: false }
            ]
        };

        const duplicates = findDuplicateSkus(existingSkus);
        expect(duplicates).toEqual(['sku2', 'sku4']);
    });

    test('Prefers active SKUs over inactive ones', () => {
        const existingSkus = {
            'plant1': [
                { skuId: 'sku1', size: new Decimal(2.5), availability: 5, status: SkuStatus.Inactive, isNew: false },
                { skuId: 'sku2', size: new Decimal(2.5), availability: 10, status: SkuStatus.Active, isNew: false }
            ]
        };

        const duplicates = findDuplicateSkus(existingSkus);
        expect(duplicates).toEqual(['sku1']);
    });

    test('Prefers SKUs with higher availability when status is the same', () => {
        const existingSkus = {
            'plant1': [
                { skuId: 'sku1', size: new Decimal(2.5), availability: 10, status: SkuStatus.Active, isNew: false },
                { skuId: 'sku2', size: new Decimal(2.5), availability: 15, status: SkuStatus.Active, isNew: false }
            ]
        };

        const duplicates = findDuplicateSkus(existingSkus);
        expect(duplicates).toEqual(['sku1']);
    });

    test('Handles empty input', () => {
        const existingSkus = {};

        const duplicates = findDuplicateSkus(existingSkus);
        expect(duplicates).toEqual([]);
    });

    test('Handles single SKU per plant without deletion', () => {
        const existingSkus = {
            'plant1': [
                { skuId: 'sku1', size: new Decimal(2.5), availability: 10, status: SkuStatus.Active, isNew: false }
            ]
        };

        const duplicates = findDuplicateSkus(existingSkus);
        expect(duplicates).toEqual([]);
    });

    test('Handles SKUs with Deleted status correctly', () => {
        const existingSkus = {
            'plant1': [
                { skuId: 'sku1', size: new Decimal(2.5), availability: 10, status: SkuStatus.Active, isNew: false },
                { skuId: 'sku2', size: new Decimal(2.5), availability: 5, status: SkuStatus.Deleted, isNew: false },
                { skuId: 'sku3', size: new Decimal(2.5), availability: 8, status: SkuStatus.Inactive, isNew: false }
            ],
            'plant2': [
                { skuId: 'sku4', size: new Decimal(3.0), availability: 12, status: SkuStatus.Deleted, isNew: false },
                { skuId: 'sku5', size: new Decimal(3.0), availability: 12, status: SkuStatus.Active, isNew: false }
            ]
        };

        const duplicates = findDuplicateSkus(existingSkus);
        // Assuming that Deleted SKUs are treated similarly to Inactive ones in terms of priority
        expect(duplicates).toEqual(['sku3', 'sku2', 'sku4']);
    });

    test('Prefers new SKUs over existing ones', () => {
        const existingSkus = {
            'plant1': [
                { skuId: 'sku1', size: new Decimal(2.5), availability: 10, status: SkuStatus.Active, isNew: false },
                { skuId: 'sku2', size: new Decimal(2.5), availability: 1, status: SkuStatus.Active, isNew: true }
            ]
        };

        const duplicates = findDuplicateSkus(existingSkus);
        expect(duplicates).toEqual(['sku1']);
    });

    test('No duplicate SKU IDs in the result', () => {
        const existingSkus = {
            'plant1': [
                { skuId: 'sku1', size: new Decimal(2.5), availability: 10, status: SkuStatus.Active, isNew: true },
                { skuId: 'sku2', size: new Decimal(2.5), availability: 5, status: SkuStatus.Active, isNew: false },
                { skuId: 'sku3', size: new Decimal(5.0), availability: 15, status: SkuStatus.Active, isNew: false }
            ],
            'plant2': [
                { skuId: 'sku4', size: new Decimal(3.0), availability: 8, status: SkuStatus.Active, isNew: false },
                { skuId: 'sku5', size: new Decimal(3.0), availability: 10, status: SkuStatus.Active, isNew: true }
            ]
        };

        const duplicates = findDuplicateSkus(existingSkus);
        const hasDuplicates = new Set(duplicates).size !== duplicates.length;
        expect(hasDuplicates).toBeFalsy();
    });
});

const mockCommonNames = [
    { plantId: 'plant1', value: 'Common Plant 1' },
    { plantId: 'plant2', value: 'Common Plant 2' },
    // ... other mock common names
];

const mockColumnIndexMap = {
    latinName: 0,
    size: 1,
    commonName: 2,
    // ... other indices as needed
};

describe('extractLatinNameAndSize', () => {
    test('Extracts latin name, size, and common name correctly', () => {
        const row = ['Latin Name 1', '10', 'Common Plant 1'];
        const result = extractLatinNameAndSize(row, mockColumnIndexMap, mockCommonNames);
        expect(result).toEqual({ latinName: 'Latin Name 1', size: 10 });
    });

    test('Handles missing size and extracts from latin name', () => {
        const row = ['Latin Name 1 #10', '', 'Common Plant 1'];
        const result = extractLatinNameAndSize(row, mockColumnIndexMap, mockCommonNames);
        expect(result).toEqual({ latinName: 'Latin Name 1', size: 10 });
    });

    test('Handles missing latin name and finds it from common name', () => {
        const row = ['', '', 'Common Plant 1'];
        const result = extractLatinNameAndSize(row, mockColumnIndexMap, mockCommonNames);
        expect(result).toEqual({ latinName: 'plant1', size: null });
    });

    test('Returns null for all fields if they are not found', () => {
        const row = ['', '', ''];
        const result = extractLatinNameAndSize(row, mockColumnIndexMap, mockCommonNames);
        expect(result).toEqual({ latinName: null, size: null });
    });

    test('Handles non-string size correctly', () => {
        const row = ['Latin Name 2', 15, 'Common Plant 2'];
        const result = extractLatinNameAndSize(row, mockColumnIndexMap, mockCommonNames);
        expect(result).toEqual({ latinName: 'Latin Name 2', size: 15 });
    });

    test('Handles size with mixed characters', () => {
        const row = ['Latin Name 3', 'Size: 20cm', 'Common Plant 3'];
        const result = extractLatinNameAndSize(row, mockColumnIndexMap, mockCommonNames);
        expect(result).toEqual({ latinName: 'Latin Name 3', size: 20 });
    });

    test('Handles empty latin name and size, but valid common name', () => {
        const row = ['', '', 'Common Plant 1'];
        const result = extractLatinNameAndSize(row, mockColumnIndexMap, mockCommonNames);
        expect(result).toEqual({ latinName: 'plant1', size: null });
    });

    test('Handles invalid size format', () => {
        const row = ['Latin Name 4', 'Invalid Size', 'Common Plant 4'];
        const result = extractLatinNameAndSize(row, mockColumnIndexMap, mockCommonNames);
        expect(result).toEqual({ latinName: 'Latin Name 4', size: null });
    });

    test('Handles missing common name with valid latin name and size', () => {
        const row = ['Latin Name 5', '30', ''];
        const result = extractLatinNameAndSize(row, mockColumnIndexMap, mockCommonNames);
        expect(result).toEqual({ latinName: 'Latin Name 5', size: 30 });
    });

    test('Handles all empty fields', () => {
        const row = ['', '', ''];
        const result = extractLatinNameAndSize(row, mockColumnIndexMap, mockCommonNames);
        expect(result).toEqual({ latinName: null, size: null });
    });

    test('Handles latin name with embedded size but no separate size column', () => {
        const row = ['Latin Name 6 #25', '', ''];
        const result = extractLatinNameAndSize(row, mockColumnIndexMap, mockCommonNames);
        expect(result).toEqual({ latinName: 'Latin Name 6', size: 25 });
    });

    test('Handles non-numeric size in latin name', () => {
        const row = ['Latin Name 7 #SizeLarge', '', ''];
        const result = extractLatinNameAndSize(row, mockColumnIndexMap, mockCommonNames);
        expect(result).toEqual({ latinName: 'Latin Name 7 #SizeLarge', size: null });
    });
});

describe('mergeProcessedSkus', () => {
    test('Merging with empty existing SKUs', () => {
        const existingSkus = {};
        const processedSkus = {
            'plant1': [{ skuId: 'sku1', size: new Decimal(2.5), availability: 10, status: SkuStatus.Active, isNew: true }]
        };

        const result = mergeProcessedSkus(processedSkus, existingSkus);
        expect(result).toEqual(processedSkus);
    });

    test('Merging with empty processed SKUs', () => {
        const existingSkus = {
            'plant1': [{ skuId: 'sku1', size: new Decimal(2.5), availability: 10, status: SkuStatus.Active, isNew: false }]
        };
        const processedSkus = {};

        const result = mergeProcessedSkus(processedSkus, existingSkus);
        expect(result).toEqual(existingSkus);
    });

    test('Merging non-overlapping SKUs', () => {
        const existingSkus = {
            'plant1': [{ skuId: 'sku1', size: new Decimal(2.5), availability: 10, status: SkuStatus.Active, isNew: false }]
        };
        const processedSkus = {
            'plant2': [{ skuId: 'sku2', size: new Decimal(3.0), availability: 5, status: SkuStatus.Active, isNew: true }]
        };

        const result = mergeProcessedSkus(processedSkus, existingSkus);
        expect(result['plant1']).toEqual(existingSkus['plant1']);
        expect(result['plant2']).toEqual(processedSkus['plant2']);
    });

    test('Merging overlapping SKUs', () => {
        const existingSkus = {
            'plant1': [{ skuId: 'sku1', size: new Decimal(2.5), availability: 10, status: SkuStatus.Active, isNew: false }]
        };
        const processedSkus = {
            'plant1': [{ skuId: 'sku2', size: new Decimal(3.0), availability: 5, status: SkuStatus.Active, isNew: true }]
        };

        const result = mergeProcessedSkus(processedSkus, existingSkus);
        expect(result['plant1']).toContainEqual(existingSkus['plant1'][0]);
        expect(result['plant1']).toContainEqual(processedSkus['plant1'][0]);
    });

    test('Merging maintains SKU data integrity', () => {
        const existingSkus = {
            'plant1': [{ skuId: 'sku1', size: new Decimal(2.5), availability: 10, status: SkuStatus.Active, isNew: false }]
        };
        const processedSkus = {
            'plant1': [{ skuId: 'sku2', size: new Decimal(3.0), availability: 5, status: SkuStatus.Active, isNew: true }]
        };

        const result = mergeProcessedSkus(processedSkus, existingSkus);
        expect(result['plant1']).toContainEqual(expect.objectContaining({ isNew: true }));
        expect(result['plant1']).toContainEqual(expect.objectContaining({ isNew: false }));
    });
});

const mockPlantData = [
    {
        id: '1',
        latinName: 'Ficus lyrata',
        traits: [
            { id: 't1', name: 'Trait1', value: 'Value1' },
            { id: 't2', name: 'Trait2', value: 'Value2' }
        ]
    },
    {
        id: '2',
        latinName: 'Monstera deliciosa',
        traits: [
            { id: 't3', name: 'Trait3', value: 'Value3' }
        ]
    }
];
const mockPlantIds = mockPlantData.map(plant => plant.id);

describe('upsertPlantData', () => {
    let prismaMock;

    beforeEach(() => {
        // Reset the mock for each test
        jest.clearAllMocks();

        // Mock data for the Plant model
        prismaMock = mockPrisma({
            Plant: [...mockPlantData],
        });
    });

    test('should find and return an existing plant by latin name', async () => {
        const latinName = 'Ficus lyrata';
        const plant = await upsertPlantData(latinName, prismaMock);

        expect(plant).toBeDefined();
        expect(plant.id).toBe('1');
        expect(plant.latinName).toBe(latinName);
    });

    test('should create and return a new plant if it does not exist', async () => {
        const latinName = 'Alocasia amazonica';
        const plant = await upsertPlantData(latinName, prismaMock);

        expect(plant).toBeDefined();
        expect(plant.latinName).toBe(latinName);
        expect(mockPlantIds).not.toContain(plant.id);
    });

    test('should find and return an existing plant by latin name, case insensitive', async () => {
        const latinName = 'ficus lyrata'; // Different case
        const plant = await upsertPlantData(latinName, prismaMock);

        expect(plant).toBeDefined();
        expect(plant.id).toBe('1');
        expect(plant.latinName).toBe('Ficus lyrata'); // Original case in mock data
    });

    test('should create a new plant with correct casing if it does not exist', async () => {
        const latinName = 'Alocasia Amazonica'; // Case as intended
        const plant = await upsertPlantData(latinName, prismaMock);

        expect(plant).toBeDefined();
        expect(plant.latinName).toBe(latinName); // Maintains the case of input
        expect(mockPlantIds).not.toContain(plant.id);
    });

    test('should return a plant with correct traits', async () => {
        const latinName = 'Ficus lyrata';
        const plant = await upsertPlantData(latinName, prismaMock);

        expect(plant).toBeDefined();
        expect(plant.id).toBe('1');
        expect(plant.latinName).toBe(latinName);
        expect(plant.traits).toHaveLength(2);
        expect(plant.traits![0]).toEqual({ id: 't1', name: 'Trait1', value: 'Value1' });
        expect(plant.traits![1]).toEqual({ id: 't2', name: 'Trait2', value: 'Value2' });
    });

    test('should create a new plant with no traits if it does not exist', async () => {
        const latinName = 'Alocasia amazonica';
        const plant = await upsertPlantData(latinName, prismaMock);

        expect(plant).toBeDefined();
        expect(plant.latinName).toBe(latinName);
        expect(mockPlantIds).not.toContain(plant.id);
        expect(plant.traits).toBeUndefined();
    });
});

const mockPlantTraits = [
    { plantId: '1', name: 'latinName', value: 'Ficus lyrata' },
    { plantId: '1', name: 'commonName', value: 'Fiddle Leaf Fig' },
    { plantId: '2', name: 'latinName', value: 'Monstera deliciosa' }
];

const createMockRow = (latinName, commonName) => {
    const row: any[] = [];
    row[mockColumnIndexMap.latinName] = latinName;
    row[mockColumnIndexMap.commonName] = commonName;
    return row;
};