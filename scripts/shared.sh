#!/bin/bash
HERE=$(dirname $0)
. "${HERE}/prettify.sh"

# Loop through shared folder and convert typescript to javascript
header 'Converting shared typescript to javascript'
yarn tsc
success "Finished converting shared typescript to javascript"
