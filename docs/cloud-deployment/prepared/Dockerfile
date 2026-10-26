# Optional portable runner. Primary Lightsail runbook uses systemd, not Docker.
FROM node:22.23.4-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
# tsx is a locked devDependency required by the existing runtime.
RUN npm ci --include=dev --no-audit --no-fund && npm cache clean --force
COPY server ./server
COPY shared ./shared
COPY gamepacks ./gamepacks
COPY gateway ./gateway
COPY public ./public
COPY dist ./dist
COPY tsconfig.json ./
COPY deploy ./deploy
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4319 KEEPBOARD_DATA_DIR=/var/lib/keepboard
EXPOSE 4319
CMD ["node","--import","tsx","deploy/cloud-launch.mjs"]
