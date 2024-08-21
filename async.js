const { ERR, NUM, PROMISE } = require("./constants.js");

function sleep(args, env) {
    const ret = { type: PROMISE };
    if (args.length !== 1 || args[0].type !== NUM) {
        return { type: ERR, value: "sleep expects a number as argument" };
    }
    const promise = new Promise(r => { setTimeout(r, args[0].value) }).then(r => ret.value = "done.");
    ret.promise = promise;
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
        return { type: ERR, value: "resolve error " + JSON.stringify(e) };
    }
    
    return promise.value;
}

exports.sleep = sleep
exports.resolve = resolve
