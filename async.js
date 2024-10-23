const { EXP, ERR, NUM, STR, PAIR, PROMISE, nullList, voidValue } = require("./constants.js");
const fs = require('node:fs/promises');
const readline = require('node:readline/promises');

const { stdin: input, stdout: output } = require('node:process');

function sleepPromise(args, env) {
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
        headers[ "Content-Type"] = "application/text";
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

async function readFilePromise(args, env) {
    const result = { type: PROMISE };
    if (args.length !== 1 || args[0].type !== STR) {
        return { type: ERR, value: "read-file-promise expect a file name as argument" };
    }
    const promise = fs.readFile(args[0].value, { encoding: 'utf8' }).then(r => result.value = { type: STR, value: r });
    result.promise = promise;
    return result;
}

async function writeFilePromise(args, env) {
    const result = { type: PROMISE };
    if (args.length !== 2 || args[0].type !== STR || args[1].type !== STR) {
        return { type: ERR, value: "write-file-promise expect a file name and a string to write as the file content as argument" };
    }
    const promise = fs.writeFile(args[0].value, args[1].value).then(r => result.value = nullList );
    result.promise = promise;
    return result;
}

async function promptPromise(args, env) {
    const result = { type: PROMISE };
    if (args.length !== 1 || args[0].type !== STR) {
        return { type: ERR, value: "prompt-promise requires a string prompt" };
    }
    const rl = readline.createInterface({ input, output });

    const promise = rl.question(args[0].value).then(r => { result.value = { type: STR, value: r }; rl.close(); } );
    result.promise = promise;
    return result;
}

async function applyPromise(args, env, eval) {
    const result = { type: PROMISE };
    if (args.length !== 2) {
        return { type: ERR, value: "applyPromise takes 2 arguments" };
    }
    expValue = [args[0]];
    if (args[1].type !== PAIR) {
        return { type: ERR, value: "applyPromise requires a list as second argument" };
    }
    for (let head = args[1]; head.type === PAIR; head = head.rest) {
        expValue.push(head.value);
    }

    const exp = { type: EXP, value: expValue };
    // console.log("applyPromise " + JSON.stringify(exp));
    const promise = eval(exp, env).then(r => {
        // console.log("apply-promise result " + JSON.stringify(r));
        result.value = r });
    result.promise = promise;
    return result;
}

async function messagePromise(args, env, eval) {
    if (args.length !== 0) {
        return { type: ERR, value: "message-promise takes no arguments" };
    }
    const result = { type: PROMISE, queue: [] };
   
    result.promise = new Promise( (resolve) => {
        result.wakeup = () => { 
            resolve(true);
        }
    });

    return result;
}

// One shot send to promise. Enables subsequent resolve of the promise to return the value sent.
async function sendToPromise(args, env, eval) {
    if (args.length !== 2 || args[0].type !== PROMISE) {
        return { type: ERR, value: "send-promise expects a promise and a message as arguments" };
    }
    const msgPromise = args[0];
    if (msgPromise.wakeup === undefined) {
        return { type: ERR, value: "Can't send to a promise that is not promising a message" };
    }
    msgPromise.value = args[1];
    msgPromise.wakeup();
    return voidValue;
}

async function sendMessage(args, env, eval) {
    if (args.length !== 2 || args[0].type !== PROMISE) {
        return { type: ERR, value: "send-message expects a promise and a message as arguments" };
    }
    const msgQueuePromise = args[0];
    if (msgQueuePromise.queue === undefined) {
        return { type: ERR, value: "Not a queue promise" };
    }
    msgQueuePromise.queue.push(args[1]);
    if (msgQueuePromise.promise !== undefined && msgQueuePromise.wakeup !== undefined) {
        msgQueuePromise.value = voidValue;
        msgQueuePromise.wakeup();
    }
    return voidValue;
}

// Only a single receiever at a time is supported. A second receive for an empty queue will take over 
// and crowd out a waiting first receiver.
async function receiveMessage(args, env, eval) {
    if (args.length !== 1 || args[0].type !== PROMISE) {
        return { type: ERR, value: "receive-message expects (only) a promise as argument" };
    }
    const msgQueuePromise = args[0];
    if (msgQueuePromise.queue === undefined) {
        return { type: ERR, value: "Not a queue promise" };
    }
    while (msgQueuePromise.queue.length === 0) { // Some protection against messages being hijacked while waiting.
        msgQueuePromise.wakeup = undefined;
        msgQueuePromise.promise = new Promise( (resolve) => {
            msgQueuePromise.wakeup = () => { 
                resolve(true);
            }
        });
        if (msgQueuePromise.queue.length !== 0) break;
        await msgQueuePromise.promise;
    }
   
    const result = msgQueuePromise.queue.shift(); // performance may be O(N)
    return result;
}

async function resolve(args, env, eval) {
    if (args.length !== 1 || args[0].type !== PROMISE) {
        return { type: ERR, value: "resolve expects a promise as the single argument" };
    }
    const promise = args[0];
    try {
        await promise.promise;
    } catch (e) {
        return { type: ERR, value: "resolve error " + e };
    }

    return promise.value;
}

exports.sleepPromise = sleepPromise
exports.resolve = resolve
exports.fetchPromise = fetchPromise
exports.applyPromise = applyPromise
exports.readFilePromise = readFilePromise
exports.writeFilePromise = writeFilePromise
exports.promptPromise = promptPromise
exports.messagePromise = messagePromise
exports.sendToPromise = sendToPromise
exports.sendMessage = sendMessage
exports.receiveMessage = receiveMessage
