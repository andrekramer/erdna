(load "examples/json.scm")

(define gemini-api-key (resolve (read-file-promise "ai/gemini-api-key"))) 

(define gemini-url (concat "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" gemini-api-key))

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

(define gemini-reply (one-shot-gemini text))

;;; (one-shot-gemini "Alice is 16 years old, which is twice as old as Emily was when Alice was as old as Emily is now. How old is Emily?")

;;(define query (make-gemini-query text))
;;(define json-reply ((ask-gemini query)))
;;(define reply (json-find 'text json-reply))
