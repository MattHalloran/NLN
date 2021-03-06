#!/bin/sh

# Wait for backend server to start. It could run fine alone, but we don't want a user trying to access the site during this time
${PROJECT_DIR}/scripts/wait-for.sh server:5000 -t 1000 -- echo 'Backend server is up. Starting UI'

if [ "${NODE_ENV}" == "development" ] ; then
    (cd ${PROJECT_DIR}/packages/ui && PORT=${UI_PORT} && npm run start-dev)
else
    (cd ${PROJECT_DIR}/packages/ui && PORT=${UI_PORT} && npm run start-prod)
fi