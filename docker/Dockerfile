FROM node:10-alpine

MAINTAINER Cristian Greco

EXPOSE 8080

RUN apk add --no-cache dumb-init

RUN npm init -y \
    && npm install express@4.16.4

COPY index.js .

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "index.js"]
