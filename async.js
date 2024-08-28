const { ERR, NUM, STR, PROMISE } = require("./constants.js");

function sleep(args, env) {
    const ret = { type: PROMISE };
    if (args.length !== 1 || args[0].type !== NUM) {
        return { type: ERR, value: "sleep expects a number as argument" };
    }
    const promise = new Promise(r => { setTimeout(r, args[0].value) }).then(r => ret.value = { type: STR, value: "done." });
    ret.promise = promise;
    return ret;
}

async function fetchPromise(args, env) {
    const ret = { type: PROMISE };

    if (args.length < 2 || args[0].type !== STR || args[1].type !== STR) {
        return { type: ERR, value: "fetch-promise expect a url as first argument and apikey as second argument" };
    }
    const headers = {};
    if (args[1].value !== "") {
        headers["apikey"] = args[1].value;
    }
    let promise;
    if (args.length === 2) {
        // console.log("fetch " + args[0].value);
        promise = fetch(args[0].value, { headers });
    } else if (args.length === 3) {
        headers[ "Content-Type"] = "application/json";
        if (args[2].type !== STR) {
            return { type: ERR, value: "fetch-promise expect a text body as optional 3rd argument" };
        }
        promise = fetch(args[0].value, {
            method: "POST",
            headers,
            body: args[2].value,
        });
    } else if (args.length > 3) {
        return { type: ERR, value: "fetch-promise called with too many arguments" };
    }
    const promise2 = promise.then((response) => response.text())
    .then((body) => {
        ret.value = { type: STR, value: body };
        // console.log("body " + body);
    }).catch((error) => {
        // console.error('fetch error ', error);
        ret.value = { type: ERR, value: "fetch error " + error};
    });
    ret.promise = promise2;
    return ret;
}

async function resolve(args, env, eval) {
    if (args.length !== 1 || args[0].type !== PROMISE) {
        return { type: ERR, value: "resolve expects a promise as argument" };
    }
    const promise = args[0];
    try {
        await promise.promise;
    } catch (e) {
        return { type: ERR, value: "resolve error " + e };
    }

    return promise.value;
}

exports.sleep = sleep
exports.resolve = resolve
exports.fetchPromise = fetchPromise
