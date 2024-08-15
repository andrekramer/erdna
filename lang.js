const res = require("express/lib/response");

const buildIns = {
    "+": plus,
    "-": minus,
    "*": multiply,
    "/": divide,
    "equal?": equal,
    "list": (args, env) => listify(args),
    "cons": cons,
    "car": car,
    "cdr": cdr,
    "append": append,
    "begin": begin,
    "<": lessThan,
    "apply": applyToList,
    "string-length": strLength,
    "slice": strSlice,
    "concat": strConcat
};

const formals = {
    "if": evalRewrite(rewriteIf),
    "cond": evalRewrite(rewriteCond),
    "case": evalRewrite(rewriteCase),
    "letrec": evalRewrite(rewriteLetrec),
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
    "string": evalPrimitive,
    "number": evalPrimitive,
    "boolean": evalPrimitive,
    "closure": evalPrimitive
};

const rewrites = {
    "if": rewriteIf,
    "cond": rewriteCond,
    "case": rewriteCase,
    "letrec": rewriteLetrec
}

let scopeId = 1;
const tailCalls = true;

const trueValue = { type: "boolean", value: true };
const falseValue = { type: "boolean", value: false };
const nullList = { type: "expression", value: [] };

function read(text) {
    let result = [];
    let pos = 0;
    while (pos < text.length) {
        const [r, p] = readExpressionOrAtom(text, pos);
        if (r.type === "error") {
            return [r];
        }
        if (r.type === "comment") {
            pos = p;
            continue;
        }
        if (r.type === "atom" && r.value === '') {
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
            if (r.type === "error") {
                return [r];
            }
            if (r.type === "comment") {
                pos = p;
                continue;
            }
            if (r.type === "atom" && r.value === '') {
                pos = p;
                continue;
            }
            pos = p;
            exp.push(r);
            pos = skipWhitespace(text, pos);
        }
        if (pos === text.length) {
            result = { type: "error", value: "Incomplete " + bracket + " expression at " + pos };
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
                result = { type: "error", value: err };
            } else {
                pos++;
                result = { type: "expression", value: exp };
            }
        }
    } else if (ch === '"') {
        const [str, p, error] = readString(text, pos);
        if (error) {
            result = { type: "error", value: str };
        } else {
            // console.log(" string " + str);
            result = { type: "string", value: str };
            pos = skipWhitespace(text, p);
        }
    } else if (ch === ';') {
        pos = readComment(text, pos);
        return [{ type: "comment", value: "" }, pos];
    } else if (ch === '#' && pos + 1 < text.length) {
        const [r, p] = readObject(text, pos);
        result = r;
        pos = p;
    } else if (ch === "'") {
        const [r, p] = readExpressionOrAtom(text, ++pos);
        const quote = [{ type: "atom", value: "quote" }];
        quote.push(r);
        result = { type: "expression", value: quote };
        pos = p;
    }  else if (ch === "`") {
        const [r, p] = readExpressionOrAtom(text, ++pos);
        const quasiquote = [{ type: "atom", value: "quasiquote" }];
        quasiquote.push(r);
        result = { type: "expression", value: quasiquote };
        pos = p;
    } else if (ch === ",") {
        const [r, p] = readExpressionOrAtom(text, ++pos);
        const unquote = [{ type: "atom", value: "unquote" }];
        unquote.push(r);
        result = { type: "expression", value: unquote };
        pos = p;
    } else {
        if ([')', ']', '}'].includes(ch)) {
            return [{ type: "error", value: "Missing opening bracket for " + ch + " at " + pos }];
        }
        const [atom, p, error] = readAtom(text, pos);
        if (error) {
            result = { type: "error", value: atom }
        } else {
            const ch = atom.charAt(0);
            if ((['-', '+'].includes(ch) && atom.length !== 1) || (ch >= '0' && ch <= '9')) {
                const [r, next] = readNumber(atom, text, p);
                result = r;
                pos = next;
            } else {
                // console.log(" atom " + atom);
                result = { type: "atom", value: atom };
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
        result = { type: "error", value: "Unknown # object " + pos };
    }
    return [result, pos];
}

function readNumber(atom, text, pos) {
    const number = Number(atom);
    if (Number.isNaN(number)) {
        result = { type: "error", value: "Not a number " + pos };
    } else {
        // console.log("number " + atom);
        result = { type: "number", value: number };
        pos = skipWhitespace(text, pos);
    }
    return [result, pos];
}

function pairToExp(exp) {
    if (exp.type === "pair") {
       const value = [exp.value];
       let head = exp.rest;
        while (head.type === "pair") {
            value.push(pairToExp(head.value));
            head = head.rest;
        }
        exp = { type: "expression", value };
    }
    return exp;
}

function eval(exp, env) {
    
    if (exp.type === "pair") {
        exp = pairToExp(exp);
    }

    const type = exp.type;

    const primitiveEval = primitiveTypes[type];
    if (primitiveEval !== undefined) {
        return primitiveEval(exp, env);
    }

    if (type === "atom") {
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
            return { type: "error", value: "Unbound variable " + exp.value }
        }
    }

    if (type === "expression") {
        // console.log("eval expression");

        if (exp.value[0].type === "atom") {
            const first = exp.value[0];
            const evalFormal = formals[first.value];
            if (evalFormal !== undefined) {
                return evalFormal(exp, env);
            }
        }

        let proc = eval(exp.value[0], env);
        // console.log("proc " + JSON.stringify(proc));
        if (proc.type === "error") {
            return proc;
        }

        let closureEnv = env;
        if (proc.type === "closure") {
            closureEnv = proc.scope;
            proc = proc.value;
        }

        if (proc.type === "expression" && proc.value[0].type === "atom" && proc.value[0].value === "lambda") {
            tail: while (true) {
                // console.log("lambda " + JSON.stringify(proc));

                if (proc.value.length < 2 && proc.value[1].type !== "expression") {
                    return { type: "error", value: "lambda needs formal params" };
                }
                if (proc.value.length < 3) {
                    return { type: "error", value: "lambda needs a body" };
                }
                const args = evalArgs(exp, env);
                if (args["type"] === "error") {
                    return args;
                }
                const formalsCount = proc.value[1].value.length;
                const formals = proc.value[1].value;
                // console.log("varargs? " + proc.value[1].value[formalsCount - 2].value);
                if ((formalsCount >= 2 && formals[formalsCount - 2].value === ".")) {
                  if (args.length < formalsCount - 2) {
                    return { type: "error", value: "lambda requires at least " + (formalsCount - 2) + " arguments" };
                  }
                } else if (args.length != formalsCount) {
                    return { type: "error", value: "lambda requires " + formalsCount + " arguments" };
                }

                let localEnv = { "__parent_scope": closureEnv, name: "scope id " + scopeId++ };

                // console.log("formals " + JSON.stringify(formals));
                let i = 0;
                for (const formal of formals) {
                    if (formal.type !== "atom") {
                        return { type: "error", value: "Formal arguments must be symbols" };
                    }
                    if (formal.value === ".") {
                        // varargs
                        if (i !== formals.length - 2) {
                            return { type: "error", value: ". must be second last formal parameter" };
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

                    if (tailCalls && a == proc.value.length - 1 && exp.value[0].type === "atom") {
                        // console.log("tail? " + exp.value[0].value + " " + JSON.stringify(target));

                        rewrite: while (true) {
                            if (target.type === "expression" && target.value.length !== 0 && target.value[0].type === "atom") {
                                const rewrite = rewrites[target.value[0].value];
                                if (rewrite !== undefined) {
                                    // console.log("tail " + target.value[0].value);
                                    [target, localEnv] = rewrite(target, localEnv);
                                    continue;
                                }
                            }
                            break;
                        }

                        if (target.type === "expression" && target.value.length !== 0) {
                            // console.log("tail target " + JSON.stringify(target));
                            // Call to same proc can be optimized to avoid stack growing.
                            if (target.value[0].type === "atom" && target.value[0].value === exp.value[0].value) {
                                proc = eval(target.value[0], env);
                                if (proc.type === "closure") {
                                    closureEnv = proc.scope;
                                    proc = proc.value;
                                    exp = target;
                                    env = localEnv;
                                    if (proc.type === "expression" && proc.value[0].type === "atom" && proc.value[0].value === "lambda") {
                                        // console.log("tail call");
                                        continue tail;
                                    }
                                }
                            }
                        }
                    }
                    result = eval(target, localEnv);
                    if (result.type === "error") {
                        return result;
                    }
                    // console.log("result " + JSON.stringify(result));
                }

                return result;
            }
        } else {
            if (proc.type !== "atom") {
                return { type: "erorr", value: "can't apply a " + proc.type };
            }

            // console.log("proc " + JSON.stringify(proc));
            const args = evalArgs(exp, env);
            if (args["type"] === "error") {
                return args;
            }
            return apply(proc, args, env);
        }
    }

    if (type === "error") {
        return exp;
    }
    return { type: "erorr", value: "Could not evaluate " + type };
}

function evalPrimitive(exp, env) { return exp; }

function evalLambda(exp, env) {
    // console.log("closure over " + JSON.stringify(exp));
    return { type: "closure", value: exp, scope: env };
}

function evalQuote(exp, env) {
    if (exp.value.length !== 2) {
        return { type: "error", value: "Can only quote one value" };
    }
    let result = exp.value[1];
    if (result.type === "expression") {
        result = listify(result.value);
    }
    // console.log("quoted " + JSON.stringify(result));
    return result;
}

function evalQuasiquote(exp, env) {
    if (exp.value.length !== 2) {
        return { type: "error", value: "Can only quasi-quote one value" };
    }
    let result = exp.value[1];
    if (result.type === "expression") {
        const resultList = [];
        for (const subExp of exp.value[1].value) {
            if (subExp.type === "expression" && subExp.value[0].type === "atom" && subExp.value[0].value === "unquote") {
                if (subExp.value.length !== 2) {
                    return { type: "error", value: "Can only unquote one value"};
                }
                const unquoteExp = subExp.value[1];
                const r = eval(unquoteExp, env);
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

function evalSet(exp, env) {
    if (exp.value.length !== 3) {
        return { type: "error", value: "set! requires a name and value" };
    }
    const symbol = exp.value[1];
    if (symbol.type !== "atom") {
        return { type: "error", value: "Can only set value of a symbol" };
    }

    let e = env;
    while (e !== undefined && e[symbol.value] === undefined) {
        e = e["__parent_scope"];
    }
    if (e === undefined) {
        return { type: "error", value: "Undefined symbol " + symbol.value + " in set!" };
    }

    const value = e[symbol.value];

    const update = eval(exp.value[2], env);
    if (update.type === "error") {
        return { type: "error", value: "Could not evaluate value to set!" };
    }

    // console.log("set! " + symbol.value + " in " + e.name + " = " + JSON.stringify(update));
    e[symbol.value] = update;
    return value;
}

function evalRewrite(rewrite) {
    return (exp, env) => {
        const [rewriteExp, localEnv] = rewrite(exp, env);
        if (rewriteExp.type === "error") {
            return rewriteExp;
        }
        return eval(rewriteExp, localEnv);
    };
}

function rewriteLetrec(exp, env) {
    const letrecEnv =  { "__parent_scope": env, name: "letrec " + scopeId++ };

    if (exp.value.length < 3) {
        return [{ type: "error", value: "letrec form needs a bind and one or more eval sub parts" }, env];
    }
    const binds = exp.value[1];
    if (binds.type !== "expression") {
        return [{ type: "error", value: "letrec bind expression expected" }, env];
    }
    for (const bind of binds.value) {
        if (bind.type !== "expression" || bind.value.length !== 2) {
            return [{ type: "error", value: "letrec bind must be expression pair" }, env];
        }
        if (bind.value[0].type !== "atom") {
            return [{ type: "error", value: "letrec bind must be atom and expression pair" } , env];
        }
 
        const variable = bind.value[0].value;
        // console.log("letrec var " + variable);
        
        const value = eval(bind.value[1], letrecEnv);
        if (value.type === "error") {
            return [{ type: "error", value: "letrec bind eval fails" }, env];
        }
        letrecEnv[variable] = value;
    }
    for (let i = 2; i < exp.value.length - 1; i++) {
        const result = eval(exp.value[i], letrecEnv);
        if (result.type === "error") {
            return [result, env];
        }
    }
    const letrecExp = exp.value[exp.value.length - 1];
    // console.log("letrec exp " + JSON.stringify(letrecExp));
    return [letrecExp, letrecEnv];
}

function rewriteIf(exp, env) {
    if (exp.value.length < 3) {
        return [{ type: "error", value: "if form needs a condition and a then part" }, env];
    }
    if (exp.value.length > 4) {
        return [{ type: "error", value: "if form requires condition with then and optional else part" }, env];
    }

    const condition = exp.value[1];
    // console.log("if " + JSON.stringify(condition));
    const result = eval(condition, env);
    if (result.type === "error") {
        return [result, env];
    }

    if (!(result.type === "boolean" && result.value === false)) {
        return [exp.value[2], env];
    } else {
        if (exp.value.length === 4) {
            return [exp.value[3], env];
        } else {
            return [falseValue, env];
        }
    }
}

function rewriteCond(exp, env) {
    if (exp.value.length === 1) {
        return [{ type: "error", value: "cond needs one or more conditions" }, env];
    }

    for (let i = 1; i < exp.value.length; i++) {
        const cond = exp.value[i];
        if (cond.type !== "expression" && cond.value.length !== 2) {
            return [{ type: "error", value: "cond arg must be expression pair" }, env];
        }
        // console.log("condition " + JSON.stringify(cond.value[0]));
        const defaultElse = cond.value[0];
        if (defaultElse.type === "atom" && defaultElse.value == "else") {
            if (i !== exp.value.length - 1) {
                return [{ type: "error", value: "else must be last arg to cond" }, env];
            }
            return [cond.value[1], env];
        }
        const test = eval(cond.value[0], env);
        if (!(test.type === "boolean" && test.value === false)) {
            return [cond.value[1], env];
        }
    }
    return [falseValue, env];
}

function rewriteCase(exp, env) {
    if (exp.value.length < 2) {
        return [{ type: "error", value: "case needs expression and one or more conditions" }, env];
    }
    const selector = eval(exp.value[1], env);
    // console.log("selector " + JSON.stringify(selector));
    for (let i = 2; i < exp.value.length; i++) {
       const cond = exp.value[i];
       if (cond.type !== "expression" || cond.value.length < 2) {
         return [{ type: "error", value: "invalid condition" }, env];
       }
       const condCase = cond.value[0];
       if (condCase.type == "atom" && condCase.value === "else") {
            // console.log("case else");
            if (i !== exp.value.length - 1) {
                return [{ type: "error", value: "else must be last case" }, env];
            }
            return evalCase(cond);
       }
       if (condCase.type !== "expression") {
          return [{ type: "error", value: "cond case must be a list" }, env];
       }
       for (let i = 0; i < condCase.value.length; i++) {
           if (equal([selector, condCase.value[i]], env).value === true) {
              // console.log("case match");
              return evalCase(cond);
           }
       }
    }
    return [falseValue, env];
}

function evalCase(cond, env) {
    for (let c = 1; c < cond.value.length - 1; c++) {
        const result = eval(cond.value[c], env);
        if (result.type === "error") {
            return error;
        }
    }
    return [cond.value[cond.value.length - 1], env];
}

function evalDefine(exp, env) {
    if (exp.value.length < 2) {
        return { type: "error", value: "define what please?" };
    }
    const def = exp.value[1];
    if (def.type === "atom") {
        // console.log("define " + JSON.stringify(def));
        if (exp.value.length !== 3) {
            return { type: "error", value: "define takes 2 arguments found " + exp.value.length };
        }
        const arg = exp.value[2];
        const result = eval(arg, env);
        // console.log("eval define arg result " +  JSON.stringify(result));
        env[def.value] = result;
        return result;
    } if (def.type === "expression") { // procedure definition - rewrite as lambdda
        if (exp.value.length < 3) {
            return { type: "error", value: "define procedure needs a body" };
        }
        const proc = def.value[0];
        if (proc.type !== "atom") {
            return { type: "error", value: "define procedure needs a name" };
        }
        const args = [];
        for (let i = 1; i < def.value.length; i++) {
            args.push(def.value[i]);
        }
        const lambda = [{ type: "atom", value: "lambda" }, { type: "expression", value: args }];
        for (let i = 2; i < exp.value.length; i++) {
            lambda.push(exp.value[i]);
        }
        // console.log("define proc " + JSON.stringify(lambda));
        const closure = eval({ type: "expression", value: lambda }, env);
        env[proc.value] = closure;
        return closure;
    } else {
        return { type: "error", value: "Can't define a " + def.type };
    }
}

function evalLet(exp, env) {
    if (exp.value.length < 3) {
        return { type: "error", value: "let form needs a bind and one or more eval sub parts" };
    }
    const binds = exp.value[1];
    if (binds.type !== "expression") {
        return { type: "error", value: "let bind expression expected" };
    }

    // rewrite as lambda
    const lambda = { type: "atom", value: "lambda" };
    const params = [];
    const args = [];
    for (const bind of binds.value) {
        // console.log("param " + JSON.stringify(bind));
        if (bind.type !== "expression" || bind.value.length !== 2) {
            return { type: "error", value: "let bind must be expression pair" };
        }
        if (bind.value[0].type !== "atom") {
            return { type: "error", value: "let bind must be atom and expression pair" };
        }
        params.push(bind.value[0]);
        args.push(bind.value[1]);
    }

    const letLambdaValue = [lambda, { type: "expression", value: params }];
    for (let i = 2; i < exp.value.length; i++) {
        letLambdaValue.push(exp.value[i]);
    }

    const letLambdaExpValue = [{ type: "expression", value: letLambdaValue }];
    for (const arg of args) {
        letLambdaExpValue.push(arg);
    }
    const letLambdaExp = { type: "expression", value: letLambdaExpValue };
    console.log("let lambda expression " + JSON.stringify(letLambdaExp));

    return eval(letLambdaExp, env);
}

function evalAnd(exp, env) {
    let result = trueValue;
    for (let i = 1; i < exp.value.length; i++) {
        result = eval(exp.value[i], env);
        if (result.type === "boolean" && result.value === false) {
            return falseValue;
        }
    }
    return result;
}

function evalOr(exp, env) {
    let result = falseValue;
    for (let i = 1; i < exp.value.length; i++) {
        result = eval(exp.value[i], env);
        if (!(result.type === "boolean" && result.value === false)) {
            return trueValue;
        }
    }
    return result;
}

function evalArgs(exp, env) {
    const args = [];
    for (let i = 1; i < exp.value.length; i++) {
        // console.log("arg " + i + " " + JSON.stringify(exp.value[i]));
        const arg = eval(exp.value[i], env);
        if (arg.type === "error") {
            return arg;
        }
        args.push(arg);
    }
    return args;
}

function eval2(exp, env) {
    if (exp.value.length !== 3) {
        return { type: "error", value: "eval takes an expression to evaluate and a closure to borrow an environment from" };
    }
    const closure = eval(exp.value[2], env);
    if (closure.type !== "closure") {
        return { type: "error", value: "eval requires a closure as second arg to provide an environment to evaluate in" };
    }
    const exp2 = eval(exp.value[1], env);
    return eval(exp2, closure.scope);
}

function write(result) {
    // console.log("write " + JSON.stringify(result));
    if (result.type === "number" || result.type === "string" || result.type === "boolean") {
        return result.value;
    }
    if (result.type === "atom") {
        return result.value;
    }
    if (result.type === "closure") {
        return JSON.stringify(result.value);
    }
    if (result.type === "expression" && result.value.length === 0) {
        return "()";
    }
    if (result.type === "pair") {
        let str = "(";
        let once = false;
        while (result.type === "pair") {
            if (!once) {
                once = true;
            } else {
                str += " ";
            }
            str += write(result.value);
            result = result.rest;
        }
        if (result.type !== "expression" && result.value.length !== 0) {
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

function apply(proc, args, env) {
    const buildIn = buildIns[proc.value];
    if (buildIn !== undefined) {
        return buildIn(args, env);
    }
    return { type: "error", value: "Unkown procedure " + proc.value };
}

function listify(expList) {
    if (expList.length === 3 && expList[1].type === "atom" && expList[1].value === ".") {
        let left = expList[0].type === "expression" ? listify(expList[0].value) : expList[0];
        let right = expList[2].type === "expression" ? listify(expList[2].value) : expList[2];
        const pair = { type: "pair", value: left, rest: right };
        return pair;
    }
    let result = nullList;
    for (let i = expList.length - 1; i >= 0; i--) {
        let value = expList[i].type === "expression" ? listify(expList[i].value) : expList[i];
        const pair = { type: "pair", value: value, rest: result };
        result = pair;
    }
    // console.log("listified " + JSON.stringify(result));
    return result;
}

function cons(args, env) {
    if (args.length !== 2) {
        return { type: "error", value: "cons requires two arguments" };
    }
    return { type: "pair", value: args[0], rest: args[1] };
}

function car(args, env) {
    if (args.length !== 1) {
        return { type: "error", value: "car requires a single arguments" };
    }
    if (args[0].type !== "pair") {
        return { type: "error", value: "car requires a non empty list or pair" };
    }
    return args[0].value;
}

function cdr(args, env) {
    if (args.length !== 1) {
        return { type: "error", value: "cdr requires a single arguments" };
    }
    if (args[0].type !== "pair") {
        return { type: "error", value: "cdr requires a non empty list or pair" };
    }
    return args[0].rest;
}

function append(args, env) {
    const list = [];
    for (l of args) {
        if (l.type === "expression" && l.value.length === 0) {
            continue;
        }
        if (l.type !== "pair") {
            return { type: "error", value: "can only append lists" };
        }
        let v = l;
        while (v.type === "pair") {
            list.push(v.value);
            v = v.rest;
        }
    }
    return listify(list);
}

function begin(args, env) {
    if (args.length === 0) {
        return { type: "error", value: "begin needs at least one argument" };
    }
    return args[args.length - 1];
}

function lessThan(args, env) {
    if (args.length === 0) {
        return trueValue;
    }
    const first = args[0];
    if (first.type !== "number") {
        return { type: "error", value: "< requires numbers as arguments" };
    }
    for (let i = 1; i < args.length; i++) {
        if (args[i].type !== "number") {
            return { type: "error", value: "< requires numbers as arguments" };
        }
        if (!(first.value < args[i].value)) {
            return falseValue;
        }
    }
    return trueValue;
}

function applyToList(args, env) {
    if (args.length !== 2) {
        return { type: "error", value: "apply takes 2 arguments" };
    }
    expValue = [args[0]];
    for (let head = args[1]; head.type === "pair"; head = head.rest) {
        expValue.push(head.value);
    }
    const exp = { type: "expression", value: expValue };
    // console.log("apply " + JSON.stringify(exp));
    return eval(exp, env);
}

function equal(args, env) {
    // console.log("equal? " + JSON.stringify(args));
    if (args.length != 2) {
        return { type: "error", value: "equal? requires two argumewnts" };
    }
    if (args[0].type !== args[1].type) {
        return falseValue;
    }

    // () empty list is expression with value []
    if (args[0].type === "expression" && args[0].value.length === 0) {
        return args[1].value.length === 0;
    }

    if (args[0].type === "pair") {
        let left = args[0];
        let right = args[1];
        while (left.type === "pair" && right.type === "pair") {
            if (!equal([left.value, right.value], env).value === true) {
                return falseValue;
            }
            left = left.rest;
            right = right.rest;
        }
        const result = left.type === right.type;
        return { type: "boolean", value: result };
    }

    const result = args[0].value === args[1].value;
    return { type: "boolean", value: result };
}

function plus(args, env) {
    let value = 0;
    for (let arg of args) {
        if (arg.type !== "number") {
            return { type: "error", value: "+ requires numbers as arguments" };
        }
        value += arg.value;
    }
    return { type: "number", value };
}

function minus(args, env) {
    if (args.length < 1) {
        return { type: "error", value: "- requires at least one number as argument" };
    }
    if (args[0].type !== "number") {
        return { type: "error", value: "- requires a number as first argument" };
    }

    let value = args[0].value;
    if (args.length === 1) {
        return -value;
    }

    for (let i = 1; i < args.length; i++) {
        if (args[i].type !== "number") {
            return { type: "error", value: "- requires numbers as arguments" };
        }
        value -= args[i].value;
    }
    return { type: "number", value };
}

function multiply(args, env) {
    let value = 1;
    for (let arg of args) {
        if (arg.type !== "number") {
            return { type: "error", value: "* requires numbers as arguments" };
        }
        value *= arg.value;
    }
    return { type: "number", value };
}

function divide(args, env) {
    if (args.length < 1) {
        return { type: "error", value: "/ requires at least one number as argument" };
    }
    if (args[0].type !== "number") {
        return { type: "error", value: "/ requires a number as first argument" };
    }

    let value = args[0].value;
    if (value === 0) {
        return { type: "error", value: "divide by zero" };
    }
    if (args.length === 1) {
        return 1 / value;
    }

    for (let i = 1; i < args.length; i++) {
        if (args[i].type !== "number") {
            return { type: "error", value: "/ requires numbers as arguments" };
        }
        const v = args[i].value;
        if (v === 0) {
            return { type: "error", value: "divide by zero" };
        }
        value /= v;
    }
    return { type: "number", value };
}

function strLength(args, env) {
    if (args.length !== 1 || args[0].type !== "string") {
        return { type: "error", value: "string-length expectes one string argument" };
    }
    return { type: "number", value: args[0].value.length };
}

function strSlice(args, env) {
    if (args.length === 2 && args[0].type === "string" && args[1].type === "number") {
        return { type: "string", value: args[0].value.slice(args[1].value) };
    } if (args.length === 3 && args[0].type === "string" && args[1].type === "number" && args[2].type === "number") {
        return { type: "string", value: args[0].value.slice(args[1].value, args[2].value) };
    }
    return { type: "error", value: "slice expectes string and one or two numeric arguments" };
}

function strConcat(args, env) {
    if (args.length === 0 || args[0].type !== "string") {
        return { type: "error", value: "concat requires at least one string as argument" };
    }
    let value = args[0].value;
    for (let i = 1; i < args.length; i++) {
        if (args[i].type !== "string") {
            return { type: "error", value: "concat requires strings as arguments" };
        }
        value += args[i].value;
    }
    return { type: "string", value };
}

exports.read = read;
exports.eval = eval;
exports.write = write;
