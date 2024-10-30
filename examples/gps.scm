;;; General Problem Solver prgram from 
;;; [Paradigms of Artificial Intelligence Programming](https://en.wikipedia.org/wiki/Paradigms_of_AI_Programming)

;; this version of (when test expressions) returns #f when not test or value of last expression
(define-rewriter when
   (lambda (expr)
      (list 'if (cadr expr) (append (list 'begin) (cddr expr)) #f)))

(define (member? m l)
  (cond ((null? l) #f)     
        ((equal? m (car l)) l)
        (else (member? m (cdr l)))))

(define (every f l) 
   (cond ((null? l) #t)
         ((f (car l)) (every f (cdr l)))
         (else #f)))

(define (some f l)
   (cond ((null? l) #f)
         ((f (car l)) #t)  
         (else (some f (cdr l)))))

(define (set-difference l l2) 
   (define (diff l l2 d)
      (cond ((null? l) d)
            ((member? (car l) l2) (diff (cdr l) l2 d))
            (else (diff (cdr l) l2 (cons (car l) d)))))
   (diff l l2 '()))

(define (union l l2)
 (append l (set-difference l2 l)))

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

(define state '())
(define ops '())

(define (make-op action preconds add-list del-list) (list action preconds add-list del-list))
(define (op-action op) (list-ref 0 op))
(define (op-preconds op) (list-ref 1 op))
(define (op-add-list op) (list-ref 2 op))
(define (op-del-list op) (list-ref 3 op))

(define (GPS goals) 
  (define (achieve goal)
    (define (appropriate? op) 
      (member? goal (op-add-list op)))
    (define (apply-op op)
      (when (every achieve (op-preconds op))
        (display (concat "executing " (op-action op)))
        (set! state (set-difference state (op-del-list op)))
        (set! state (union state (op-add-list op)))
        #t))
    (or (member? goal state) (some apply-op (find-all appropriate? ops))))
  (if (every achieve goals) 'success))

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

(set! state '(son-at-home car-needs-battery have-money have-phone-book))
(set! ops school-ops)

(define first-go (GPS '(son-at-school)))
(display (concat "first solve was a " first-go))

(set! state '(son-at-home car-needs-battery have-money))
(set! ops school-ops)

(define second-go (GPS '(son-at-school)))
(display (concat "second solve was a " (if second-go second-go "fail")))

(set! state '(son-at-home car-works))
(set! ops school-ops)

(define third-go (GPS '(son-at-school)))
(display (concat "third solve was a " third-go))

