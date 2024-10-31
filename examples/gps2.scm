;;; Version 2 of General Problem Solver prgram from 
;;; [Paradigms of Artificial Intelligence Programming](https://en.wikipedia.org/wiki/Paradigms_of_AI_Programming)
;;; Scheme treats booleans and empty lists (nil) differently than lisp so some extra checks are needed.

(define (remove-if f l)
  (if (null? l) '()
    (let ((v (car l)) (r (cdr l)))
       (cond ((f v) (remove-if f r))
             (else (cons v (remove-if f r )))))))

(define (safe-remove-if f l)
  (if (or (equal? l #t) (equal? l #f)) '() (remove-if f l)))

(define (member? m l)
  (cond ((null? l) #f)     
        ((equal? m (car l)) l)
        (else (member? m (cdr l)))))

(define (safe-member? m l) (if (or (equal? l #t) (equal? l #f)) #f (member? m l)))

(define (every f l) 
   (cond ((null? l) #t)
         ((f (car l)) (every f (cdr l)))
         (else #f)))

(define (safe-every f l) (if (or (equal? l #t) (equal? l #f)) #f (every f l)))

(define (safe-some f l)
   (if (null? l) #f (let ((v (f (car l)))) (if (or (null? v) (equal? v #f)) (safe-some f (cdr l)) v))))

(define (subset l ll) 
  (cond ((null? l) #t)
        ((member? (car l) ll) (subset (cdr l) ll))
        (else #f)))

(define (safe-subset l ll) 
  (if (or (equal? l #f) (equal? ll #f) (equal? l #t) (equal? ll #t)) #f (subset l ll)))

(define (find-all f l)
   (define (find-all2 f l r)
     (cond ((null? l) r) 
           ((f (car l)) (find-all2 f (cdr l) (cons (car l) r)))
           (else (find-all2 f (cdr l) r))))
   (find-all2 f l '()))

(define (list-ref pos l) 
  (cond ((< pos 0) (error "list-ref index < 0"))
        ((null? l) (error "list-ref list too short"))
        ((equal? pos 0) (car l))
        (else (list-ref (- pos 1) (cdr l)))))

(define ops '())
(define state '())

(define (make-op action preconds add-list del-list) (list action preconds (cons (list 'executing action) add-list) del-list))
(define (op-action op) (list-ref 0 op))
(define (op-preconds op) (list-ref 1 op))
(define (op-add-list op) (list-ref 2 op))
(define (op-del-list op) (list-ref 3 op))

(define school-ops (list
(make-op 'drive-son-to-school
  '(son-at-home car-works)
  '(son-at-school)
  '(son-at-home))
(make-op 'shop-installs-battery
  '(car-needs-battery shop-knows-problem shop-has-money)
  '(car-works) 
  '())
(make-op 'tell-shop-problem
  '(in-communication-with-shop)
  '(shop-knows-problem) 
  '())
(make-op 'telephone-shop
  '(know-phone-number)
  '(in-communication-with-shop) 
  '())
(make-op 'look-up-number
  '(have-phone-book)
  '(know-phone-number) 
  '())
(make-op 'give-shop-money
  '(have-money)
  '(shop-has-money)
  '(have-money))))

(define (GPS state goals) (safe-remove-if symbol? (achieve-all (cons '(start) state) goals '())))

(define (achieve-all state goals goal-stack)
  (let ((current-state state))
    (if (and (every (lambda (g) (set! current-state (achieve current-state g goal-stack)) current-state) goals)
             (safe-subset goals current-state)) current-state)))
    
(define (achieve state goal goal-stack)
  (display (concat "goal " goal))
  (define (appropriate? op) (safe-member? goal (op-add-list op)))
  (cond ((safe-member? goal state) state)
        ((safe-member? goal goal-stack) #f)
        (else (safe-some (lambda (op) (apply-op state goal op goal-stack)) (find-all appropriate? ops)))))

(define (apply-op state goal op goal-stack) 
   (display (concat "consider " (op-action op)))
   (let ((state2 (achieve-all state (op-preconds op) (cons goal goal-stack)))) 
     (if (or (equal? state2 #f) (null? state2))
       #f
       (begin (display (concat "action " (op-action op)))
         (append (safe-remove-if (lambda (x) (safe-member? x (op-del-list op))) state2) (op-add-list op))))))

(display "\nfirst solve\n")
(set! state '(son-at-home))
(set! ops school-ops)

(define go1 (GPS state '(son-at-school)))

(display "\nsecond solve\n")
(set! state '(son-at-home car-needs-battery have-money have-phone-book))
(set! ops school-ops)

(define go2 (GPS state '(son-at-school)))

(display "\nsolve 3\n")
(set! state '(son-at-home car-needs-battery have-money))
(set! ops school-ops)

(define go3 (GPS state '(son-at-school)))

(display "\nsolve 4\n")
(set! state '(son-at-home car-works))
(set! ops school-ops)

(define go4 (GPS state '(son-at-school)))

;;; The clobbered sibling problem

(display "\nclobbered sibling solve\n")
(set! state '(son-at-home car-needs-battery have-money have-phone-book))
(set! ops school-ops)

(define go5 (GPS state '(have-money son-at-school)))

(display "\nsolve 6\n")
(set! state '(son-at-home car-needs-battery have-money have-phone-book))
(set! ops school-ops)

(define go6 (GPS state '(son-at-school have-money)))

(display "\nsolve 7\n")
(set! state '(son-at-home car-needs-battery have-money))
(set! ops school-ops)

(define go7 (GPS state '(son-at-school)))

(display "\nsolve 8\n")
(set! state '(son-at-school))
(set! ops school-ops)

(define go8 (GPS state '(son-at-school)))
