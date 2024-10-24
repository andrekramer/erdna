const lang = require("./lang.js");

const procs = `
(define (null? l) (equal? '() l))
(define (not bool) (if (equal? bool #f) #t #f))
(define (reverse l) 
  (define (rev l rl)
    (cond 
      ((null? l) rl)
      (else (rev (cdr l) (cons (car l) rl)))))
  (rev l '()))
(define (length l)
  (define (len l n)
    (if (equal? l '())
        n
        (len (cdr l) (+ n 1))))
  (len l 0))
(define (caar l) (car (car l)))
(define (cadr l) (car (cdr l)))
(define (cdar l) (cdr (car l)))
(define (cddr l) (cdr (cdr l)))
(define (caddr l) (car (cdr (cdr l))))
(define (>= n1 n2) (not (< n1 n2)))
(define (<= n1 n2) (not (> n1 n2)))
(define (symbol? x) (equal? (type-of x) 0))
(define (number? x) (equal? (type-of x) 2))
(define (string? x) (equal? (type-of x) 3))
(define (boolean? x) (equal? (type-of x) 4))
(define (pair? x) (equal? (type-of x) 11))
(define (list? x) (or (null? x) (equal? (type-of x) 11)))
(define (object? x) (equal? (type-of x) 6))
(define (vector? x) (equal? (type-of x) 7))
(define (byte-vector? x) (equal? (type-of x) 8))
(define (promise? x) (equal? (type-of x) 9))

(define (map f l) 
  (if (null? l) '() (cons (f (car l)) (map f (cdr l)))))
(define (reduce fn l r)
  (if (null? l) r
      (fn (car l)
          (reduce fn (cdr l) r))))
(define (force f) (f))
(define (break) 'break)
(define (continue) 'continue)
`;

function seed() {
    const topLevelEnv = lang.topLevelEnv;
    topLevelEnv.name = topLevelEnv.name + " with predefined procs";
    const exps = lang.read(procs);
    for (const exp of exps) {
        const result = lang.eval(exp, topLevelEnv);
        // console.log(lang.write(result));
    }
    return topLevelEnv;
};

exports.seed = seed;
