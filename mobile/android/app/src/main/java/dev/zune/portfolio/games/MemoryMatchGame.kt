package dev.zune.portfolio.games

import android.content.Context
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.widthIn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.zune.portfolio.core.LocalApp
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.theme.Skin
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.tap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MemoryCard(val id: Int, val sym: String)

/** Port of MemoryMatch.jsx: flip two cards at a time, match the 6 code symbols in the fewest moves. */
class MemoryModel(private val ctx: Context, private val scope: CoroutineScope) {
    private val bestKey = "memory-best" // record = fewest moves

    var deck by mutableStateOf(shuffle()); private set
    var flipped by mutableStateOf(listOf<Int>()); private set
    var done by mutableStateOf(setOf<String>()); private set
    var moves by mutableStateOf(0); private set
    var round by mutableStateOf(0); private set
    var best by mutableStateOf(Best.read(ctx, bestKey)); private set
    var newBest by mutableStateOf(false); private set
    var onRecord: ((Int) -> Unit)? = null
    private var timer: Job? = null

    private fun shuffle() = (MemoryCfg.symbols + MemoryCfg.symbols).mapIndexed { id, sym -> MemoryCard(id, sym) }.shuffled()

    val won get() = done.size == MemoryCfg.symbols.size

    fun reset() {
        timer?.cancel()
        deck = shuffle()
        round += 1
        flipped = emptyList(); done = emptySet(); moves = 0; newBest = false
    }

    fun stop() { timer?.cancel() }

    fun flip(i: Int) {
        if (flipped.size >= 2 || i in flipped || deck[i].sym in done) return
        flipped = flipped + i
        if (flipped.size < 2) return
        moves += 1
        val (a, b) = flipped
        if (deck[a].sym == deck[b].sym) {
            done = done + deck[a].sym
            flipped = emptyList()
            if (won) {
                newBest = Best.record(ctx, bestKey, moves, lowerIsBetter = true)
                best = Best.read(ctx, bestKey)
                if (newBest) onRecord?.invoke(best)
            }
        } else {
            timer = scope.launch { delay(MemoryCfg.MISMATCH_MS); flipped = emptyList() }
        }
    }
}

@Composable
fun MemoryMatchGame() {
    val t = theme()
    val app = LocalApp.current
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val m = remember { MemoryModel(ctx, scope) }
    var unlocked by remember { mutableStateOf(listOf<Skin>()) }
    m.onRecord = { best -> unlocked = app.themeStore.report("memory-best", best) }
    DisposableEffect(Unit) { onDispose { m.stop() } }

    GameFrame(
        stats = listOf(Stat("moves", "${m.moves}", t.amber), Stat("pairs", "${m.done.size}/${MemoryCfg.symbols.size}", t.green), Stat("best", if (m.best == 0) "-" else "${m.best}")),
        action = if (m.won) "play again" else "shuffle",
        onAction = { unlocked = emptyList(); m.reset() },
    ) {
        Box(Modifier.widthIn(max = 360.dp).fillMaxWidth().align(Alignment.CenterHorizontally)) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                for (r in 0 until 3) Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    for (c in 0 until 4) {
                        val i = r * 4 + c
                        val card = m.deck[i]
                        val matched = card.sym in m.done
                        val up = matched || i in m.flipped
                        // keyed by round: a new game rebuilds the cards so they don't slide to new places while face down
                        androidx.compose.runtime.key(m.round, card.id) {
                            Flip(up, matched, card.sym, Modifier.weight(1f).aspectRatio(1f).tap { m.flip(i) })
                        }
                    }
                }
            }
            if (m.won) GameOverlay {
                Centered("all merged in ${m.moves} moves", t.text)
                Centered(if (m.newBest) "new best!" else "can you do it in fewer?", t.dim)
                UnlockNote(unlocked)
            }
        }
    }
}

/** a card that turns around its vertical axis: the front below 90°, the mirrored back above */
@Composable
private fun Flip(up: Boolean, matched: Boolean, sym: String, modifier: Modifier) {
    val t = theme()
    val angle by animateFloatAsState(if (up) 180f else 0f, tween(300), label = "flip")
    val tint = if (matched) t.green else t.amber
    Box(
        modifier.graphicsLayer { rotationY = angle; cameraDistance = 12f * density },
        contentAlignment = Alignment.Center,
    ) {
        if (angle < 90f) {
            Box(Modifier.fillMaxWidth().aspectRatio(1f).box(t, t.panel, radius = 8f), contentAlignment = Alignment.Center) { MText("?", t.dim, 15f) }
        } else {
            // the back is mirrored by the 180° rotation, so mirror it again
            Box(Modifier.fillMaxWidth().aspectRatio(1f).graphicsLayer { rotationY = 180f }.box(t, t.panel, radius = 8f, stroke = tint), contentAlignment = Alignment.Center) {
                MText(sym, tint, 16f, FontWeight.Bold)
            }
        }
    }
}
