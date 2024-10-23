const { ATOM, EXP, ERR, NUM, STR, BOOL, PAIR, VOID, CLOSURE, PROMISE, OBJ, trueValue, falseValue, nullList, isNullList, VECTOR, voidValue, BYTEVECTOR } = require("./constants.js");

function pairToExp(exp) {
    if (exp.type === PAIR) {
       const value = [pairToExp(exp.value)];
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
    if (args.length !== 1 || args[0].type !== PAIR) {
        return { type: ERR, value: "car requires a non empty list or pair" };
    }
    return args[0].value;
}

function cdr(args, env) {
    if (args.length !== 1 || args[0].type !== PAIR) {
        return { type: ERR, value: "cdr requires a non empty list or pair" };
    }
    return args[0].rest;
}

function setCar(args, env) {
    if (args.length !== 2 || args[0].type !== PAIR) {
        return { type: ERR, value: "setCar! requires a non empty list or pair and a value" };
    }
    const value = args[0].value;
    args[0].value = args[1];
    return value;
}

function setCdr(args, env) {
    if (args.length !== 2 || args[0].type !== PAIR) {
        return { type: ERR, value: "setCdr! requires a non empty list or pair and a value" };
    }
    const value = args[0].rest;
    args[0].rest = args[1];
    return value;
}

function append(args, env) {
    const list = [];
    for (l of args) {
        if (isNullList(l)) {
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
        return voidValue;
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

async function applyLambda(args, env, evalExp) {
    if (args.length !== 2) {
        return { type: ERR, value: "apply takes 2 arguments" };
    }
    expValue = [args[0]];
    if (args[1].type !== PAIR) {
        return { type: ERR, value: "apply requires a list as second argument" };
    }
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
        return { type: ERR, value: "equal? takes two and only two argumewnts" };
    }

    const value = args[0];
    const otherValue = args[1];

    const type = value.type;
    if (type !== otherValue.type) {
        return falseValue;
    }

    if (value.value === otherValue.value) {
        return trueValue;
    }

    if (isNullList(value)) {
        return otherValue.value.length === 0 ? trueValue : falseValue;
    }

    if (type === PAIR) {
        let left = value;
        let right = otherValue;
        while (left.type === PAIR && right.type === PAIR) {
            if (!equalValue(left.value, right.value)) {
                return falseValue;
            }
            left = left.rest;
            right = right.rest;
        }
        return { type: BOOL, value: equalValue(left, right) };
    }
    
    if (type === VECTOR) {
        const vector = value.value;
        const otherVector = otherValue.value;
        if (vector.length !== otherVector.length) {
            return falseValue;
        }
        
        for (let i = 0; i < vector.length; i++) {
            if (vector[i] === undefined) {
                if (otherValue[i] !== undefined) {
                    return falseValue;
                }
            } else if (otherVector[i] === undefined || !equalValue(vector[i], otherVector[i])) {
                return falseValue;
            }
        }
        return trueValue;
    }

    if (type === BYTEVECTOR) {
        const vector = value.value;
        const otherVector = otherValue.value;
        if (vector.length !== otherVector.length) {
            return falseValue;
        }
        for (let i = 0; i < vector.length; i++) {
            if (vector[i] !== otherVector[i]) {
                return falseValue;
            }
        }
        return trueValue;
    }

    return falseValue;
}

function equalValue(value, otherValue) {
    if (value.type !== otherValue.type) {
        return false;
    }
    if (value.value === otherValue.value) {
        return true;
    }
    if (isNullList(value)) {
        return otherValue.value.length === 0 ? trueValue : falseValue;
    }
    if (value.type === PAIR || value.type === VECTOR) {
        return equal([value, otherValue]).value !== false;
    }
    return false;
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

function sqrt(args, env) {
    if (args.length !== 1 || args[0].type !== NUM) {
        return { type: ERR, value: "sqrt takes one number" };
    }
    return { type: NUM, value: Math.sqrt(args[0].value) };
}

function floor(args, env) {
    if (args.length !== 1 || args[0].type !== NUM) {
        return { type: ERR, value: "floor takes one number" };
    }
    return { type: NUM, value: Math.floor(args[0].value) };
}

function random(args, env) {
    if (args.length !== 0)  {
        return { type: ERR, value: "random takes no arguments" };
    }
    return { type: NUM, value: Math.random() };
}

function makeVector(args, env) {
    if ((args.length !== 1 && args.length !== 2) || args[0].type !== NUM)  {
        return { type: ERR, value: "make-vector takes a length argument and an optional initializer" };
    }
    const len = args[0].value;
    if (len < 0 || Math.floor(len) !== len) {
        return { type: ERR, value: "Can't make a vector with less than 0 or non-integer entries" };
    }
   
    const vector = new Array(len);
    if (args.length === 2) {
        for (let i = 0; i < len; i++) {
            vector[i] = args[1];
        }
    }
    return { type: VECTOR, value: vector};
}

function vectorSet(args, env) {
    if (args.length < 1 || args[0].type !== VECTOR) {
        return { type: ERR, value: "vector-set! requires a vector as first argument" };
    }
    if (args.length < 2 || args[1].type !== NUM) {
        return { type: ERR, value: "vector-set! requires an integer index as second argument" };
    }
    const index = args[1].value;
    if (index < 0 || Math.floor(index) !== index) {
        return { type: ERR, value: "vector-set! requires an integer index" };
    }
    if (args.length !== 3) {
        return { type: ERR, value: "vector-set! requires a value to set entry to" };
    }

    const value = args[2];
    args[0].value[index] = value;
    return voidValue;
}

function vectorRef(args, env) {
    if (args.length < 1 || args[0].type !== VECTOR) {
        return { type: ERR, value: "vector-ref requires a vector as first argument" };
    }
    if (args.length !== 2 || args[1].type !== NUM) {
        return { type: ERR, value: "vector-ref requires an integer index as second argument" };
    }
    const index = args[1].value;
    if (index < 0 || Math.floor(index) !== index) {
        return { type: ERR, value: "vector-ref requires an integer index" };
    }

    const result = args[0].value[index];
    if (result === undefined) {
        return { type: ERR, value: "vector has no value at index " + index};
    }
    return result;
}

function vectorLength(args, env) {
    if (args.length < 1 || args[0].type !== VECTOR) {
        return { type: ERR, value: "vector-length requires a vector as first argument" };
    }
    return { type: NUM, value: args[0].value.length };
}

function makeByteVector(args, env) {
    if ((args.length !== 1 && args.length !== 2) || args[0].type !== NUM)  {
        return { type: ERR, value: "make-vector takes a length argument and an optional initializer" };
    }
    const len = args[0].value;
    if (len < 0 || Math.floor(len) !== len) {
        return { type: ERR, value: "Can't make a vector with less than 0 or non-integer entries" };
    }
   
    const buffer = new ArrayBuffer(len);
    const vector = new Uint8Array(buffer);
    if (args.length === 2) {
        const value = args[1].value;
        if (args[1].type !== NUM || value < 0 || value > 255) {
            return { type: ERR, value: "make-byte-vector initializer must number in range be >= 0 and <= 255" };
        }
        for (let i = 0; i < len; i++) {
            vector[i] = value;
        }
    }
    return { type: BYTEVECTOR, value: vector};
}

function byteVectorSet(args, env) {
    if (args.length < 1 || args[0].type !== BYTEVECTOR) {
        return { type: ERR, value: "byte-vector-set! requires a byte vector as first argument" };
    }
    if (args.length < 2 || args[1].type !== NUM) {
        return { type: ERR, value: "byte-vector-set! requires an integer index as second argument" };
    }
    const index = args[1].value;
    if (index < 0 || index >= args[0].value.length) {
         return { type: ERR, value: "byte-vector-set! index out of bounds" };
    }
    if (Math.floor(index) !== index) {
        return { type: ERR, value: "byte-vector-set! requires an integer index" };
    }
    if (args.length !== 3) {
        return { type: ERR, value: "byte-vector-set! requires a value to set entry to" };
    }
    const value = args[2].value;
    if (args[2].type !== NUM || value < 0 || value > 255) {
        return { type: ERR, value: "byte-vector-set! value must be >= 0 and <= 255" };
    }

    args[0].value[index] = value;
    return voidValue;
}

function byteVectorRef(args, env) {
    if (args.length < 1 || args[0].type !== BYTEVECTOR) {
        return { type: ERR, value: "byte-vector-ref requires a vector as first argument" };
    }
    if (args.length !== 2 || args[1].type !== NUM) {
        return { type: ERR, value: "byte-vector-ref requires an integer index as second argument" };
    }
    const index = args[1].value;
    if (index < 0 || index >= args[0].value.length) {
        return { type: ERR, value: "byte-vector-set! index out of bounds" };
    }
    if ( Math.floor(index) !== index) {
        return { type: ERR, value: "byte-vector-ref requires an integer index" };
    }
    const result = args[0].value[index]; 
    return { type: NUM, value: result };
}

function byteVectorLength(args, env) {
    if (args.length < 1 || args[0].type !== BYTEVECTOR) {
        return { type: ERR, value: "byte-vector-length requires a byte vector as first argument" };
    }
    return { type: NUM, value: args[0].value.length };
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
            return { type: ERR, value: "concat requires values that convert to string as arguments" };
        }
        value += arg.value;
    }
    return { type: STR, value };
}

function strIndexOf(args, env) {
    if (args.length !== 2 || args[0].type !== STR || args[1].type !== STR) {
        return { type: ERR, value: "index-of requires two string arguments" };
    }
    return { type: NUM, value: args[1].value.indexOf(args[0].value) };
}

function typeOf(args, env) {
    if (args.length !== 1) {
        return { type: ERR, value: "type-of takes one argument" };
    }
    return { type: NUM, value: args[0].type };
}

function symbolToString(args, env) {
    if (args.length !== 1 || args[0].type !== ATOM) {
        return { type: ERR, value: "symbol->string takes a symbol as argument" };
    }
    return { type: STR, value: args[0].value};
}

function stringToSymbol(args, env) {
    if (args.length !== 1 || args[0].type !== STR) {
        return { type: ERR, value: "string->symbol takes a string as argument" };
    }
    return { type: ATOM, value: args[0].value};
}

let gensymcounter = 1;

function gensym(args, env) {
    if (args.length !== 0 && (args.length !== 1 || args[0].type !== STR)) {
         return { type: ERR, value: "gensym takes one optional string argument" };
    }
    const prefix = args.length === 0 ? "g" : args[0].value;
    return { type: ATOM, value: prefix + gensymcounter++ };
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

function printValue(value) {
    if (value.type === ERR) {
        return "(error " + escape(value.value) + ")";
    }
    if (value.type === NUM) {
        return value.value;
    }
    if (value.type === BOOL) {
        return value.value ? "#t" : "#f";
    }
    if (value.type === STR) {
        return escape(value.value);
    }
    if (value.type === ATOM ) {
        return value.value;
    }
    if (value.type === CLOSURE) {
        // console.log("closure");
        return "λ";
    }
    if (value.type === VOID) {
        return "";
    }
    if (value.type === PROMISE ) {
        return "promise";
    }
    if (isNullList(value)) {
        return "()";
    }
    if (value.type === EXP) {
        return "expression";
    }
    if (value.type === OBJ) {
        return "object";
    }
    if (value.type === VECTOR) {
        return "vector";
    }
    if (value.type === BYTEVECTOR) {
        return "byte-vector";
    }
    if (value.type === PAIR) {
        let str = "(";
        let once = false;
        while (value.type === PAIR) {
            if (!once) {
                once = true;
            } else {
                str += " ";
            }
            str += printValue(value.value);
            value = value.rest;
        }
        if (value.type !== EXP && value.value.length !== 0) {
            str += " . ";
            str += printValue(value);
        }
        str += ")";
        return str;
    }
    return undefined;
}

function print(args, env) {
    // .log("print " + JSON.stringify(args));
    let result = "";
    for (const arg of args) {
        // console.log("print arg " + JSON.stringify(arg.type));
        const str = printValue(arg);
        if (str === undefined) {
            return { type: ERR, value: "Could not print a " + arg.type };
        }
        result += str;
    }
  
    return { type: STR, value: result };
}

exports.listify = listify
exports.pairToExp = pairToExp
exports.cons = cons
exports.car = car
exports.cdr = cdr
exports.setCar = setCar
exports.setCdr = setCdr
exports.append = append
exports.begin = begin
exports.lessThan = lessThan
exports.greaterThan = greaterThan
exports.applyLambda = applyLambda
exports.equal = equal
exports.numberEqual = numberEqual
exports.plus = plus
exports.minus = minus
exports.multiply = multiply
exports.divide = divide
exports.divmod = divmod
exports.sqrt = sqrt
exports.floor = floor
exports.random = random
exports.makeVector = makeVector
exports.vectorSet = vectorSet
exports.vectorRef = vectorRef
exports.vectorLength = vectorLength
exports.makeByteVector = makeByteVector
exports.byteVectorSet = byteVectorSet
exports.byteVectorRef = byteVectorRef
exports.byteVectorLength = byteVectorLength
exports.strLength = strLength
exports.strSlice = strSlice
exports.strConcat = strConcat
exports.strIndexOf = strIndexOf
exports.typeOf = typeOf
exports.symbolToString = symbolToString
exports.stringToSymbol = stringToSymbol
exports.gensym = gensym
exports.error = error
exports.print = print
exports.escape = escape
exports.printValue = printValue
