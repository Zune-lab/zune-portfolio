package dev.zune.portfolio.creatures

import android.provider.Settings
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.theme.Theme
import dev.zune.portfolio.ui.box
import kotlin.math.min
import kotlin.math.PI

/**
 * A framed, non-interactive canvas that redraws every frame with the time since it appeared
 * (the web's "pure CSS animation" toys: the animation is redrawn by code here). Honors "remove animations".
 */
@Composable
fun CanvasFrame(background: Color, height: Dp = 340.dp, draw: (Ctx2D, Float, Float, Double, Theme) -> Unit) {
    val t = theme()
    val ctx = LocalContext.current
    val reduce = remember { Settings.Global.getFloat(ctx.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }
    var tick by remember { mutableLongStateOf(0L) }
    val first = remember { LongArray(1) }
    if (!reduce) LaunchedEffect(Unit) { while (true) withFrameNanos { tick = it } } // paused while the app is in the background
    Canvas(Modifier.fillMaxWidth().height(height).box(t, background, radius = 10f)) {
        tick // redraw every frame
        if (first[0] == 0L) first[0] = tick
        drawIntoCanvas { c ->
            c.save()
            c.scale(density, density) // units are dp, like CSS px
            draw(Ctx2D(c), size.width / density, size.height / density, if (reduce) 0.0 else (tick - first[0]) / 1e9, t)
            c.restore()
        }
    }
}

// ---- CSS helpers for the CSS-drawn toys

/** a CSS box with `border-radius: rx / tl tr br bl`: if two neighbouring radii don't fit a side, ALL radii shrink by the same factor (CSS rule) */
fun cssBox(g: Ctx2D, x: Double, y: Double, w: Double, h: Double, rx0: Double, tl0: Double, tr0: Double, br0: Double, bl0: Double) {
    var f = 1.0
    if (rx0 > 0) f = min(f, w / (2 * rx0))
    if (tl0 + bl0 > 0) f = min(f, h / (tl0 + bl0))
    if (tr0 + br0 > 0) f = min(f, h / (tr0 + br0))
    val rx = rx0 * f; val tl = tl0 * f; val tr = tr0 * f; val br = br0 * f; val bl = bl0 * f
    g.beginPath()
    g.moveTo(x + rx, y)
    g.lineTo(x + w - rx, y)
    g.ellipse(x + w - rx, y + tr, rx, tr, 0.0, -PI / 2, 0.0)
    g.lineTo(x + w, y + h - br)
    g.ellipse(x + w - rx, y + h - br, rx, br, 0.0, 0.0, PI / 2)
    g.lineTo(x + rx, y + h)
    g.ellipse(x + rx, y + h - bl, rx, bl, 0.0, PI / 2, PI)
    g.lineTo(x, y + tl)
    g.ellipse(x + rx, y + tl, rx, tl, 0.0, PI, 3 * PI / 2)
    g.closePath()
}

/** `border-radius: 50%` */
fun cssOval(g: Ctx2D, x: Double, y: Double, w: Double, h: Double) = cssBox(g, x, y, w, h, w / 2, h / 2, h / 2, h / 2, h / 2)

/** run `body` with the canvas rotated by `deg` around (cx, cy) (CSS `transform: rotate()` with its transform-origin) */
inline fun rotated(g: Ctx2D, cx: Double, cy: Double, deg: Double, body: () -> Unit) {
    g.save()
    g.translate(cx, cy); g.rotate(deg * PI / 180); g.translate(-cx, -cy)
    body()
    g.restore()
}

/** CSS keyframes: linear interpolation between (progress 0…1, value) stops */
fun keyframes(p: Double, vararg stops: Pair<Double, Double>): Double {
    for (i in 1 until stops.size) if (p <= stops[i].first) {
        val (p0, v0) = stops[i - 1]
        val (p1, v1) = stops[i]
        return if (p1 == p0) v1 else v0 + (v1 - v0) * (p - p0) / (p1 - p0)
    }
    return stops.last().second
}

/** 0 → 1 → 0 over one cycle: an animation with a single `50%` keyframe */
fun tri(p: Double) = if (p < 0.5) p * 2 else (1 - p) * 2
