package dev.zune.portfolio.banner

import android.graphics.Bitmap
import androidx.compose.ui.graphics.Color
import dev.zune.portfolio.creatures.clamp
import dev.zune.portfolio.games.GridPoint
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

// Port of src/components/lab/BannerMaker/banner.js: a pixel cloth of any size, one base colour + up to 6 stacked patterns,
// a frame (shape, rounded corners, border) that is part of the picture, and hand-drawn paint on top.
// No UI in this file, so it could be unit-tested on its own.

object BannerCfg {
    const val MIN_SIZE = 12
    const val MAX_SIZE = 48
    const val MAX_LAYERS = 6
}

/** the site's own 16-colour palette */
class Dye(val id: String, val hex: Int)

val dyes = listOf(
    Dye("chalk", 0xF2EFE9), Dye("ash", 0xA3A7AD), Dye("slate", 0x4A5058), Dye("ink", 0x1B1D22),
    Dye("bark", 0x7A5238), Dye("ember", 0xC4352B), Dye("tangerine", 0xF08A24), Dye("honey", 0xF5C93A),
    Dye("moss", 0x7FB23A), Dye("pine", 0x2F6B3F), Dye("teal", 0x1F9C93), Dye("sky", 0x4CB4E6),
    Dye("indigo", 0x3B43B0), Dye("grape", 0x8A3FBF), Dye("orchid", 0xD556B8), Dye("blush", 0xF4A1B8),
)
private val dyeById = dyes.associateBy { it.id }

// a colour is an id from the 16 ('sky') or a custom hex ('#3ab0e6')
fun isCustom(c: String) = c.startsWith("#")

private fun parseHex(hex: String): Triple<Int, Int, Int> {
    var h = hex.drop(1)
    if (h.length == 3) h = h.map { "$it$it" }.joinToString("")
    val v = if (h.length == 6) h.toIntOrNull(16) else null
    return if (v == null) Triple(0, 0, 0) else Triple((v shr 16) and 0xFF, (v shr 8) and 0xFF, v and 0xFF)
}

fun rgbOf(c: String): Triple<Int, Int, Int> {
    if (isCustom(c)) return parseHex(c)
    val d = dyeById[c] ?: dyeById.getValue("ink")
    return Triple((d.hex shr 16) and 0xFF, (d.hex shr 8) and 0xFF, d.hex and 0xFF)
}

fun hexOf(c: String): String = if (isCustom(c)) c.lowercase() else "#" + "%06x".format((dyeById[c] ?: dyeById.getValue("ink")).hex)
fun colorName(c: String): String = if (isCustom(c)) c.lowercase() else c
fun colorOf(c: String): Color { val (r, g, b) = rgbOf(c); return Color(r / 255f, g / 255f, b / 255f) }

private fun clampInt(n: Double, lo: Int, hi: Int) = max(lo, min(hi, floor(n + 0.5).toInt()))
private fun clamp01(n: Double) = clamp(n, 0.0, 1.0)

enum class BannerShape(val title: String) {
    RECT("rectangle"), SWALLOW("swallowtail"), POINT("pennant"), ARCH("arch"), OVAL("oval");
    val code get() = name.lowercase()
}

data class BannerFrame(
    val w: Int = 20, val h: Int = 40, val shape: BannerShape = BannerShape.RECT,
    val radius: Int = 0, val border: Int = 0, val borderColor: String = "ink",
)

data class BannerLayer(val id: Int, val pattern: String, val color: String)

private var layerUid = 0
fun makeLayer(pattern: String, color: String) = BannerLayer(++layerUid, pattern, color)

class PaintGroup(val color: String, val cells: List<GridPoint>)

/** what every pattern mask receives: (x, y) pixel, (u, v) its centre, (nx, ny) position 0…1 on the cloth, m = the shorter side */
class BannerCell(val x: Int, val y: Int, val u: Double, val v: Double, val w: Int, val h: Int, val nx: Double, val ny: Double, val m: Double)

class BannerPattern(val id: String, val name: String, val mask: (BannerCell) -> Double)

/** bitmap patterns (bug, cat, bolt…): '#' is a filled pixel, scaled to the cloth size */
private fun bitmap(rows: List<String>): (BannerCell) -> Double {
    val cols = rows[0].length
    return { c ->
        val s = max(1, min(floor(c.w * 0.9 / cols).toInt(), floor(c.h * 0.8 / rows.size).toInt()))
        val ox = floor((c.w - cols * s) / 2.0 + 0.5).toInt() // Math.round
        val oy = floor((c.h - rows.size * s) / 2.0 + 0.5).toInt()
        val bx = floor((c.x - ox).toDouble() / s).toInt()
        val by = floor((c.y - oy).toDouble() / s).toInt()
        if (by in rows.indices && bx in 0 until cols && rows[by][bx] == '#') 1.0 else 0.0
    }
}

