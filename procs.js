
const lang = require("./lang.js");

const procs = `
(define (null? l) (equal? '() l))
(define (not bool) (if (equal? bool #f) #t #f))
`;

function seed() {
    const topLevelEnv = { name: "top level scope with predefines"};
    const exps = lang.read(procs);
    for (const exp of exps) {
        const result = lang.eval(exp, topLevelEnv);
        // console.log(lang.write(result));
    }
    return topLevelEnv;
};

exports.seed = seed;
