package dev.zune.portfolio.creatures

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.LinearGradientShader
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.PaintingStyle
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.RadialGradientShader
import androidx.compose.ui.graphics.Shader
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin

/**
 * A tiny HTML-canvas-like drawing surface over Compose's `Canvas`, so the lab creatures
 * (written for `canvas.getContext('2d')` on the web) can be ported almost line by line.
 * Units are dp (the stage scales the canvas by the screen density), like CSS px on the web.
 */
class Ctx2D(private val canvas: Canvas) {
    sealed class Style {
        class Solid(val color: Color) : Style()
        class Gradient(val shader: Shader) : Style()
    }
    enum class Align { LEFT, CENTER, RIGHT }

    private class Saved(
        val fill: Style, val stroke: Style, val lineWidth: Float, val cap: StrokeCap, val join: StrokeJoin,
        val alpha: Float, val fontSize: Float, val align: Align,
    )

    private val paint = Paint().apply { isAntiAlias = true }
    private val textPaint = android.graphics.Paint().apply { isAntiAlias = true; typeface = android.graphics.Typeface.MONOSPACE }
    private val stack = ArrayList<Saved>()
    private var path = Path()
    private var hasCurrent = false

    var fillStyle: Style = Style.Solid(Color.Black)
    var strokeStyle: Style = Style.Solid(Color.Black)
    var lineWidth = 1f
    var lineCap = StrokeCap.Butt
    var lineJoin = StrokeJoin.Miter
    var globalAlpha = 1f
    var fontSize = 14f
    var textAlign = Align.LEFT

    // ---- style helpers
    fun fillColor(c: Color) { fillStyle = Style.Solid(c) }
    fun strokeColor(c: Color) { strokeStyle = Style.Solid(c) }

    fun linearGradient(x0: Float, y0: Float, x1: Float, y1: Float, stops: List<Pair<Float, Color>>): Style =
        Style.Gradient(LinearGradientShader(Offset(x0, y0), Offset(x1, y1), stops.map { it.second }, stops.map { it.first }))

    /** same-centre radial gradient (the only kind the creatures use); an inner radius > 0 is kept as a flat first colour */
    fun radialGradient(cx: Float, cy: Float, r0: Float, r1: Float, stops: List<Pair<Float, Color>>): Style {
        val radius = max(r1, 0.01f)
        val inner = (r0 / radius).coerceIn(0f, 0.999f)
        val list = if (inner > 0f) listOf(0f to stops.first().second) + stops.map { (inner + it.first * (1 - inner)) to it.second } else stops
        return Style.Gradient(RadialGradientShader(Offset(cx, cy), radius, list.map { it.second }, list.map { it.first }))
    }

    // ---- state
    fun save() {
        canvas.save()
        stack += Saved(fillStyle, strokeStyle, lineWidth, lineCap, lineJoin, globalAlpha, fontSize, textAlign)
    }
    fun restore() {
        val s = stack.removeLastOrNull() ?: return
        canvas.restore()
        fillStyle = s.fill; strokeStyle = s.stroke; lineWidth = s.lineWidth; lineCap = s.cap; lineJoin = s.join
        globalAlpha = s.alpha; fontSize = s.fontSize; textAlign = s.align
    }
    fun translate(x: Float, y: Float) = canvas.translate(x, y)
    fun rotate(a: Float) = canvas.rotate(Math.toDegrees(a.toDouble()).toFloat())
    fun scale(x: Float, y: Float) = canvas.scale(x, y)

    // ---- path
    fun beginPath() { path = Path(); hasCurrent = false }
    fun closePath() = path.close()
    fun moveTo(x: Float, y: Float) { path.moveTo(x, y); hasCurrent = true }
    fun lineTo(x: Float, y: Float) { if (hasCurrent) path.lineTo(x, y) else { path.moveTo(x, y); hasCurrent = true } }
    fun quadraticCurveTo(cx: Float, cy: Float, x: Float, y: Float) {
        if (!hasCurrent) { path.moveTo(cx, cy); hasCurrent = true }
        path.quadraticBezierTo(cx, cy, x, y)
    }
    fun bezierCurveTo(c1x: Float, c1y: Float, c2x: Float, c2y: Float, x: Float, y: Float) {
        if (!hasCurrent) { path.moveTo(c1x, c1y); hasCurrent = true }
        path.cubicTo(c1x, c1y, c2x, c2y, x, y)
    }
    fun rect(x: Float, y: Float, w: Float, h: Float) { path.addRect(Rect(x, y, x + w, y + h)); hasCurrent = true }

    /** canvas `arc`: clockwise on screen unless `ccw`; joins the current point with a line, like the browser does */
    fun arc(x: Float, y: Float, r: Float, a0: Float, a1: Float, ccw: Boolean = false) = ellipse(x, y, r, r, 0f, a0, a1, ccw)

