#!/usr/bin/env node

const DEFAULT_IDENTITY_HEADER = "X-Test-Client-IP";
const DEFAULT_CLIENT_A = "203.0.113.240";
const DEFAULT_CLIENT_B = "203.0.113.241";

function parseArgs(argv) {
    const options = {
        identityHeader: DEFAULT_IDENTITY_HEADER,
        clientA: DEFAULT_CLIENT_A,
        clientB: DEFAULT_CLIENT_B,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        const next = argv[index + 1];

        if (arg === "--url") {
            options.url = next;
            index += 1;
        } else if (arg === "--identity-header") {
            options.identityHeader = next;
            index += 1;
        } else if (arg === "--client-a") {
            options.clientA = next;
            index += 1;
        } else if (arg === "--client-b") {
            options.clientB = next;
            index += 1;
        } else if (arg === "--help" || arg === "-h") {
            options.help = true;
        } else {
            throw new Error(`Unknown option: ${arg}`);
        }
    }

    return options;
}

function usage() {
    console.log(`Usage: node scripts/rate-limit-proxy-smoke.mjs --url URL [options]

Checks that a proxy/app endpoint gives separate rate-limit buckets to two
configured client identities. The endpoint must return standard
RateLimit-Remaining headers.

Options:
  --url URL                    Endpoint to request, for example http://localhost:3001/api/v1/health
  --identity-header HEADER     Header used by the test proxy to select client identity
                               default: ${DEFAULT_IDENTITY_HEADER}
  --client-a IP                First test client identity, default: ${DEFAULT_CLIENT_A}
  --client-b IP                Second test client identity, default: ${DEFAULT_CLIENT_B}
`);
}

async function requestRemaining(url, identityHeader, identity) {
    const response = await fetch(url, {
        headers: {
            [identityHeader]: identity,
        },
    });
    const rawRemaining = response.headers.get("ratelimit-remaining");

    if (!response.ok) {
        throw new Error(`Request for ${identity} failed with HTTP ${response.status}`);
    }

    if (rawRemaining === null) {
        throw new Error("Response did not include RateLimit-Remaining header");
    }

    const remaining = Number.parseInt(rawRemaining, 10);
    if (!Number.isFinite(remaining)) {
        throw new Error(`Invalid RateLimit-Remaining header: ${rawRemaining}`);
    }

    return remaining;
}

function assertBucketBehavior(results) {
    const firstClientConsumedOne = results.clientASecond === results.clientAFirst - 1;
    const secondClientGotFreshBucket = results.clientBFirst === results.clientAFirst;

    if (!firstClientConsumedOne) {
        throw new Error(
            `Expected repeated client A request to consume one bucket slot: first=${results.clientAFirst}, second=${results.clientASecond}`
        );
    }

    if (!secondClientGotFreshBucket) {
        throw new Error(
            `Rate-limit identity appears collapsed: clientAFirst=${results.clientAFirst}, clientASecond=${results.clientASecond}, clientBFirst=${results.clientBFirst}`
        );
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        usage();
        return;
    }

    if (!options.url) {
        usage();
        throw new Error("--url is required");
    }

    const results = {
        clientAFirst: await requestRemaining(options.url, options.identityHeader, options.clientA),
        clientASecond: await requestRemaining(options.url, options.identityHeader, options.clientA),
        clientBFirst: await requestRemaining(options.url, options.identityHeader, options.clientB),
    };

    assertBucketBehavior(results);

    console.log("Rate-limit proxy smoke check passed");
    console.log(
        JSON.stringify(
            {
                url: options.url,
                identityHeader: options.identityHeader,
                clientA: options.clientA,
                clientB: options.clientB,
                remaining: results,
            },
            null,
            2
        )
    );
}

main().catch((error) => {
    console.error(`Rate-limit proxy smoke check failed: ${error.message}`);
    process.exit(1);
});
