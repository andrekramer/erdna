;; Produced with Google AI Studio:

;; Towers of Hanoi solver in Scheme

(define (towers-of-hanoi n source destination auxiliary)
  (if (= n 1)
      (display (list 'move 'disk 1 'from source 'to destination))
      (begin
        (towers-of-hanoi (- n 1) source auxiliary destination)
        (display (list 'move 'disk n 'from source 'to destination))
        (towers-of-hanoi (- n 1) auxiliary destination source))))

(towers-of-hanoi 3 'A 'C 'B)

