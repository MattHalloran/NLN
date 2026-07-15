import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export class ContractError extends Error {
    constructor(message, exitCode = 1) {
        super(message);
        this.exitCode = exitCode;
    }
}

export function parseOptions(argv, { booleans = [], positional = 0 } = {}) {
    const result = { _: [] };
    const booleanSet = new Set(booleans);
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (!token.startsWith("--")) {
            result._.push(token);
            continue;
        }
        const name = token.slice(2);
        if (!name || Object.hasOwn(result, name))
            throw new ContractError(`invalid or duplicate option: ${token}`, 2);
        if (booleanSet.has(name)) result[name] = true;
        else {
            const value = argv[++index];
            if (!value || value.startsWith("--"))
                throw new ContractError(`${token} requires a value`, 2);
            result[name] = value;
        }
    }
    if (result._.length > positional)
        throw new ContractError(`unexpected argument: ${result._[positional]}`, 2);
    return result;
}

export function assertExactKeys(value, { required = [], optional = [] }, label = "object") {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new ContractError(`${label} must be an object`);
    const allowed = new Set([...required, ...optional]);
    for (const key of Object.keys(value))
        if (!allowed.has(key)) throw new ContractError(`${label} has unknown field: ${key}`);
    for (const key of required)
        if (!Object.hasOwn(value, key))
            throw new ContractError(`${label} is missing field: ${key}`);
}

export function regularFile(file, label = "file", { ownerOnly = false } = {}) {
    let stat;
    try {
        stat = fs.lstatSync(file);
    } catch {
        throw new ContractError(`${label} is missing`);
    }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1)
        throw new ContractError(`${label} must be a regular, single-link, non-symlink file`);
    if (ownerOnly && (stat.mode & 0o077) !== 0)
        throw new ContractError(`${label} must be owner-only`);
    return stat;
}

export function readJson(file, label = "JSON file", options) {
    regularFile(file, label, options);
    try {
        return parseJsonStrict(fs.readFileSync(file, "utf8"), label);
    } catch (error) {
        throw new ContractError(`${label} is invalid JSON: ${error.message}`);
    }
}

export function parseJsonStrict(source, label = "JSON") {
    if (typeof source !== "string") throw new ContractError(`${label} source must be text`);
    let offset = 0;
    const fail = (message) => {
        throw new ContractError(`${message} at byte ${offset}`);
    };
    const whitespace = () => {
        while (/\s/.test(source[offset] ?? "")) offset += 1;
    };
    const string = () => {
        if (source[offset] !== '"') fail("expected string");
        const start = offset++;
        while (offset < source.length) {
            const character = source[offset++];
            if (character === '"') {
                try {
                    return JSON.parse(source.slice(start, offset));
                } catch {
                    fail("invalid string");
                }
            }
            if (character === "\\") {
                if (offset >= source.length) fail("unterminated escape");
                const escape = source[offset++];
                if (escape === "u") {
                    if (!/^[0-9a-fA-F]{4}$/.test(source.slice(offset, offset + 4)))
                        fail("invalid unicode escape");
                    offset += 4;
                } else if (!'"\\/bfnrt'.includes(escape)) fail("invalid escape");
            } else if (character.charCodeAt(0) < 0x20) fail("unescaped control character");
        }
        fail("unterminated string");
    };
    const value = () => {
        whitespace();
        const character = source[offset];
        if (character === '"') return string();
        if (character === "{") {
            offset += 1;
            const result = {},
                keys = new Set();
            whitespace();
            if (source[offset] === "}") {
                offset += 1;
                return result;
            }
            while (true) {
                whitespace();
                const key = string();
                if (keys.has(key)) fail(`duplicate object key ${JSON.stringify(key)}`);
                keys.add(key);
                whitespace();
                if (source[offset++] !== ":") fail("expected colon");
                result[key] = value();
                whitespace();
                const separator = source[offset++];
                if (separator === "}") return result;
                if (separator !== ",") fail("expected comma or closing brace");
            }
        }
        if (character === "[") {
            offset += 1;
            const result = [];
            whitespace();
            if (source[offset] === "]") {
                offset += 1;
                return result;
            }
            while (true) {
                result.push(value());
                whitespace();
                const separator = source[offset++];
                if (separator === "]") return result;
                if (separator !== ",") fail("expected comma or closing bracket");
            }
        }
        for (const [literal, parsed] of [
            ["true", true],
            ["false", false],
            ["null", null],
        ]) {
            if (source.startsWith(literal, offset)) {
                offset += literal.length;
                return parsed;
            }
        }
        const match = source.slice(offset).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
        if (!match) fail("expected JSON value");
        offset += match[0].length;
        const parsed = Number(match[0]);
        if (!Number.isFinite(parsed)) fail("number is outside the supported range");
        return parsed;
    };
    const parsed = value();
    whitespace();
    if (offset !== source.length) fail("unexpected trailing content");
    return parsed;
}

