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
            "vite.config.ts",
            "graphqlTypes.ts",
            "**/*.js",
            "**/*.cjs",
            "**/*.mjs",
            "!eslint.config.js",
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
            "@typescript-eslint/no-unused-vars": "error",
            "@typescript-eslint/prefer-nullish-coalescing": "off",
            "@typescript-eslint/prefer-optional-chain": "off",
            "@typescript-eslint/no-empty-function": "off",
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
            },
        },
        plugins: {
            "react-hooks": reactHooks,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-hooks/exhaustive-deps": "warn",
            "react-hooks/rules-of-hooks": "error",
        },
    },

    // Server package
    {
        files: ["packages/server/**/*.ts"],
        languageOptions: {
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
            },
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
    },
];
