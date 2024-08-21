const { ATOM, EXP, ERR, COMMENT, NUM, STR, BOOL, CLOSURE, PAIR, trueValue, falseValue } = require("./constants.js");
const {
    listify, pairToExp,
    cons, car, cdr,
    append,begin,
    lessThan, greaterThan,
    applyToList,
    equal, numberEqual,
    plus, minus, multiply, divide, divmod,
    strLength, strSlice, strConcat, strIndexOf,
    typeOf, error
} = require("./buildins.js");
const promises = require("./async.js");

const buildIns = {
    "+": plus, "-": minus, "*": multiply, "/": divide, "div-mod": divmod,
    "=": numberEqual, "equal?": equal,
    "list": (args, env) => listify(args),
    "cons": cons, "car": car, "first": car, "cdr": cdr, "rest": cdr,
    "append": append,
    "begin": begin,
    "<": lessThan, ">": greaterThan,
    "apply": applyToList,
    "string-length": strLength, "slice": strSlice, "concat": strConcat,  "index-of": strIndexOf,
    "type-of": typeOf,
    "error": error,
    "sleep-promise": promises.sleep, "resolve": promises.resolve
};

const asyncBuildIns = {
    "apply": applyToList,
    "resolve": promises.resolve
};

const formals = {
    "if": evalRewrite(rewriteIf),
    "cond": evalRewrite(rewriteCond),
    "case": evalRewrite(rewriteCase),
    "letrec": evalRewrite(rewriteLetrec), "local": evalRewrite(rewriteLetrec),
    "define": evalDefine,
    "lambda": evalLambda,
    "set!": evalSet,
    "quote": evalQuote,
    "quasiquote": evalQuasiquote,
    "let": evalLet,
    "and": evalAnd,
    "or": evalOr,
    "eval": eval2
};

const primitiveTypes = {
    "2": evalPrimitive,
    "3": evalPrimitive,
    "4": evalPrimitive,
    "5": evalPrimitive,
    "9": evalPrimitive
};

const rewrites = {
    "if": rewriteIf,
    "cond": rewriteCond,
    "case": rewriteCase,
    "letrec": rewriteLetrec
};

let scopeId = 1;
const tailCalls = true;

function read(text) {
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
        const quote = [{ type: ATOM, value: "quote" }];
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
        const [r, p] = readExpressionOrAtom(text, ++pos);
        const unquote = [{ type: ATOM, value: "unquote" }];
        unquote.push(r);
        result = { type: EXP, value: unquote };
        pos = p;
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
                return ["Incomplete string escape  " + pos, pos, true];
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
                    return ["Unknown string escape  " + pos, pos, true];
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
        result = { type: ERR, value: "Unknown # object " + pos };
    }
    return [result, pos];
}

function readNumber(atom, text, pos) {
    const number = Number(atom);
    if (Number.isNaN(number)) {
        result = { type: ERR, value: "Not a number " + pos };
    } else {
        // console.log("number " + atom);
        result = { type: NUM, value: number };
        pos = skipWhitespace(text, pos);
    }
    return [result, pos];
}

async function eval(exp, env) {
    
    if (exp.type === PAIR) {
        exp = pairToExp(exp);
    }

    const type = exp.type;

    if (type > EXP) {
        const primitiveEval = primitiveTypes[type];
        if (primitiveEval !== undefined) {
            return primitiveEval(exp, env);
        }
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

        if (exp.value[0].type === ATOM) {
            const first = exp.value[0];
            const evalFormal = formals[first.value];
            if (evalFormal !== undefined) {
                return await evalFormal(exp, env);
            }
        }

        let proc = await eval(exp.value[0], env);
        // console.log("proc " + JSON.stringify(proc));
        if (proc.type === ERR) {
            return proc;
        }

        let closureEnv = env;
        if (proc.type === CLOSURE) {
            closureEnv = proc.scope;
            proc = proc.value;
        }

        if (proc.type === EXP && proc.value[0].type === ATOM && proc.value[0].value === "lambda") {
            tail: while (true) {
                // console.log("lambda " + JSON.stringify(proc));

                if (proc.value.length < 2 && proc.value[1].type !== EXP) {
                    return { type: ERR, value: "lambda needs formal params" };
                }
                if (proc.value.length < 3) {
                    return { type: ERR, value: "lambda needs a body" };
                }
                const args = await evalArgs(exp, env);
                if (args["type"] === ERR) {
                    return args;
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
                                const rewrite = rewrites[target.value[0].value];
                                if (rewrite !== undefined) {
                                    // console.log("tail " + target.value[0].value);
                                    [target, localEnv] = await rewrite(target, localEnv);
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
                return { type: "erorr", value: "can't apply a " + proc.type };
            }

            // console.log("proc " + JSON.stringify(proc));
            const args = await evalArgs(exp, env);
            if (args["type"] === ERR) {
                return args;
            }
            return await apply(proc, args, env);
        }
    }

    if (type === ERR) {
        return exp;
    }
    return { type: "erorr", value: "Could not evaluate " + type };
}

function evalPrimitive(exp, env) { return exp; }

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

async function evalQuasiquote(exp, env) {
    if (exp.value.length !== 2) {
        return { type: ERR, value: "Can only quasi-quote one value" };
    }
    let result = exp.value[1];
    if (result.type === EXP) {
        const resultList = [];
        for (const subExp of exp.value[1].value) {
            if (subExp.type === EXP && subExp.value[0].type === ATOM && subExp.value[0].value === "unquote") {
                if (subExp.value.length !== 2) {
                    return { type: ERR, value: "Can only unquote one value"};
                }
                const unquoteExp = subExp.value[1];
                const r = await eval(unquoteExp, env);
                resultList.push(r);
            } else {
                resultList.push(subExp);
            }
        }
        result = listify(resultList);
    }
    // console.log("quasiquoted " + JSON.stringify(result));
    return result;
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
        return { type: ERR, value: "Could not evaluate value to set!" };
    }

    // console.log("set! " + symbol.value + " in " + e.name + " = " + JSON.stringify(update));
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
                return [{ type: ERR, value: "letrec define eval fails" }, env];
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
            return [{ type: ERR, value: "letrec bind eval fails" }, env];
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
        if (cond.type !== EXP && cond.value.length !== 2) {
            return [{ type: ERR, value: "cond arg must be expression pair" }, env];
        }
        // console.log("condition " + JSON.stringify(cond.value[0]));
        const defaultElse = cond.value[0];
        if (defaultElse.type === ATOM && defaultElse.value == "else") {
            if (i !== exp.value.length - 1) {
                return [{ type: ERR, value: "else must be last arg to cond" }, env];
            }
            return [cond.value[1], env];
        }
        const test = await eval(cond.value[0], env);
        if (!(test.type === BOOL && test.value === false)) {
            return [cond.value[1], env];
        }
    }
    return [falseValue, env];
}

