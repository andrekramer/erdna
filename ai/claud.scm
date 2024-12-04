(load "examples/json.scm")

(define claud-api-key (resolve (read-file-promise "ai/claud-api-key"))) 

(define claud-headers (list (cons "x-api-key" claud-api-key) (cons "anthropic-version" "2023-06-01")))

(define json-content-type "application/json")

(define claud-url "https://api.anthropic.com/v1/messages")

(define (make-claud-query text) 
  (concat "{ \"model\": \"claude-3-5-sonnet-20241022\", \"max_tokens\": 1024, \"messages\": [{\"role\": \"user\", \"content\": \"" 
          text 
          "\"} ]}"))

;; (define text "Hello, Claud")

(define text "There are three contries in a continent named Pandoma. Esland is next to MiddLand and MiddLand is next to Wesland. Esland and Wesland have no other neighbours than Middland. Middland has two neighbours which are Esland and Wesland. Esland is a Democracy while Wesland is a Communist country. Middland is either a Democracy or a Communist country. Is there a Democracy next to a Communist country in Pandoma?")

(define (ask-claud query)
  (let ((reply (resolve (fetch-promise claud-url "" query json-content-type claud-headers))))
       (json-parse reply)))

(define (one-shot-claud text) 
  (let ((reply (ask-claud (make-claud-query text))))
       (json-find 'text reply)))

;; (define claud-reply (one-shot-claud text))

(define (task-claud text)
  (letrec ((query (make-claud-query text))
           (promise (fetch-promise claud-url "" query json-content-type claud-headers))
           (completion (lambda () (json-find 'text (json-parse (resolve promise))))))
          completion))

