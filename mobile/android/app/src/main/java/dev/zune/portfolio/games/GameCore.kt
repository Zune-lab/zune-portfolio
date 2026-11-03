package dev.zune.portfolio.games

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import dev.zune.portfolio.core.storageKey
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.theme.Skin
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.Panel
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.tap

// Port of src/config/games.js: every hard number of the mini games lives here.
object SnakeCfg {
    const val GRID = 18
    const val START_X = 5
    const val START_Y = 9
    const val START_LENGTH = 3
    const val FIRST_STEP_MS = 140L
    const val STEP_MS = 140
    const val MIN_STEP_MS = 60
    const val SPEED_UP_MS = 3
    const val SWIPE_MIN_PX = 20f
    const val MAX_QUEUED_TURNS = 2
}

object BugCfg {
    const val CELLS = 9
    const val DURATION_S = 30
    const val LIFE_START_MS = 900
    const val LIFE_MIN_MS = 450
    const val LIFE_SHRINK_MS_PER_S = 15
    const val RESPAWN_AFTER_HIT_MS = 120L
}

object MemoryCfg {
    val symbols = listOf("{ }", "</>", "[ ]", "=>", "&&", "#!")
    const val MISMATCH_MS = 750L
}

/** Port of src/lib/useBest.js: records live in SharedPreferences under the same keys as the web's localStorage. */
object Best {
    private fun prefs(ctx: Context) = ctx.getSharedPreferences("zune", Context.MODE_PRIVATE)

    fun read(ctx: Context, key: String): Int = prefs(ctx).getInt(storageKey(key), 0)

    /** returns true when `n` beats the record (lowerIsBetter: fewest moves; no record yet = the first game always counts) */
    fun record(ctx: Context, key: String, n: Int, lowerIsBetter: Boolean = false): Boolean {
        val cur = read(ctx, key)
        val beats = if (lowerIsBetter) cur == 0 || n < cur else n > cur
        if (beats) prefs(ctx).edit().putInt(storageKey(key), n).apply()
        return beats
    }
}

enum class RoundStatus { IDLE, PLAYING, OVER }

fun actionTitle(s: RoundStatus) = when (s) { RoundStatus.PLAYING -> "restart"; RoundStatus.OVER -> "play again"; RoundStatus.IDLE -> "start" }

class Stat(val label: String, val value: String, val color: Color? = null)

/** stat bar + main button (GameShell.jsx GameFrame) */
@Composable
fun GameFrame(stats: List<Stat>, action: String, onAction: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    val t = theme()
    Panel {
        Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    stats.forEach { s ->
                        Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                            MText(s.label, t.dim, 13f)
                            MText(s.value, s.color ?: t.text, 13f)
                        }
                    }
                }
                MText(action, t.text, 13f, modifier = Modifier.box(t, Color.Transparent, radius = 6f).tap(onAction).padding(horizontal = 14.dp, vertical = 6.dp))
            }
            content()
        }
    }
}

/** translucent cover over the board (start / game over screens) */
@Composable
fun BoxScope.GameOverlay(content: @Composable ColumnScope.() -> Unit) {
    val t = theme()
    Column(
        Modifier.fillMaxSize().background(t.bg.copy(alpha = 0.82f), androidx.compose.foundation.shape.RoundedCornerShape(t.r(8f).dp)).padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterVertically),
    ) { content() }
}

@Composable
fun Centered(text: String, color: Color, weight: FontWeight = FontWeight.Normal) = MText(text, color, 13f, weight, align = TextAlign.Center)

/** "skin unlocked: matrix" (the web shows it as a toast) */
@Composable
fun UnlockNote(skins: List<Skin>) {
    if (skins.isEmpty()) return
    val t = theme()
    MText("${if (skins.size > 1) "skins" else "skin"} unlocked: ${skins.joinToString(", ") { it.label }}", t.amber, 12f)
}
