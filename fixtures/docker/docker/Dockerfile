FROM node:10-alpine

MAINTAINER Cristian Greco

EXPOSE 8080

RUN apk add --no-cache curl dumb-init libcap openssl

RUN openssl req -x509 -nodes -days 36500 \
    -subj  "/C=CA/ST=QC/O=Company Inc/CN=localhost" \
    -newkey rsa:2048 -keyout /etc/ssl/private/cert.key \
    -out /etc/ssl/certs/cert.crt \
    && chmod 666 /etc/ssl/private/cert.key

RUN npm init -y \
    && npm install express@4.16.4

COPY index.js .

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "index.js"]
