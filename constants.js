const ATOM = 0;
const EXP = 1;
const ERR = -1;
const COMMENT = -2; 
const NUM = 2;
const STR = 3;
const BOOL = 4;
const CLOSURE = 5;
const PROMISE = 6;
const PAIR = 8;

const trueValue = { type: BOOL, value: true };
const falseValue = { type: BOOL, value: false };

const nullList = { type: EXP, value: [] };

exports.ATOM = ATOM
exports.EXP = EXP
exports.ERR = ERR
exports.COMMENT = COMMENT
exports.NUM = NUM
exports.STR = STR
exports.BOOL = BOOL
exports.CLOSURE = CLOSURE
exports.PAIR = PAIR
exports.PROMISE = PROMISE

exports.trueValue = trueValue
exports.falseValue = falseValue
exports.nullList = nullList