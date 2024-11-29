(define (json-get prop json)
  (cond ((null? json) '())
        ((equal? prop (caar json)) (car (cdar json)))
        (else (json-get prop (cdr json)))))

(define (json-find prop json) 
  (letrec 
    ((result '())
     (define (find prop json) 
       (define (check-prop pair)
         (cond ((null? pair) #f)
               ((not (list? pair)) #f)
               ((equal? (car pair) prop) (set! result (cadr pair)))
               ((list? (car pair)) (find prop (car pair)))
               (else #f)))
       (define (check-value pair) 
         (cond ((null? pair) #f)
               ((not (list? pair)) #f)
               (else (if (list? (cdr pair)) (find prop (cdr pair)) #f))))
       (cond 
         ((null? json) #f)
         ((check-prop json) #t)
         ((check-prop (car json)) #t)
         ((check-value (car json)) #t)
         (else (find prop (cdr json))))))

    (find prop json)
    result))

