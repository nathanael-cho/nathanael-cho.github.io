;; water.wat — a height-field water surface solver, hand-written in
;; WebAssembly text format.
;;
;; The lake surface is a grid of "columns" of water. Each cell stores a
;; height (its displacement from rest) and a vertical velocity. Every frame
;; we integrate the 2D wave equation over the grid:
;;
;;     a  =  c^2 * laplacian(h)            (acceleration from surface tension)
;;     v +=  a                             (velocity update)
;;     v *=  damping                       (energy loss, so ripples fade)
;;     h +=  v                             (position update)
;;
;; where laplacian(h) at a cell is the sum of its four neighbours minus four
;; times itself. Near the edges of the grid an absorbing "sponge" band applies
;; extra damping, so ripples fade out at the boundary instead of reflecting.
;;
;; Memory layout (one flat linear memory, all f32 unless noted):
;;   [0 .. 1024)              scratch / reserved
;;   [HEIGHTS .. HEIGHTS+n*4) height buffer   (n = W*H cells)
;;   [VELS    .. VELS   +n*4) velocity buffer
;;
;; JS reads the height buffer directly out of this memory to draw the water.

(module
  ;; 128 pages * 64 KiB = 8 MiB. Enough for grids up to ~1000x1000 cells,
  ;; far more than we need for a lake surface.
  (memory (export "memory") 128)

  (global $W        (mut i32) (i32.const 0))
  (global $H        (mut i32) (i32.const 0))
  (global $HEIGHTS  (mut i32) (i32.const 1024))
  (global $VELS     (mut i32) (i32.const 0))
  (global $DAMP     (mut f32) (f32.const 0.985))
  (global $C2       (mut f32) (f32.const 0.24))   ;; wave speed squared * dt^2
  (global $BAND     (mut i32) (i32.const 16))     ;; sponge width, in cells, from each edge

  ;; init(w, h): record grid dimensions, place the velocity buffer right
  ;; after the height buffer, and zero both.
  (func (export "init") (param $w i32) (param $h i32)
    (local $n i32)
    (local $i i32)
    (local $bytes i32)
    (global.set $W (local.get $w))
    (global.set $H (local.get $h))
    (local.set $n (i32.mul (local.get $w) (local.get $h)))
    (global.set $VELS
      (i32.add (global.get $HEIGHTS) (i32.mul (local.get $n) (i32.const 4))))
    ;; zero heights + velocities = 2*n floats
    (local.set $bytes (i32.mul (local.get $n) (i32.const 8)))
    (local.set $i (i32.const 0))
    (block $done
      (loop $z
        (br_if $done (i32.ge_u (local.get $i) (local.get $bytes)))
        (f32.store (i32.add (global.get $HEIGHTS) (local.get $i)) (f32.const 0))
        (local.set $i (i32.add (local.get $i) (i32.const 4)))
        (br $z)))
  )

  ;; setParams(damping, c2): tune how quickly ripples fade and how fast
  ;; waves propagate. Called from JS to expose sliders.
  (func (export "setParams") (param $damp f32) (param $c2 f32)
    (global.set $DAMP (local.get $damp))
    (global.set $C2 (local.get $c2)))

  ;; setBand(cells): width of the absorbing sponge measured in from each edge.
  ;; JS sets this to the off-screen margin so the fade happens outside the view.
  (func (export "setBand") (param $cells i32)
    (global.set $BAND (local.get $cells)))

  ;; heightsPtr(): byte offset of the height buffer so JS can build an
  ;; Float32Array view over it.
  (func (export "heightsPtr") (result i32) (global.get $HEIGHTS))

  ;; perturb(cx, cy, radius, strength): push a circular patch of the surface.
  ;; A raindrop or a mouse drag calls this. Falloff is parabolic so the
  ;; centre gets the full impulse and it tapers to zero at the radius.
  (func (export "perturb")
        (param $cx i32) (param $cy i32) (param $radius i32) (param $strength f32)
    (local $x i32) (local $y i32)
    (local $x0 i32) (local $x1 i32) (local $y0 i32) (local $y1 i32)
    (local $dx i32) (local $dy i32) (local $d2 i32) (local $r2 i32)
    (local $idx i32) (local $addr i32)
    (local $fall f32) (local $w i32) (local $h i32)
    (local.set $w (global.get $W))
    (local.set $h (global.get $H))
    (local.set $r2 (i32.mul (local.get $radius) (local.get $radius)))

    ;; clamp bounding box to [1, dim-2] so we never touch the pinned border
    (local.set $x0 (i32.sub (local.get $cx) (local.get $radius)))
    (local.set $x1 (i32.add (local.get $cx) (local.get $radius)))
    (local.set $y0 (i32.sub (local.get $cy) (local.get $radius)))
    (local.set $y1 (i32.add (local.get $cy) (local.get $radius)))
    (if (i32.lt_s (local.get $x0) (i32.const 1)) (then (local.set $x0 (i32.const 1))))
    (if (i32.lt_s (local.get $y0) (i32.const 1)) (then (local.set $y0 (i32.const 1))))
    (if (i32.gt_s (local.get $x1) (i32.sub (local.get $w) (i32.const 2)))
      (then (local.set $x1 (i32.sub (local.get $w) (i32.const 2)))))
    (if (i32.gt_s (local.get $y1) (i32.sub (local.get $h) (i32.const 2)))
      (then (local.set $y1 (i32.sub (local.get $h) (i32.const 2)))))

    (local.set $y (local.get $y0))
    (block $yend
      (loop $yloop
        (br_if $yend (i32.gt_s (local.get $y) (local.get $y1)))
        (local.set $dy (i32.sub (local.get $y) (local.get $cy)))
        (local.set $x (local.get $x0))
        (block $xend
          (loop $xloop
            (br_if $xend (i32.gt_s (local.get $x) (local.get $x1)))
            (local.set $dx (i32.sub (local.get $x) (local.get $cx)))
            (local.set $d2
              (i32.add (i32.mul (local.get $dx) (local.get $dx))
                       (i32.mul (local.get $dy) (local.get $dy))))
            (if (i32.le_s (local.get $d2) (local.get $r2))
              (then
                ;; fall = 1 - d2/r2   (parabolic bump)
                (local.set $fall
                  (f32.sub (f32.const 1)
                    (f32.div (f32.convert_i32_s (local.get $d2))
                             (f32.convert_i32_s (local.get $r2)))))
                (local.set $idx
                  (i32.add (i32.mul (local.get $y) (local.get $w)) (local.get $x)))
                (local.set $addr
                  (i32.add (global.get $VELS) (i32.mul (local.get $idx) (i32.const 4))))
                ;; add impulse to velocity so the patch starts moving
                (f32.store (local.get $addr)
                  (f32.add (f32.load (local.get $addr))
                           (f32.mul (local.get $strength) (local.get $fall))))))
            (local.set $x (i32.add (local.get $x) (i32.const 1)))
            (br $xloop)))
        (local.set $y (i32.add (local.get $y) (i32.const 1)))
        (br $yloop)))
  )

  ;; step(): advance the whole surface by one timestep. Two passes over the
  ;; interior: first update velocities from the laplacian of the heights,
  ;; then integrate heights from the new velocities. Splitting the passes
  ;; keeps the stencil reading consistent (undisturbed) height values.
  (func (export "step")
    (local $x i32) (local $y i32)
    (local $w i32) (local $h i32)
    (local $idx i32) (local $hAddr i32) (local $vAddr i32)
    (local $center f32) (local $lap f32) (local $v f32)
    (local $hbase i32) (local $vbase i32) (local $rowmax i32) (local $colmax i32)
    (local $M i32) (local $md i32) (local $edge i32) (local $t f32) (local $sp f32)
    (local.set $w (global.get $W))
    (local.set $h (global.get $H))
    (local.set $hbase (global.get $HEIGHTS))
    (local.set $vbase (global.get $VELS))
    (local.set $rowmax (i32.sub (local.get $h) (i32.const 1)))
    (local.set $colmax (i32.sub (local.get $w) (i32.const 1)))
    ;; Absorbing "sponge" band: cells within M of any edge get extra damping so
    ;; ripples fade out at the boundary instead of reflecting. JS sizes this to
    ;; the off-screen margin, so the fade never shows inside the visible lake.
    (local.set $M (global.get $BAND))
    (if (i32.lt_s (local.get $M) (i32.const 1)) (then (local.set $M (i32.const 1))))

    ;; ---- pass 1: velocity += c2 * laplacian(h),  then  velocity *= damping
    (local.set $y (i32.const 1))
    (block $y1end
      (loop $y1
        (br_if $y1end (i32.ge_s (local.get $y) (local.get $rowmax)))
        (local.set $x (i32.const 1))
        (block $x1end
          (loop $x1
            (br_if $x1end (i32.ge_s (local.get $x) (local.get $colmax)))
            (local.set $idx
              (i32.add (i32.mul (local.get $y) (local.get $w)) (local.get $x)))
            (local.set $hAddr
              (i32.add (local.get $hbase) (i32.mul (local.get $idx) (i32.const 4))))
            (local.set $center (f32.load (local.get $hAddr)))
            ;; laplacian = left + right + up + down - 4*center
            (local.set $lap
              (f32.sub
                (f32.add
                  (f32.add
                    (f32.load (i32.sub (local.get $hAddr) (i32.const 4)))       ;; left
                    (f32.load (i32.add (local.get $hAddr) (i32.const 4))))      ;; right
                  (f32.add
                    (f32.load (i32.sub (local.get $hAddr)
                              (i32.mul (local.get $w) (i32.const 4))))          ;; up
                    (f32.load (i32.add (local.get $hAddr)
                              (i32.mul (local.get $w) (i32.const 4))))))        ;; down
                (f32.mul (local.get $center) (f32.const 4))))
            (local.set $vAddr
              (i32.add (local.get $vbase) (i32.mul (local.get $idx) (i32.const 4))))
            (local.set $v (f32.load (local.get $vAddr)))
            (local.set $v
              (f32.mul
                (f32.add (local.get $v) (f32.mul (global.get $C2) (local.get $lap)))
                (global.get $DAMP)))
            ;; --- sponge absorption: distance to the nearest edge ---
            (local.set $md (local.get $x))
            (if (i32.lt_s (local.get $y) (local.get $md))
              (then (local.set $md (local.get $y))))
            (local.set $edge (i32.sub (local.get $colmax) (local.get $x)))
            (if (i32.lt_s (local.get $edge) (local.get $md))
              (then (local.set $md (local.get $edge))))
            (local.set $edge (i32.sub (local.get $rowmax) (local.get $y)))
            (if (i32.lt_s (local.get $edge) (local.get $md))
              (then (local.set $md (local.get $edge))))
            ;; within the band, scale velocity by sp = 1 - (1 - t)^2 * 0.6,
            ;; where t = md/M ramps 0 (at the edge) to 1 (band interior).
            (if (i32.lt_s (local.get $md) (local.get $M))
              (then
                (local.set $t
                  (f32.div (f32.convert_i32_s (local.get $md))
                           (f32.convert_i32_s (local.get $M))))
                (local.set $sp
                  (f32.sub (f32.const 1)
                    (f32.mul
                      (f32.mul (f32.sub (f32.const 1) (local.get $t))
                               (f32.sub (f32.const 1) (local.get $t)))
                      (f32.const 0.6))))
                (local.set $v (f32.mul (local.get $v) (local.get $sp)))))
            (f32.store (local.get $vAddr) (local.get $v))
            (local.set $x (i32.add (local.get $x) (i32.const 1)))
            (br $x1)))
        (local.set $y (i32.add (local.get $y) (i32.const 1)))
        (br $y1)))

    ;; ---- pass 2: height += velocity
    (local.set $y (i32.const 1))
    (block $y2end
      (loop $y2
        (br_if $y2end (i32.ge_s (local.get $y) (local.get $rowmax)))
        (local.set $x (i32.const 1))
        (block $x2end
          (loop $x2
            (br_if $x2end (i32.ge_s (local.get $x) (local.get $colmax)))
            (local.set $idx
              (i32.add (i32.mul (local.get $y) (local.get $w)) (local.get $x)))
            (local.set $hAddr
              (i32.add (local.get $hbase) (i32.mul (local.get $idx) (i32.const 4))))
            (local.set $vAddr
              (i32.add (local.get $vbase) (i32.mul (local.get $idx) (i32.const 4))))
            (f32.store (local.get $hAddr)
              (f32.add (f32.load (local.get $hAddr)) (f32.load (local.get $vAddr))))
            (local.set $x (i32.add (local.get $x) (i32.const 1)))
            (br $x2)))
        (local.set $y (i32.add (local.get $y) (i32.const 1)))
        (br $y2)))
  )
)
