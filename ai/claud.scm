(define claud-api-key (resolve (read-file-promise "ai/claud-api-key"))) 

(define headers (list (cons "x-api-key" claud-api-key) (cons "anthropic-version" "2023-06-01")))

(define content-type "application/json")

(define claud-url "https://api.anthropic.com/v1/messages")

(define (make-query text) 
  (concat "{ \"model\": \"claude-3-5-sonnet-20241022\", \"max_tokens\": 1024, \"messages\": [{\"role\": \"user\", \"content\": \"" 
          text 
          "\"} ]}"))

;; (define text "Hello, Claud")

(define text "There are three contries in a continent named Pandoma. Esland is next to MiddLand and MiddLand is next to Wesland. Esland and Wesland have no other neighbours than Middland. Middland has two neighbours which are Esland and Wesland. Esland is a Democracy while Wesland is a Communist country. Middland is either a Democracy or a Communist country. Is there a Democracy next to a Communist country in Pandoma?")

(define query (make-query text))

(define (ask-claud query)
  (let ((reply (resolve (fetch-promise claud-url "" query content-type headers))))
       (json-parse reply)))

(define claud-reply (ask-claud query))

;; (json-find 'text claud-reply)