async function rewriteCase(exp, env) {
    if (exp.value.length < 2) {
        return [{ type: ERR, value: "case needs expression and one or more conditions" }, env];
    }
    const selector = await eval(exp.value[1], env);
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
            return await evalCase(cond);
       }
       if (condCase.type !== EXP) {
          return [{ type: ERR, value: "cond case must be a list" }, env];
       }
       for (let i = 0; i < condCase.value.length; i++) {
           if (equal([selector, condCase.value[i]], env).value === true) {
              // console.log("case match");
              return await evalCase(cond);
           }
       }
    }
    return [falseValue, env];
}

async function evalCase(cond, env) {
    for (let c = 1; c < cond.value.length - 1; c++) {
        const result = await eval(cond.value[c], env);
        if (result.type === ERR) {
            return error;
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
        // console.log("eval define arg result " +  JSON.stringify(result));
        env[def.value] = result;
        return result;
    } if (def.type === EXP) { // procedure definition - rewrite as lambdda
        if (exp.value.length < 3) {
            return { type: ERR, value: "define procedure needs a body" };
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
        for (let i = 2; i < exp.value.length; i++) {
            lambda.push(exp.value[i]);
        }
        // console.log("define proc " + JSON.stringify(lambda));
        const closure = await eval({ type: EXP, value: lambda }, env);
        env[proc.value] = closure;
        return closure;
    } else {
        return { type: ERR, value: "Can't define a " + def.type };
    }
}

async function evalLet(exp, env) {
    if (exp.value.length < 3) {
        return { type: ERR, value: "let form needs a bind and one or more eval sub parts" };
    }
    const binds = exp.value[1];
    if (binds.type !== EXP) {
        return { type: ERR, value: "let bind expression expected" };
    }

    // rewrite as lambda
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
    console.log("let lambda expression " + JSON.stringify(letLambdaExp));

    return await eval(letLambdaExp, env);
}

async function evalAnd(exp, env) {
    let result = trueValue;
    for (let i = 1; i < exp.value.length; i++) {
        result = await eval(exp.value[i], env);
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
        if (!(result.type === BOOL && result.value === false)) {
            return trueValue;
        }
    }
    return result;
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
    const closure = await eval(exp.value[2], env);
    if (closure.type !== CLOSURE) {
        return { type: ERR, value: "eval requires a closure as second arg to provide an environment to evaluate in" };
    }
    const exp2 = await eval(exp.value[1], env);
    return await eval(exp2, closure.scope);
}

function write(result) {
    // console.log("write " + JSON.stringify(result));
    if (result.type === ERR) {
        return "ERROR " + result.value + "!";
    }
    if (result.type === NUM || result.type === STR || result.type === BOOL) {
        return result.value;
    }
    if (result.type === ATOM ) {
        return result.value;
    }
    if (result.type === CLOSURE) {
        return JSON.stringify(result.value);
    }
    if (result.type === EXP && result.value.length === 0) {
        return "()";
    }
    if (result.type === PAIR) {
        let str = "(";
        let once = false;
        while (result.type === PAIR) {
            if (!once) {
                once = true;
            } else {
                str += " ";
            }
            str += write(result.value);
            result = result.rest;
        }
        if (result.type !== EXP && result.value.length !== 0) {
            str += " . ";
            str += write(result);
        }
        str += ")";
        return str;
    }
    return JSON.stringify(result);
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

async function apply(proc, args, env) {
    const buildIn = buildIns[proc.value];
    if (buildIn !== undefined) {
        if (asyncBuildIns[proc.value] !== undefined) {
            return await buildIn(args, env, eval);
        }
        return buildIn(args, env);
    }
    return { type: ERR, value: "Unkown procedure " + proc.value };
}

exports.read = read;
exports.eval = eval;
exports.write = write;
