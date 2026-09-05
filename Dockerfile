FROM node:22-alpine AS build
WORKDIR /app
COPY game/package.json game/package-lock.json ./
RUN npm ci
COPY game/ ./
ARG VITE_DISCORD_CLIENT_ID=""
ARG VITE_GAME_SERVER_URL=""
ENV VITE_DISCORD_CLIENT_ID=$VITE_DISCORD_CLIENT_ID
ENV VITE_GAME_SERVER_URL=$VITE_GAME_SERVER_URL
RUN npm run build:standalone

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY game/package.json game/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist-client ./dist-client
COPY --from=build /app/server ./server
COPY --from=build /app/game ./game
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "server/index.ts"]
