FROM node AS build
WORKDIR /app
RUN npm init -y \
    && npm install express@4.16.4
COPY index.js .

FROM gcr.io/distroless/nodejs20-debian12 AS app
EXPOSE 8080
COPY --from=build /app /app
WORKDIR /app
CMD ["index.js"]
