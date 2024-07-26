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

curl --data '(define (add1 x) (+ x 1)) (add1 3)' localhost:8080
4
