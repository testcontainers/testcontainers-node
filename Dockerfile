FROM node:10-alpine

COPY . .
RUN npm install

CMD ["tail", "-f", "/dev/null"]
