FROM --platform=linux/aarch64 caddy:builder-alpine AS builder
RUN xcaddy build --with github.com/mholt/caddy-ratelimit
FROM --platform=linux/aarch64 caddy:latest
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile