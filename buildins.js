const { ATOM, EXP, ERR, NUM, STR, BOOL, PAIR, trueValue, falseValue, nullList } = require("./constants.js");

function pairToExp(exp) {
    if (exp.type === PAIR) {
       const value = [exp.value];
       let head = exp.rest;
        while (head.type === PAIR) {
            value.push(pairToExp(head.value));
            head = head.rest;
        }
        exp = { type: EXP, value };
    }
    return exp;
}

function listify(expList) {
    if (expList.length === 3 && expList[1].type === ATOM && expList[1].value === ".") {
        let left = expList[0].type === EXP ? listify(expList[0].value) : expList[0];
        let right = expList[2].type === EXP? listify(expList[2].value) : expList[2];
        const pair = { type: PAIR, value: left, rest: right };
        return pair;
    }
    let result = nullList;
    for (let i = expList.length - 1; i >= 0; i--) {
        let value = expList[i].type === EXP ? listify(expList[i].value) : expList[i];
        const pair = { type: PAIR, value: value, rest: result };
        result = pair;
    }
    // console.log("listified " + JSON.stringify(result));
    return result;
}

function cons(args, env) {
    if (args.length !== 2) {
        return { type: ERR, value: "cons requires two arguments" };
    }
    return { type: PAIR, value: args[0], rest: args[1] };
}

function car(args, env) {
    if (args.length !== 1) {
        return { type: ERR, value: "car requires a single arguments" };
    }
    if (args[0].type !== PAIR) {
        return { type: ERR, value: "car requires a non empty list or pair" };
    }
    return args[0].value;
}

function cdr(args, env) {
    if (args.length !== 1) {
        return { type: ERR, value: "cdr requires a single arguments" };
    }
    if (args[0].type !== PAIR) {
        return { type: ERR, value: "cdr requires a non empty list or pair" };
    }
    return args[0].rest;
}

function append(args, env) {
    const list = [];
    for (l of args) {
        if (l.type === EXP && l.value.length === 0) {
            continue;
        }
        if (l.type !== PAIR) {
            return { type: ERR, value: "can only append lists" };
        }
        let v = l;
        while (v.type === PAIR) {
            list.push(v.value);
            v = v.rest;
        }
    }
    return listify(list);
}

function begin(args, env) {
    if (args.length === 0) {
        return { type: ERR, value: "begin needs at least one argument" };
    }
    return args[args.length - 1];
}

function lessThan(args, env) {
    if (args.length === 0) {
        return trueValue;
    }
    const first = args[0];
    if (first.type !== NUM) {
        return { type: ERR, value: "< requires numbers as arguments" };
    }
    for (let i = 1; i < args.length; i++) {
        if (args[i].type !== NUM) {
            return { type: ERR, value: "< requires numbers as arguments" };
        }
        if (!(first.value < args[i].value)) {
            return falseValue;
        }
    }
    return trueValue;
}

function greaterThan(args, env) {
    if (args.length === 0) {
        return trueValue;
    }
    const first = args[0];
    if (first.type !== NUM) {
        return { type: ERR, value: "> requires numbers as arguments" };
    }
    for (let i = 1; i < args.length; i++) {
        if (args[i].type !== NUM) {
            return { type: ERR, value: "> requires numbers as arguments" };
        }
        if (!(first.value > args[i].value)) {
            return falseValue;
        }
    }
    return trueValue;
}

async function applyToList(args, env, evalExp) {
    if (args.length !== 2) {
        return { type: ERR, value: "apply takes 2 arguments" };
    }
    expValue = [args[0]];
    for (let head = args[1]; head.type === PAIR; head = head.rest) {
        expValue.push(head.value);
    }
    const exp = { type: EXP, value: expValue };
    // console.log("apply " + JSON.stringify(exp));
    return await evalExp(exp, env);
}

function equal(args, env) {
    // console.log("equal? " + JSON.stringify(args));
    if (args.length != 2) {
        return { type: ERR, value: "equal? requires two argumewnts" };
    }
    if (args[0].type !== args[1].type) {
        return falseValue;
    }

    // () empty list is expression with value []
    if (args[0].type === EXP && args[0].value.length === 0) {
        return args[1].value.length === 0 ? trueValue : falseValue;
    }

    if (args[0].type === PAIR) {
        let left = args[0];
        let right = args[1];
        while (left.type === PAIR && right.type === PAIR) {
            if (!equal([left.value, right.value], env).value === true) {
                return falseValue;
            }
            left = left.rest;
            right = right.rest;
        }
        const result = left.type === right.type;
        return { type: BOOL, value: result };
    }

    const result = args[0].value === args[1].value;
    return { type: BOOL, value: result };
}

function numberEqual(args, env) {
    if (args.length === 0) {
        return trueValue;
    }
    if (args[0].type !== NUM) {
        return { type: ERR, value: "= only compares numbers" };
    }
    const value = args[0].value;
    for (let i = 0; i < args.length; i++) {
        if (args[1].type !== NUM) {
            return { type: ERR, value: "= only compares numbers" };
        }
        if (args[i].value !== value) {
            return falseValue;
        }
    }
    return trueValue;
}
 
function plus(args, env) {
    let value = 0;
    for (let arg of args) {
        if (arg.type !== NUM) {
            return { type: ERR, value: "+ requires numbers as arguments" };
        }
        value += arg.value;
    }
    return { type: NUM, value };
}

function minus(args, env) {
    if (args.length < 1) {
        return { type: ERR, value: "- requires at least one number as argument" };
    }
    if (args[0].type !== NUM) {
        return { type: ERR, value: "- requires a number as first argument" };
    }

    let value = args[0].value;
    if (args.length === 1) {
        return -value;
    }

    for (let i = 1; i < args.length; i++) {
        if (args[i].type !== NUM) {
            return { type: ERR, value: "- requires numbers as arguments" };
        }
        value -= args[i].value;
    }
    return { type: NUM, value };
}

