const express = require("express");

const app = express();
const port = 8080;

app.get("/hello-world", (_req, res) => {
  res.status(200).send("hello-world");
});

app.get("/env", (_req, res) => {
  res.status(200).json(process.env);
});

app.get("/cmd", (_req, res) => {
  res.status(200).json(process.argv);
});

app.listen(port, () => console.log(`Listening on port ${port}`));
