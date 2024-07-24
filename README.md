to install:

npm init

npm install express

to run:

node index.js

try it out:

curl --data "(+ 1 2)" localhost:8080

or 

curl --data-raw ' 

 (+ 1 2)

' localhost:8080

curl --data '(* 4 (+ 2 3 1) 2)'  localhost:8080

curl --data '((lambda (a b) (+ a b)) 1 2 )'  localhost:8080

