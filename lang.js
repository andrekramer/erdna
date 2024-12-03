const { ATOM, EXP, ERR, COMMENT, NUM, STR, BOOL, CLOSURE, VOID, PAIR, OBJ, trueValue, falseValue, PROMISE, nullList, displayType, isNullList, voidValue, QUOTE } = require("./constants.js");
const {
    listify, pairToExp,
    cons, car, cdr,
    setCar, setCdr,
    append,
    // begin,
    lessThan, greaterThan,
    makeVector, vectorSet, vectorRef, vectorLength,
    makeByteVector, byteVectorSet, byteVectorRef, byteVectorLength,
    applyLambda,
    equal, numberEqual,
    plus, minus, multiply, divide, divmod,
    sqrt, floor, random,
    strLength, strSlice, strConcat, strIndexOf, strReplace,
    typeOf, 
    numberToString, symbolToString, stringToSymbol, gensym,
    getEnvVar, print, error, printValue, 
    jsonParse
} = require("./buildins.js");

const { sleepPromise, fetchPromise, applyPromise, readFilePromise, writeFilePromise, promptPromise, messagePromise, sendToPromise, sendMessage, receiveMessage, resolve } = require("./async.js");

const buildIns = {
    "+": plus, "-": minus, "*": multiply, "/": divide, "div-mod": divmod,
    "sqrt": sqrt, "floor": floor, "random": random,
    "=": numberEqual, "equal?": equal,
    "list": (args, env) => listify(args),
    "cons": cons, "car": car, "first": car, "cdr": cdr, "rest": cdr,
    "set-car!": setCar, "set-cdr!": setCdr,
    "append": append,
    // "begin": begin,
    "<": lessThan, ">": greaterThan,
    "make-vector": makeVector, "vector": makeVector, "vector-set!": vectorSet, "vector-ref": vectorRef, "vector-length": vectorLength,
    "make-byte-vector": makeByteVector, "byte-vector": makeByteVector, "byte-vector-set!": byteVectorSet, "byte-vector-ref": byteVectorRef, "byte-vector-length": byteVectorLength,
    "apply": applyLambda,
    "string-length": strLength, "slice": strSlice, "concat": strConcat,  "index-of": strIndexOf, "string-replace": strReplace,
    "type-of": typeOf, "print": print, "error": error,
    "number->string": numberToString, "symbol->string": symbolToString, "string->symbol": stringToSymbol, "gensym": gensym,
    "get-env-var": getEnvVar,
    "sleep-promise": sleepPromise, "fetch-promise": fetchPromise, 
    "read-file-promise": readFilePromise, "write-file-promise": writeFilePromise, 
    "prompt-promise": promptPromise,
    "message-promise": messagePromise, "send-to-promise": sendToPromise,
    "send-message": sendMessage, "receive-message": receiveMessage,
    "apply-promise": applyPromise, "resolve": resolve,
    "read": readExp, "display": display,
    "json-parse": jsonParse
};

const asyncBuildIns = {
    "apply": applyLambda,
    "apply-promise": applyPromise,
    "resolve": resolve
};

const evalRewriteLetrec = evalRewrite(rewriteLetrec);
const evalRewriteLet = evalRewrite(rewriteLet);

const formals = {
    "if": evalRewrite(rewriteIf),
    "cond": evalRewrite(rewriteCond),
    "case": evalRewrite(rewriteCase),
    "begin": evalRewrite(rewriteBegin),
    "delay": evalRewrite(rewriteDelay),
    "letrec": evalRewriteLetrec, "local": evalRewriteLetrec, 
    "let": evalRewriteLet, // alternatively without tail call optimisation: evalLet,
    "define": evalDefine,
    "lambda": evalLambda,
    "set!": evalSet,
    "quote": evalQuote,
    "unquote": evalUnquote,
    "quasiquote": evalQuasiquote,
    "and": evalAnd,
    "or": evalOr,
    "while": evalWhile,
    "do": evalDo,
    "eval": eval2,
    "error->string": errorToString,
    "screen": screen,
    "define-rewriter": evalRewrite(macroRewriter),
    "make": evalMake,
    "@": evalAt,
    "@!": evalAtSet
};

if (true) {
  //  loosely equivalent to letrec
  formals["letrec*"] = evalRewriteLetrec;
  formals["let*"] = evalRewriteLetrec;
}

const rewrites = {
    "if": rewriteIf,
    "cond": rewriteCond,
    "case": rewriteCase,
    "let": rewriteLet,
    "letrec": rewriteLetrec,
    "define-rewriter": macroRewriter,
    "begin": rewriteBegin,
    "delay": rewriteDelay
};

const topLevelEnv = { name: "top level env" };

const macros = {
};

let scopeId = 1;
const tailCalls = true;
const macroRewriteOnly = (process.env.REWRITE_ONLY == 1) || false;

const SET_ANY_FIELD_ON_BASE = true;

function read(text) {
    // console.log("read " + text);
    let result = [];
    let pos = 0;
    while (pos < text.length) {
        const [r, p] = readExpressionOrAtom(text, pos);
        if (r.type === ERR) {
            return [r];
        }
        if (r.type === COMMENT) {
            pos = p;
            continue;
        }
        if (r.type === ATOM && r.value === '') {
            pos = p;
            continue;
        }
        pos = p;
        result.push(r);
    }
    return result;
}

function skipWhitespace(text, pos) {
    ch = text.charAt(pos);
    while ([' ', '\n', '\r', '\t'].includes(ch) && pos !== text.length) {
        pos++;
        ch = text.charAt(pos);
    }
    return pos;
}

