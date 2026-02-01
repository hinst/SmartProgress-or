FROM node:24

RUN mkdir /app
COPY dist /app/dist
COPY schema.sql /app/schema.sql
COPY package.json /app/package.json
RUN chown -R node:node /app
USER node
WORKDIR /app
RUN npm install --omit=dev
CMD ["npm", "run", "start-prod"]