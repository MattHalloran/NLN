# Stage 0. Copy required files
# NOTE: Using alpine3.16 because of this issue: https://github.com/prisma/prisma/issues/16553
FROM node:16-alpine3.16 as stage0

# Set working directory
ARG PROJECT_DIR
ARG VIRTUAL_PORT
WORKDIR ${PROJECT_DIR}

# Copy main package.json, as well as packages this container will use. Doing this first helps with caching (I think).
COPY --chown=node:node package.json bun.lockb ./
COPY --chown=node:node packages/server/package.json packages/server/
COPY --chown=node:node packages/shared/package.json packages/shared/

# Copy all files from packages/server/src, and every directory's src in packages/shared
COPY --chown=node:node packages/server/src packages/server/
COPY --chown=node:node packages/shared/src packages/shared/

# Copy required script files
COPY --chown=node:node scripts/* scripts/

# Assign working directory to node
RUN chown -R node:node .

# Stage 1. Copy files from stage 0, and install packages
FROM node:16-alpine3.16 as stage1

# Set working directory
ARG PROJECT_DIR
WORKDIR ${PROJECT_DIR}

# Copy entire working directory contents from stage 0, and install packages
COPY --from=stage0 ${PROJECT_DIR} ./

# Install local packages
RUN bun install

# Install global packages
RUN bun add typescript ts-node nodemon prisma@4.12.0

# Stage 2. Copy files from stage 1, and install required unix tools
FROM node:16-alpine3.16 as stage2

# Set working directory
ARG PROJECT_DIR
WORKDIR ${PROJECT_DIR}

# Copy entire working directory contents from stage 1
COPY --from=stage1 ${PROJECT_DIR} ./

# Copy global packages from stage 1
COPY --from=stage1 ~/.bun/install/cache ~/.bun/install/cache

# Update and install unix packages
RUN apk update
RUN apk add netcat-openbsd

# Set port
EXPOSE ${VIRTUAL_PORT} 9229