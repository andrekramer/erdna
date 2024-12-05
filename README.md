An interpreter for a Scheme -like language written in Javascript hosted in a Node web server.  
Loosely based on
[An Introduction to Scheme and its Implemementation](https://docs.scheme.org/schintro/schintro_toc.html). 
The project commit history builds up language features for the example curl commands below
and those in the files in the examples directory (please see examples.md).  

What if the Web (or Agentic AI) was programmable in a uniform but flexible syntax?  

The ability to use LLMs from a Scheme repl may be interesting given the classic AI Lisp legacy connections.    

The v1 code was written in small pieces over the summer of 2024 without AI input and is free for non commercial use. 
More examples where added and some bugs fixed in later minor versions.  
  
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

Use a curl POST to calculate a number in the Fibonacci sequence:  

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
> (load "game-of-life.scm")   

Gen AI Samples:   

The ai directory contains some experiments of using ai large language models from a scheme repl.   
e.g.   
Add an api key in "ai/gemini-api-key" from Google AI and do a (load "ai/gemini.scm")  
Add an api key in "ai/claud-api-key" from Anthropic and do a (load "ai/claud.scm")    
Add an api key in "ai/openai-api-key" from OpenAI and do a (load "ai/openai.scm")    
    
Once you are set up you can use (load "ai/multi-llm.scm") and perform queries over the above models from the repl: > (map display (multi-way "your query here"))   