function readExpressionOrAtom(text, pos) {
    let result = {};
    pos = skipWhitespace(text, pos);
    let ch = text.charAt(pos);
    // console.log("at " + pos);
    if (['(', '{', '['].includes(ch)) {
        // console.log("expression");
        let exp = [];
        const bracket = ch;
        pos++;
        pos = skipWhitespace(text, pos);
        while (![')', '}', ']'].includes(text.charAt(pos)) && pos < text.length) {
            const [r, p] = readExpressionOrAtom(text, pos);
            if (r.type === ERR) {
                return [r];
            }
            if (r.type === COMMENT) {
                pos = p;
                continue;
            }
            if (r.type === ATOM && r.value === '') {
                pos = p;
                continue;
            }
            pos = p;
            exp.push(r);
            pos = skipWhitespace(text, pos);
        }
        if (pos === text.length) {
            result = { type: ERR, value: "Incomplete " + bracket + " expression at " + pos };
        } else {
            let err = null;
            switch (bracket) {
                case '(':
                    if (text.charAt(pos) !== ')') err = "Unbalanced (";
                    break;
                case '{':
                    if (text.charAt(pos) !== '}') err = "Unbalanced {";
                    break;
                case '[':
                    if (text.charAt(pos) !== ']') err = "Unbalanced [";
                    break;
            }
            if (err !== null) {
                result = { type: ERR, value: err };
            } else {
                pos++;
                result = { type: EXP, value: exp };
            }
        }
    } else if (ch === '"') {
        const [str, p, error] = readString(text, pos);
        if (error) {
            result = { type: ERR, value: str };
        } else {
            // console.log(" string " + str);
            result = { type: STR, value: str };
            pos = skipWhitespace(text, p);
        }
    } else if (ch === ';') {
        pos = readComment(text, pos);
        return [{ type: COMMENT, value: "" }, pos];
    } else if (ch === '#' && pos + 1 < text.length) {
        const [r, p] = readObject(text, pos);
        result = r;
        pos = p;
    } else if (ch === "'") {
        const [r, p] = readExpressionOrAtom(text, ++pos);
        const quote = [ QUOTE ];
        quote.push(r);
        result = { type: EXP, value: quote };
        pos = p;
    }  else if (ch === "`") {
        const [r, p] = readExpressionOrAtom(text, ++pos);
        const quasiquote = [{ type: ATOM, value: "quasiquote" }];
        quasiquote.push(r);
        result = { type: EXP, value: quasiquote };
        pos = p;
    } else if (ch === ",") {
        const next = pos + 1;
        if (next === text.length || text.charAt(next) !== '@') {
            const [r, p] = readExpressionOrAtom(text, ++pos);
            const unquote = [{ type: ATOM, value: "unquote" }];
            unquote.push(r);
            result = { type: EXP, value: unquote };
            pos = p;
        } else {
            pos += 2;
            const [r, p] = readExpressionOrAtom(text, pos);
            const unquoteList = [{ type: ATOM, value: "unquote-list" }];
            unquoteList.push(r);
            result = { type: EXP, value: unquoteList };
            pos = p;
        }
    } else {
        if ([')', ']', '}'].includes(ch)) {
            return [{ type: ERR, value: "Missing opening bracket for " + ch + " at " + pos }];
        }
        const [atom, p, error] = readAtom(text, pos);
        if (error) {
            result = { type: ERR, value: atom }
        } else {
            const ch = atom.charAt(0);
            if ((['-', '+'].includes(ch) && atom.length !== 1) || (ch >= '0' && ch <= '9')) {
                const [r, next] = readNumber(atom, text, p);
                result = r;
                pos = next;
            } else {
                // console.log(" atom " + atom);
                result = { type: ATOM, value: atom };
                pos = skipWhitespace(text, p);
            }
        }
    }
    return [result, pos];
}

function readAtom(text, pos) {
    let ch = text.charAt(pos);
    let atom = "";
    while (![' ', '\n', '\r', '\t', ')', '}', ']', ","].includes(ch) && pos !== text.length) {
        if (ch === '"') {
            return ["No double quotes in identifiers allowed", pos, true];
        }
        atom += ch;
        pos++;
        ch = text.charAt(pos);
    }
    return [atom, pos, false];
}

function readString(text, pos) {
    let ch = text.charAt(++pos);
    let str = "";
    while (ch !== '"' && pos !== text.length) {
        if (ch === '\\') {
            if (pos + 1 === text.length) {
                return ["Incomplete string escape at " + pos, pos, true];
            }
            pos++;
            switch (text.charAt(pos)) {
                case 'n': str += '\n'; break;
                case 'r': str += '\r'; break;
                case 't': str += '\t'; break;
                case '\\': str += '\\'; break;
                case '"': str += '"'; break;
                case '\`': str += '`'; break;
                case '\'': str += "'"; break;
                case '\b': str += '`\b'; break;
                case '\f': str += '`\f'; break;
                case '\v': str += '`\v'; break;
                default:
                    return ["Unknown string escape at " + pos, pos, true];
            }
            pos++;
            ch = text.charAt(pos);
            continue;
        }
        str += ch;
        pos++;
        ch = text.charAt(pos);
    }
    if (ch !== '"' && pos == text.length) {
        return ["Non \" terminated string at " + pos, pos, true];
    }
    return [str, ++pos, false];
}

function readComment(text, pos) {
    ch = text.charAt(pos);
    while (ch !== '\n' && ch != '\r' && pos !== text.length) {
        pos++;
        ch = text.charAt(pos);
    }
    return pos;
}

