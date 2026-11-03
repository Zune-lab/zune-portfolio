package dev.zune.portfolio.banner

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import dev.zune.portfolio.creatures.randInt
import dev.zune.portfolio.games.GridPoint
import kotlin.math.abs

enum class BannerTab { DESIGN, FRAME, DRAW, CODE }
enum class BannerTool { PENCIL, ERASER }

/** state + actions of the banner maker (port of the hooks in BannerMaker.jsx) */
class BannerModel {
    companion object {
        const val MAX_UNDO = 50
        val sizePresets = listOf(Triple("portrait", 20, 40), Triple("landscape", 40, 20), Triple("square", 30, 30))

        /** the cells on the straight line between two cells (Bresenham), so a fast drag leaves no gaps */
        fun line(a: GridPoint, b: GridPoint): List<GridPoint> {
            val cells = ArrayList<GridPoint>()
            val dx = abs(b.x - a.x)
            val dy = -abs(b.y - a.y)
            val sx = if (a.x < b.x) 1 else -1
            val sy = if (a.y < b.y) 1 else -1
            var err = dx + dy
            var x = a.x
            var y = a.y
            while (true) {
                cells += GridPoint(x, y)
                if (x == b.x && y == b.y) return cells
                val e2 = 2 * err
                if (e2 >= dy) { err += dy; x += sx }
                if (e2 <= dx) { err += dx; y += sy }
            }
        }
    }

    var tab by mutableStateOf(BannerTab.DESIGN)
    var base by mutableStateOf("indigo")
    var layers by mutableStateOf(listOf(makeLayer("rhombus", "sky"), makeLayer("circle", "chalk")))
    var frame by mutableStateOf(BannerFrame())
    var tilt by mutableStateOf(0f)
    var shadow by mutableStateOf(14f)
    var hanger by mutableStateOf(true)
    var sel by mutableStateOf(1)                       // -1 = base, -2 = border
    var paint by mutableStateOf(mapOf<GridPoint, String>()); private set
    var history by mutableStateOf(listOf<Map<GridPoint, String>>()); private set
    var tool by mutableStateOf(BannerTool.PENCIL)
    var mirror by mutableStateOf(false)
    var ink by mutableStateOf("honey")
    var copied by mutableStateOf(false)

    private var strokeLast: GridPoint? = null
    private var strokePushed = false

    val w get() = frame.w
    val h get() = frame.h
    val drawing get() = tab == BannerTab.DRAW
    val selLayer get() = layers.getOrNull(sel)?.takeIf { sel >= 0 }
    val activeColor get() = selLayer?.color ?: if (sel == -2) frame.borderColor else base
    val colorLabel get() = if (selLayer != null) "layer color" else if (sel == -2) "border color" else "base color"
    val paintCount get() = paint.size

    /** hand-drawn pixels grouped by colour (for rendering and for the generated code) */
    val groups: List<PaintGroup>
        get() = paint.entries.groupBy({ it.value }, { it.key })
            .map { (c, cells) -> PaintGroup(c, cells.sortedWith(compareBy({ it.y }, { it.x }))) }
            .sortedBy { it.color }

    val pixels: IntArray get() = renderBanner(base, layers, frame, groups)

    // ---- design
    fun setColor(c: String) {
        when {
            sel == -1 -> base = c
            sel == -2 -> frame = frame.copy(borderColor = c)
            sel in layers.indices -> layers = layers.mapIndexed { i, l -> if (i == sel) l.copy(color = c) else l }
        }
    }
    fun setPattern(p: String) { if (sel in layers.indices) layers = layers.mapIndexed { i, l -> if (i == sel) l.copy(pattern = p) else l } }
    fun setBorder(n: Int) { frame = frame.copy(border = n); if (n == 0 && sel == -2) sel = -1 }

    fun addLayer() {
        if (layers.size >= BannerCfg.MAX_LAYERS) return
        val prev = layers.lastOrNull()?.color ?: base
        val color = dyes.filter { it.id != prev }.random()
        layers = layers + makeLayer(bannerPatterns.random().id, color.id)
        sel = layers.size - 1
    }

