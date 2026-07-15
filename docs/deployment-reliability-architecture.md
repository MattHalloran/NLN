# Deployment Reliability Architecture

> Authority: architecture and developer reference. This describes the fixture-only Phase 10 design and extension rules, not the current production procedure.

## Layers

The additive `release` interface is presentation and orchestration only. It delegates domain decisions to backup, migration, immutable-release, health, maintenance, and reduced-downtime helpers. Those helpers consume versioned policy files and produce typed evidence. External work is isolated behind injected fixture adapters.

```text
release CLI
  -> lifecycle orchestration
    -> typed receipt registry and evidence graph
      -> domain helpers
        -> explicit fixture adapters
```

The current production path remains `prepare-deploy-readiness.sh` followed by `deploy-production.sh`. `config/deployment-traceability.json` freezes the bytes of current production entrypoints so Phase 10 refactoring cannot silently alter them.

## Contract ownership

- `deployment-operational-objectives.json`: freshness, RPO, RTO, cadence, downtime, and incident holds.
- `deployment-topology.json`: application activation and protected state services.
- `migration-compatibility.json`: canonical ordered migration metadata.
- `runtime-state-assurance-profiles.json`: integrity through full backup assurance.
- `release-state-machine.json`: evidence-derived lifecycle states.
- `command-registry.json`: command names, aliases, effects, defaults, and availability.
- `receipt-registry.json`: receipt schema and semantic verifier ownership.
- `deployment-traceability.json`: producers, consumers, tests, adapters, and frozen production surfaces.

Consumers must hash-bind governing contracts. They must not copy private constants into another phase. Cross-contract validation runs in `validate:quick` so contradictory limits cannot be checked in unnoticed.

## Safety primitives

`scripts/lib/phase10-safe-io.mjs` owns strict duplicate-key JSON parsing, exact object keys, safe paths, owner-only regular file checks, canonical hashing and timestamps, atomic no-overwrite publication, explicitly named atomic pointer replacement, explicit fixture guards, bounded/redacted child execution, and temporary cleanup. Immutable evidence always uses no-overwrite publication; replacement is reserved for derived pointers such as `current.json`, never qualification records. Domain modules should use these primitives without moving business rules into the library.

Production-capable adapters must not be added or enabled in Phase 10. Fixture contexts require `fixture: true` and `production: false`. Help and planning paths must be side-effect-free. Every mutating fixture command defaults to planning or requires exact confirmation.

## Adding a command or receipt

1. Define the policy owner and safety/effect class.
2. Add the receipt schema and semantic verifier before adding a consumer.
3. Add producer, consumers, and focused tests to deployment traceability.
4. Add the command and compatibility aliases to the command registry.
5. Regenerate `generated-operator-reference.md`.
6. Test malformed, duplicate, stale, wrong-release, wrong-scope, corrupt, symlinked, overwrite, interruption, cleanup, and secret-redaction paths.
7. Confirm the frozen production-entrypoint and deployment-order contracts still pass.

Compatibility readers must remain isolated and state their assurance limitation. Do not rewrite historical evidence or make a compatibility receipt silently satisfy a canonical gate.