function readObject(text, pos) {
    if (text.charAt(pos + 1) === 'f') {
        pos += 2;
        result = falseValue;
    } else if (text.charAt(pos + 1) === 't') {
        pos += 2;
        result = trueValue;
    } else {
        result = { type: ERR, value: "Unknown # object at " + pos };
    }
    return [result, pos];
}

function readNumber(atom, text, pos) {
    const number = Number(atom);
    if (Number.isNaN(number)) {
        result = { type: ERR, value: "Not a number at " + pos };
    } else {
        // console.log("number " + atom);
        result = { type: NUM, value: number };
        pos = skipWhitespace(text, pos);
    }
    return [result, pos];
}

async function eval(exp, env) {
    
    let type = exp.type;

    if (type >= NUM && type < PAIR) {
        // primitive eval returns self
        return exp;
    } else if (type === PAIR) {
        exp = pairToExp(exp);
        type = exp.type;
    }

    if (type === ATOM) {
        // console.log("eval atom");
        atom = lookup(exp.value, env);
        if (atom !== undefined) {
            // console.log("found atom " + JSON.stringify(atom));
            return atom;
        } else {
            if (buildIns[exp.value] !== undefined) {
                // console.log("snarfable");
                return exp;
            }
            return { type: ERR, value: "Unbound variable " + exp.value }
        }
    }

    if (type === EXP) {
        // console.log("eval expression");

        if (exp.value.length === 0) { // '() null list
            return exp;
        }
        if (exp.value[0].type === ATOM) {
            const first = exp.value[0];
            const evalFormal = formals[first.value];
            if (evalFormal !== undefined) {
                return await evalFormal(exp, env);
            }
            const macro = macros[first.value];
            if (macro !== undefined) {
                const macroExp = { type: EXP, value: [macro, { type: EXP, value: [QUOTE, exp] }] };
                let rewrite = await eval(macroExp, macro.scope);
                if (rewrite.type === ERR) {
                    return rewrite;
                }
                if (macroRewriteOnly) {
                    return rewrite;
                }
                if (rewrite.type === PAIR) {
                    rewrite = pairToExp(rewrite);
                    // console.log("macro rewrite " + JSON.stringify(rewrite));
                }
                const macroEnv = { "__parent_scope": env, name: "macro_scope " + scopeId++ };
                const result = await eval(rewrite, macroEnv);
                // console.log("macro result " + JSON.stringify(result));
                return result;
            }
        }

        let proc = await eval(exp.value[0], env);
        // console.log("proc " + JSON.stringify(proc));
        if (proc.type === ERR) {
            return proc;
        }

        let closureEnv = env;
        if (proc.type === CLOSURE) {
            // console.log("closure");
            closureEnv = proc.scope;
            proc = proc.value;
        }

        if (proc.type === EXP && proc.value.length > 0 && proc.value[0].type === ATOM && proc.value[0].value === "lambda") {
            tail: while (true) {
                // console.log("lambda " + JSON.stringify(proc));

                if (proc.value.length < 2 || (proc.value[1].type !== EXP && proc.value[1].type !== ATOM)) {
                    return { type: ERR, value: "lambda needs formal params" };
                }
                if (proc.value.length < 3) {
                    return { type: ERR, value: "lambda needs a body" };
                }
                const args = await evalArgs(exp, env);
                if (args["type"] === ERR) {
                    return args;
                }
                if (proc.value[1].type === ATOM) {
                    // console.log("single formal => (. formal)");
                    const singleFormal = { type: EXP, value: [{ type: ATOM, value: "." }, proc.value[1]]};
                    proc.value[1] = singleFormal;
                }
                const formalsCount = proc.value[1].value.length;
                const formals = proc.value[1].value;
                // console.log("varargs? " + proc.value[1].value[formalsCount - 2].value);
                if ((formalsCount >= 2 && formals[formalsCount - 2].value === ".")) {
                  if (args.length < formalsCount - 2) {
                    return { type: ERR, value: "lambda requires at least " + (formalsCount - 2) + " arguments" };
                  }
                } else if (args.length != formalsCount) {
                    return { type: ERR, value: "lambda requires " + formalsCount + " arguments" };
                }

                let localEnv = { "__parent_scope": closureEnv, name: "scope id " + scopeId++ };

                // console.log("formals " + JSON.stringify(formals));
                let i = 0;
                for (const formal of formals) {
                    if (formal.type !== ATOM) {
                        return { type: ERR, value: "Formal arguments must be symbols" };
                    }
                    if (formal.value === ".") {
                        // varargs
                        if (i !== formals.length - 2) {
                            return { type: ERR, value: ". must be second last formal parameter" };
                        }
                        const rest = [];
                        for (let j = i; j < args.length; j++) {
                            rest.push(args[j]);
                        }
                        localEnv[formals[formals.length -1].value] = listify(rest);
                        break;
                    }
                    localEnv[formal.value] = args[i++];
                }
                // console.log("localEnv " + JSON.stringify(localEnv));

                let result;
                for (let a = 2; a < proc.value.length; a++) {
                    // console.log("at " + JSON.stringify(proc.value[a]));
                    let target = proc.value[a];

                    if (tailCalls && a == proc.value.length - 1 && exp.value[0].type === ATOM) {
                        // console.log("tail? " + exp.value[0].value + " " + JSON.stringify(target));

                        rewrite: while (true) {
                            if (target.type === EXP && target.value.length !== 0 && target.value[0].type === ATOM) {
                                const procName = target.value[0].value;
                                const rewrite = rewrites[procName];
                                if (rewrite !== undefined) {
                                    // console.log("tail " + target.value[0].value);
                                    [target, localEnv] = await rewrite(target, localEnv);
                                    continue;
                                }
                                const macro = macros[procName];
                                if (macro !== undefined) {
                                    const macroExp = { type: EXP, value: [macro, { type: EXP, value: [ QUOTE, target] }] };
                                    let rewrite = await eval(macroExp, macro.scope);
                                    if (rewrite.type === ERR) {
                                        return rewrite;
                                    }
                                    // console.log("macro rewrite " + JSON.stringify(rewrite));
                                    if (rewrite.type === PAIR) {
                                        rewrite = pairToExp(rewrite);
                                    }
                               
                                    const macroEnv = { "__parent_scope": localEnv, name: "macro_rewrite_scope " + scopeId++ };
                                    target = await eval(rewrite, macroEnv);
                                    if (target.type === ERR) {
                                        return target;
                                    }
                                    // console.log("macro eval " + JSON.stringify(rewrite));
                                    localEnv = macroEnv;
                                    continue;
                                }
                            }
                            break;
                        }

                        if (target.type === EXP && target.value.length !== 0) {
                            // console.log("tail target " + JSON.stringify(target));
                            // Call to same proc can be optimized to avoid stack growing.
                            if (target.value[0].type === ATOM && target.value[0].value === exp.value[0].value) {
                                proc = await eval(target.value[0], env);
                                if (proc.type === ERR) {
                                    return proc;
                                }
                                if (proc.type === CLOSURE) {
                                    closureEnv = proc.scope;
                                    proc = proc.value;
                                    exp = target;
                                    env = localEnv;
                                    if (proc.type === EXP && proc.value[0].type === ATOM && proc.value[0].value === "lambda") {
                                        // console.log("tail call");
                                        continue tail;
                                    }
                                }
                            }
                        }
                    }
                    result = await eval(target, localEnv);
                    if (result.type === ERR) {
                        return result;
                    }
                    // console.log("result " + JSON.stringify(result));
                }

                return result;
            }
        } else {
            if (proc.type !== ATOM) {
                return { type: ERR, value: "can't apply " + displayType(proc.type) };
            }

            // console.log("proc " + JSON.stringify(proc));
            const args = await evalArgs(exp, env);
            if (args["type"] === ERR) {
                return args;
            }
            return await applyBuildin(proc, args, env);
        }
    }

    if (type === ERR || type === VOID) {
        return exp;
    }
    return { type: ERR, value: "Could not evaluate " + displayType(type) };
}

