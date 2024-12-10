(load "ai/gemini.scm")
(load "ai/openai.scm")
(load "ai/claud.scm")


(define models '(task-gemini task-claud task-openai))

(define (multi-query text models)
  (let ((tasks (map (lambda (func) (func text)) models)))
       (map (lambda (task) (task)) tasks)))

(define (multi-way text) (multi-query text models))

(define (second l) (car (cdr l)))
(define (third l) (car (cdr (cdr l))))
(define (clean s) (string-replace s "\n" "\\n"))
(define (safe s) (if (null? s) "" s))

(define (format-comparison actor1 opinion1 actor2 opinion2)
  (concat "The following are two assertions by " actor1 " and " actor2 ".\n" actor1 " says:\n" opinion1 "\n\nBut " actor2 " says:\n" opinion2))

(define compare-instructions "\n\nSay YES if the above opinions logically agree and NO if they do not agree.")

(define gate1 #t)
(define gate2 #t)
(define gate3 #t)
(define consensus #t)

(define (comparable opinion1 opinion2) (not (or (null? opinion1) (equal? "" opinion1) (null? opinion2) (equal? "" opinion2))))

(define (compare replies one-shot)
 (letrec ((opinion1 (first replies))
          (opinion2 (second replies))
          (opinion3 (third replies))
          (comparison1 (clean (concat (format-comparison "Alice" opinion1 "Bob" opinion2) compare-instructions)))
          (comparison2 (clean (concat (format-comparison "Alice" opinion1 "Eve" opinion3) compare-instructions)))
          (comparison3 (clean (concat (format-comparison "Bob" opinion2 "Eve" opinion3) compare-instructions)))
          (pass (lambda (opinion) (> (index-of "YES" (safe opinion)) -1))))
      (if (and gate1 (comparable opinion1 opinion2) (pass (one-shot comparison1))) 
        (if (and consensus (comparable opinion2 opinion3) (pass (one-shot comparison3)))
          (concat "PASS all\n" opinion1)
          (concat "PASS first second\n" opinion1))
        (if (and gate2 (comparable opinion1 opinion3) (pass (one-shot comparison2)))
          (concat "PASS first third\n" opinion1)
          (if (and gate3 (comparable opinion2 opinion3) (pass (one-shot comparison3)))
            (concat "PASS second third\n" opinion2) 
            "FAIL on no 2 agree")))))

;; Query and compare example:
;; (define text "4% of 1000 compounded for 5 years")
;; (define replies (multi-way text))
;; (map display replies)
;; (compare replies one-shot-gemini) ;; result starts with "PASS" if any 2 are found to agree

