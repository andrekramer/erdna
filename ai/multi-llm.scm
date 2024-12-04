(load "ai/gemini.scm")
(load "ai/openai.scm")
(load "ai/claud.scm")

(define text "Examine Loki as a Jungian archtype")

(define (multi-query text models)
  (let ((tasks (map (lambda (func) (func text)) models)))
       (map (lambda (task) (task)) tasks)))

;; (define replies (multi-query text '(task-gemini task-claud task-openai)))
