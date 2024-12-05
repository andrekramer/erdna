(load "examples/json.scm")

(define gemini-api-key (resolve (read-file-promise "ai/gemini-api-key"))) 

(define gemini-model "gemini-1.5-flash-latest")
(define gemini-model-001 "gemini-1.5-flash-001") ;;; used by cache example as latest not supported there

(define (make-gemini-url model) 
  (concat "https://generativelanguage.googleapis.com/v1beta/models/" model ":generateContent?key=" gemini-api-key))

(define gemini-url (make-gemini-url gemini-model))
(define gemini-url-001 (make-gemini-url gemini-model-001))

(define json-content-type "application/json")

(define (ask-gemini query)
  (let ((reply (resolve (fetch-promise gemini-url "" query json-content-type))))
       (json-parse reply)))

;; (define text "Explain how AI works")

(define text "There are three contries in a continent named Pandoma. Esland is next to MiddLand and MiddLand is next to Wesland. Esland and Wesland have no other neighbours than Middland. Middland has two neighbours which are Esland and Wesland. Esland is a Democracy while Wesland is a Communist country. Middland is either a Democracy or a Communist country. Is there a Democracy next to a Communist country in Pandoma?")

(define (make-gemini-query text) (concat "{\"contents\":[{\"parts\":[{\"text\":\"" text "\"}]}]}"))

(define (one-shot-gemini text) 
  (let ((reply (ask-gemini (make-gemini-query text))))
       (json-find 'text reply)))



(define cache-name (get-env-var "CACHE_NAME"))

(define (make-gemini-cache-query text cache-name) (concat "{
      \"contents\": [
        {
          \"parts\":[{
            \"text\": \"" text  "\"}],
          \"role\": \"user\"
        }
      ],
      \"cachedContent\": \"" cache-name "\"}"))

;; (define query (make-gemini-query text))

;;(define json-reply (ask-gemini query))
;;(define reply (json-find 'text json-reply))

;; (one-shot-gemini "Alice is 16 years old, 
;; which is twice as old as Emily was when Alice was as old as Emily is now. How old is Emily?")

;; (define gemini-reply (one-shot-gemini text))

(define (ask-gemini-with-cache query)
  (let ((reply (resolve (fetch-promise gemini-url-001 "" query json-content-type))))
       (json-parse reply)))

;;; (define query2 (make-gemini-cache-query "What did the horse say?" cache-name))
;;; (define reply (json-find 'text (ask-gemini-with-cache query2)))

(define (task-gemini text)
  (letrec ((query (make-gemini-query text))
           (promise (fetch-promise gemini-url "" query json-content-type))
           (completion (lambda () (json-find 'text (json-parse (resolve promise))))))
          completion))

