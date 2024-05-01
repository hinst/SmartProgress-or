FROM --platform=linux/aarch64 node:22

RUN mkdir /app
COPY dist /app/dist
USER node
CMD ["node", "/app/dist/app.js"]