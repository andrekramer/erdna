(load "examples/json.scm")

(define openai-api-key (resolve (read-file-promise "ai/openai-api-key"))) 

(define openai-headers (list (cons "Authorization" (concat "Bearer " openai-api-key))))

(define json-content-type "application/json")

(define openai-url "https://api.openai.com/v1/chat/completions")

(define (make-openai-query text) 
  (concat "{ \"model\": \"gpt-4o\", \"messages\": [{\"role\": \"user\", \"content\": \"" 
          text
          "\"}]}"))

;; (define text "write a haiku about ai")

(define text "There are three contries in a continent named Pandoma. Esland is next to MiddLand and MiddLand is next to Wesland. Esland and Wesland have no other neighbours than Middland. Middland has two neighbours which are Esland and Wesland. Esland is a Democracy while Wesland is a Communist country. Middland is either a Democracy or a Communist country. Is there a Democracy next to a Communist country in Pandoma?")

(define (ask-openai query)
  (let ((reply (resolve (fetch-promise openai-url "" query json-content-type openai-headers))))
       (json-parse reply)))

(define (one-shot-openai text) 
  (let ((reply (ask-openai (make-openai-query text))))
       (json-find 'content reply)))

(define openai-reply (one-shot-openai text))
