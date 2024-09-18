An interpreter for a Scheme -like language written in Javascript hosted in a Node web server.  
Loosely based on
[An Introduction to Scheme and its Implemementation](https://docs.scheme.org/schintro/schintro_toc.html)  
The commit history builds up language features for the example curl commands below
and those in the files in the examples directory.  
Full Scheme macros (see examples/macros for lisp style macros) and callcc are not covered.  
Supports Promises via Javascript async/await and so can request the Web (see examples/async).  
Bootstraps a simple object system so that object-orientated programming can be used (examples/objects),  
as well as functional, procdural and symbolic programming.   
What if the Web was programmable in a uniform but flexible syntax?  

To clone:

git clone git@github.com:andrekramer/erdna.git  
cd erdna  

To install:  

Follow instructions on [node.js](https://nodejs.org/en/download/package-manager) to install node and npm.  

Then in a command shell:  

npm init  
npm install express  

To run node:  

node index.js   

Try it out in another shell using the following curl command to post a script to the server running on 8080:  

curl --data "(+ 1 2)" localhost:8080    
3   

or with a Scheme style comment:    

curl --data-raw " 

 (+ 1 2 3 4 5) ; adds 1 and 2   

" localhost:8080    
15  

or any of the following examples ...  

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
#t

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
(1 2 a #f) 

curl --data "'() " localhost:8080  
()

curl --data "(equal? '() '()) " localhost:8080  
#t

curl --data "(equal? '(1 2 3) (list 1 2 3))" localhost:8080  
#t

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
   (cond ((= n 0) 0)
         (else (loop (- n 1)))))
(loop 1000000)
" localhost:8080  
0

; with predefined procs 

curl --data "(not #t)(not #f)(not 1)" localhost:8080  
#f
#t
#f

curl --data "(null? '())(null? '(1 2 3))" localhost:8080  
#t
#f

curl --data "(and #t (equal? 1 0))" localhost:8080  
#f

curl --data "(or #f (equal? 1 0)) (+ 1 2)"  localhost:8080   
#f
3

curl --data "(append '() '(1 2 3) (list 4 (+ 2 3)) '() '(6) '(7 8 9 0))" localhost:8080  
(1 2 3 4 5 6 7 8 9 0)

curl --data "(reverse '(1 2 3 4 5 6 7 8 9 0))" localhost:8080  
(0 9 8 7 6 5 4 3 2 1)

curl --data "(<)(< 1)(< 1 2)(< 2 1)(< 2 3 4)"  localhost:8080  
#t
#t
#t
#f
#t

curl --data "(>)(> 1)(> 2 1)(> 1 2)(> 4 3 2)"  localhost:8080  
#t  
#t  
#t  
#f  
#t  

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

curl --data "
(= 100 101) (= 110 110) (= 1 0 1) (= '2 2) (=)
" localhost:8080  
#f  
#t  
#f  
#t  
#t  

curl --data "
(caar '((1 2) 0 (3 4)))
(cadr '((1 2) 0 (3 4)))
(cdar '((1 2) 0 (3 4)))
(cddr '((1 2) 0 (3 4)))
" localhost:8080  
1   
0  
(2)  
((3 4))  

curl --data '
(define (hick n) 
  (cond ((> 10 n) n)
    (else (error "hick"))))
(hick 9)
(hick 11)
(error "raise an error")
' localhost:8080  
9  

hick  

curl --data "  
(symbol? 'a) (number? 1) (pair? '(1 2)) (string? \"abc\") (boolean? #f)  
(symbol? '1) (number? 'x) (pair? '()) (string? '(\"abc\")) (boolean? 0)  
" localhost:8080 
#t #t #t #t #t  
#f #f #f #f  

curl --data "(define (hello) (display \"Hello world\" 1 '(1 2 3) 'a)) (hello)" localhost:8080
λ

Writes:
Hello world
1
(1 2 3)
a

curl --data "  
(define (quotient x y) (car (div-mod x y)))
(define (remainder x y) (cdr (div-mod x y)))
(define (number->list n)
  (let loop ((n n)
             (acc '()))
    (if (< n 10)
        (cons n acc)
        (loop (quotient n 10)
              (cons (remainder n 10) acc)))))
(number->list 1234567890)  
" localhost:8080  
(1 2 3 4 5 6 7 8 9 0)

