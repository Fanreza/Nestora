# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Build args → env vars for Nuxt build (public vars are baked into client bundle)
ARG NUXT_PUBLIC_PRIVY_APP_ID
ARG NUXT_PUBLIC_PRIVY_CLIENT_ID
ARG NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID

ENV NUXT_PUBLIC_PRIVY_APP_ID=$NUXT_PUBLIC_PRIVY_APP_ID
ENV NUXT_PUBLIC_PRIVY_CLIENT_ID=$NUXT_PUBLIC_PRIVY_CLIENT_ID
ENV NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID

RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=build /app/.output .output

# Runtime env vars (server-only secrets, not baked into bundle)
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
