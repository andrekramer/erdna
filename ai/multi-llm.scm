(load "ai/gemini.scm")
(load "ai/openai.scm")
(load "ai/claud.scm")

(define text "Examine Loki as a Jungian archtype")

(define (multi-query text models)
  (let ((tasks (map (lambda (func) (func text)) models)))
       (map (lambda (task) (task)) tasks)))

(define models '(task-gemini task-claud task-openai))

(define (multi-way text) (multi-query text models))

;; (define replies (multi-way text))
;; (map display replies)