async function evalLambda(exp, env) {
    // console.log("closure over " + JSON.stringify(exp));
    return { type: CLOSURE, value: exp, scope: env };
}

async function evalQuote(exp, env) {
    if (exp.value.length !== 2) {
        return { type: ERR, value: "Can only quote one value" };
    }
    let result = exp.value[1];
    if (result.type === EXP) {
        result = listify(result.value);
    }
    // console.log("quoted " + JSON.stringify(result));
    return result;
}

async function evalUnquote(exp, env) {
    if (exp.value.length !== 2) {
        return { type: ERR, value: "Can only unquote one value" };
    }
    let value = exp.value[1];
    // console.log("unquote " + JSON.stringify(value));
    const result = await eval(value, env);
    if (result.type === ERR) {
        return result;
    }
    const result2 = await eval(result, env);
    return result2;
}

async function unquote(result, env) {
    if (result.type === EXP) {
        const resultList = [];
        for (const subExp of result.value) {
            if (subExp.type === EXP && subExp.value[0].type === ATOM && (subExp.value[0].value === "unquote" || subExp.value[0].value === "unquote-list")) {
                if (subExp.value.length !== 2) {
                    return { type: ERR, value: "Can only unquote one value"};
                }
                
                if (subExp.value[0].value === "unquote-list") {
                    const unquoteListExp = subExp.value[1];
                    const r = await eval(unquoteListExp, env);
                    if (r.type === ERR) {
                        return r;
                    }
                    let first;
                    if (r.type === EXP) {
                        first = listify(r);
                    } else if (r.type !== PAIR) {
                        return { type: ERR, value: "Expected a list to splice"};
                    } else {
                        first = r;
                    }
                    
                    while (first.type === PAIR) {
                       resultList.push(first.value);
                       first = first.rest;
                    }
                } else {
                    const unquoteExp = subExp.value[1];
                    const r = await eval(unquoteExp, env);
                    if (r.type === ERR) {
                        return r;
                    }
                    resultList.push(r);
                }
            } else {
                resultList.push(await unquote(subExp, env));
            }
        }
        result = listify(resultList);
    }
    // console.log("quasiquoted " + JSON.stringify(result));
    return result;
}

async function evalQuasiquote(exp, env) {
    if (exp.value.length !== 2) {
        return { type: ERR, value: "Can only quasi-quote one value" };
    }
    let result = exp.value[1];
    return await unquote(result, env);
}

async function evalSet(exp, env) {
    if (exp.value.length !== 3) {
        return { type: ERR, value: "set! requires a name and value" };
    }
    const symbol = exp.value[1];
    if (symbol.type !== ATOM) {
        return { type: ERR, value: "Can only set value of a symbol" };
    }

    let e = env;
    while (e !== undefined && e[symbol.value] === undefined) {
        e = e["__parent_scope"];
    }
    if (e === undefined) {
        return { type: ERR, value: "Undefined symbol " + symbol.value + " in set!" };
    }

    const value = e[symbol.value];

    const update = await eval(exp.value[2], env);
    if (update.type === ERR) {
        return { type: ERR, value: "Could not evaluate value to set! (" + update.value + ")"};
    }

    // console.log("set! " + symbol.value + " in " + e.name + " = " + JSON.stringify(update) + " was " + JSON.stringify(value));
    e[symbol.value] = update;
    return value;
}

