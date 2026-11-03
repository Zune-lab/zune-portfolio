import SwiftUI

// Port of src/components/lab/Cat (Cat.jsx + Cat.css): a cat running upside-down. On the web it is divs with
// border-radius, borders and CSS keyframes (0.45 s loop); here the same shapes are drawn on a canvas, with the
// same coordinates, radii and keyframes.

private let grey = Color(hex: 0x616161)
private let cycle = 0.45

/// the cat in "cat box" coordinates (188 × 260), (0, 0) = top-left of the box
private func drawCat(_ g: Ctx2D, _ t: Double) {
    let p = t.truncatingRemainder(dividingBy: cycle) / cycle
    let a = tri(p)
    let black = Color.black

    // ---- ground shadow (::before), delayed by half a cycle
    do {
        let ps = t > cycle / 2 ? (t - cycle / 2).truncatingRemainder(dividingBy: cycle) / cycle : 0
        let w = 130 - 20 * tri(ps)
        let x = 94 - 50 + 10 * tri(ps)
        g.fillColor(grey); g.globalAlpha = 0.4
        cssOval(g, x, 240, w, 30); g.fill()
        g.globalAlpha = 1
    }

    // ---- paws (they step in turn)
    let pawL = (keyframes(p, [(0, 88), (0.5, 130), (1, 88)]), keyframes(p, [(0, 176), (0.5, 176), (0.7, 160), (1, 176)]))
    let pawR = (keyframes(p, [(0, 130), (0.5, 88), (1, 130)]), keyframes(p, [(0, 176), (0.25, 160), (0.5, 176), (1, 176)]))
    for (x, y) in [pawL, pawR] {
        rotated(g, x + 10, y + 40, 10) {
            g.fillColor(black)
            cssBox(g, x, y, 20, 80, rx: 20, 0, 0, 80, 40); g.fill()
            // the toes
            rotated(g, x + 6, y + 72, 24) { cssOval(g, x - 4, y + 59, 20, 26); g.fill() }
        }
    }

    // ---- everything that bobs (.shake)
    g.save()
    g.translate(0, 6 * a)

    // tail: only its top and left borders are painted; drawn as the middle line of that border, 20 px wide
    rotated(g, 112, 75, 45 - 7 * a) {
        let bx = 32.0, by = 0.0, bw = 160.0, bh = 150.0, border = 20.0
        // CSS shrinks the radii (120 / 106 120 0 120) until they fit the 160 × 150 box
        let f = min(1, bw / 240, bh / (106 + 120), bh / 120)
        let rx = max(0, 120 * f - border / 2)
        let rTL = max(0, 106 * f - border / 2), rTR = max(0, 120 * f - border / 2), rBL = max(0, 120 * f - border / 2)
        let x0 = bx + border / 2, y0 = by + border / 2, x1 = bx + bw - border / 2, y1 = by + bh - border / 2
        let cTR = (x1 - rx, y0 + rTR), cTL = (x0 + rx, y0 + rTL), cBL = (x0 + rx, y1 - rBL)
        // where the colour changes from top border to right border: the diagonal through the box corner (x + y = const)
        func solve(_ c: (Double, Double), _ ry: Double, _ target: Double, _ lo: Double, _ hi: Double) -> Double {
            var lo = lo, hi = hi
            for _ in 0..<40 {
                let mid = (lo + hi) / 2
                let v = c.0 + rx * cos(mid) + c.1 + ry * sin(mid) - target
                let vlo = c.0 + rx * cos(lo) + c.1 + ry * sin(lo) - target
                if (v > 0) == (vlo > 0) { lo = mid } else { hi = mid }
            }
            return (lo + hi) / 2
        }
        let thTR = solve(cTR, rTR, bx + bw + by, -.pi / 2, 0)
        let thBL = solve(cBL, rBL, bx + by + bh, .pi / 2, .pi)
        g.strokeColor(black); g.lineWidth = border; g.lineCap = .butt
        g.beginPath()
        g.ellipse(cTR.0, cTR.1, rx, rTR, 0, thTR, -.pi / 2, ccw: true)
        g.ellipse(cTL.0, cTL.1, rx, rTL, 0, -.pi / 2, -.pi, ccw: true)
        g.ellipse(cBL.0, cBL.1, rx, rBL, 0, .pi, thBL, ccw: true)
        g.stroke()
        // tail tip (:after): a 20 px dot with a trail of box-shadow dots
        g.fillColor(black)
        for (dx, dy) in [(0.0, 0.0), (2, 4), (2, 7), (2, 10), (1, 14), (-1, 18), (-5, 22), (-10, 25), (-15, 28), (-20, 30)] {
            cssOval(g, 52 + dx, 110 + dy, 20, 20); g.fill()
        }
    }

    // ---- .main (head, body, leg, face), box at (44, 14)
    g.fillColor(black)
    rotated(g, 116, 150, 40) { cssBox(g, 64, 60, 104, 180, rx: 55, 100, 100, 65, 65); g.fill() } // head
    cssBox(g, 58, 14, 130, 180, rx: 65, 70, 70, 100, 100); g.fill()                              // body
    cssBox(g, 148, 34, 50, 116, rx: 25, 0, 60, 50, 0); g.fill()                                  // leg
    g.strokeColor(grey); g.lineWidth = 3; g.lineCap = .butt
    rotated(g, 188, 134, 6) {                                                                    // leg:before (left border of an oval)
        g.beginPath(); g.ellipse(188, 134, 8.5, 18.5, 0, 3 * .pi / 4, 5 * .pi / 4); g.stroke()
    }
    rotated(g, 189, 80, 65) {                                                                    // leg:after (bottom border of an oval)
        g.beginPath(); g.ellipse(189, 80, 36.5, 33.5, 0, .pi / 4, 3 * .pi / 4); g.stroke()
    }

    // ---- face, box at (44, 150), 76 × 80
    g.save()
    g.translate(44, 150)
    // whiskers: two groups, the right one mirrored; each line pivots on its right end
    for (cx, mirrored) in [(10.0, false), (66.0, true)] {
        g.save()
        g.translate(cx, 70)
        if mirrored { g.scale(-1, 1) }
        g.rotate(-10 * a * .pi / 180)
        g.translate(-cx, -70)
        let left = cx - 10
        g.fillColor(grey)
        for (top, deg) in [(0.0, -10.0), (6.0, -20.0)] {
            rotated(g, left + 20, 65 + top + 1, deg) { g.beginPath(); g.rect(left, 65 + top, 20, 2); g.fill() }
        }
        g.restore()
    }
    g.fillColor(Color(hex: 0x9C1B4D)); cssBox(g, 28, 63, 18, 9, rx: 20, 10, 10, 20, 20); g.fill() // nose
    // eyes: white, 3 px black ring, pupil sliding up and down
    for (ex, ey) in [(-8.0, 28.0), (36.0, 26.0)] {
        g.fillColor(.white); cssOval(g, ex, ey, 30, 30); g.fill()
        g.strokeColor(black); g.lineWidth = 3
        g.beginPath(); g.arc(ex + 15, ey + 15, 13.5, 0, 2 * .pi); g.stroke()
        g.fillColor(black); cssOval(g, ex + 16, ey + 3 + (4 - 2 * a), 10, 10); g.fill()
    }
    // brows: two thin lines each, the right group mirrored
    g.fillColor(grey)
    for (bx, mirrored) in [(10.0, false), (38.0, true)] {
        g.save()
        if mirrored { g.translate(bx + 5, 0); g.scale(-1, 1); g.translate(-(bx + 5), 0) }
        rotated(g, bx + 2, 14 + 2, 10) { g.beginPath(); g.rect(bx, 14 + 2, 2, 8); g.fill() }
        rotated(g, bx + 8, 14, 3) { g.beginPath(); g.rect(bx + 6, 14, 2, 12); g.fill() }
        g.restore()
    }
    // left ear (rotates on its bottom centre)
    rotated(g, 10, 13, -20 - 10 * a) {
        g.fillColor(black); cssBox(g, 0, -17, 20, 30, rx: 20, 55, 55, 0, 0); g.fill()
        g.fillColor(grey); cssBox(g, 6, -12, 6, 14, rx: 7, 20, 20, 0, 0); g.fill()
    }
    // right ear: an outline of a tall arch, clipped to the ear box
    rotated(g, 58, 8, 20 + 10 * a) {
        g.save()
        g.beginPath(); g.rect(40, -22, 36, 30); g.clip()
        g.strokeColor(grey); g.lineWidth = 3
        cssBox(g, 41.5, -20.5, 33, 63, rx: 16.5, 48, 48, 0, 0); g.stroke()
        g.fillColor(grey); cssOval(g, 52, -7, 12, 26); g.fill()
        g.restore()
    }
    g.restore()
    g.restore() // .shake

    // ---- footprints (::after): a row of dots sliding along the ground
    let p2 = t.truncatingRemainder(dividingBy: cycle / 2) / (cycle / 2)
    g.fillColor(grey); g.globalAlpha = 0.3
    for k in 0..<7 { cssOval(g, 188 - 30 + 50 * p2 + 50 * Double(k), 250, 15, 10); g.fill() }
    g.globalAlpha = 1
}

struct CatToy: View {
    var body: some View {
        CanvasFrame(background: Color(hex: 0xFF9A2E)) { g, size, t, _ in
            g.translate(size.width / 2 - 99, size.height / 2 - 130)
            drawCat(g, t)
        }
    }
}
