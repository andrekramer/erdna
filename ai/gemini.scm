(define gemini-api-key (resolve (read-file-promise "ai/gemini-api-key"))) 

(define gemini-url (concat "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" gemini-api-key))

(define content-type "application/json")

(define (ask-gemini query)
  (resolve (fetch-promise gemini-url "" query content-type)) )

(define query "{\"contents\":[{\"parts\":[{\"text\":\"Explain how AI works\"}]}]}")

(ask-gemini query)