export function canonicalJson(value) {
    const sort = (item) =>
        Array.isArray(item)
            ? item.map(sort)
            : item && typeof item === "object"
              ? Object.fromEntries(
                    Object.keys(item)
                        .sort()
                        .map((key) => [key, sort(item[key])]),
                )
              : item;
    return `${JSON.stringify(sort(value), null, 2)}\n`;
}

export const sha256Bytes = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const sha256File = (file) => {
    regularFile(file);
    return sha256Bytes(fs.readFileSync(file));
};

export function safeRelative(value, label = "path") {
    if (
        typeof value !== "string" ||
        !value ||
        path.isAbsolute(value) ||
        value.includes("\\") ||
        value.split("/").some((part) => !part || part === "." || part === "..")
    )
        throw new ContractError(`${label} must be a safe relative path`);
    return value;
}

export function assertFixtureScope(scope, label = "operation") {
    if (!scope || typeof scope !== "object" || scope.fixture !== true || scope.production !== false)
        throw new ContractError(
            `${label} requires explicit fixture=true and production=false scope`,
        );
    return scope;
}

export function redactText(value, secrets = []) {
    let result = String(value ?? "");
    for (const secret of secrets.filter((item) => typeof item === "string" && item.length >= 4))
        result = result.split(secret).join("[REDACTED]");
    return result;
}

export function runChild(
    program,
    args = [],
    { cwd, env, timeoutMilliseconds = 300000, redactions = [], input } = {},
) {
    if (
        typeof program !== "string" ||
        !program ||
        !Array.isArray(args) ||
        args.some((item) => typeof item !== "string")
    )
        throw new ContractError("child command is invalid");
    if (
        !Number.isSafeInteger(timeoutMilliseconds) ||
        timeoutMilliseconds < 1 ||
        timeoutMilliseconds > 900000
    )
        throw new ContractError("child timeout is outside the supported range");
    const result = spawnSync(program, args, {
        cwd,
        env,
        input,
        encoding: "utf8",
        timeout: timeoutMilliseconds,
        stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    const output = {
        status: result.status,
        signal: result.signal,
        timedOut: result.error?.code === "ETIMEDOUT",
        stdout: redactText(result.stdout, redactions),
        stderr: redactText(result.stderr, redactions),
    };
    if (result.error && !output.timedOut)
        throw new ContractError(
            `child command could not start: ${redactText(result.error.message, redactions)}`,
        );
    return output;
}

export function withTemporaryDirectory(prefix, callback) {
    if (
        typeof prefix !== "string" ||
        !/^[A-Za-z0-9_.-]+$/.test(prefix) ||
        typeof callback !== "function"
    )
        throw new ContractError("temporary-directory request is invalid");
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
    fs.chmodSync(directory, 0o700);
    try {
        return callback(directory);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

export function isoTimestamp(value, label = "timestamp") {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
        !Number.isFinite(Date.parse(value))
    )
        throw new ContractError(`${label} must be a canonical UTC ISO timestamp`);
    return value;
}

export function assertFresh(value, maxAgeSeconds, now = new Date()) {
    const age = now.getTime() - Date.parse(isoTimestamp(value));
    if (age < 0 || age > maxAgeSeconds * 1000)
        throw new ContractError("evidence is stale or from the future");
}

export function publishJsonNoOverwrite(file, value) {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true, mode: 0o700 });
    const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
    try {
        fs.writeFileSync(temporary, canonicalJson(value), { flag: "wx", mode: 0o600 });
        fs.linkSync(temporary, file);
        fs.unlinkSync(temporary);
    } catch (error) {
        try {
            fs.unlinkSync(temporary);
        } catch {}
        if (error.code === "EEXIST") throw new ContractError("output already exists");
        throw error;
    }
}

export function receiptEnvelope({
    receiptType,
    receiptId,
    status,
    scope,
    command,
    version = "1",
    release,
    policy,
    inputs = [],
    checks = [],
    outputs = [],
    childReceipts = [],
    result = {},
    failure = null,
    startedAt,
    finishedAt,
}) {
    const canonicalStartedAt = isoTimestamp(startedAt, "startedAt");
    const canonicalFinishedAt = isoTimestamp(finishedAt, "finishedAt");
    const durationMilliseconds = Date.parse(canonicalFinishedAt) - Date.parse(canonicalStartedAt);
    if (!Number.isSafeInteger(durationMilliseconds) || durationMilliseconds < 0)
        throw new ContractError("finishedAt must not precede startedAt");
    if (
        !Array.isArray(inputs) ||
        !Array.isArray(checks) ||
        !Array.isArray(outputs) ||
        !Array.isArray(childReceipts)
    )
        throw new ContractError("receipt evidence collections must be arrays");
    if (!result || typeof result !== "object" || Array.isArray(result))
        throw new ContractError("receipt result must be an object");
    return {
        schemaVersion: 1,
        receiptType,
        receiptId,
        status,
        scope,
        producer: { name: command, version },
        release,
        policy,
        startedAt: canonicalStartedAt,
        finishedAt: canonicalFinishedAt,
        durationMilliseconds,
        inputs,
        checks,
        outputs,
        childReceipts,
        result,
        failure,
    };
}
