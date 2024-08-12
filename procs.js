const lang = require("./lang.js");

const procs = `
(define (null? l) (equal? '() l))
(define (not bool) (if (equal? bool #f) #t #f))
(define (reverse l) 
  (define (rev l rl)
    (cond 
      ((null? l) rl)
      (else (rev (cdr l) (cons (car l) rl)))
    ))
  (rev l '())
)
(define (length l)
  (define (len l n)
    (if (equal? l '())
      n
      (len (cdr l) (+ n 1))
    )
  )
  (len l 0)
)
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
