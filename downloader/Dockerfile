FROM node:24

RUN apt-get update
RUN apt-get install -y ca-certificates
RUN update-ca-certificates
ENV NODE_OPTIONS="--use-openssl-ca"

RUN mkdir /app
COPY dist /app/dist
COPY schema.sql /app/schema.sql
COPY schema.postgre.sql /app/schema.postgre.sql
COPY package.json /app/package.json
RUN chown -R node:node /app
USER node
WORKDIR /app
RUN npm install --omit=dev
CMD ["npm", "run", "start-prod"]