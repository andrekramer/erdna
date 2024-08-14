to clone:

git@github.com:andrekramer/erdna.git
cd erdna

to install:

npm init

npm install express

to run:

node index.js

try it out in another shell:

curl --data "(+ 1 2)" localhost:8080
3 

or 

curl --data-raw ' 

 (+ 1 2) ; adds 1 and 2 

' localhost:8080
3

or ...

curl --data '(* 4 (+ 2 3 1) 2)'  localhost:8080
48

curl --data '((lambda (a b) (+ a b)) 1 2 )'  localhost:8080
3

curl --data '(define a (+ 1 2)) (+ a a 4)' localhost:8080
3
10

curl --data '(define a (lambda (x) (+ x 1))) (a 3)' localhost:8080
4

curl --data '(define (add1 x) (+ x 1)) (add1 4)' localhost:8080
5

curl --data '(define (addx x) (lambda (y) (+ x y))) 
(define add5 (addx 5)) (add5 3)' localhost:8080
8

curl --data '(equal? #f (equal? 1 2))' localhost:8080
true

curl --data '(if (equal? "abc" "abc") (+ 2 3) (+ 4 5))' localhost:8080
5

curl --data-raw '
  (define (! n)   
    (if (equal? n 0) 
      1
      (* n (! (- n 1)))
    )
  )
  (! 5)   
' localhost:8080
120

curl --data '(define x "abc") x (set! x 2) x' localhost:8080
2

curl --data-raw '
(define counter (lambda ()  
  (define x 0)
  (lambda () (set! x (+ x 1)) x)
 )
)
(define x (counter))
(x)
(x)
(x)
' localhost:8080
1
2
3

curl --data "'(1 2 a #f) " localhost:8080
(1 2 a false) 

curl --data "'() " localhost:8080
()

curl --data "(equal? '() '()) " localhost:8080
true

curl --data "(equal? '(1 2 3) (list 1 2 3))" localhost:8080
true

curl --data "(define a 100) (cons a '(1 2 3))" localhost:8080
(100 1 2 3)

curl --data "(cons 1 2)" localhost:8080
(1 . 2)

curl --data "(car '(1 2 3))" localhost:8080 
1

curl --data "(cdr '(1 2 3))" localhost:8080
(2 3)

curl --data-raw "
(define (length2 l) 
  (define (len l n) 
    (if (equal? l '()) 
      n 
      (len (cdr l) (+ n 1))
    )
  )
  (len l 0)
)
(length2 '(1 2 3))
" localhost:8080
3

curl --data "
(define apple 'delicious) 
(cond 
  [(equal? apple 'baseball) 'wrong]
  [(equal? apple 'delicious) 'right]
  [else 'not-sure])" localhost:8080
right

curl --data "
(define (append2 list1 list2)
  (cond ((equal? '() list1)
         list2)
        (else
         (cons (car list1)
               (append2 (cdr list1) list2)))))
(append2 '(1 2 3) '(4 5))
" localhost:8080
(1 2 3 4 5)

curl --data "(define a 1) (if (equal? 1 1) (begin (set! a 2) 'a '(1 2) (+ 1 a  3 4)) (#f))" localhost:8080
10

curl --data "
(define (loop n) 
   (cond ((equal? n 0) 0)
         (else (loop (- n 1)))))
(loop 1000000)
" localhost:8080

; with predefined procs 

curl --data "(not #t)(not #f)(not 1)" localhost:8080
false
true
false

curl --data "(null? '())(null? '(1 2 3))" localhost:8080
true
false

curl --data "(and #t (equal? 1 0))" localhost:8080
false

curl --data "(or #f (equal? 1 0)) (+ 1 2)"  localhost:8080 
false
3

curl --data "(append '() '(1 2 3) (list 4 (+ 2 3)) '() '(6) '(7 8 9 0))" localhost:8080
(1 2 3 4 5 6 7 8 9 0)

curl --data "(reverse '(1 2 3 4 5 6 7 8 9 0))" localhost:8080
(0 9 8 7 6 5 4 3 2 1)

curl --data "(<)(< 1)(< 1 2)(< 2 1)(< 2 3 4)"  localhost:8080
true
true
true
false
true

curl --data "
(define (variable-args a b . c) (cons a (cons b c)))
(variable-args 1 2 '(3 4 5))
(define (variable-args-only . x) x)
(variable-args-only  0 1 2 3)
(variable-args-only)
"  localhost:8080
(1 2 (3 4 5))
(0 1 2 3)
()

curl --data "(apply + '(1 2 3))" localhost:8080
6

curl --data "(apply (lambda (. x) x) '(1 2 3 4))" localhost:8080
(1 2 3 4)

curl --data "(quasiquote (a 1 ,(+ 1 2)))" localhost:8080
export bq='`';curl --data "$bq(a 1 ,(+ 1 2))" localhost:8080
(a 1 3)

curl --data "'(a 1 ,(+ 1 2))" localhost:8080
(a 1 (unquote (+ 1 2)))


curl --data '
(let ((number 4))
  (case number
    [(0 1) "small"]
    [(2) "medium"]
    [(3 4 5) "large"]
    [else "other"]))
' localhost:8080
"large"

curl --data "
(define c (lambda () '()))
(eval '(+ 1 2) c)
" localhost:8080
3

curl --data "
(define c (let ((a 1) (b 2)) (lambda () (list a b))))
(eval '(list a b (+ a b)) c)
(eval (cons '+ (cons 'a (cons 'b '()))) c)
(eval '((lambda (a) (+ 1 a)) 100) c)
" localhost:8080
(1 2 3)
3
101
3

