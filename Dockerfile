# Open data first: it only changes when this stage changes, not with the code.
FROM node:24-slim AS data
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY scripts/download-data.sh scripts/
RUN scripts/download-data.sh && rm data/raw/sncf-gtfs.zip

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run lint && npm run typecheck && npm test && npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=data /app/data/raw data/raw
COPY --from=build /app/dist dist
COPY --from=build /app/dist-server dist-server
EXPOSE 3000
CMD ["node", "--max-old-space-size=256", "dist-server/main.js"]
