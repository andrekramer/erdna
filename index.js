const express = require("express");
const { ERR, PROMISE } = require("./constants.js");
const lang = require("./lang.js");
const procs = require("./procs.js");

const app = express();
app.use(express.raw({ type: '*/*', limit: '10mb' }));

const port = process.env.PORT || 8080;
const apiKey = process.env.APIKEY || '';

const topLevelEnv = procs.seed(); // Uncomment for no procs { name: "top level scope "};

const { sendMessage } = require("./async.js");

app.use((req, res, next) => {
  if (apiKey !== "" && req.headers["apikey"] !== apiKey) {
    res.status(401).send('invalid api key');
  } else {
    next();
  }
});

app.get("/", (req, res) => {
  res.send("erdna");
});

app.post("/", async (req, res) => {
  // const topLevelEnv = { name: "per request top level scope "}; // Uncomment this line for no sharing between requests.
  text = req.body.toString('utf-8');
  // console.log(text);
  result = lang.read(text);
  // console.log(JSON.stringify(result));

  const portal = req.query.portal;
  if (portal !== undefined) {
    // console.log("send to portal: " + portal);
    const messagePromise = topLevelEnv[portal];
    if (messagePromise === undefined || messagePromise.type !== PROMISE) {
      res.send("send failed - no such portal");
      return;
    }
    const messageEnv = { "__parent_scope": topLevelEnv, name: "message-scope" };
    const message = await await lang.eval(result[0], messageEnv);
    // console.log("message " + JSON.stringify(message));
    sendMessage([messagePromise, message], messageEnv, undefined);
    res.send("message sent.");
    return;
  }

  reply = "";
  for (const exp of result) {
    let result = await lang.eval(exp, topLevelEnv);
    if (result.type === ERR) {
      console.log("eval error: " + result.value);
      if (reply !== "") {
        res.send("" + reply + "\n" + result.value);
        return;
      }
      res.send(result.value);
      return;
    }
    if (result.type === PROMISE) {
      // console.log("promise!");
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