function evalRewrite(rewrite) {
    return async (exp, env) => {
        const [rewriteExp, localEnv] = await rewrite(exp, env);
        if (rewriteExp.type === ERR) {
            return rewriteExp;
        }
        return await eval(rewriteExp, localEnv);
    };
}

async function rewriteLet(exp, env) {
    const letEnv =  { "__parent_scope": env, name: "let " + scopeId++ };

    if (exp.value.length < 3) {
        return [{ type: ERR, value: "let form needs a bind and one or more eval sub parts" }, env];
    }
    const binds = exp.value[1];
    if (binds.type === ATOM) {
        if (exp.value[2].type !== EXP || exp.value.length < 4) {
            return [{ type: ERR, value: "named let needs args with initalizers and a body" }, env];
        }

        // console.log("named let " + binds.value);
        const args = [];
        const initValues = [];
        for (const argInit of exp.value[2].value) {
            if (argInit.type !== EXP || argInit.value.length !== 2 || argInit.value[0].type !== ATOM) {
                return [{ type: ERR, value: "arg initializers must be pairs of arg and initial value" }, env];
            }
            args.push(argInit.value[0]);
            const initValue = await eval(argInit.value[1], env);
            if (initValue.type === ERR) {
                return [initValue, env];
            }
            // console.log("arg init " + argInit.value[0].value + " = " + JSON.stringify(initValue));
            initValues.push(initValue);
        }
       
        const lambda = [{ type: ATOM, value: "lambda" }, { type: EXP, value: args }];
        for (let i = 3; i < exp.value.length; i++) {
            lambda.push(exp.value[i]);
        }
        // console.log("named let lambda " + JSON.stringify(lambda));
       
        const closure = await eval({ type: EXP, value: lambda }, env);
        if (closure.type === ERR) {
            return [closure, env];
        }
        env[binds.value] = closure;

        const namedLetExp = { type: EXP, value: [ binds ] };
        for (const initValue of initValues) {
            namedLetExp.value.push(initValue);
        }
        
        // console.log("named let exp " + JSON.stringify(namedLetExp));
        return [namedLetExp, letEnv];
    }
    if (binds.type !== EXP) {
        return [{ type: ERR, value: "let bind expression expected" }, env];
    }
    for (const bind of binds.value) {
        if (bind.type !== EXP || bind.value.length !== 2) {
            return [{ type: ERR, value: "let bind must be an expression pair" }, env];
        }
        if (bind.value[0].type !== ATOM) {
            return [{ type: ERR, value: "let bind must be atom and expression pair" } , env];
        }
 
        const variable = bind.value[0].value;
        // console.log("let var " + variable);
        
        const value = await eval(bind.value[1], env);
        if (value.type === ERR) {
            return [{ type: ERR, value: "let bind eval fails: " + value.value }, env];
        }
        letEnv[variable] = value;
    }
    for (let i = 2; i < exp.value.length - 1; i++) {
        const result = await eval(exp.value[i], letEnv);
        if (result.type === ERR) {
            return [result, env];
        }
    }
    const letExp = exp.value[exp.value.length - 1];
    // console.log("let exp " + JSON.stringify(letrecExp));
    return [letExp, letEnv];
}

async function rewriteLetrec(exp, env) {
    const letrecEnv =  { "__parent_scope": env, name: "letrec " + scopeId++ };

    if (exp.value.length < 3) {
        return [{ type: ERR, value: "letrec form needs a bind and one or more eval sub parts" }, env];
    }
    const binds = exp.value[1];
    if (binds.type !== EXP) {
        return [{ type: ERR, value: "letrec bind expression expected" }, env];
    }
    for (const bind of binds.value) {

        if (bind.type === EXP && bind.value.length > 1 && bind.value[0].type === ATOM && bind.value[0].value === "define") {
            // allow defines to add to local env
            const v = await eval(bind, letrecEnv);
            if (v.type === ERR) {
                return [{ type: ERR, value: "letrec define eval fails: " + v.value }, env];
            }
            continue;
        }

        if (bind.type !== EXP || bind.value.length !== 2) {
            return [{ type: ERR, value: "letrec bind must be a define or an expression pair" }, env];
        }
        if (bind.value[0].type !== ATOM) {
            return [{ type: ERR, value: "letrec bind must be atom and expression pair" } , env];
        }
 
        const variable = bind.value[0].value;
        // console.log("letrec var " + variable);
        
        const value = await eval(bind.value[1], letrecEnv);
        if (value.type === ERR) {
            return [{ type: ERR, value: "letrec bind eval fails: " + value.value}, env];
        }
        letrecEnv[variable] = value;
    }
    for (let i = 2; i < exp.value.length - 1; i++) {
        const result = await eval(exp.value[i], letrecEnv);
        if (result.type === ERR) {
            return [result, env];
        }
    }
    const letrecExp = exp.value[exp.value.length - 1];
    // console.log("letrec exp " + JSON.stringify(letrecExp));
    return [letrecExp, letrecEnv];
}

