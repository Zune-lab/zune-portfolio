@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package dev.zune.portfolio.banner

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import dev.zune.portfolio.core.Site
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.games.GridPoint
import dev.zune.portfolio.ui.Panel
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.tap
import kotlinx.coroutines.delay
import java.io.File
import kotlin.math.floor
import kotlin.math.roundToInt

private const val STAGE_W = 296f
private const val STAGE_H = 330f

/**
 * Banner maker (src/components/lab/BannerMaker/BannerMaker.jsx): four tabs design / frame / draw / code,
 * save as a PNG (share sheet) or copy the code. Preview on top, controls below (the web puts them side by side).
 */
@Composable
fun BannerMakerScreen() {
    val t = theme()
    val ctx = LocalContext.current
    val m = remember { BannerModel() }

    Panel {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Preview(m)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ActionButton("random", Modifier.weight(1f)) { m.randomize() }
                ActionButton("clear", Modifier.weight(1f)) { m.clear() }
                ActionButton("save .png", Modifier.weight(1f), t.green) { share(ctx, m) }
            }
            Tabs(m)
            when (m.tab) {
                BannerTab.DESIGN -> DesignTab(m)
                BannerTab.FRAME -> FrameTab(m)
                BannerTab.DRAW -> DrawTab(m)
                BannerTab.CODE -> CodeTab(m)
            }
        }
    }
}

