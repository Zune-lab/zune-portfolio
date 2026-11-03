package dev.zune.portfolio.games

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import dev.zune.portfolio.core.LocalApp
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.theme.Skin
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.box
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Port of BugSquash.jsx: a bug pops up in a random cell, tap it before it hides; they get quicker as time passes. */
class BugModel(private val ctx: Context, private val scope: CoroutineScope) {
    private val bestKey = "bugsquash-best"

    var timeLeft by mutableStateOf(BugCfg.DURATION_S); private set
    var score by mutableStateOf(0); private set
    var misses by mutableStateOf(0); private set
    var active by mutableStateOf(-1); private set
    var status by mutableStateOf(RoundStatus.IDLE); private set
    var best by mutableStateOf(Best.read(ctx, bestKey)); private set
    var newBest by mutableStateOf(false); private set
    var onRecord: ((Int) -> Unit)? = null

    private var clock: Job? = null
    private var spawnJob: Job? = null

    val accuracy: Int get() { val total = score + misses; return if (total == 0) 0 else Math.round(score * 100f / total) }

    fun start() {
        halt()
        timeLeft = BugCfg.DURATION_S; score = 0; misses = 0; active = -1; newBest = false
        status = RoundStatus.PLAYING
        run()
    }

    fun stop() { halt(); active = -1 }

    /** app went to the background: stop clock and bugs (like Snake), `resume()` continues */
    fun pause() { if (status == RoundStatus.PLAYING) { halt(); active = -1 } }
    fun resume() { if (status == RoundStatus.PLAYING && clock == null) run() }

    private fun halt() { clock?.cancel(); clock = null; spawnJob?.cancel(); spawnJob = null }

    private fun run() {
        spawn()
        clock = scope.launch {
            while (true) {
                delay(1000)
                timeLeft -= 1
                if (timeLeft <= 0) { finish(); return@launch }
            }
        }
    }

    private fun spawn() {
        val elapsed = BugCfg.DURATION_S - timeLeft
        val life = maxOf(BugCfg.LIFE_MIN_MS, BugCfg.LIFE_START_MS - elapsed * BugCfg.LIFE_SHRINK_MS_PER_S).toLong() // bugs live shorter and shorter
        var next: Int
        do { next = (0 until BugCfg.CELLS).random() } while (next == active)
        active = next
        spawnJob = scope.launch { delay(life); spawn() }
    }

    fun press(i: Int) {
        if (status != RoundStatus.PLAYING) return
        if (i == active) {
            score += 1
            active = -1
            spawnJob?.cancel()
            spawnJob = scope.launch { delay(BugCfg.RESPAWN_AFTER_HIT_MS); spawn() } // the next bug pops up almost at once
        } else {
            misses += 1
        }
    }

    private fun finish() {
        halt()
        active = -1
        newBest = Best.record(ctx, bestKey, score)
        best = Best.read(ctx, bestKey)
        status = RoundStatus.OVER
        if (newBest) onRecord?.invoke(best)
    }
}

@Composable
fun BugSquashGame() {
    val t = theme()
    val app = LocalApp.current
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val m = remember { BugModel(ctx, scope) }
    var unlocked by remember { mutableStateOf(listOf<Skin>()) }
    m.onRecord = { best -> unlocked = app.themeStore.report("bugsquash-best", best) }

    val owner = LocalLifecycleOwner.current
    DisposableEffect(owner) {
        val obs = LifecycleEventObserver { _, e ->
            if (e == Lifecycle.Event.ON_PAUSE) m.pause() else if (e == Lifecycle.Event.ON_RESUME) m.resume()
        }
        owner.lifecycle.addObserver(obs)
        onDispose { owner.lifecycle.removeObserver(obs); m.stop() }
    }

    GameFrame(
        stats = listOf(Stat("bugs", "${m.score}", t.green), Stat("time", "${m.timeLeft}s", t.amber), Stat("best", if (m.best == 0) "-" else "${m.best}")),
        action = actionTitle(m.status),
        onAction = { unlocked = emptyList(); m.start() },
    ) {
        val n = 3
        Box(Modifier.widthIn(max = 360.dp).fillMaxWidth().align(Alignment.CenterHorizontally)) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                for (r in 0 until n) Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    for (c in 0 until n) {
                        val i = r * n + c
                        Box(
                            Modifier.weight(1f).aspectRatio(1f).box(t, t.panel, radius = 8f)
                                // pointer-down, not click: a tap on a quick bug must not wait for the finger to lift
                                .pointerInput(Unit) { detectTapGestures(onPress = { m.press(i) }) },
                            contentAlignment = Alignment.Center,
                        ) {
                            if (i == m.active) MText("bug", t.bg, 13f, FontWeight.Bold, modifier = Modifier.background(t.amber, CircleShape).padding(horizontal = 10.dp, vertical = 4.dp))
                        }
                    }
                }
            }
            if (m.status != RoundStatus.PLAYING) GameOverlay {
                if (m.status == RoundStatus.IDLE) {
                    Centered("squash the bugs before time runs out.", t.text)
                    Centered("${BugCfg.DURATION_S} seconds. they get faster.", t.dim)
                } else {
                    Centered("ship it: ${m.score} bugs squashed", t.text)
                    Centered("accuracy ${m.accuracy}%${if (m.newBest) " · new best!" else ""}", t.dim)
                    UnlockNote(unlocked)
                }
            }
        }
    }
}