async function rewriteIf(exp, env) {
    if (exp.value.length < 3) {
        return [{ type: ERR, value: "if form needs a condition and a then part" }, env];
    }
    if (exp.value.length > 4) {
        return [{ type: ERR, value: "if form requires condition with then and optional else part" }, env];
    }

    const condition = exp.value[1];
    // console.log("if " + JSON.stringify(condition));
    const result = await eval(condition, env);
    if (result.type === ERR) {
        return [result, env];
    }

    if (!(result.type === BOOL && result.value === false)) {
        return [exp.value[2], env];
    } else {
        if (exp.value.length === 4) {
            return [exp.value[3], env];
        } else {
            return [falseValue, env];
        }
    }
}

async function rewriteCond(exp, env) {
    if (exp.value.length === 1) {
        return [{ type: ERR, value: "cond needs one or more conditions" }, env];
    }

    for (let i = 1; i < exp.value.length; i++) {
        const cond = exp.value[i];
        if (cond.type !== EXP || cond.value.length < 2) {
            return [{ type: ERR, value: "cond must be a test and expression pair or test and expressions" }, env];
        }
        // console.log("condition " + JSON.stringify(cond.value[0]));
        const defaultElse = cond.value[0];
        if (defaultElse.type === ATOM && defaultElse.value == "else") {
            if (i !== exp.value.length - 1) {
                return [{ type: ERR, value: "else must be last arg to cond" }, env];
            }
            return await evalRewriteCondCase(cond, env);
        }
        const test = await eval(cond.value[0], env);
        if (test.type === ERR) {
            return [test, env];
        }
        if (!(test.type === BOOL && test.value === false)) {
            return await evalRewriteCondCase(cond, env);
        }
    }
    return [falseValue, env];
}

async function rewriteCase(exp, env) {
    if (exp.value.length < 3) {
        return [{ type: ERR, value: "case needs expression and one or more conditions" }, env];
    }
    const selector = await eval(exp.value[1], env);
    if (selector.type === ERR) {
        return [selector, env];
    }
    // console.log("selector " + JSON.stringify(selector));
    for (let i = 2; i < exp.value.length; i++) {
       const cond = exp.value[i];
       if (cond.type !== EXP || cond.value.length < 2) {
         return [{ type: ERR, value: "invalid condition" }, env];
       }
       const condCase = cond.value[0];
       if (condCase.type == ATOM && condCase.value === "else") {
            // console.log("case else");
            if (i !== exp.value.length - 1) {
                return [{ type: ERR, value: "else must be last case" }, env];
            }
            return await evalRewriteCondCase(cond, env);
       }
       if (condCase.type !== EXP) {
          return [{ type: ERR, value: "cond case must be a list" }, env];
       }
       for (let i = 0; i < condCase.value.length; i++) {
           const condCaseValue = await eval(condCase.value[i], env);
           if (equal([selector, condCaseValue], env).value === true) {
              // console.log("case match");
              return await evalRewriteCondCase(cond, env);
           }
       }
    }
    return [falseValue, env];
}

async function rewriteBegin(exp, env) {
    if (exp.value.length === 1) {
        return [voidValue, env];
    }

    for (let i = 1; i < exp.value.length - 1; i++) {
        const result = await eval(exp.value[i], env);
        if (result.type === ERR) {
            return [result, env];
        }
    }

    return [exp.value[exp.value.length - 1], env];
}

async function rewriteDelay(exp, env) {
    if (exp.value.length !== 2) {
        return { type: ERR, value: "delay requires a single expression or value as argument" };
    }
    const thunk = { type: EXP, value: [{ type: ATOM, value: "lambda" }, { type: EXP, value: [] }, exp.value[1]]};
    return [thunk, env];
}

async function macroRewriter(exp, env) {
    // console.log("define-rewriter");
    if (exp.value.length !== 3 || exp.value[1].type !== ATOM || exp.value[2].type !== EXP) {
        return [{ type: ERR, value: "define-rewriter takes a name and an expression" }, env];
    }
    macros[exp.value[1].value] = { type: CLOSURE, value: {type: EXP, value: exp.value[2].value }, scope: env };
    return [nullList, env];
}

async function evalRewriteCondCase(cond, env) {
    for (let c = 1; c < cond.value.length - 1; c++) {
        const result = await eval(cond.value[c], env);
        if (result.type === ERR) {
            return [result, env];
        }
    }
    return [cond.value[cond.value.length - 1], env];
}

async function evalDefine(exp, env) {
    if (exp.value.length < 2) {
        return { type: ERR, value: "define what please?" };
    }
    const def = exp.value[1];
    if (def.type === ATOM) {
        // console.log("define " + JSON.stringify(def));
        if (exp.value.length !== 3) {
            return { type: ERR, value: "define takes 2 arguments found " + exp.value.length };
        }
        const arg = exp.value[2];
        const result = await eval(arg, env);
        if (result.type === ERR) {
            return result;
        }
        // console.log("eval define arg result " +  JSON.stringify(result));
        env[def.value] = result;
        return result;
    } if (def.type === EXP) { // procedure definition - rewrite as lambdda
        if (exp.value.length < 3) {
            return { type: ERR, value: "define procedure needs a body" };
        }
        let body = 2;
        if (exp.value[2].type === STR) {
            if (exp.value.length < 4) {
                return { type: ERR, value: "define procedure needs a body as well as a doc comment" };
            }
            body = 3;
            const doc = exp.value[2];
        }
        const proc = def.value[0];
        if (proc.type !== ATOM) {
            return { type: ERR, value: "define procedure needs a name" };
        }
        const args = [];
        for (let i = 1; i < def.value.length; i++) {
            args.push(def.value[i]);
        }
        const lambda = [{ type: ATOM, value: "lambda" }, { type: EXP, value: args }];
        for (let i = body; i < exp.value.length; i++) {
            lambda.push(exp.value[i]);
        }
        // console.log("define proc " + JSON.stringify(lambda));
        const closure = await eval({ type: EXP, value: lambda }, env);
        if (closure.type === ERR) {
            return closure;
        }
        env[proc.value] = closure;
        return closure;
    } else {
        return { type: ERR, value: "Can't define " + displayType(def.type) };
    }
}

