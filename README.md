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

The code was written in small parts over the summer of 2024 without AI input and is free for non commercial use.  

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

or multi-line with a Scheme style comment:    

curl --data-raw " 

 (+ 1 2 3 4 5) ; adds the first 5 numbers together   

" localhost:8080    
15  

or define and call a function:

curl --data-raw " 
(define (square x) (* x x))
(square 5)
" localhost:8080    
25

There is a REPL (read evaluate print loop) that can be started in a server using curl 
with the ./erdna script (which loads examples/repl into the already running server).    

in one cmd window / shell run:

node --trace-uncaught --stack-size=100000 index.js 

and then ./erdna in another cmd window shell.

or use curl to post any of the other code samples in file in the example directory.  
  
