const express = require("express");
const lang = require("./lang.js");

const app = express();
app.use(express.raw({ type: '*/*', limit: '10mb' }));

const port = 8080;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/", (req, res) => {
  text = req.body.toString('utf-8');
  console.log(text);
  result = lang.parse(text);
  console.log(JSON.stringify(result));
  reply = text + ".";
  res.send(reply);
});

app.listen(port, () => {
  console.log(`erdna listening on port ${port}!`);
});

