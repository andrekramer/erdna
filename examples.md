
Try a multi-line curl POST with a Scheme style comment:    

curl --data "   
  
 ; add the first 5 numbers together   
 (+ 1 2 3 4 5)   
   
" localhost:8080    
15   

or to define and call a function:   
   
curl --data "(define (square x) (* x x)) (square 5)" localhost:8080     
25  

Full Scheme macros and callcc are not covered (but see examples/macros for lisp style macros).   
Supports Promises via Javascript async/await and so can request the Web (see examples/async) or perform background tasks.  
Remote script execution and distributed / concurrency examples (using Actor model) are built on Promises   
(see examples/async and examples/conc).  
   
Bootstraps a simple object system so that object-oriented programming can be employed (examples/objects),  
as well as allowing experimenting with functional, procedural and symbolic programming.   
See examples/useful for other functional techniques such as lazy evaluation.   
        
GPS (General Problem Solver) from [Paradigms of AI Programming](https://en.wikipedia.org/wiki/Paradigms_of_AI_Programming):  
(load "examples/gps.scm") (load "examples/gps2.scm")   
  
Or use "curl" commands to post any of the code samples in the files in the example directory to the running erdna server.   
  
Tests are semi automated. Run py-install and then "python3 test examples/procs" or on other files in the examples directory. 
A small number of Fails need manual examination but can be due to indeterminate results.

Example files with .gen. in their name are derived from AI generated or translated code.
