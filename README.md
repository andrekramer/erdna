An interpreter for a Scheme -like language written in Javascript hosted in a Node web server.  
Loosely based on
[An Introduction to Scheme and its Implemementation](https://docs.scheme.org/schintro/schintro_toc.html).  
The project commit history builds up language features for the example curl commands below
and those in the files in the examples directory.  
Full Scheme macros and callcc are not covered (but see examples/macros for lisp style macros).  
Supports Promises via Javascript async/await and so can request the Web (see examples/async) or perform background tasks.  
Remote script execution and distributed / concurrency examples (using Actor model) are built on Promises   
(see examples/async and examples/conc).  

Bootstraps a simple object system so that object-oriented programming can be employed (examples/objects),  
as well as allowing experimenting with functional, procedural and symbolic programming. See examples/useful for other functional techniques such as lazy evaluation. 
    
What if the Web was programmable in such a uniform but flexible syntax?  

The v1 code was written in small pieces over the summer of 2024 without AI input and is free for non commercial use. More examples where added and some bugs fixed in later minor versions.   

The ability to use LLMs from a Scheme repl may be interesting given the classic AI lisp legacy.  

  
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

Try it out in another shell using the following curl command to post a Scheme script to the server running on port 8080:  
curl --data "(+ 1 2)" localhost:8080    
3   

or a multi-line post with a Scheme style comment:    

curl --data "   
  
 (+ 1 2 3 4 5) ; adds the first 5 numbers together   
 
" localhost:8080    
15  

or to define and call a function:

curl --data "(define (square x) (* x x)) (square 5)" localhost:8080     
25  

calculate a number in the Fibonacci sequence:  

curl --data '   
(define (fib n)   
"calculate the nth fibonacci number"   
(cond   
  ((equal? n 0) 0)   
  ((equal? n 1) 1)   
  (else (+ (fib (- n 1)) (fib (- n 2))))))    
(fib 19)  
' localhost:8080    
4181   
     
There is a REPL (read evaluate print loop) that can be started in a running Node server  
with the ./erdna script (which loads examples/repl into the already running server).    
  
In one shell / cmd window run (with increased stack size and error tracing):  
  
node --trace-uncaught --stack-size=100000 index.js   
  
and then ./erdna in another shell / cmd window to start the ">" prompt in the node server.  
A Scheme expression can then we entered on a single line at a time.  
  
Try loading Conway's game of life with:   
(load "game-of-life.scm")   

Or GPS (General Problem Solver) from [Paradigms of AI Programming](https://en.wikipedia.org/wiki/Paradigms_of_AI_Programming):  
(load "examples/gps.scm") (load "examples/gps2.scm")   
  
or use "curl" commands to post any of the code samples in the files in the example directory to the running erdna server.   
  
Tests are semi automated. Run py-install and then "python3 test examples/procs" or on other files in the examples directory. A small number of Fails need manual examination but can be due to indeterminate results.

Gen AI Samples:   

The ai directory contains some experiments of using ai large language models from a scheme repl.   
e.g.   
Add an api key in "ai/gemini-api-key" from Google AI and do a (load "ai/gemini.scm")  
Add an api key in "ai/claud-api-key" from Anthropic and do a (load "ai/claud.scm")    


