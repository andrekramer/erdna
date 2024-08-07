to install:

npm init

npm install express

to run:

node index.js

try it out:

curl --data "(+ 1 2)" localhost:8080
3 

or 

curl --data-raw ' 

 (+ 1 2)

' localhost:8080
3

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
(define (length l) 
  (define (len l n) 
    (if (equal? l '()) 
      n 
      (len (cdr l) (+ n 1))
    )
  )
  (len l 0)
)
(length '(1 2 3))
" localhost:8080
3

curl --data "
(define apple 'delicious) 
(cond 
  [(equal? apple 'baseball) 'wrong]
  [(equal? apple 'delicious) 'right]
  [else 'not-sure])" localhost:8080
'right

curl --data "
(define (null? l) (equal? '() l))
(define (append2 list1 list2)
  (cond ((null? list1)
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
(loop 10000)
" localhost:8080
