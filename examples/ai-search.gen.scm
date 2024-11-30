;;; https://github.com/aimacode/aima-lisp/blob/master/search/algorithms/simple.lisp 
;;; initial translation to Scheme by Google AI Gemini 1.5 Pro

;;; defines for search

(define (merge l m comparison)
  (if (null? l) m
    (if (null? m) l
      (if (comparison (car l) (car m))
        (cons (car l) (merge (cdr l) m comparison))
        (cons (car m) (merge (cdr m) l comparison))))))

(define (split l)
  (define (sp l left right odd?)
    (if (null? l)
      (cons left (cons right '()))
      (if odd?
         (sp (cdr l) (cons (car l) left) right #f)
         (sp (cdr l) left (cons (car l) right) #t))))
  (sp l '() '() #t))

(define (sort l comparison)
  (if (null? l) l
    (if (null? (cdr l)) l
      (merge (sort (car  (split l)) comparison)
             (sort (cadr (split l)) comparison) comparison))))
(sort '(1 3 2 0) <)

;; Queue functions (example implementations - adapt as needed)

(define (make-empty-queue) '())

(define (empty-queue? q) (null? q))

(define (remove-front q) (car q))

(define (enqueue-at-end q items) (append q items))

(define (enqueue-at-front q items) (append items q))

(define (enqueue-by-priority q items eval-fn)
  ;; (display 'enqueue-by-priority)
  ;; (display items)
  (sort (append q items) (lambda (n1 n2) (< (eval-fn n1) (eval-fn n2)))))

;;; Simple searches 

(define (general-search problem queuing-fn)
  (let ((nodes (make-initial-queue problem queuing-fn)))
    (let loop ()
      (if (empty-queue? nodes)
          #f
          (let ((node (remove-front nodes)))
            (if (goal-test problem (node-state node))
                node
                (begin
                  (set! nodes (queuing-fn nodes (expand node problem)))
                  (loop))))))))

(define (breadth-first-search problem)
  "Search the shallowest nodes in the search tree first."
  (general-search problem enqueue-at-end))

(define (depth-first-search problem)
  "Search the deepest nodes in the search tree first."
  (general-search problem enqueue-at-front))

(define (iterative-deepening-search problem)
  "Do a series of depth-limited searches, increasing depth each time."
  (let loop ((depth 0))
    (let ((solution (depth-limited-search problem depth)))
      (if (not (eq? solution 'cut-off))
          solution
          (loop (+ depth 1))))))

(define (depth-limited-search problem limit node)
  "Search depth-first, but only up to LIMIT branches deep in the tree."
  (cond ((goal-test problem (node-state node)) node)
        ((>= (node-depth node) limit) 'cut-off)
        (else
         (let loop ((children (expand node problem)))
           (cond ((null? children) #f)
                 (else
                  (let ((solution (depth-limited-search problem limit (car children))))
                    (if solution
                        solution
                        (loop (cdr children))))))))))


(define (depth-limited-search problem limit)
  (depth-limited-search problem limit (create-start-node problem)))

(define (best-first-search problem eval-fn)
  "Search the nodes with the best evaluation first."
  (general-search problem (lambda (old-q nodes) (enqueue-by-priority old-q nodes eval-fn))))

(define (greedy-search problem)
  "Best-first search using H (heuristic distance to goal)."
  (best-first-search problem node-h-cost))

(define (tree-a*-search problem)
  "Best-first search using estimated total cost, or (F = G + H)."
  (best-first-search problem node-f-cost))

(define (uniform-cost-search problem)
  "Best-first search using the node's depth as its cost."
  (best-first-search problem node-depth))

(define (make-initial-queue problem queuing-fn)
  (let ((q (make-empty-queue)))
    (display "make-initial-queue")
    (queuing-fn q (list (create-start-node problem)))))

;;  You'll need to define these functions based on your problem representation:

;; goal-test:  Takes a problem and a state, returns #t if the state is a goal state.
;; node-state: Takes a node and returns its state.
;; expand:     Takes a node and a problem, returns a list of successor nodes.
;; node-depth: Takes a node and returns its depth.
;; node-h-cost: Takes a node and returns its heuristic cost.
;; node-f-cost: Takes a node and returns its estimated total cost (g + h).
;; create-start-node: Takes a problem and returns the initial node.

;; Trivial problem: find item in ordered list of integers

(define (goal-test problem state) 
  (display 'goal?)
  (display state)
  (if (equal? (car state) 5) #t #f)
)

(define (node-state node) 
  ;; (display 'node-state)
  (define state node)
  state
)

(define (expand node problem)
  (display 'expand)
  (define next (list (+ (car node) 1)))
  (display next)
  (list next)
)

(define (node-depth node)
  (define 'node-depth)
  (define depth node)
  (display depth)
  depth
)

(define (node-h-cost node) 
  (display 'node-h-cost)
  (define cost (car node))
  (display cost)
  cost
)

(define (node-f-cost node)
  ;; (display 'node-f-cost)
  ;; (display node)
  (let ((g (- 5 (car node)))
        (h (- 5 (car node))))
     (+ g h)))

(define (create-start-node problem)
   ;; (display 'initial-node)
   (define initial-node (car problem))
   ;; (display initial-node)
   initial-node
)

;;; test

(define problem '((1) (2) (3) (4) (5)))

(display 'search)
(define test (tree-a*-search problem))
(display 'searched)
(display test)

