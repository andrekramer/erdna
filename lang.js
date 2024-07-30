const res = require("express/lib/response");

const buildIns = { "+": plus, "-": minus, "*": multiply, "/": divide, "equal?":  equal };

let scopeId = 1;

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
        result = { type: "expression", value: quote }
        pos = p;
    } else if (ch === ",") {
        const [r, p] = readExpressionOrAtom(text, ++pos);
        const unquote = [{ type: "atom", value: "unquote" }];
        unquote.push(r);
        result = { type: "expression", value: unquote }
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
                case '\'': str += '`'; break;
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
        result = { type: "boolean", value: false };
    } else if (text.charAt(pos + 1) === 't') {
        pos += 2;
        result = { type: "boolean", value: true };
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
        // console.log(" number " + atom);
        result = { type: "number", value: number };
        pos = skipWhitespace(text, pos);
    }
    return [result, pos];
}

function eval(exp, env) {
    const type = exp.type;
    if (type === "string" || type === "number" || type === "boolean") {
        // console.log("eval literal " + type)
        return exp;
    }
    if (type === "closure") {
        console.log("eval closure -> return");
        return exp;
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

    if (exp.type === "expression" && exp.value[0].type === "atom") {
        const first = exp.value[0];

        if (first.value === "set!") {
            if (exp.value.length !== 3) {
                return { type: "error", value: "set! requires a name and value" };
            }
            const symbol = exp.value[1];
            if (symbol.type !== "atom") {
                return { type: "error", value: "Can only set value of a symbol" };
            }

            let e = env;
            while(e !== undefined && e[symbol.value] === undefined) {
                e = e["__parent_scope"];
            }
            if (e === undefined) {
                return { type: "error", value: "Undefined symbol " + symbol.value + " in set!"};
            }

            const value = e[symbol.value];
           
            const update = eval(exp.value[2], env);
            if (update.type === "error") {
                return { type: "error", value: "Could not evaluate value to set!"};
            }

            console.log("set! " + symbol.value + " in " + e.name + " = " + JSON.stringify(update));
            e[symbol.value] = update;
            return value;
        }

        if (first.value === "if") {
            if (exp.value.length < 3) {
                return { type: "error", value: "if form needs a condition and a then part" };
            }
            if (exp.value.length > 4) {
                return { type: "error", value: "if form requires condition with then and optional else part" };
            }
            const condition = exp.value[1];
            // console.log("if " + JSON.stringify(condition));
            const result = eval(condition, env);
            if (result.type === "error") {
                return result;
            }

            if (!(result.type === "boolean" && result.value === false)) {
                const result = eval(exp.value[2], env);
                return result;
            } else {
                if (exp.value.length === 4) {
                     const result = eval(exp.value[3], env);
                     return result;
                } else {
                    return { type: "boolean", value: false };
                }
            }
        }

        if (first.value === "define") {
            if (exp.value.length < 2) {
                return { type: "error", value: "define what please?" };
            }
            const def = exp.value[1];
            if (def.type === "atom") {
                console.log("define " + JSON.stringify(def));
                if (exp.value.length !== 3) {
                    return {type: "error", value: "define takes 2 arguments found " + exp.value.length };
                }
                const arg = exp.value[2];
                const result = eval(arg, env);
                // console.log("eval define arg result " +  JSON.stringify(result));
                env[def.value] = result;
                return result;
            } if (def.type === "expression") { // procedure definition - rewrite as lambdda
                if (exp.value.length < 3) {
                    return { type: "error", value: "define procedure needs a body"};
                }
                const proc = def.value[0];
                if (proc.type !== "atom") {
                    return { type: "error", value: "define procedure needs a name"};
                }
                const args = [];
                for (i = 1; i < def.value.length; i++) {
                    args.push(def.value[i]);
                }
                const lambda = [ { type: "atom", value: "lambda"}, {type: "expression", value:args} ];
                for (i = 2; i < exp.value.length; i++) {
                    lambda.push(exp.value[i]);
                }
                console.log("define proc " + JSON.stringify(lambda));
                const closure = eval({ type: "expression", value: lambda }, env);
                env[proc.value] = closure;
                return closure;
            } else {
                return { type: "error", value: "Can't define a " + def.type };
            }
        }

        if (first.value === "lambda") {
            console.log("closure over " + JSON.stringify(exp));
            const closure = { type: "closure", value: exp, scope: env };
            return closure;
        }
    }

    if (type === "expression") {
        // console.log("eval expression");

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
            console.log("lambda " + JSON.stringify(proc));

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
            if (args.length != formalsCount) {
                return { type: "error", value: "lambda requires " + formalsCount + " arguments" };
            }

            const localEnv = { "__parent_scope": closureEnv, name: "scope id " + scopeId++ };
            const formals = proc.value[1].value;

            // console.log("formals " + JSON.stringify(formals));
            let i = 0;
            for (const formal of formals) {
                if (formal.type !== "atom") {
                    return { type: "error", value: "Formal arguments must be symbols" };
                }
                localEnv[formal.value] = args[i++];
            }
            // console.log("localEnv " + JSON.stringify(localEnv));

            let result;
            for (let a = 2; a < proc.value.length; a++) {
                // console.log("at " + JSON.stringify(proc.value[a]));
                result = eval(proc.value[a], localEnv);
                // console.log("result " + JSON.stringify(result));
            }

            return result;
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

function write(result) {
    // console.log("write " + JSON.stringify(result));
    if (result.type === "number" || result.type === "string" || result.type === "boolean") {
        return result.value;
    }
    if (result.type === "closure") {
        return JSON.stringify(result.value);
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

function equal(args, env) {
    if (args.length != 2) {
        return { type: "error", value: "equal? requires two argumewnts" };
    }
    if (args[0].type !== args[1].type) {
        return { type: "boolean", value: false };
    }
    const result = args[0].value === args[1].value;
    return { type: "boolean", value: result };
}

exports.read = read;
exports.eval = eval;
exports.write = write;
