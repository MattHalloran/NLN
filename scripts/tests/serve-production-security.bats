#!/usr/bin/env bats

@test "production UI proxy keeps the configured authority for absolute-form requests" {
  run node --input-type=module - <<'NODE'
import {
  buildProxyRequestTarget,
  parseProxyApiTarget,
} from './packages/ui/scripts/serve-production.js';

const configured = parseProxyApiTarget('http://127.0.0.1:4000');
const target = buildProxyRequestTarget('http://attacker.invalid/api/orders?limit=1', configured);
if (target.origin !== configured.origin) process.exit(1);
if (target.pathname !== '/api/orders' || target.search !== '?limit=1') process.exit(2);
if (buildProxyRequestTarget('http://attacker.invalid/not-api', configured) !== null) process.exit(3);
NODE
  [ "$status" -eq 0 ]
}

@test "production UI proxy rejects unsafe configured targets" {
  run node --input-type=module - <<'NODE'
import { parseProxyApiTarget } from './packages/ui/scripts/serve-production.js';

for (const value of [
  'file:///etc/passwd',
  'http://user:secret@127.0.0.1:4000',
  'http://127.0.0.1:4000/base',
  'http://127.0.0.1:4000/?token=secret',
]) {
  try {
    parseProxyApiTarget(value);
    process.exit(1);
  } catch {}
}
NODE
  [ "$status" -eq 0 ]
}
