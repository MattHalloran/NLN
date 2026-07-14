#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT="$BATS_TEST_DIRNAME/../runtime-state-manifest-v2.mjs"
INVENTORY="$BATS_TEST_DIRNAME/../../config/runtime-state-inventory.json"

setup() {
    ROOT="$BATS_TMPDIR/v2-root-$BATS_TEST_NUMBER"
    MANIFEST="$BATS_TMPDIR/v2-manifest-$BATS_TEST_NUMBER.json"
    mkdir -p "$ROOT/data/uploads/nested" "$ROOT/assets" "$ROOT/data/redis" "$ROOT/data/migration-backups"
    printf 'sql fixture\n' >"$ROOT/data/postgres.sql"
    printf 'upload\n' >"$ROOT/data/uploads/nested/file.txt"
    printf 'asset\n' >"$ROOT/assets/asset.txt"
    printf 'redis\n' >"$ROOT/data/redis/dump.rdb"
    printf 'migration\n' >"$ROOT/data/migration-backups/evidence.sql"
    printf 'DB_PASSWORD=fixture-only\n' >"$ROOT/.env-prod"
    chmod 600 "$ROOT/.env-prod"
}

create_manifest() {
    node "$SCRIPT" create --root "$ROOT" --manifest "$MANIFEST" --inventory "$INVENTORY"
}

@test "v2 manifest records and verifies every fixture object" {
    run create_manifest
    [ "$status" -eq 0 ]
    [ "$(stat -c %a "$MANIFEST")" = 600 ]
    run node "$SCRIPT" verify --root "$ROOT" --manifest "$MANIFEST" --inventory "$INVENTORY"
    [ "$status" -eq 0 ]
    assert_output --partial "manifest verified"
    run node -e 'const m=require(process.argv[1]); const f=m.objects.find(o=>o.path==="data/uploads/nested/file.txt"); if(!f || f.type!=="file" || f.bytes!==7 || !/^[a-f0-9]{64}$/.test(f.sha256)) process.exit(1)' "$MANIFEST"
    [ "$status" -eq 0 ]
}

@test "missing required inventory root fails closed" {
    rm -rf "$ROOT/assets"
    run create_manifest
    [ "$status" -ne 0 ]
    assert_output --partial "required inventory path is missing: assets"
}

@test "changed files fail verification" {
    create_manifest
    printf 'changed\n' >"$ROOT/assets/asset.txt"
    run node "$SCRIPT" verify --root "$ROOT" --manifest "$MANIFEST" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "captured objects do not match"
}

@test "extra files under an inventoried root fail verification" {
    create_manifest
    printf 'extra\n' >"$ROOT/data/uploads/extra.txt"
    run node "$SCRIPT" verify --root "$ROOT" --manifest "$MANIFEST" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "captured objects do not match"
}

@test "unclassified objects outside inventory roots fail closed" {
    printf 'unexpected\n' >"$ROOT/unclassified.txt"
    run create_manifest
    [ "$status" -ne 0 ]
    assert_output --partial "unexpected object: unclassified.txt"
}

@test "mode changes fail verification" {
    create_manifest
    chmod 600 "$ROOT/assets/asset.txt"
    run node "$SCRIPT" verify --root "$ROOT" --manifest "$MANIFEST" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "captured objects do not match"
}

@test "secret inputs and manifests must remain owner-only" {
    chmod 644 "$ROOT/.env-prod"
    run create_manifest
    [ "$status" -ne 0 ]
    assert_output --partial "secret object is not owner-only: .env-prod"

    chmod 600 "$ROOT/.env-prod"
    create_manifest
    chmod 644 "$MANIFEST"
    run node "$SCRIPT" verify --root "$ROOT" --manifest "$MANIFEST" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "manifest must be owner-only"
}

@test "symlinks and special files are rejected" {
    ln -s /etc/passwd "$ROOT/assets/link"
    run create_manifest
    [ "$status" -ne 0 ]
    assert_output --partial "symbolic links are not allowed"
    rm "$ROOT/assets/link"
    mkfifo "$ROOT/assets/fifo"
    run create_manifest
    [ "$status" -ne 0 ]
    assert_output --partial "special files are not allowed"
}

@test "wrong inventory and corrupt manifest fail closed" {
    create_manifest
    INVENTORY_COPY="$BATS_TMPDIR/inventory-$BATS_TEST_NUMBER.json"
    cp "$INVENTORY" "$INVENTORY_COPY"
    node -e 'const fs=require("fs"),p=process.argv[1],i=require(p); i.inventoryId="different"; fs.writeFileSync(p,JSON.stringify(i))' "$INVENTORY_COPY"
    run node "$SCRIPT" verify --root "$ROOT" --manifest "$MANIFEST" --inventory "$INVENTORY_COPY"
    [ "$status" -ne 0 ]
    assert_output --partial "different inventory"
    printf '{bad json' >"$MANIFEST"
    run node "$SCRIPT" verify --root "$ROOT" --manifest "$MANIFEST" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "cannot read valid manifest"
}

@test "manifest creation never overwrites existing evidence" {
    printf 'existing evidence\n' >"$MANIFEST"
    run create_manifest
    [ "$status" -ne 0 ]
    [ "$(cat "$MANIFEST")" = "existing evidence" ]
}