/** saves exactly the cloth (shape, border, drawing, transparent outside), without tilt or shadow, then opens the share sheet */
private fun share(ctx: Context, m: BannerModel) {
    val bmp = bannerScaled(m.pixels, m.w, m.h)
    val dir = File(ctx.cacheDir, "banner").apply { mkdirs() }
    val file = File(dir, "${Site.ID}-banner.png")
    file.outputStream().use { bmp.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
    val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.files", file)
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    ctx.startActivity(Intent.createChooser(send, "save banner").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}

@Composable
private fun ActionButton(title: String, modifier: Modifier, color: Color? = null, onClick: () -> Unit) {
    val t = theme()
    MText(title, color ?: t.text, 12f, modifier = modifier.box(t, Color.Transparent, radius = 6f).tap(onClick).padding(vertical = 8.dp), align = androidx.compose.ui.text.style.TextAlign.Center)
}

// ---------------------------------------------------------------- preview

@Composable
private fun Preview(m: BannerModel) {
    val t = theme()
    val w = m.w
    val h = m.h
    val cell = maxOf(3f, floor(minOf(STAGE_W / w, (STAGE_H - if (m.hanger) 10 else 0) / h)))
    val px = m.pixels
    val bitmap = remember(px.contentHashCode(), w, h) { pixelBitmap(px, w, h).asImageBitmap() }

    Box(
        Modifier.fillMaxWidth().height(400.dp).box(t, t.panel, radius = 8f)
            // a soft shadow under the cloth (the web uses drop-shadow; an ellipse works for every shape)
            .drawBehind {
                if (m.shadow > 0) {
                    val c = Offset(size.width / 2, size.height / 2 + (h * cell + 20).dp.toPx() / 2)
                    val r = (w * cell).dp.toPx() * 0.6f + m.shadow.dp.toPx()
                    drawCircle(Brush.radialGradient(listOf(Color.Black.copy(alpha = 0.35f * m.shadow / 40f + 0.1f), Color.Transparent), c, r), r, c)
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        Column(Modifier.graphicsLayer { rotationZ = if (m.drawing) 0f else m.tilt }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
            if (m.hanger) Box(Modifier.width((w * cell + 16).dp).height(8.dp).clip(RoundedCornerShape(3.dp)).background(Brush.verticalGradient(listOf(Color(0xFFA0703F), Color(0xFF6E4A26)))))
            Canvas(
                Modifier.size((w * cell).dp, (h * cell).dp)
                    .pointerInput(m.drawing, w, h, cell) {
                        if (!m.drawing) return@pointerInput
                        awaitPointerEventScope {
                            while (true) {
                                val ev = awaitPointerEvent()
                                val ch = ev.changes.first()
                                val c = GridPoint(
                                    (ch.position.x / density / cell).toInt().coerceIn(0, w - 1),
                                    (ch.position.y / density / cell).toInt().coerceIn(0, h - 1),
                                )
                                when (ev.type) {
                                    PointerEventType.Press -> m.beginStroke(c)
                                    PointerEventType.Move -> if (ch.pressed) m.continueStroke(c)
                                    PointerEventType.Release -> m.endStroke()
                                    else -> {}
                                }
                                if (ch.pressed) ch.consume() // painting must not scroll the page
                            }
                        }
                    },
            ) {
                drawImage(bitmap, dstOffset = IntOffset.Zero, dstSize = IntSize(size.width.roundToInt(), size.height.roundToInt()), filterQuality = FilterQuality.None)
            }
        }
    }
}

// ---------------------------------------------------------------- tabs + small controls

@Composable
private fun Tabs(m: BannerModel) {
    val t = theme()
    Column {
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            BannerTab.entries.forEach { tab ->
                val on = m.tab == tab
                MText(
                    tab.name.lowercase(), if (on) t.text else t.dim, 13f,
                    modifier = Modifier.tap { m.tab = tab }.drawBehind { if (on) drawRect(t.amber, Offset(0f, size.height - 2.dp.toPx()), Size(size.width, 2.dp.toPx())) }
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                )
            }
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(t.line))
    }
}

@Composable
private fun BChip(title: String, on: Boolean, onClick: () -> Unit) {
    val t = theme()
    MText(title, if (on) t.text else t.dim, 12.5f, modifier = Modifier.box(t, Color.Transparent, radius = 6f, stroke = if (on) t.amber else t.line).tap(onClick).padding(horizontal = 10.dp, vertical = 4.dp))
}

@Composable
private fun Swatch(c: String) {
    val t = theme()
    Box(Modifier.size(14.dp).clip(RoundedCornerShape(2.dp)).background(colorOf(c)).box(t, colorOf(c), radius = 2f))
}

@Composable
private fun BToggle(label: String, on: Boolean, onChange: (Boolean) -> Unit) {
    val t = theme()
    MText("${if (on) "[x]" else "[ ]"} $label", if (on) t.amber else t.text, 13f, modifier = Modifier.tap { onChange(!on) }.padding(vertical = 4.dp))
}

/** a plain horizontal slider with integer steps (no material dependency) */
@Composable
private fun PxSlider(value: Float, min: Float, max: Float, enabled: Boolean = true, modifier: Modifier = Modifier, onChange: (Float) -> Unit) {
    val t = theme()
    val cb by rememberUpdatedState(onChange)
    fun at(x: Float, width: Float) = (min + (x / width).coerceIn(0f, 1f) * (max - min)).roundToInt().toFloat()
    Canvas(
        modifier.height(28.dp)
            .pointerInput(enabled, min, max) { if (enabled) detectTapGestures { cb(at(it.x, size.width.toFloat())) } }
            .pointerInput(enabled, min, max) { if (enabled) detectHorizontalDragGestures { ch, _ -> ch.consume(); cb(at(ch.position.x, size.width.toFloat())) } },
    ) {
        val cy = size.height / 2
        val frac = ((value - min) / (max - min)).coerceIn(0f, 1f)
        drawRect(t.line, Offset(0f, cy - 1.5.dp.toPx()), Size(size.width, 3.dp.toPx()))
        drawRect(t.amber, Offset(0f, cy - 1.5.dp.toPx()), Size(size.width * frac, 3.dp.toPx()))
        drawCircle(t.amber, 9.dp.toPx(), Offset(9.dp.toPx() + (size.width - 18.dp.toPx()) * frac, cy))
    }
}

@Composable
private fun SliderRow(label: String, value: Float, min: Float, max: Float, unit: String, enabled: Boolean = true, onChange: (Float) -> Unit) {
    val t = theme()
    Row(Modifier.alpha(if (enabled) 1f else 0.4f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        MText(label, t.dim, 13f, modifier = Modifier.width(64.dp))
        PxSlider(value, min, max, enabled, Modifier.weight(1f), onChange)
        MText("${value.roundToInt()}$unit", t.green, 13f, modifier = Modifier.width(52.dp), align = androidx.compose.ui.text.style.TextAlign.End)
    }
}

/** 16 dyes + a last cell that opens three RGB sliders for any colour */
@Composable
private fun DyePicker(value: String, onChange: (String) -> Unit) {
    val t = theme()
    var open by remember { mutableStateOf(false) }
    val rgb = rgbOf(value)
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        for (rowDyes in dyes.chunked(8)) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                rowDyes.forEach { d ->
                    Box(
                        Modifier.weight(1f).aspectRatio(1f).clip(RoundedCornerShape(t.r(6f).dp)).background(Color(0xFF000000 or d.hex.toLong()))
                            .box(t, Color(0xFF000000 or d.hex.toLong()), radius = 6f, stroke = if (value == d.id) t.amber else t.line).tap { onChange(d.id) },
                    )
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(40.dp).clip(RoundedCornerShape(t.r(6f).dp))
                    .background(if (isCustom(value)) colorOf(value) else Color.Transparent)
                    .background(if (isCustom(value)) Brush.linearGradient(listOf(colorOf(value), colorOf(value))) else Brush.sweepGradient(listOf(Color.Red, Color.Yellow, Color.Green, Color.Cyan, Color.Magenta, Color.Red)))
                    .box(t, Color.Transparent, radius = 6f, stroke = if (isCustom(value)) t.amber else t.line).tap { open = !open },
            )
            MText(if (isCustom(value)) "custom ${hexOf(value)}" else "custom color", t.dim, 12f)
        }
        if (open) {
            val set = { r: Int, g: Int, b: Int -> onChange("#%02x%02x%02x".format(r, g, b)) }
            SliderRow("red", rgb.first.toFloat(), 0f, 255f, "") { set(it.roundToInt(), rgb.second, rgb.third) }
            SliderRow("green", rgb.second.toFloat(), 0f, 255f, "") { set(rgb.first, it.roundToInt(), rgb.third) }
            SliderRow("blue", rgb.third.toFloat(), 0f, 255f, "") { set(rgb.first, rgb.second, it.roundToInt()) }
        }
    }
}

// ---------------------------------------------------------------- design

@Composable
private fun DesignTab(m: BannerModel) {
    val t = theme()
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                MText("// layers ${m.layers.size}/${BannerCfg.MAX_LAYERS}", t.dim, 12f, modifier = Modifier.weight(1f))
                val full = m.layers.size >= BannerCfg.MAX_LAYERS
                MText("+ layer", t.text, 12f, modifier = Modifier.alpha(if (full) 0.4f else 1f).box(t, Color.Transparent, radius = 6f).then(if (full) Modifier else Modifier.tap { m.addLayer() }).padding(horizontal = 10.dp, vertical = 3.dp))
            }
            if (m.layers.isEmpty()) MText("// no layers yet. press + layer to stack a pattern on the base.", t.dim, 12f)
            // top layer first; a new layer lands right under the "+ layer" button
            m.layers.indices.reversed().forEach { i ->
                val l = m.layers[i]
                Row(Modifier.fillMaxWidth().box(t, Color.Transparent, radius = 6f, stroke = if (m.sel == i) t.amber else t.line), verticalAlignment = Alignment.CenterVertically) {
                    Row(Modifier.weight(1f).tap { m.sel = i }.padding(horizontal = 8.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Swatch(l.color)
                        MText(bannerPatternById[l.pattern]?.name ?: l.pattern, t.text, 13f)
                        MText(colorName(l.color), t.dim, 12f)
                    }
                    IconBtn("↑", i < m.layers.size - 1) { m.move(i, 1) }
                    IconBtn("↓", i > 0) { m.move(i, -1) }
                    IconBtn("✕", true) { m.removeLayer(i) }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                SelRow("base", m.base, m.sel == -1, Modifier.weight(1f)) { m.sel = -1 }
                if (m.frame.border > 0) SelRow("border", m.frame.borderColor, m.sel == -2, Modifier.weight(1f)) { m.sel = -2 }
            }
        }

        val layer = m.selLayer
        if (layer != null) {
            // small picture of each pattern (white on grey) at the current cloth ratio
            val rows = bannerPatterns.chunked(7)
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                for (row in rows) Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    for (p in row) {
                        val thumb = remember(p.id, m.w, m.h) {
                            pixelBitmap(renderBanner("slate", listOf(BannerLayer(0, p.id, "chalk")), BannerFrame(w = m.w, h = m.h)), m.w, m.h).asImageBitmap()
                        }
                        Canvas(Modifier.weight(1f).height(40.dp).box(t, Color.Transparent, radius = 6f, stroke = if (layer.pattern == p.id) t.amber else t.line).tap { m.setPattern(p.id) }.padding(3.dp)) {
                            val s = minOf(size.width / m.w, size.height / m.h)
                            val dw = (m.w * s).roundToInt(); val dh = (m.h * s).roundToInt()
                            drawImage(thumb, dstOffset = IntOffset(((size.width - dw) / 2).roundToInt(), ((size.height - dh) / 2).roundToInt()), dstSize = IntSize(dw, dh), filterQuality = FilterQuality.None)
                        }
                    }
                    repeat(7 - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        } else MText("// base and border take a color only. pick a layer to change its pattern.", t.dim, 12f)

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            MText(m.colorLabel, t.dim, 12f)
            DyePicker(m.activeColor) { m.setColor(it) }
        }
    }
}

@Composable
private fun IconBtn(s: String, enabled: Boolean, onClick: () -> Unit) {
    val t = theme()
    MText(s, t.dim, 13f, align = androidx.compose.ui.text.style.TextAlign.Center,
        modifier = Modifier.alpha(if (enabled) 1f else 0.3f).width(34.dp).then(if (enabled) Modifier.tap(onClick) else Modifier).padding(vertical = 10.dp))
}

@Composable
private fun SelRow(title: String, c: String, on: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val t = theme()
    Row(modifier.box(t, Color.Transparent, radius = 6f, stroke = if (on) t.amber else t.line).tap(onClick).padding(horizontal = 8.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
        Swatch(c); MText(title, t.text, 13f); MText(colorName(c), t.dim, 12f)
    }
}

// ---------------------------------------------------------------- frame

@Composable
private fun FrameTab(m: BannerModel) {
    val t = theme()
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            BannerModel.sizePresets.forEach { (name, pw, ph) -> BChip(name, m.w == pw && m.h == ph) { m.frame = m.frame.copy(w = pw, h = ph) } }
            BannerShape.entries.forEach { s -> BChip(s.title, m.frame.shape == s) { m.frame = m.frame.copy(shape = s) } }
            MText("reset", t.dim, 13f, modifier = Modifier.tap { m.resetFrame() }.padding(vertical = 4.dp, horizontal = 6.dp))
        }
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SliderRow("width", m.w.toFloat(), BannerCfg.MIN_SIZE.toFloat(), BannerCfg.MAX_SIZE.toFloat(), "px") { m.frame = m.frame.copy(w = it.roundToInt()) }
            SliderRow("height", m.h.toFloat(), BannerCfg.MIN_SIZE.toFloat(), BannerCfg.MAX_SIZE.toFloat(), "px") { m.frame = m.frame.copy(h = it.roundToInt()) }
            SliderRow("radius", m.frame.radius.toFloat(), 0f, 50f, "%", enabled = m.frame.shape != BannerShape.OVAL) { m.frame = m.frame.copy(radius = it.roundToInt()) }
            SliderRow("border", m.frame.border.toFloat(), 0f, 4f, "px") { m.setBorder(it.roundToInt()) }
            SliderRow("tilt", m.tilt, -30f, 30f, "deg") { m.tilt = it }
            SliderRow("shadow", m.shadow, 0f, 40f, "px") { m.shadow = it }
        }
        BToggle("wooden bar", m.hanger) { m.hanger = it }
        MText("// tilt, shadow and bar are preview only, not saved in the .png", t.dim, 12f)
    }
}

