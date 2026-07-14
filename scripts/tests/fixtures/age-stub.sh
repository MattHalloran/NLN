#!/usr/bin/env bash
set -euo pipefail
mode=$1
shift
output=""
input=""
key_file=""
while (($#)); do
    case "$1" in
        --recipients-file|--identity) key_file=$2; shift 2 ;;
        --output) output=$2; shift 2 ;;
        *) input=$1; shift ;;
    esac
done
[[ -n "$output" && -n "$input" && -n "$key_file" ]] || exit 2
if [[ "$mode" == "--decrypt" && -n "${AGE_STUB_DECRYPT_KEY_FILE:-}" ]]; then
    key_file=$AGE_STUB_DECRYPT_KEY_FILE
fi
key=$(sha256sum "$key_file" | cut -d' ' -f1)
if [[ "$mode" == "--encrypt" ]]; then
    { printf 'AGE-STUB:%s\n' "$key"; cat "$input"; } >"$output"
elif [[ "$mode" == "--decrypt" ]]; then
    IFS= read -r header <"$input"
    [[ "$header" == "AGE-STUB:$key" ]] || exit 3
    tail -n +2 "$input" >"$output"
else exit 2
fi
chmod 600 "$output"
