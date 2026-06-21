FROM node:26

RUN apt-get update
RUN apt-get install -y ca-certificates
RUN update-ca-certificates

RUN mkdir /app
COPY dist /app/dist
COPY schema.postgre.sql /app/schema.postgre.sql
COPY package.json /app/package.json
RUN chown -R node:node /app
USER node
WORKDIR /app
RUN npm install --omit=dev
CMD ["npm", "run", "start-prod"]