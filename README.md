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

curl --data '(define (addx x) (lambda (y) (+ x y))) (define add5 (addx 5)) (add5 3)' localhost:8080
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

