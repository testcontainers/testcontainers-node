const http = require("http");
const express = require("express");

const app = express();

app.get("/hello-world", (req, res) => {
  res.status(200).send("hello-world");
});

const PORT = 8080;

http
  .createServer(app)
  .listen(PORT, () => console.log(`Listening on port ${PORT}`));