private const val BAND = 0.11 // half width of a diagonal stripe, as a fraction of the cloth
private fun diagDown(c: BannerCell) = abs(c.ny - c.nx) < BAND
private fun diagUp(c: BannerCell) = abs(c.ny - (1 - c.nx)) < BAND
private fun b(v: Boolean) = if (v) 1.0 else 0.0

val bannerPatterns = listOf(
    BannerPattern("stripe_bottom", "bottom stripe") { b(it.ny >= 0.8) },
    BannerPattern("stripe_top", "top stripe") { b(it.ny < 0.2) },
    BannerPattern("stripe_left", "left stripe") { b(it.nx < 0.3) },
    BannerPattern("stripe_right", "right stripe") { b(it.nx >= 0.7) },
    BannerPattern("stripe_center", "center stripe") { b(it.nx >= 0.35 && it.nx < 0.65) },
    BannerPattern("stripe_middle", "middle stripe") { b(it.ny >= 0.4 && it.ny < 0.6) },
    BannerPattern("stripe_down", "diagonal ↘") { b(diagDown(it)) },
    BannerPattern("stripe_up", "diagonal ↙") { b(diagUp(it)) },
    BannerPattern("small_stripes", "small stripes") { b(it.x % 4 == 1 || it.x % 4 == 2) },
    BannerPattern("saltire", "saltire ✕") { b(diagDown(it) || diagUp(it)) },
    BannerPattern("cross", "cross +") { b(abs(it.u - it.w / 2.0) < it.m * 0.15 || abs(it.v - it.h / 2.0) < it.m * 0.15) },
    BannerPattern("border", "border") { c ->
        val bd = max(1, floor(c.m * 0.1 + 0.5).toInt())
        b(c.x < bd || c.x >= c.w - bd || c.y < bd || c.y >= c.h - bd)
    },
    BannerPattern("gradient_top", "gradient ↓") { clamp01(1 - it.ny / 0.7) },
    BannerPattern("gradient_bottom", "gradient ↑") { clamp01(1 - (1 - it.ny) / 0.7) },
    BannerPattern("circle", "circle") { c ->
        val dx = c.u - c.w / 2.0
        val dy = c.v - c.h / 2.0
        val r = c.m * 0.325
        b(dx * dx + dy * dy <= r * r)
    },
    BannerPattern("rhombus", "rhombus") { b(abs(it.nx - 0.5) / 0.4 + abs(it.ny - 0.5) / 0.4 <= 1) },
    BannerPattern("half_top", "half top") { b(it.ny < 0.5) },
    BannerPattern("half_bottom", "half bottom") { b(it.ny >= 0.5) },
    BannerPattern("half_left", "half left") { b(it.nx < 0.5) },
    BannerPattern("half_right", "half right") { b(it.nx >= 0.5) },
    BannerPattern("corner_bl", "corner ◣") { b(it.ny > it.nx) },
    BannerPattern("corner_tr", "corner ◥") { b(it.ny < it.nx) },
    BannerPattern("corner_tl", "corner ◤") { b(it.ny < 1 - it.nx) },
    BannerPattern("corner_br", "corner ◢") { b(it.ny > 1 - it.nx) },
    BannerPattern("triangle_up", "triangle ▲") { b(it.ny > 0.5 && abs(it.nx - 0.5) <= it.ny - 0.5) },
    BannerPattern("triangle_down", "triangle ▼") { b(it.ny < 0.5 && abs(it.nx - 0.5) <= 0.5 - it.ny) },
    BannerPattern("bricks", "bricks") { b(it.y % 5 == 0 || (it.x + ((it.y / 5) % 2) * 5) % 10 == 0) },
    BannerPattern("bug", "bug", bitmap(listOf("..#...#..", "...#.#...", "..#####..", ".#######.", "#.#####.#", "..#####..", "#.#####.#", "...###..."))),
    BannerPattern("cat", "cat", bitmap(listOf("#.......#", "##.....##", "#########", "##.###.##", "#########", "####.####", ".#######."))),
    BannerPattern("moon", "moon", bitmap(listOf("..####..", ".###....", "###.....", "###.....", "###.....", ".###....", "..####.."))),
    BannerPattern("bolt", "bolt", bitmap(listOf("....##", "...##.", "..##..", ".#####", "...##.", "..##..", ".##...", "##...."))),
    BannerPattern("star", "star", bitmap(listOf("....#....", "...###...", "#########", ".#######.", "..#####..", "..##.##..", ".##...##."))),
    BannerPattern("heart", "heart", bitmap(listOf(".###.###.", "#########", "#########", "#########", ".#######.", "..#####..", "...###...", "....#...."))),
)
val bannerPatternById = bannerPatterns.associateBy { it.id }

