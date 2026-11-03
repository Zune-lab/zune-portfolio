package dev.zune.portfolio.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.zune.portfolio.core.theme
import kotlin.math.cos
import kotlin.math.sin

/**
 * Minecraft torch light/dark switch (src/components/layout/ThemeToggleTorch).
 * The web builds a 3D CSS cube; here the same cube (rotateX(-30deg) rotateY(45deg), same cell colours) is projected by hand
 * and painted as flat polygons. Lit = dark mode (the torch lights the page), unlit = light mode.
 */
object TorchGeometry {
    class Cell(val pts: List<Offset>, val lit: Long, val unlit: Long)

    // same projection as the CSS: rotateY(45°) then rotateX(-30°), orthographic, y points down
    private fun project(x: Double, y: Double, z: Double): Offset {
        val a = Math.PI / 4
        val b = -Math.PI / 6
        val x1 = x * cos(a) + z * sin(a)
        val z1 = -x * sin(a) + z * cos(a)
        return Offset(x1.toFloat(), (y * cos(b) - z1 * sin(b)).toFloat())
    }

    /** unlit flame colours are the translucent (#xx60) cells over the black face = colour * 0.376 */
    private fun dim(c: Long): Long {
        fun ch(s: Int) = (((c shr s) and 0xFF) * 0.376).toLong()
        return 0xFF000000 or (ch(16) shl 16) or (ch(8) shl 8) or ch(0)
    }
    private fun opaque(c: Long) = 0xFF000000 or c

    // children 1…4 of each head face, row-major
    private val topCells = listOf(0xFFFF97L, 0xFFD800L, 0xFFFFFFL, 0xFF8F00L)
    private val sideCells = listOf(0xFFD800L, 0xFF8F00L, 0xFFFF97L, 0xFFFFFFL)
    // children 1…16 of the stick (2 columns × 8 rows)
    private val stickLit = listOf(0x7C623EL, 0x4C3D26L, 0x937344L, 0x3C2F1CL, 0x937344L, 0x423522L, 0x9F7F50L, 0x403320L,
        0x977748L, 0x3C2F1CL, 0x675231L, 0x3D301DL, 0x987849L, 0x3B2E1BL, 0x675231L, 0x271E10L)
    private val stickUnlit = listOf(0x443622L, 0x2E2517L, 0x4B3B23L, 0x251E12L, 0x4B3B23L, 0x292115L, 0x4B3C26L, 0x292115L,
        0x4B3A21L, 0x251E12L, 0x3D311DL, 0x2C2315L, 0x493A22L, 0x2B2114L, 0x3D311DL, 0x271E10L)

    private fun grid(cols: Int, rows: Int, at: (Double, Double) -> Offset, lit: List<Long>, unlit: List<Long>): List<Cell> {
        val out = mutableListOf<Cell>()
        for (r in 0 until rows) for (c in 0 until cols) {
            val u0 = c.toDouble() / cols; val u1 = (c + 1).toDouble() / cols
            val v0 = r.toDouble() / rows; val v1 = (r + 1).toDouble() / rows
            out += Cell(listOf(at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)), lit[r * cols + c], unlit[r * cols + c])
        }
        return out
    }

    /** painter's order: stick first, flame cube on top */
    val cells: List<Cell> by lazy {
        val stickR = grid(2, 8, { u, v -> project(-15 + 30 * u, 20 + 120 * v, 15.0) }, stickLit.map(::opaque), stickUnlit.map(::opaque))
        val stickL = grid(2, 8, { u, v -> project(-15.0, 20 + 120 * v, -15 + 30 * u) }, stickLit.map(::opaque), stickUnlit.map(::opaque))
        val right = grid(2, 2, { u, v -> project(-15 + 30 * u, 30 * v, 15.0) }, sideCells.map(::opaque), sideCells.map(::dim))
        val left = grid(2, 2, { u, v -> project(-15.0, 30 * v, -15 + 30 * u) }, sideCells.map(::opaque), sideCells.map(::dim))
        val top = grid(2, 2, { u, v -> project(-15 + 30 * u, 0.0, -15 + 30 * v) }, topCells.map(::opaque), topCells.map(::dim))
        stickL + stickR + left + right + top
    }

    val minX by lazy { cells.flatMap { it.pts }.minOf { it.x } }
    val maxX by lazy { cells.flatMap { it.pts }.maxOf { it.x } }
    val minY by lazy { cells.flatMap { it.pts }.minOf { it.y } }
    val maxY by lazy { cells.flatMap { it.pts }.maxOf { it.y } }
}

@Composable
fun TorchSwitch(lit: Boolean, enabled: Boolean = true, onClick: () -> Unit) {
    val t = theme()
    Column(
        Modifier.alpha(if (enabled) 1f else 0.5f).then(if (enabled) Modifier.tap(onClick) else Modifier),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(1.dp),
    ) {
        Canvas(Modifier.width(36.dp).height(34.dp)) {
            val bw = TorchGeometry.maxX - TorchGeometry.minX
            val bh = TorchGeometry.maxY - TorchGeometry.minY
            val s = minOf(size.width / bw, size.height / bh) * 0.9f
            val ox = (size.width - bw * s) / 2 - TorchGeometry.minX * s
            val oy = (size.height - bh * s) / 2 - TorchGeometry.minY * s
            fun map(p: Offset) = Offset(p.x * s + ox, p.y * s + oy)

            if (lit) { // the glow around the flame
                val c = map(Offset(0f, 12f))
                val r = size.height * 0.75f
                drawCircle(Brush.radialGradient(listOf(Color(0x8CFFED9C), Color.Transparent), center = c, radius = r), radius = r, center = c)
            }
            for (cell in TorchGeometry.cells) {
                val path = Path().apply {
                    val q = cell.pts.map(::map)
                    moveTo(q[0].x, q[0].y); q.drop(1).forEach { lineTo(it.x, it.y) }; close()
                }
                drawPath(path, Color(if (lit) cell.lit else cell.unlit))
            }
        }
        MText("Tap me!", t.text.copy(alpha = 0.85f), 8f, FontWeight.Bold)
    }
}
