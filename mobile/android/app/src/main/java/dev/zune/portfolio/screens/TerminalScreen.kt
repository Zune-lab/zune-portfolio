package dev.zune.portfolio.screens

import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.zune.portfolio.core.LocalApp
import dev.zune.portfolio.core.Site
import dev.zune.portfolio.core.TerminalEngine
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.ui.BlinkCursor
import dev.zune.portfolio.ui.Flow
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.code
import dev.zune.portfolio.ui.tap
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private data class TLine(val isCmd: Boolean, val text: String)

/**
 * The terminal window of the home page (src/components/home/Terminal/Terminal.jsx):
 * types its own intro when it scrolls into view (the LazyColumn composes it then), accepts commands,
 * or you tap a question chip.
 */
@Composable
fun TerminalScreen(onNavigate: (Tab) -> Unit) {
    val t = theme()
    val app = LocalApp.current
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val lines = remember { mutableStateListOf<TLine>() }
    var ready by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var value by remember { mutableStateOf("") }
    val history = remember { mutableListOf<String>() }
    var hIdx by remember { mutableIntStateOf(-1) }
    val scroll = rememberScrollState()
    val focus = remember { FocusRequester() }

    fun cap() { while (lines.size > 200) lines.removeAt(0) }
    fun exec(raw: String) = TerminalEngine.exec(raw, TerminalEngine.Context(app, onNavigate))

    // intro: types itself once (reduced motion = "remove animations" in developer/accessibility settings)
    LaunchedEffect(Unit) {
        val reduce = Settings.Global.getFloat(ctx.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
        for ((cmd, out) in TerminalEngine.intro(app.status.info.blurb)) {
            lines += TLine(true, if (reduce) cmd else "")
            if (!reduce) for (i in 1..cmd.length) { delay(45); lines[lines.lastIndex] = TLine(true, cmd.take(i)) }
            delay(250)
            lines += TLine(false, out)
            delay(350)
        }
        ready = true
    }

    LaunchedEffect(lines.size, ready) { delay(16); scroll.animateScrollTo(scroll.maxValue) }

    fun submit() {
        if (busy) return // a chip is typing: run() edits the last line, a manual command would mix with it
        val raw = value
        if (raw.isNotBlank()) history += raw
        hIdx = -1
        value = ""
        val r = exec(raw)
        if (r.clear) { lines.clear(); return }
        lines += TLine(true, raw)
        r.lines.forEach { lines += TLine(false, it) }
        cap()
    }

    /** tapping a question: the command types itself, then prints, so visitors don't need to know any command */
    fun run(cmd: String) {
        if (!ready || busy) return
        busy = true
        scope.launch {
            lines += TLine(true, "")
            for (i in 1..cmd.length) { delay(35); lines[lines.lastIndex] = TLine(true, cmd.take(i)) }
            delay(250)
            exec(cmd).lines.forEach { lines += TLine(false, it) }
            cap()
            busy = false
        }
    }

    /** +1 = older, -1 = newer (arrow keys in the web terminal; newer only while browsing so it never wipes what you typed) */
    fun browse(dir: Int) {
        if (dir > 0 && history.isNotEmpty()) {
            hIdx = minOf(hIdx + 1, history.lastIndex)
            value = history[history.lastIndex - hIdx]
        } else if (dir < 0 && hIdx >= 0) {
            hIdx = maxOf(hIdx - 1, -1)
            value = if (hIdx == -1) "" else history[history.lastIndex - hIdx]
        }
    }

    Column(Modifier.fillMaxWidth().box(t, t.inset)) {
        Row(Modifier.fillMaxWidth().background(t.panel).padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(t.danger, t.dotYellow, t.dotGreen).forEach { Box(Modifier.size(11.dp).background(it, CircleShape)) }
            }
            Spacer(Modifier.width(12.dp))
            MText("${Site.ID}@${Site.HOST}: ~", t.dim, 12f)
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(t.line))

        Column(
            Modifier.fillMaxWidth().height(260.dp).verticalScroll(scroll)
                .tap { if (ready) focus.requestFocus() }.padding(horizontal = 20.dp, vertical = 22.dp),
        ) {
            lines.forEach { l ->
                if (l.isCmd) MText(code("$ " to t.green, l.text to t.text), t.text, 13.5f, modifier = Modifier.padding(bottom = 2.dp))
                else MText(l.text, t.dim, 13.5f, modifier = Modifier.padding(bottom = 8.dp))
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                MText("$ ", t.green, 13.5f)
                if (!ready) BlinkCursor(8f, 16f)
                else BasicTextField(
                    value = value, onValueChange = { value = it }, singleLine = true,
                    textStyle = TextStyle(color = t.text, fontSize = 13.5.sp, fontFamily = FontFamily.Monospace),
                    cursorBrush = SolidColor(t.amber),
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None, autoCorrectEnabled = false, imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(onSend = { submit(); focus.requestFocus() }),
                    modifier = Modifier.weight(1f).focusRequester(focus),
                )
            }
        }

        Box(Modifier.fillMaxWidth().height(1.dp).background(t.line))
        Box(Modifier.fillMaxWidth().heightIn(min = 52.dp).padding(horizontal = 20.dp, vertical = 12.dp)) {
            if (ready) Flow(8f) {
                MText("ask:", t.dim, 12f, modifier = Modifier.padding(vertical = 5.dp))
                TerminalEngine.quick.forEach { (label, cmd) ->
                    MText(
                        label, t.dim, 12f,
                        modifier = Modifier.alpha(if (busy) 0.5f else 1f).box(t, androidx.compose.ui.graphics.Color.Transparent, radius = 2f)
                            .then(if (busy) Modifier else Modifier.tap { run(cmd) }).padding(horizontal = 10.dp, vertical = 5.dp),
                    )
                }
                listOf("↑" to 1, "↓" to -1).forEach { (arrow, dir) ->
                    MText(arrow, t.dim, 12f, modifier = Modifier.box(t, androidx.compose.ui.graphics.Color.Transparent, radius = 2f).tap { browse(dir) }.padding(horizontal = 10.dp, vertical = 5.dp))
                }
            }
        }
    }
}