    fun ellipse(x: Float, y: Float, rx: Float, ry: Float, rot: Float, a0: Float, a1: Float, ccw: Boolean = false) {
        val tau = (Math.PI * 2).toFloat()
        var sweep = a1 - a0
        sweep = if (!ccw) {
            if (sweep >= tau) tau else { var s = sweep % tau; if (s < 0) s += tau; s }
        } else {
            if (sweep <= -tau) -tau else { var s = sweep % tau; if (s > 0) s -= tau; s }
        }
        val n = max(2, ceil(abs(sweep) / 0.12f).toInt())
        val cr = cos(rot); val sr = sin(rot)
        for (i in 0..n) {
            val a = a0 + sweep * i / n
            val lx = rx * cos(a); val ly = ry * sin(a)
            val px = x + lx * cr - ly * sr
            val py = y + lx * sr + ly * cr
            if (i == 0 && !hasCurrent) { path.moveTo(px, py); hasCurrent = true } else path.lineTo(px, py)
        }
    }

    // ---- Double overloads: the creatures do their maths in Double, like JavaScript
    fun translate(x: Double, y: Double) = translate(x.toFloat(), y.toFloat())
    fun rotate(a: Double) = rotate(a.toFloat())
    fun scale(x: Double, y: Double) = scale(x.toFloat(), y.toFloat())
    fun moveTo(x: Double, y: Double) = moveTo(x.toFloat(), y.toFloat())
    fun lineTo(x: Double, y: Double) = lineTo(x.toFloat(), y.toFloat())
    fun quadraticCurveTo(cx: Double, cy: Double, x: Double, y: Double) = quadraticCurveTo(cx.toFloat(), cy.toFloat(), x.toFloat(), y.toFloat())
    fun rect(x: Double, y: Double, w: Double, h: Double) = rect(x.toFloat(), y.toFloat(), w.toFloat(), h.toFloat())
    fun arc(x: Double, y: Double, r: Double, a0: Double, a1: Double, ccw: Boolean = false) = arc(x.toFloat(), y.toFloat(), r.toFloat(), a0.toFloat(), a1.toFloat(), ccw)
    fun ellipse(x: Double, y: Double, rx: Double, ry: Double, rot: Double, a0: Double, a1: Double, ccw: Boolean = false) =
        ellipse(x.toFloat(), y.toFloat(), rx.toFloat(), ry.toFloat(), rot.toFloat(), a0.toFloat(), a1.toFloat(), ccw)
    fun fillRect(x: Double, y: Double, w: Double, h: Double) = fillRect(x.toFloat(), y.toFloat(), w.toFloat(), h.toFloat())
    fun radialGradient(cx: Double, cy: Double, r0: Double, r1: Double, stops: List<Pair<Float, Color>>) =
        radialGradient(cx.toFloat(), cy.toFloat(), r0.toFloat(), r1.toFloat(), stops)

    /** clips everything painted until the matching `restore()` to the current path (canvas `clip`) */
    fun clip() = canvas.clipPath(path)

    // ---- paint
    private fun apply(style: Style, mode: PaintingStyle) {
        paint.style = mode
        paint.alpha = globalAlpha
        when (style) {
            is Style.Solid -> { paint.shader = null; paint.color = style.color.copy(alpha = style.color.alpha * globalAlpha) }
            is Style.Gradient -> paint.shader = style.shader
        }
    }
    fun fill() { apply(fillStyle, PaintingStyle.Fill); canvas.drawPath(path, paint) }
    fun stroke() {
        apply(strokeStyle, PaintingStyle.Stroke)
        paint.strokeWidth = lineWidth; paint.strokeCap = lineCap; paint.strokeJoin = lineJoin
        canvas.drawPath(path, paint)
    }
    fun fillRect(x: Float, y: Float, w: Float, h: Float) { apply(fillStyle, PaintingStyle.Fill); canvas.drawRect(x, y, x + w, y + h, paint) }
    fun fillText(s: String, x: Float, y: Float) {
        val c = (fillStyle as? Style.Solid)?.color ?: Color.White
        textPaint.color = c.copy(alpha = c.alpha * globalAlpha).toArgbCompat()
        textPaint.textSize = fontSize
        textPaint.textAlign = when (textAlign) { Align.LEFT -> android.graphics.Paint.Align.LEFT; Align.CENTER -> android.graphics.Paint.Align.CENTER; Align.RIGHT -> android.graphics.Paint.Align.RIGHT }
        canvas.nativeCanvas.drawText(s, x, y, textPaint)
    }
}

private fun Color.toArgbCompat(): Int = this.toArgb()

/** `rgba(r,g,b,a)` with 0…255 channels, like the CSS strings the web creatures build */
fun rgba(r: Double, g: Double, b: Double, a: Double = 1.0) = Color((r / 255).toFloat(), (g / 255).toFloat(), (b / 255).toFloat(), a.toFloat())
