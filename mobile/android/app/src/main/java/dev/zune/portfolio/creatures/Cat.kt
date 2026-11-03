package dev.zune.portfolio.creatures

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

// Port of src/components/lab/Cat (Cat.jsx + Cat.css): a cat running upside-down. On the web it is divs with
// border-radius, borders and CSS keyframes (0.45 s loop); here the same shapes are drawn on a canvas, with the
// same coordinates, radii and keyframes.

private val GREY = Color(0xFF616161)
private const val CYCLE = 0.45

/** the cat in "cat box" coordinates (188 × 260), (0, 0) = top-left of the box */
private fun drawCat(g: Ctx2D, t: Double) {
    val p = (t % CYCLE) / CYCLE
    val a = tri(p)
    val black = Color.Black

    // ---- ground shadow (::before), delayed by half a cycle
    run {
        val ps = if (t > CYCLE / 2) ((t - CYCLE / 2) % CYCLE) / CYCLE else 0.0
        val w = 130 - 20 * tri(ps)
        val x = 94 - 50 + 10 * tri(ps)
        g.fillColor(GREY); g.globalAlpha = 0.4f
        cssOval(g, x, 240.0, w, 30.0); g.fill()
        g.globalAlpha = 1f
    }

    // ---- paws (they step in turn)
    val pawL = keyframes(p, 0.0 to 88.0, 0.5 to 130.0, 1.0 to 88.0) to keyframes(p, 0.0 to 176.0, 0.5 to 176.0, 0.7 to 160.0, 1.0 to 176.0)
    val pawR = keyframes(p, 0.0 to 130.0, 0.5 to 88.0, 1.0 to 130.0) to keyframes(p, 0.0 to 176.0, 0.25 to 160.0, 0.5 to 176.0, 1.0 to 176.0)
    for ((x, y) in listOf(pawL, pawR)) {
        rotated(g, x + 10, y + 40, 10.0) {
            g.fillColor(black)
            cssBox(g, x, y, 20.0, 80.0, 20.0, 0.0, 0.0, 80.0, 40.0); g.fill()
            // the toes
            rotated(g, x + 6, y + 72, 24.0) { cssOval(g, x - 4, y + 59, 20.0, 26.0); g.fill() }
        }
    }

    // ---- everything that bobs (.shake)
    g.save()
    g.translate(0.0, 6 * a)

    // tail: only its top and left borders are painted; drawn as the middle line of that border, 20 px wide
    rotated(g, 112.0, 75.0, 45 - 7 * a) {
        val bx = 32.0; val by = 0.0; val bw = 160.0; val bh = 150.0; val border = 20.0
        // CSS shrinks the radii (120 / 106 120 0 120) until they fit the 160 × 150 box
        val f = minOf(1.0, bw / 240, bh / (106 + 120), bh / 120)
        val rx = max(0.0, 120 * f - border / 2)
        val rTL = max(0.0, 106 * f - border / 2)
        val rTR = max(0.0, 120 * f - border / 2)
        val rBL = max(0.0, 120 * f - border / 2)
        val x0 = bx + border / 2; val y0 = by + border / 2; val x1 = bx + bw - border / 2; val y1 = by + bh - border / 2
        val cTRx = x1 - rx; val cTRy = y0 + rTR
        val cTLx = x0 + rx; val cTLy = y0 + rTL
        val cBLx = x0 + rx; val cBLy = y1 - rBL
        // where the colour changes from top border to right border: the diagonal through the box corner (x + y = const)
        fun solve(cx: Double, cy: Double, ry: Double, target: Double, lo0: Double, hi0: Double): Double {
            var lo = lo0; var hi = hi0
            fun v(th: Double) = cx + rx * cos(th) + cy + ry * sin(th) - target
            repeat(40) {
                val mid = (lo + hi) / 2
                if ((v(mid) > 0) == (v(lo) > 0)) lo = mid else hi = mid
            }
            return (lo + hi) / 2
        }
        val thTR = solve(cTRx, cTRy, rTR, bx + bw + by, -PI / 2, 0.0)
        val thBL = solve(cBLx, cBLy, rBL, bx + by + bh, PI / 2, PI)
        g.strokeColor(black); g.lineWidth = border.toFloat(); g.lineCap = StrokeCap.Butt
        g.beginPath()
        g.ellipse(cTRx, cTRy, rx, rTR, 0.0, thTR, -PI / 2, ccw = true)
        g.ellipse(cTLx, cTLy, rx, rTL, 0.0, -PI / 2, -PI, ccw = true)
        g.ellipse(cBLx, cBLy, rx, rBL, 0.0, PI, thBL, ccw = true)
        g.stroke()
        // tail tip (:after): a 20 px dot with a trail of box-shadow dots
        g.fillColor(black)
        for ((dx, dy) in listOf(0.0 to 0.0, 2.0 to 4.0, 2.0 to 7.0, 2.0 to 10.0, 1.0 to 14.0, -1.0 to 18.0, -5.0 to 22.0, -10.0 to 25.0, -15.0 to 28.0, -20.0 to 30.0)) {
            cssOval(g, 52 + dx, 110 + dy, 20.0, 20.0); g.fill()
        }
    }

    // ---- .main (head, body, leg, face), box at (44, 14)
    g.fillColor(black)
    rotated(g, 116.0, 150.0, 40.0) { cssBox(g, 64.0, 60.0, 104.0, 180.0, 55.0, 100.0, 100.0, 65.0, 65.0); g.fill() } // head
    cssBox(g, 58.0, 14.0, 130.0, 180.0, 65.0, 70.0, 70.0, 100.0, 100.0); g.fill()                                    // body
    cssBox(g, 148.0, 34.0, 50.0, 116.0, 25.0, 0.0, 60.0, 50.0, 0.0); g.fill()                                        // leg
    g.strokeColor(GREY); g.lineWidth = 3f; g.lineCap = StrokeCap.Butt
    rotated(g, 188.0, 134.0, 6.0) {                                                                                 // leg:before (left border of an oval)
        g.beginPath(); g.ellipse(188.0, 134.0, 8.5, 18.5, 0.0, 3 * PI / 4, 5 * PI / 4); g.stroke()
    }
    rotated(g, 189.0, 80.0, 65.0) {                                                                                 // leg:after (bottom border of an oval)
        g.beginPath(); g.ellipse(189.0, 80.0, 36.5, 33.5, 0.0, PI / 4, 3 * PI / 4); g.stroke()
    }

    // ---- face, box at (44, 150), 76 × 80
    g.save()
    g.translate(44.0, 150.0)
    // whiskers: two groups, the right one mirrored; each line pivots on its right end
    for ((cx, mirrored) in listOf(10.0 to false, 66.0 to true)) {
        g.save()
        g.translate(cx, 70.0)
        if (mirrored) g.scale(-1.0, 1.0)
        g.rotate(-10 * a * PI / 180)
        g.translate(-cx, -70.0)
        val left = cx - 10
        g.fillColor(GREY)
        for ((top, deg) in listOf(0.0 to -10.0, 6.0 to -20.0)) {
            rotated(g, left + 20, 65 + top + 1, deg) { g.beginPath(); g.rect(left, 65 + top, 20.0, 2.0); g.fill() }
        }
        g.restore()
    }
    g.fillColor(Color(0xFF9C1B4D)); cssBox(g, 28.0, 63.0, 18.0, 9.0, 20.0, 10.0, 10.0, 20.0, 20.0); g.fill() // nose
    // eyes: white, 3 px black ring, pupil sliding up and down
    for ((ex, ey) in listOf(-8.0 to 28.0, 36.0 to 26.0)) {
        g.fillColor(Color.White); cssOval(g, ex, ey, 30.0, 30.0); g.fill()
        g.strokeColor(black); g.lineWidth = 3f
        g.beginPath(); g.arc(ex + 15, ey + 15, 13.5, 0.0, 2 * PI); g.stroke()
        g.fillColor(black); cssOval(g, ex + 16, ey + 3 + (4 - 2 * a), 10.0, 10.0); g.fill()
    }
    // brows: two thin lines each, the right group mirrored
    g.fillColor(GREY)
    for ((bx, mirrored) in listOf(10.0 to false, 38.0 to true)) {
        g.save()
        if (mirrored) { g.translate(bx + 5, 0.0); g.scale(-1.0, 1.0); g.translate(-(bx + 5), 0.0) }
        rotated(g, bx + 2, 14.0 + 2, 10.0) { g.beginPath(); g.rect(bx, 14.0 + 2, 2.0, 8.0); g.fill() }
        rotated(g, bx + 8, 14.0, 3.0) { g.beginPath(); g.rect(bx + 6, 14.0, 2.0, 12.0); g.fill() }
        g.restore()
    }
    // left ear (rotates on its bottom centre)
    rotated(g, 10.0, 13.0, -20 - 10 * a) {
        g.fillColor(black); cssBox(g, 0.0, -17.0, 20.0, 30.0, 20.0, 55.0, 55.0, 0.0, 0.0); g.fill()
        g.fillColor(GREY); cssBox(g, 6.0, -12.0, 6.0, 14.0, 7.0, 20.0, 20.0, 0.0, 0.0); g.fill()
    }
    // right ear: an outline of a tall arch, clipped to the ear box
    rotated(g, 58.0, 8.0, 20 + 10 * a) {
        g.save()
        g.beginPath(); g.rect(40.0, -22.0, 36.0, 30.0); g.clip()
        g.strokeColor(GREY); g.lineWidth = 3f
        cssBox(g, 41.5, -20.5, 33.0, 63.0, 16.5, 48.0, 48.0, 0.0, 0.0); g.stroke()
        g.fillColor(GREY); cssOval(g, 52.0, -7.0, 12.0, 26.0); g.fill()
        g.restore()
    }
    g.restore()
    g.restore() // .shake

    // ---- footprints (::after): a row of dots sliding along the ground
    val p2 = (t % (CYCLE / 2)) / (CYCLE / 2)
    g.fillColor(GREY); g.globalAlpha = 0.3f
    for (k in 0 until 7) { cssOval(g, 188 - 30 + 50 * p2 + 50 * k, 250.0, 15.0, 10.0); g.fill() }
    g.globalAlpha = 1f
}

@Composable
fun CatToy() {
    CanvasFrame(Color(0xFFFF9A2E)) { g, w, h, t, _ ->
        g.translate(w / 2 - 99, h / 2 - 130)
        drawCat(g, t)
    }
}