function multiply(args, env) {
    let value = 1;
    for (let arg of args) {
        if (arg.type !== NUM) {
            return { type: ERR, value: "* requires numbers as arguments" };
        }
        value *= arg.value;
    }
    return { type: NUM, value };
}

function divide(args, env) {
    if (args.length < 1) {
        return { type: ERR, value: "/ requires at least one number as argument" };
    }
    if (args[0].type !== NUM) {
        return { type: ERR, value: "/ requires a number as first argument" };
    }

    let value = args[0].value;
    if (value === 0) {
        return { type: ERR, value: "divide by zero" };
    }
    if (args.length === 1) {
        return 1 / value;
    }

    for (let i = 1; i < args.length; i++) {
        if (args[i].type !== NUM) {
            return { type: ERR, value: "/ requires numbers as arguments" };
        }
        const v = args[i].value;
        if (v === 0) {
            return { type: ERR, value: "divide by zero" };
        }
        value /= v;
    }
    return { type: NUM, value };
}

function divmod(args, env) {
    if (args.length !== 2 || args[0].type !== NUM || args[1].type !== NUM) {
        return { type: ERR, value: "divmod requires two numbers as arguments" };
    }
    const x = args[0].value;
    const y = args[1].value;
    return { type: PAIR, value: { type: NUM, value: Math.floor(x / y)}, rest:  { type: NUM, value: x % y} };
}

function strLength(args, env) {
    if (args.length !== 1 || args[0].type !== STR) {
        return { type: ERR, value: "string-length expectes one string argument" };
    }
    return { type: NUM, value: args[0].value.length };
}

function strSlice(args, env) {
    if (args.length === 2 && args[0].type === STR && args[1].type === NUM) {
        return { type: STR, value: args[0].value.slice(args[1].value) };
    } if (args.length === 3 && args[0].type === STR && args[1].type === NUM && args[2].type === NUM) {
        return { type: STR, value: args[0].value.slice(args[1].value, args[2].value) };
    }
    return { type: ERR, value: "slice expectes string and one or two numeric arguments" };
}

function strConcat(args, env) {
    function concatable(type) {
        return (type >= NUM && type <= BOOL) || type === ATOM;
    }
    if (args.length === 0 || !concatable(args[0].type)) {
        return { type: ERR, value: "concat requires at least one argument" };
    }
    let value = "";
    for (const arg of args) {
        if (!concatable(arg.type)) {
            return { type: ERR, value: "concat requires valies that convert to string as arguments" };
        }
        value += arg.value;
    }
    return { type: STR, value };
}

function strIndexOf(args, env) {
    if (args.length !== 2 || args[0].type !== STR || args[1].type !== STR) {
        return { type: ERR, value: "index-of requires two string arguments" };
    }
    return args[1].value.indexOf(args[0].value);
}

function typeOf(args, env) {
    if (args.length !== 1) {
        return { type: ERR, value: "type-of takes one argument" };
    }
    return { type: NUM, value: args[0].type };
}

function error(args, env) {
    if (args.length === 1 && args[0].type === STR) {
        return { type: ERR, value: args[0].value };
    }
    return { type: ERR, value: "error!" };
}

function escape(str) {
   let r = '"';
   for (let i = 0; i < str.length; i++) {
      switch(str[i]) {
        case '"': 
            r += '\\"';
            break;
        case '\n':
            r += '\\n';
            break;
         case '\t':
            r += '\\t';
            break;
        case '\r':
            r += '\\r';
            break;
        case '\\':
            r += '\\';
            break;
        default:
            r += str[i];
      }
   }
   r += '"';
   return r;
}

function print(args, env) {
    // .log("print " + JSON.stringify(args));
    let result = "";
    for (const arg of args) {
        // console.log("print arg " + JSON.stringify(arg.type));
        if (arg.type === ERR) {
            result += "(error " + escape(arg.value) + ")";
        } else if (arg.type === NUM) {
            result += arg.value;
        } else if (arg.type === STR) {
            result += escape(arg.value);
        } else if (arg.type === BOOL) {
            result += (args.value? "#t" : "#f");
        } else if (arg.type === ATOM ) {
            result += arg.value;
        } else if (arg.type === EXP && arg.value.length === 0) {
            result += "()";
        } else if (arg.type === PAIR) {
            let a = arg;
            let str = "(";
            let once = false;
            while (a.type === PAIR) {
                if (!once) {
                    once = true;
                } else {
                    str += " ";
                }
                str += print([a.value], env).value;
                a = a.rest;
            }
            if (a.type !== EXP && a.value.length !== 0) {
                str += " . ";
                str += print([a], env).value;
            }
            str += ")";
            result = str;
        } else {
            return { type: ERR, value: "Could not print a " + arg.type}
        }
    }
    return { type: STR, value: result };
}

exports.listify = listify
exports.pairToExp = pairToExp
exports.cons = cons
exports.car = car
exports.cdr = cdr
exports.append = append
exports.begin = begin
exports.lessThan = lessThan
exports.greaterThan = greaterThan
exports.applyToList = applyToList
exports.equal = equal
exports.numberEqual = numberEqual
exports.plus = plus
exports.minus = minus
exports.multiply = multiply
exports.divide = divide
exports.divmod = divmod
exports.strLength = strLength
exports.strSlice = strSlice
exports.strConcat = strConcat
exports.strIndexOf = strIndexOf
exports.typeOf = typeOf
exports.error = error
exports.print = print
exports.escape = escape
