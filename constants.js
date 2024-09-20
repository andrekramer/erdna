const ATOM = 0;
const EXP = 1;
const ERR = -1;
const COMMENT = -2; 
const NUM = 2;
const STR = 3;
const BOOL = 4;
const CLOSURE = 5;
const OBJ = 6;
const PROMISE = 7;
const VOID = 8;
const PAIR = 9;

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
        default: return "unkown";
    }
}

const trueValue = { type: BOOL, value: true };
const falseValue = { type: BOOL, value: false };

const nullList = { type: EXP, value: [] };

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
exports.VOID = VOID
exports.PROMISE = PROMISE
exports.OBJ = OBJ

exports.trueValue = trueValue
exports.falseValue = falseValue
exports.nullList = nullList
exports.displayType = displayType
exports.isNullList = isNullList