async function evalLet(exp, env) {
    // This version of evalLet re-wites let as a lambda
    if (exp.value.length < 3) {
        return { type: ERR, value: "let form needs a bind and one or more eval sub parts" };
    }
    const binds = exp.value[1];
    if (binds.type !== EXP) {
        return { type: ERR, value: "let bind expression expected" };
    }

    const lambda = { type: ATOM, value: "lambda" };
    const params = [];
    const args = [];
    for (const bind of binds.value) {
        // console.log("param " + JSON.stringify(bind));
        if (bind.type !== EXP || bind.value.length !== 2) {
            return { type: ERR, value: "let bind must be expression pair" };
        }
        if (bind.value[0].type !== ATOM) {
            return { type: ERR, value: "let bind must be atom and expression pair" };
        }
        params.push(bind.value[0]);
        args.push(bind.value[1]);
    }

    const letLambdaValue = [lambda, { type: EXP, value: params }];
    for (let i = 2; i < exp.value.length; i++) {
        letLambdaValue.push(exp.value[i]);
    }

    const letLambdaExpValue = [{ type: EXP, value: letLambdaValue }];
    for (const arg of args) {
        letLambdaExpValue.push(arg);
    }
    const letLambdaExp = { type: EXP, value: letLambdaExpValue };
    // console.log("let lambda expression " + JSON.stringify(letLambdaExp));

    return await eval(letLambdaExp, env);
}

async function evalAnd(exp, env) {
    let result = trueValue;
    for (let i = 1; i < exp.value.length; i++) {
        result = await eval(exp.value[i], env);
        if (result.type === ERR) {
            return result;
        }
        if (result.type === BOOL && result.value === false) {
            return falseValue;
        }
    }
    return result;
}

async function evalOr(exp, env) {
    let result = falseValue;
    for (let i = 1; i < exp.value.length; i++) {
        result = await eval(exp.value[i], env);
        if (result.type === ERR) {
            return result;
        }
        if (!(result.type === BOOL && result.value === false)) {
            return trueValue;
        }
    }
    return result;
}

async function evalWhile(exp, env) {
    if (exp.value.length < 3) {
        return [{ type: ERR, value: "while needs a condition and a body" }, env];
    }
    loop: while (true) {
        const condition = exp.value[1];
        // console.log("while " + JSON.stringify(condition));
        const result = await eval(condition, env);
        if (result.type === ERR) {
            return result;
        }
    
        if (result.type === BOOL && result.value === false) {
            return falseValue;
        } else {
            for (let i = 2; i < exp.value.length; i++) {
                const result = await eval(exp.value[i], env);
                if (result.type === ERR) {
                    return result;
                }
                if (result.type === ATOM) {
                    if (result.value === "break") {
                        return trueValue;
                    }
                    if (result.value === "continue") {
                        continue loop;
                    }
                }
            }
        }
    }
}

async function evalDo(exp, env) {
    if (exp.value.length < 3) {
        return [{ type: ERR, value: "do needs a body and a condition" }, env];
    }
    loop: while (true) {
        for (let i = 1; i < exp.value.length - 1; i++) {
            const result = await eval(exp.value[i], env);
            if (result.type === ERR) {
                return result;
            }
            if (result.type === ATOM) {
                if (result.value === "break") {
                    return trueValue;
                }
                if (result.value === "continue") {
                    continue loop;
                }
            }
        }

        const condition = exp.value[exp.value.length - 1];
        // console.log("do " + JSON.stringify(condition));
        const result = await eval(condition, env);
        if (result.type === ERR) {
            return result;
        }
    
        if (result.type === BOOL && result.value === false) {
            return falseValue;
        }
    }
}

async function evalArgs(exp, env) {
    const args = [];
    for (let i = 1; i < exp.value.length; i++) {
        // console.log("arg " + i + " " + JSON.stringify(exp.value[i]));
        const arg = await eval(exp.value[i], env);
        if (arg.type === ERR) {
            return arg;
        }
        args.push(arg);
    }
    return args;
}

async function eval2(exp, env) {
    if (exp.value.length !== 3) {
        return { type: ERR, value: "eval takes an expression to evaluate and a closure to borrow an environment from" };
    }
    let scope;
    const closure = await eval(exp.value[2], env);
    if (isNullList(closure)) {
        scope = topLevelEnv;
    } else if (closure.type !== CLOSURE) {
        return { type: ERR, value: "eval requires a closure as second arg to provide an environment to evaluate in" };
    } else {
        scope = closure.scope;
    }

    const exp2 = await eval(exp.value[1], env);
    return await eval(exp2, scope);
}

async function errorToString(exp, env) {
    if (exp.value.length !== 2) {
        return { type: ERR, value: "error->string takes a single argument" };
    }
    const result = await eval(exp.value[1], env);
    if (result.type === ERR) {
        return { type: STR, value: "Error: " + result.value };
    }
    return result;
}

async function screen(exp, env) {
    if (exp.value.length !== 3) {
        return { type: ERR, value: "screen takes two arguments" };
    }
    const result = await eval(exp.value[1], env);
    if (result.type === ERR) {
        env["last-error"] = { type: STR, value: result.value };
        return await eval(exp.value[2], env);
    }
    return result;
}

