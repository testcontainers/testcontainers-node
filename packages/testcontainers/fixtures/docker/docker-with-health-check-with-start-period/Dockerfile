FROM node:10-alpine

MAINTAINER Cristian Greco

EXPOSE 8080

RUN apk add --no-cache curl dumb-init

RUN npm init -y \
    && npm install express@4.16.4

COPY index.js .

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "index.js"]

HEALTHCHECK --start-period=10s --interval=1s --timeout=1s --retries=1 \
    CMD curl -f http://localhost:8080/hello-world || exit 1
