FROM node:10-alpine

MAINTAINER Cristian Greco

EXPOSE 8080

RUN apk add --no-cache curl dumb-init

RUN npm init -y \
    && npm install express@4.16.4

WORKDIR /opt/app

COPY . .

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "index.js"]
