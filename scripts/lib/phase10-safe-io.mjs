import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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
        if (!name || Object.hasOwn(result, name)) throw new ContractError(`invalid or duplicate option: ${token}`, 2);
        if (booleanSet.has(name)) result[name] = true;
        else {
            const value = argv[++index];
            if (!value || value.startsWith("--")) throw new ContractError(`${token} requires a value`, 2);
            result[name] = value;
        }
    }
    if (result._.length > positional) throw new ContractError(`unexpected argument: ${result._[positional]}`, 2);
    return result;
}

export function assertExactKeys(value, { required = [], optional = [] }, label = "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContractError(`${label} must be an object`);
    const allowed = new Set([...required, ...optional]);
    for (const key of Object.keys(value)) if (!allowed.has(key)) throw new ContractError(`${label} has unknown field: ${key}`);
    for (const key of required) if (!Object.hasOwn(value, key)) throw new ContractError(`${label} is missing field: ${key}`);
}

export function regularFile(file, label = "file", { ownerOnly = false } = {}) {
    let stat;
    try { stat = fs.lstatSync(file); } catch { throw new ContractError(`${label} is missing`); }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new ContractError(`${label} must be a regular, single-link, non-symlink file`);
    if (ownerOnly && (stat.mode & 0o077) !== 0) throw new ContractError(`${label} must be owner-only`);
    return stat;
}

export function readJson(file, label = "JSON file", options) {
    regularFile(file, label, options);
    try { return JSON.parse(fs.readFileSync(file, "utf8")); }
    catch (error) { throw new ContractError(`${label} is invalid JSON: ${error.message}`); }
}

export function canonicalJson(value) {
    const sort = (item) => Array.isArray(item) ? item.map(sort) : item && typeof item === "object"
        ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, sort(item[key])])) : item;
    return `${JSON.stringify(sort(value), null, 2)}\n`;
}

export const sha256Bytes = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const sha256File = (file) => { regularFile(file); return sha256Bytes(fs.readFileSync(file)); };

export function safeRelative(value, label = "path") {
    if (typeof value !== "string" || !value || path.isAbsolute(value) || value.includes("\\") || value.split("/").some((part) => !part || part === "." || part === ".."))
        throw new ContractError(`${label} must be a safe relative path`);
    return value;
}

export function isoTimestamp(value, label = "timestamp") {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)))
        throw new ContractError(`${label} must be a canonical UTC ISO timestamp`);
    return value;
}

export function assertFresh(value, maxAgeSeconds, now = new Date()) {
    const age = now.getTime() - Date.parse(isoTimestamp(value));
    if (age < 0 || age > maxAgeSeconds * 1000) throw new ContractError("evidence is stale or from the future");
}

export function publishJsonNoOverwrite(file, value) {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true, mode: 0o700 });
    const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
    try {
        fs.writeFileSync(temporary, canonicalJson(value), { flag: "wx", mode: 0o600 });
        fs.linkSync(temporary, file);
        fs.unlinkSync(temporary);
    } catch (error) {
        try { fs.unlinkSync(temporary); } catch {}
        if (error.code === "EEXIST") throw new ContractError("output already exists");
        throw error;
    }
}

export function receiptEnvelope({ receiptType, receiptId, status, scope, command, version = "1", release, policy, inputs = [], checks = [], outputs = [], failure = null, startedAt, finishedAt }) {
    return { schemaVersion: 1, receiptType, receiptId, status, scope, producer: { command, version }, release, startedAt: isoTimestamp(startedAt, "startedAt"), finishedAt: isoTimestamp(finishedAt, "finishedAt"), policy, inputs, checks, outputs, failure };
}
