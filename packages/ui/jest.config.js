export default {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg|webp|ico)$': '<rootDir>/src/__mocks__/fileMock.js',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^route(.*)$': '<rootDir>/src/route$1',
        '^utils(.*)$': '<rootDir>/src/utils$1',
        '^components/(.*)$': '<rootDir>/src/components/$1',
        '^components$': '<rootDir>/src/components/index.ts',
        '^contexts/(.*)$': '<rootDir>/src/contexts/$1',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(lodash-es)/)',
    ],
    transform: {
        '^.+\\.tsx?$': ['@swc/jest', {
            jsc: {
                parser: {
                    syntax: 'typescript',
                    tsx: true,
                },
                transform: {
                    react: {
                        runtime: 'automatic',
                    },
                },
            },
        }],
        '^.+\\.jsx?$': ['@swc/jest', {
            jsc: {
                parser: {
                    syntax: 'ecmascript',
                },
            },
        }],
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    testMatch: [
        '**/__tests__/**/*.(test|spec).{ts,tsx}',
        '**/*.(test|spec).{ts,tsx}',
    ],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/index.tsx',
        '!src/**/*.stories.{ts,tsx}',
        '!src/__mocks__/**',
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
    ],
};