// ---------------------------------------------------------------- draw

@Composable
private fun DrawTab(m: BannerModel) {
    val t = theme()
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            BChip("pencil", m.tool == BannerTool.PENCIL) { m.tool = BannerTool.PENCIL }
            BChip("eraser", m.tool == BannerTool.ERASER) { m.tool = BannerTool.ERASER }
            BToggle("mirror", m.mirror) { m.mirror = it }
            MText("undo", t.dim, 13f, modifier = Modifier.alpha(if (m.history.isEmpty()) 0.4f else 1f).then(if (m.history.isEmpty()) Modifier else Modifier.tap { m.undo() }).padding(4.dp))
            MText("clear drawing", t.dim, 13f, modifier = Modifier.alpha(if (m.paintCount == 0) 0.4f else 1f).then(if (m.paintCount == 0) Modifier else Modifier.tap { m.clearPaint() }).padding(4.dp))
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            MText("pencil color", t.dim, 12f)
            DyePicker(m.ink) { m.ink = it; m.tool = BannerTool.PENCIL }
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            MText("// touch and drag on the banner to paint pixels.", t.dim, 12f)
            MText("// drawing sits on top of every layer and keeps its position when you resize; pixels outside the frame are hidden, not lost.", t.dim, 12f)
            MText("${m.paintCount} painted pixel${if (m.paintCount == 1) "" else "s"}", t.text, 12f)
        }
    }
}

// ---------------------------------------------------------------- code

@Composable
private fun CodeTab(m: BannerModel) {
    val t = theme()
    val ctx = LocalContext.current
    LaunchedEffect(m.copied) { if (m.copied) { delay(1500); m.copied = false } }
    Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        MText(if (m.copied) "copied!" else "copy code", if (m.copied) t.green else t.dim, 12f,
            modifier = Modifier.box(t, Color.Transparent, radius = 6f).tap {
                (ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("banner", m.code))
                m.copied = true
            }.padding(horizontal = 10.dp, vertical = 4.dp))
        Box(Modifier.fillMaxWidth().height(300.dp).box(t, t.panel, radius = 8f).verticalScroll(rememberScrollState()).horizontalScroll(rememberScrollState()).padding(14.dp)) {
            MText(m.code, t.text, 12f)
        }
    }
}