/** which pixels are inside the frame: shape + rounded corners (each pixel is in or out, no smoothing) */
private fun frameMask(w: Int, h: Int, shape: BannerShape, radius: Int): BooleanArray {
    val m = min(w, h).toDouble()
    val r = clampInt(radius.toDouble(), 0, 50) / 100.0 * m
    val W = w.toDouble()
    val H = h.toDouble()
    val inside = BooleanArray(w * h)
    for (y in 0 until h) for (x in 0 until w) {
        val u = x + 0.5
        val v = y + 0.5
        val cx = clamp(u, r, W - r)
        val cy = clamp(v, r, H - r)
        var ok = (u - cx) * (u - cx) + (v - cy) * (v - cy) <= r * r
        val dx = abs(u - W / 2) / (W / 2)
        if (ok && shape == BannerShape.SWALLOW) ok = v <= H - 0.22 * H * (1 - dx)
        else if (ok && shape == BannerShape.POINT) ok = v <= H * 0.5 || dx <= (H - v) / (H * 0.5)
        else if (ok && shape == BannerShape.ARCH) {
            val rr = min(W / 2, H)
            ok = v >= rr || (u - W / 2) * (u - W / 2) + (v - rr) * (v - rr) <= rr * rr
        } else if (shape == BannerShape.OVAL) {
            val t = (v - H / 2) / (H / 2)
            ok = dx * dx + t * t <= 1
        }
        inside[y * w + x] = ok
    }
    return inside
}

/**
 * blends every layer onto the base, then cuts to the frame: ARGB w*h, transparent (0) outside the frame.
 * `paint` is the hand-drawn layer on top.
 */
fun renderBanner(base: String, layers: List<BannerLayer>, f: BannerFrame, paint: List<PaintGroup> = emptyList()): IntArray {
    val w = max(BannerCfg.MIN_SIZE, min(BannerCfg.MAX_SIZE, f.w))
    val h = max(BannerCfg.MIN_SIZE, min(BannerCfg.MAX_SIZE, f.h))
    val bw = max(0, min(4, f.border))
    val inside = frameMask(w, h, f.shape, f.radius)
    val out = IntArray(w * h)
    val baseRgb = rgbOf(base)
    val borderRgb = rgbOf(f.borderColor)
    val stack = layers.mapNotNull { l -> bannerPatternById[l.pattern]?.let { it.mask to rgbOf(l.color) } }
    val m = min(w, h).toDouble()
    fun isOut(x: Int, y: Int) = x < 0 || y < 0 || x >= w || y >= h || !inside[y * w + x]
    // a pixel inside the frame, at most `bw` cells from its edge, is border
    fun onBorder(x: Int, y: Int): Boolean {
        for (dy in -bw..bw) for (dx in -bw..bw) if (abs(dx) + abs(dy) <= bw && isOut(x + dx, y + dy)) return true
        return false
    }
    fun argb(r: Int, g: Int, b: Int) = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
    fun byte(v: Double) = max(0, min(255, v.roundToInt())) // Uint8ClampedArray

    for (y in 0 until h) for (x in 0 until w) {
        if (!inside[y * w + x]) continue
        if (bw > 0 && onBorder(x, y)) { out[y * w + x] = argb(borderRgb.first, borderRgb.second, borderRgb.third); continue }
        var r = baseRgb.first.toDouble()
        var g = baseRgb.second.toDouble()
        var bl = baseRgb.third.toDouble()
        val u = x + 0.5
        val v = y + 0.5
        val c = BannerCell(x, y, u, v, w, h, u / w, v / h, m)
        for ((mask, rgb) in stack) {
            val a = mask(c)
            if (a > 0) { r += (rgb.first - r) * a; g += (rgb.second - g) * a; bl += (rgb.third - bl) * a }
        }
        out[y * w + x] = argb(byte(r), byte(g), byte(bl))
    }
    // hand-drawn paint sits on top and shows only inside the frame; cells outside the cloth are kept but not drawn
    for (group in paint) {
        val rgb = rgbOf(group.color)
        for (p in group.cells) {
            if (p.x < 0 || p.y < 0 || p.x >= w || p.y >= h || !inside[p.y * w + p.x]) continue
            out[p.y * w + p.x] = argb(rgb.first, rgb.second, rgb.third)
        }
    }
    return out
}

/** ARGB pixels -> bitmap (draw it with FilterQuality.None for crisp square pixels) */
fun pixelBitmap(px: IntArray, w: Int, h: Int): Bitmap =
    Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).also { it.setPixels(px, 0, w, 0, 0, w, h) }

/** the cloth scaled up with no smoothing (long side ≈ 640 px): exactly the banner, no tilt / shadow / bar */
fun bannerScaled(px: IntArray, w: Int, h: Int, longSide: Int = 640): Bitmap {
    val scale = max(4, longSide / max(w, h))
    return Bitmap.createScaledBitmap(pixelBitmap(px, w, h), w * scale, h * scale, false)
}
