FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache curl
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/public ./public
EXPOSE 8080
CMD ["node", "server/index.mjs"]
