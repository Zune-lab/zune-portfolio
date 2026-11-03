package dev.zune.portfolio.creatures

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.ui.Panel
import dev.zune.portfolio.theme.Theme
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.tap
import kotlin.math.min
import kotlin.math.sin

// Port of src/components/lab/CreatureStage/CreatureStage.jsx: the shared stage for lab creatures.
// A creature is just an object with `step(api)`; the stage does the canvas, theme colours, pointer, the loop and "respawn".

class StageColors(
    val ink: Color, val amber: Color, val dim: Color, val green: Color, val line: Color, val panel: Color,
    /** the panel is a light colour (light skins): glows need real lamp yellow there, not the skin's dark amber */
    val panelLight: Boolean = false,
)

class StageMouse(var x: Float = 0f, var y: Float = 0f, var down: Boolean = false, var inside: Boolean = false, var clicks: Int = 0)

class StageApi {
    lateinit var g: Ctx2D
    var w = 0f
    var h = 0f
    var t = 0.0
    var dt = 0.0
    lateinit var colors: StageColors
    var mouse = StageMouse()
    /** where the creature should look / walk: the finger, or a slow wander when nobody touches for 2.5 s */
    var aimX = 0f
    var aimY = 0f
    /** seconds since the pointer last moved */
    var idle = 3.5
}

interface Creature {
    /** small text in the corner of the frame */
    val label: String
    /** optional live text that replaces the label (asked every frame) */
    fun caption(): String? = null
    /** called every frame: simulate and draw on `api.g` */
    fun step(api: StageApi)
    /** called inside the touch event (audio can only start from a user gesture) */
    fun unlock() {}
    fun destroy() {}
}

private const val IDLE_SECONDS = 2.5

class StageHost {
    val api = StageApi()
    private var creature: Creature? = null
    private var lastNs = 0L
    var text by mutableStateOf("")

    fun respawn() { creature?.destroy(); creature = null; lastNs = 0 }
    fun shutdown() { creature?.destroy(); creature = null }

    fun frame(nowNs: Long, w: Float, h: Float, g: Ctx2D, t: Theme, make: (Float, Float) -> Creature) {
        if (w < 1f || h < 1f) return
        api.w = w; api.h = h
        val p = t.p.panel
        val lum = (((p shr 16) and 0xFF) * 299 + ((p shr 8) and 0xFF) * 587 + (p and 0xFF) * 114) / 1000.0
        api.colors = StageColors(t.text, t.amber, t.dim, t.green, t.line, t.panel, lum > 140)
        if (creature == null) {
            api.mouse = StageMouse(w * 0.75f, h * 0.4f)
            api.t = 0.0; api.idle = IDLE_SECONDS + 1
            val c = make(w, h)
            creature = c
            text = touchText(c.label)
        }
        api.dt = if (lastNs == 0L) 1.0 / 60 else min(0.05, (nowNs - lastNs) / 1e9)
        lastNs = nowNs
        api.t += api.dt
        api.idle += api.dt
        if (api.idle > IDLE_SECONDS) {
            // nobody is touching: the creature wanders on a slow Lissajous path
            api.aimX = (w * (0.5 + 0.34 * sin(api.t * 0.37))).toFloat()
            api.aimY = (h * (0.5 + 0.3 * sin(api.t * 0.53 + 1))).toFloat()
        } else { api.aimX = api.mouse.x; api.aimY = api.mouse.y }
        g.lineCap = androidx.compose.ui.graphics.StrokeCap.Round
        g.lineJoin = androidx.compose.ui.graphics.StrokeJoin.Round
        g.lineWidth = 1.2f
        g.strokeColor(t.text); g.fillColor(t.text)
        api.g = g
        creature?.step(api)
        creature?.caption()?.let { text = touchText(it) }
    }

    // pointer input (the web's pointermove / pointerdown / pointerup / pointerleave)
    fun move(p: Offset) { api.mouse.x = p.x; api.mouse.y = p.y; api.mouse.inside = true; api.idle = 0.0 }
    fun down(p: Offset) {
        move(p)
        if (!api.mouse.down) { api.mouse.down = true; api.mouse.clicks++; creature?.unlock() }
    }
    fun up() { api.mouse.down = false; creature?.unlock() }
    fun leave() { api.mouse.down = false; api.mouse.inside = false }
}

/** "move your cursor" → "drag your finger", "click" → "tap" (lib/env.js touchText, for touch screens) */
fun touchText(s: String): String = s
    .replace(Regex("move (your|the) cursor", RegexOption.IGNORE_CASE), "drag your finger")
    .replace(Regex("cursor", RegexOption.IGNORE_CASE), "finger")
    .replace(Regex("clicked", RegexOption.IGNORE_CASE), "tapped")
    .replace(Regex("clicking", RegexOption.IGNORE_CASE), "tapping")
    .replace(Regex("click", RegexOption.IGNORE_CASE), "tap")

@Composable
fun CreatureStage(make: (Float, Float) -> Creature, height: Dp = 380.dp) {
    val t = theme()
    val host = remember { StageHost() }
    var play by remember { mutableStateOf(true) } // true: dragging plays with the creature, false: dragging scrolls the page
    var tick by remember { mutableLongStateOf(0L) }
    LaunchedEffect(Unit) { while (true) androidx.compose.runtime.withFrameNanos { tick = it } } // paused while the app is in the background
    DisposableEffect(Unit) { onDispose { host.shutdown() } }

    Panel {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Box(Modifier.fillMaxWidth().height(height).box(t, t.panel, radius = 8f)) {
                Canvas(
                    Modifier.fillMaxWidth().height(height)
                        .pointerInput(play) {
                            if (!play) return@pointerInput
                            awaitPointerEventScope {
                                while (true) {
                                    val ev = awaitPointerEvent()
                                    val ch = ev.changes.first()
                                    val p = Offset(ch.position.x / density, ch.position.y / density)
                                    when (ev.type) {
                                        PointerEventType.Press -> host.down(p)
                                        PointerEventType.Move -> host.move(p)
                                        PointerEventType.Release -> { host.up(); host.leave() }
                                        PointerEventType.Exit -> host.leave()
                                        else -> {}
                                    }
                                    if (ch.pressed) ch.consume() // a finger on the creature must not scroll the page
                                }
                            }
                        },
                ) {
                    tick // redraw every frame
                    drawIntoCanvas { c ->
                        c.save()
                        c.scale(density, density) // units are dp, like CSS px
                        host.frame(tick, size.width / density, size.height / density, Ctx2D(c), t, make)
                        c.restore()
                    }
                }
                MText(host.text, t.dim, 12f, modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MText("respawn", t.text, 13f, modifier = Modifier.box(t, Color.Transparent, radius = 6f).tap { host.respawn() }.padding(horizontal = 14.dp, vertical = 6.dp))
                // the canvas fills much of the screen, so touch needs a way to scroll the page again
                MText(if (play) "drag: play" else "drag: scroll", t.text, 13f,
                    modifier = Modifier.box(t, Color.Transparent, radius = 6f, stroke = if (play) t.amber else t.line).tap { play = !play }.padding(horizontal = 14.dp, vertical = 6.dp))
            }
        }
    }
}
