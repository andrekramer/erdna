An interpreter for a Scheme -like language written in Javascript hosted in a Node web server.  
Loosely based on
[An Introduction to Scheme and its Implemementation](https://docs.scheme.org/schintro/schintro_toc.html).  
The commit history builds up language features for the example curl commands below
and those in the files in the examples directory.  
Full Scheme macros and callcc are not covered (but see examples/macros for lisp style macros).  
Supports Promises via Javascript async/await and so can request the Web (see examples/async) or background tasks.  
Remote script execution and and concurrency examples (Actor model) are built on Promises   
(see examples/async and examples/conc).  

Bootstraps a simple object system so that object-oriented programming can be used (examples/objects),  
as well as allowing experimenting with functional, procedural and symbolic programming. See examples/useful for other techniques such as lazy evaluation. 
    
What if the Web was programmable in a uniform but flexible syntax?  

The v1 code was written in small pieces over the summer of 2024 without AI input and is free for non commercial use. More examples where added and some bugs fixed in later minor versions.

To clone:

git clone git@github.com:andrekramer/erdna.git  
cd erdna  

To install:  

Follow instructions on [node.js](https://nodejs.org/en/download/package-manager) to install node and npm.  

Then in a command shell:  

npm init  
npm install express  

To run node and start the expression evaluation server:  

node index.js   

Try it out in another shell using the following curl command to post a Scheme script to the server running on 8080:  
curl --data "(+ 1 2)" localhost:8080    
3   

or multi-line with a Scheme style comment:    

curl --data-raw "   
  
 (+ 1 2 3 4 5) ; adds the first 5 numbers together   
 
" localhost:8080    
15  

or to define and call a function:

curl --data-raw "  
(define (square x) (* x x))  
(square 5)  
" localhost:8080     
25  

calculate a number in the Fibonacci sequence:  

curl --data-raw "   
(define (fib n)   
(cond   
  ((equal? n 0) 0)   
  ((equal? n 1) 1)   
  (else (+ (fib (- n 1)) (fib (- n 2))))))    
(fib 19)   
" localhost:8080    
4181   
     
There is a REPL (read evaluate print loop) that can be started in a Node server  
with the ./erdna script (which loads examples/repl into the already running server).    
  
In one cmd window / shell run:  
  
node --trace-uncaught --stack-size=100000 index.js   
  
and then ./erdna in another cmd window shell to start the ">" prompt in the node server.  
A Scheme expression can then we entered on a single line at a time.  
Try loading Conway's game of life with:   
(load "game-of-life.scm")   

or use "curl" commands to post any of the code samples in the files in the example directory to a running erdna server.   
  