    fun removeLayer(i: Int) {
        val oldCount = layers.size
        layers = layers.filterIndexed { j, _ -> j != i }
        sel = if (sel > i) sel - 1 else if (sel == i) minOf(i, oldCount - 2) else sel
    }

    fun move(i: Int, dir: Int) {
        val j = i + dir
        if (j < 0 || j >= layers.size) return
        val next = layers.toMutableList()
        val t = next[i]; next[i] = next[j]; next[j] = t
        layers = next
        sel = if (sel == i) j else if (sel == j) i else sel
    }

    fun randomize() {
        val n = randInt(2, BannerCfg.MAX_LAYERS)
        val baseColor = dyes.random().id
        var prev = baseColor
        val next = List(n) {
            val c = dyes.filter { d -> d.id != prev }.random().id
            prev = c
            makeLayer(bannerPatterns.random().id, c)
        }
        base = baseColor
        layers = next
        sel = next.size - 1
    }

    /** clear removes the layers and the hand-drawn paint (the paint can still be undone) */
    fun clear() { base = "chalk"; layers = emptyList(); sel = -1; clearPaint() }

    fun resetFrame() {
        frame = BannerFrame(); tilt = 0f; shadow = 14f; hanger = true
        if (sel == -2) sel = -1
    }

    // ---- drawing
    private fun pushHistory(snapshot: Map<GridPoint, String>) { history = (history + snapshot).takeLast(MAX_UNDO) }

    fun clearPaint() {
        if (paint.isEmpty()) return
        pushHistory(paint)
        paint = emptyMap()
    }

    fun undo() {
        val last = history.lastOrNull() ?: return
        paint = last
        history = history.dropLast(1)
    }

    /** paints (or erases) cells, mirrored left-right when `mirror` is on; only a stroke that really changes the picture goes into the undo history */
    private fun stamp(cells: List<GridPoint>) {
        val all = if (mirror) cells.flatMap { listOf(it, GridPoint(w - 1 - it.x, it.y)) } else cells
        val next = paint.toMutableMap()
        var changed = false
        for (p in all) {
            if (tool == BannerTool.ERASER) { if (next.remove(p) != null) changed = true }
            else if (next[p] != ink) { next[p] = ink; changed = true }
        }
        if (!changed) return
        if (!strokePushed) { strokePushed = true; pushHistory(paint) }
        paint = next
    }

    fun beginStroke(c: GridPoint) { strokeLast = c; strokePushed = false; stamp(listOf(c)) }
    fun continueStroke(c: GridPoint) {
        val last = strokeLast ?: return
        if (c == last) return
        stamp(line(last, c))
        strokeLast = c
    }
    fun endStroke() { strokeLast = null }

    // ---- code tab
    /** code that rebuilds the design on screen; it runs with `renderBanner` from banner.js */
    val code: String
        get() {
            val rows = layers.joinToString("\n") { "  { pattern: '${it.pattern}', color: '${it.color}' }," }
            val head = "import { renderBanner } from './banner.js';\n\n" +
                "const base = '$base';\n" +
                "const layers = [${if (rows.isEmpty()) "" else "\n$rows\n"}];\n" +
                "const frame = {\n" +
                "  w: ${frame.w}, h: ${frame.h}, shape: '${frame.shape.code}',\n" +
                "  radius: ${frame.radius}, border: ${frame.border}, borderColor: '${frame.borderColor}',\n" +
                "};\n"
            val g = groups
            if (g.isEmpty()) return "$head\n// RGBA pixels, w * h * 4\nconst pixels = renderBanner(base, layers, frame);"
            val paintCode = g.joinToString("\n") { group ->
                val lines = group.cells.chunked(6).joinToString("\n") { chunk -> "      " + chunk.joinToString(", ") { "[${it.x}, ${it.y}]" } + "," }
                "  {\n    color: '${group.color}',\n    cells: [\n$lines\n    ],\n  },"
            }
            return "$head\nconst paint = [\n$paintCode\n];\n\n// RGBA pixels, w * h * 4\nconst pixels = renderBanner(base, layers, frame, paint);"
        }
}
