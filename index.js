const express = require("express");
const { ERR, PROMISE } = require("./constants.js");
const lang = require("./lang.js");
const procs = require("./procs.js");

const app = express();
app.use(express.raw({ type: '*/*', limit: '10mb' }));

const port = process.env.PORT || 8080;

const topLevelEnv = procs.seed(); // Uncomment for no procs { name: "top level scope "};

app.get("/", (req, res) => {
  res.send("erdna");
});

app.post("/", async (req, res) => {
  // const topLevelEnv = { name: "per request top level scope "}; // Uncomment this line for no sharing between requests.
  text = req.body.toString('utf-8');
  // console.log(text);
  result = lang.read(text);
  console.log(JSON.stringify(result));
  reply = "";
  for (const exp of result) {
    let result = await lang.eval(exp, topLevelEnv);
    if (result.type === ERR) {
      if (reply !== "") {
        res.send("" + reply + "\n" + result.value);
        return;
      }
      res.send(result.value);
      return;
    }
    if (result.type === PROMISE) {
      console.log("promise!");
      await result.promise;
      result = result.value;
    }
    reply += lang.write(result);
    reply += "\n";
  }
  res.send(reply);
});

app.listen(port, () => {
  console.log(`erdna listening on port ${port}!`);
});
