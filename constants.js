const ATOM = 0;
const EXP = 1;
const ERR = -1;
const COMMENT = -2; 
const NUM = 2;
const STR = 3;
const BOOL = 4;
const CLOSURE = 5;
const OBJ = 6;
const VECTOR = 7;
const PROMISE = 8;
const PAIR = 9;
const VOID = 10;

function displayType(t) {
    switch(t) {
        case ATOM: return "atom";
        case EXP: return "expression";
        case ERR: return "error";
        case COMMENT: return "comment";
        case NUM: return "number";
        case STR: return "string";
        case BOOL: return "boolean";
        case CLOSURE: return "closure";
        case OBJ: return "object";
        case PROMISE: return "promise";
        case VOID: return "void";
        case PAIR: return "pair";
        case VECTOR: return "vector";
        default: return "unkown " + t;
    }
}

const trueValue = { type: BOOL, value: true };
const falseValue = { type: BOOL, value: false };

const nullList = { type: EXP, value: [] };
const voidValue = { type: VOID, value: undefined };

function isNullList(exp) {
    return exp.type === EXP && exp.value.length === 0;
}

exports.ATOM = ATOM
exports.EXP = EXP
exports.ERR = ERR
exports.COMMENT = COMMENT
exports.NUM = NUM
exports.STR = STR
exports.BOOL = BOOL
exports.CLOSURE = CLOSURE
exports.PAIR = PAIR
exports.VECTOR = VECTOR
exports.VOID = VOID
exports.PROMISE = PROMISE
exports.OBJ = OBJ

exports.trueValue = trueValue
exports.falseValue = falseValue
exports.nullList = nullList
exports.displayType = displayType
exports.isNullList = isNullList
exports.voidValue = voidValue
