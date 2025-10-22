import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [
    // Global ignores
    {
        ignores: [
            "**/dist/**",
            "**/build/**",
            "**/coverage/**",
            "**/node_modules/**",
            "**/generated/**",
            "**/archived/**",
            "vite.config.ts",
            "graphqlTypes.ts",
            "**/*.js",
            "**/*.cjs",
            "**/*.mjs",
            "!eslint.config.js",
            // UI-specific ignores (migrated from packages/ui/.eslintignore)
            "packages/ui/src/sw-template.js",
            "packages/ui/workbox-build.js",
        ],
    },

    // Base config for all files
    {
        files: ["**/*.{js,mjs,cjs,ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                console: "readonly",
                process: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                exports: "writable",
                module: "writable",
                require: "readonly",
                global: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                fetch: "readonly",
            },
        },
        plugins: {
            prettier,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...prettierConfig.rules,
            "quotes": ["error", "double"],
            "comma-dangle": ["error", "always-multiline"],
            "semi": ["error", "always"],
            "space-infix-ops": "error",
            "keyword-spacing": "error",
            "arrow-spacing": "error",
            "prefer-const": "error",
            "no-var": "error",
            "no-empty-function": "off",
            "object-shorthand": "error",
            "eol-last": "error",
            "no-console": ["warn", { "allow": ["warn", "error"] }],
            "padding-line-between-statements": [
                "error",
                { "blankLine": "always", "prev": "import", "next": "*" },
                { "blankLine": "never", "prev": "import", "next": "import" },
            ],
        },
    },

    // TypeScript files
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: "module",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    "argsIgnorePattern": "^_",
                    "varsIgnorePattern": "^_",
                    "caughtErrorsIgnorePattern": "^_",
                },
            ],
            "@typescript-eslint/prefer-nullish-coalescing": "off",
            "@typescript-eslint/prefer-optional-chain": "off",
            "@typescript-eslint/no-empty-function": "off",
            "no-redeclare": "off",
            "@typescript-eslint/no-redeclare": "error",
        },
    },

    // UI package - React files
    {
        files: ["packages/ui/**/*.{ts,tsx}"],
        languageOptions: {
            globals: {
                window: "readonly",
                document: "readonly",
                navigator: "readonly",
                localStorage: "readonly",
                sessionStorage: "readonly",
                fetch: "readonly",
                Request: "readonly",
                Response: "readonly",
                Headers: "readonly",
                URL: "readonly",
                URLSearchParams: "readonly",
                FormData: "readonly",
                Blob: "readonly",
                File: "readonly",
                NodeJS: "readonly",
                Notification: "readonly",
                caches: "readonly",
                ServiceWorkerRegistration: "readonly",
                React: "readonly",
                JSX: "readonly",
                HTMLElement: "readonly",
                HTMLDivElement: "readonly",
                HTMLButtonElement: "readonly",
                HTMLImageElement: "readonly",
                HTMLInputElement: "readonly",
                HTMLFormElement: "readonly",
                MouseEvent: "readonly",
                Event: "readonly",
                KeyboardEvent: "readonly",
                RequestInit: "readonly",
                AbortController: "readonly",
                performance: "readonly",
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",
                getComputedStyle: "readonly",
                ResizeObserver: "readonly",
                FocusEvent: "readonly",
                HTMLAnchorElement: "readonly",
                History: "readonly",
                dispatchEvent: "readonly",
                NotificationPermission: "readonly",
                PushSubscription: "readonly",
                PushSubscriptionOptions: "readonly",
                queueMicrotask: "readonly",
            },
        },
        plugins: {
            "react-hooks": reactHooks,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-hooks/exhaustive-deps": "warn",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/set-state-in-effect": "warn",
            "react-hooks/refs": "warn",
            "react-hooks/purity": "warn",
            "react-hooks/immutability": "warn",
            "no-unsafe-optional-chaining": "warn",
            "no-useless-escape": "warn",
        },
    },

    // Server package - strict type checking
    {
        files: ["packages/server/**/*.ts"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: "module",
                project: "packages/server/tsconfig.eslint.json",
                tsconfigRootDir: import.meta.dirname,
            },
            globals: {
                console: "readonly",
                process: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                exports: "writable",
                module: "writable",
                require: "readonly",
                global: "readonly",
                NodeJS: "readonly",
                Express: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-misused-promises": [
                "error",
                {
                    checksVoidReturn: false,
                },
            ],
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "no-duplicate-imports": "error",
            "no-unused-expressions": "error",
            "eqeqeq": ["error", "always"],
            "curly": ["error", "all"],
            "prefer-template": "warn",
        },
    },

    // Server package - relaxed rules for specific files with legacy any usage
    {
        files: [
            "packages/server/src/rest/landingPage.ts",
            "packages/server/src/rest/auth.ts",
            "packages/server/src/rest/dashboard.ts",
            "packages/server/src/rest/images.ts",
            "packages/server/src/rest/assets.ts",
            "packages/server/src/rest/plants.ts",
            "packages/server/src/utils/emailService.ts",
            "packages/server/src/utils/fileIO.ts",
        ],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/await-thenable": "off",
            "no-case-declarations": "off",
        },
    },

    // Shared package
    {
        files: ["packages/shared/**/*.ts"],
        languageOptions: {
            globals: {
                // Both Node and browser globals
                console: "readonly",
                process: "readonly",
                Buffer: "readonly",
                window: "readonly",
                document: "readonly",
            },
        },
        rules: {
            "@typescript-eslint/no-redeclare": "off",
        },
    },

    // Test files
    {
        files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "**/setupTests.ts", "**/*.test.example.ts"],
        languageOptions: {
            globals: {
                describe: "readonly",
                it: "readonly",
                expect: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly",
                test: "readonly",
                jest: "readonly",
                vi: "readonly",
                fail: "readonly",
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/unbound-method": "off",
            "@typescript-eslint/await-thenable": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "no-console": "off",
        },
    },

    // Server test files - additional relaxed rules
    {
        files: [
            "packages/server/**/*.test.ts",
            "packages/server/**/*.integration.test.ts",
            "packages/server/**/__tests__/**/*.ts",
            "packages/server/**/__mocks__/**/*.ts",
            "packages/server/**/seeds/**/*.ts",
        ],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/unbound-method": "off",
            "@typescript-eslint/await-thenable": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "no-console": "off",
        },
    },

    // Mock files
    {
        files: ["**/__mocks__/**/*.ts"],
        languageOptions: {
            globals: {
                jest: "readonly",
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
        },
    },

    // E2E setup and teardown files - allow console statements
    {
        files: ["e2e/setup/**/*.ts", "e2e/teardown/**/*.ts", "e2e/fixtures/**/*.ts", "e2e/**/*.setup.ts"],
        rules: {
            "no-console": "off",
        },
    },

    // Type declaration files - allow empty interfaces for augmentation
    {
        files: ["**/*.d.ts"],
        rules: {
            "@typescript-eslint/no-empty-object-type": "off",
        },
    },
];