async function evalMake(exp, env) {
    if (exp.value.length < 3 || exp.value[1].type !== ATOM || (exp.value[2].type !== ATOM && !isNullList(exp.value[2]))) {
        return { type: ERR, value: "make requires a name and a prototype with optional field initializers" };
    }
    const name = exp.value[1].value;
    const obj = {};

    if (exp.value[2].type === ATOM) {
        // console.log("make with base " + exp.value[2].value);
        const base = lookup(exp.value[2].value, env);
        if (base === undefined || base.type !== OBJ) {
            return { type: ERR, value: "super must be an object for make" };
        }
        obj["super"] = base;
    }
    for (let i = 3; i < exp.value.length; i++) {
        const v = exp.value[i];
        if (v.type !== EXP || v.value.length !== 2 || v.value[0].type !== ATOM) {
            return { type: ERR, value: "make takes a name and optional (member value) initializers" };
        }
        const result = await eval(v.value[1], env);
        if (result.type === ERR) {
            return result;
        }
        obj[v.value[0].value] = result;
    }
    
    // console.log("made " + name + " = " + JSON.stringify(obj));
    const result = { type: OBJ, value: obj };
    env[name] = result;
    return result;
}

async function evalAt(exp, env) {
    if (exp.value.length != 3) {
        return { type: ERR, value: "@ requires an object and field name" };
    }
    let obj = await eval(exp.value[1], env);
    if (obj.type === ERR) {
        return obj;
    }
    if (obj.type !== OBJ) {
        return { type: ERR, value: "@ requires a first argument that evaluates to an object" };
    }
    let name = exp.value[2];
    if (name.type === EXP && name.value.length === 2 && name.value[0].type === ATOM && name.value[0].value === "quote") {
        name = await eval(name.value[1], env);
        if (name.type === ERR) {
            return name;
        }
    }
    if (name.type !== ATOM) {
        return { type: ERR, value: "@ requires a second argument that evaluates to a field name" };
    }
    // console.log("get " + name.value);
    while (true) {
        const value = obj.value[name.value];
        if (value !== undefined) {
            return value;
        }
        const base = obj.value["super"];
        if (base === undefined) {
            return { type: ERR, value: "@ field to get not found" };
        }
        obj = base;
    }
}

const SET_FIELD_VALUE_ERROR = { type: ERR, value: "@! could not evaluate value to set field to" };

async function evalAtSet(exp, env) {
    if (exp.value.length != 4) {
        return { type: ERR, value: "@! requires an object, field name and value" };
    }
    let obj = await eval(exp.value[1], env);
    if (obj.type === ERR) {
        return obj;
    }
    if (obj.type !== OBJ) {
        return { type: ERR, value: "@! requires a first argument that evaluates to an object" };
    }
    const target = obj;

    let name = exp.value[2];
    if (name.type === EXP && name.value.length === 2 && name.value[0].type === ATOM && name.value[0].value === "quote") {
        name = await eval(name.value[1], env);
        if (name.type === ERR) {
            return name;
        }
    }
    if (name.type !== ATOM) {
        return { type: ERR, value: "@! requires a second argument that evaluates to a field name" };
    }
    while (true) {
        const value = obj.value[name.value];
        if (value !== undefined) {
            const update = await eval(exp.value[3], env);
            if (update.type === ERR) {
                return SET_FIELD_VALUE_ERROR;
            }
            obj.value[name.value] = update;
            return value;
        }
        const base = obj.value["super"];
        if (base === undefined) {
            if (SET_ANY_FIELD_ON_BASE && obj === target) {
                // Allow any field to be set on objects that don't have a super.
                const update = await eval(exp.value[3], env);
                if (update.type === ERR) {
                    return SET_FIELD_VALUE_ERROR;
                }
                obj.value[name.value] = update;
                return voidValue;
            }
            return { type: ERR, value: "@! field to set not found" };
        }
        obj = base;
    }
}

function write(result) {
    const str = printValue(result);
    if (str === undefined) {
        // console.log(JSON.stringify(result));
        return "undefined";
    }
    return str;
}

function lookup(symbol, env) {
    let e = env;
    while (e !== undefined) {
        const value = e[symbol];
        if (value !== undefined) {
            return value;
        }
        e = e["__parent_scope"];
    }
    return undefined;
}

async function applyBuildin(proc, args, env) {
    const buildIn = buildIns[proc.value];
    if (buildIn !== undefined) {
        if (asyncBuildIns[proc.value] !== undefined) {
            if (proc.value === "apply-promise") {
                return buildIn(args,env, eval);
            }
            return await buildIn(args, env, eval);
        }
        return buildIn(args, env);
    }
    return { type: ERR, value: "Unkown procedure " + proc.value };
}

function readExp(args, env) {
    if (args.length !== 1 || args[0].type !== STR) {
        return { type: ERR, value: "read expectes one string argument" };
    }
    const exps = read(args[0].value);
    if (exps.length === 1) {
        return exps[0];
    }
    exps.unshift({ type: ATOM, value: "begin" });
    return { type: EXP, value: exps };
}

function display(args, env) {
    for (const arg of args) {
        if (arg.type === STR) {
            console.log(arg.value);
        } else {
            const str = printValue(arg);
            if (str !== undefined) {
                console.log(str);
            } else {
                console.log(JSON.stringify(arg.value));
            }
        }
    }
    return voidValue;
}

exports.read = read;
exports.eval = eval;
exports.write = write;
exports.topLevelEnv = topLevelEnv;
