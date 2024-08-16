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
(define (caar l) (car (car l)))
(define (cadr l) (car (cdr l)))
(define (cdar l) (cdr (car l)))
(define (cddr l) (cdr (cdr l)))
(define (>= n1 n2) (not (< n1 n2)))
(define (<= n1 n2) (not (> n1 n2)))
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
