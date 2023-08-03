const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");

const app = express();

app.get("/hello-world", (req, res) => {
  res.status(200).send("hello-world");
});

app.get("/hello-world-delay", (req, res) => {
  setTimeout(() => {
    res.status(200).send("hello-world");
  }, 3000);
});

app.post("/hello-world-post", (req, res) => {
  res.status(200).send("hello-world");
});

app.get("/env", (req, res) => {
  res.status(200).json(process.env);
});

app.get("/cmd", (req, res) => {
  res.status(200).json(process.argv);
});

app.get("/auth", (req, res) => {
  const auth = req.headers.authorization;
  const [, base64Encoded] = auth.split(" ");
  const credentials = Buffer.from(base64Encoded, "base64").toString("ascii");
  const [username, password] = credentials.split(":");
  if (username === "user" && password === "pass") {
    res.status(200).end();
  } else {
    res.status(401).end();
  }
});

app.get("/header-or-400/:headerName", (req, res) => {
  if (req.headers[req.params["headerName"]] !== undefined) {
    res.status(200).end();
  } else {
    res.status(400).end();
  }
});

const PORT = 8080;
const TLS_PORT = 8443;

http.createServer(app).listen(PORT, () => console.log(`Listening on port ${PORT}`));
https
  .createServer(
    {
      key: fs.readFileSync("/etc/ssl/private/cert.key", "utf8"),
      cert: fs.readFileSync("/etc/ssl/certs/cert.crt", "utf8"),
    },
    app
  )
  .listen(TLS_PORT, () => console.log(`Listening on secure port ${TLS_PORT}`));
