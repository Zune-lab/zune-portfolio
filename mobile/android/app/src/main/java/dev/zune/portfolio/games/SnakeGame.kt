package dev.zune.portfolio.games

import android.content.Context
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.foundation.shape.RoundedCornerShape
import dev.zune.portfolio.core.LocalApp
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.theme.Skin
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.tap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class GridPoint(val x: Int, val y: Int)

enum class Dir(val dx: Int, val dy: Int) {
    UP(0, -1), DOWN(0, 1), LEFT(-1, 0), RIGHT(1, 0);
    val opposite get() = when (this) { UP -> DOWN; DOWN -> UP; LEFT -> RIGHT; RIGHT -> LEFT }
}

/** Snake rules (port of Snake.jsx): 18×18 board, speeds up per dot eaten, wall or body = game over, full board = win. */
class SnakeModel(private val ctx: Context, private val scope: CoroutineScope) {
    private val bestKey = "snake-best"

    var snake by mutableStateOf(listOf<GridPoint>()); private set
    var food by mutableStateOf<GridPoint?>(null); private set
    var score by mutableStateOf(0); private set
    var status by mutableStateOf(RoundStatus.IDLE); private set
    var won by mutableStateOf(false); private set
    var best by mutableStateOf(Best.read(ctx, bestKey)); private set
    var newBest by mutableStateOf(false); private set
    /** the app is in the background: freeze the snake instead of letting it die unseen */
    var paused = false
    var onRecord: ((Int) -> Unit)? = null

    private var dir = Dir.RIGHT
    private val queue = ArrayDeque<Dir>()
    private var loop: Job? = null

    init { reset() }

    private fun reset() {
        snake = List(SnakeCfg.START_LENGTH) { GridPoint(SnakeCfg.START_X - it, SnakeCfg.START_Y) }
        dir = Dir.RIGHT; queue.clear(); score = 0; won = false
        food = placeFood()
    }

    private fun placeFood(): GridPoint? {
        val n = SnakeCfg.GRID
        val taken = snake.map { it.y * n + it.x }.toSet()
        val free = (0 until n * n).filter { it !in taken }
        return free.randomOrNull()?.let { GridPoint(it % n, it / n) }
    }

    fun start() {
        loop?.cancel()
        reset()
        newBest = false
        status = RoundStatus.PLAYING
        loop = scope.launch { run() }
    }

    fun stop() { loop?.cancel() }

    fun turn(d: Dir) {
        if (status != RoundStatus.PLAYING) return
        val last = queue.lastOrNull() ?: dir
        if (d == last || d == last.opposite || queue.size >= SnakeCfg.MAX_QUEUED_TURNS) return
        queue.addLast(d)
    }

    /** one step; false = dead (wall, body) or board cleared */
    private fun tick(): Boolean {
        queue.removeFirstOrNull()?.let { dir = it }
        val head = snake[0]
        val nx = head.x + dir.dx
        val ny = head.y + dir.dy
        val f = food
        val eating = f != null && nx == f.x && ny == f.y
        val body = if (eating) snake else snake.dropLast(1) // the tail moves away, so it doesn't count
        val n = SnakeCfg.GRID
        if (nx < 0 || ny < 0 || nx >= n || ny >= n || body.any { it.x == nx && it.y == ny }) return false
        snake = listOf(GridPoint(nx, ny)) + (if (eating) snake else snake.dropLast(1))
        if (!eating) return true
        score += 1
        food = placeFood()
        if (food == null) won = true
        return food != null
    }

    private suspend fun run() {
        var wait = SnakeCfg.FIRST_STEP_MS
        while (status == RoundStatus.PLAYING) {
            delay(wait)
            if (paused) { wait = 50; continue }
            if (!tick()) { finish(); return }
            wait = maxOf(SnakeCfg.MIN_STEP_MS, SnakeCfg.STEP_MS - score * SnakeCfg.SPEED_UP_MS).toLong()
        }
    }

    private fun finish() {
        newBest = Best.record(ctx, bestKey, score)
        best = Best.read(ctx, bestKey)
        status = RoundStatus.OVER
        if (newBest) onRecord?.invoke(best)
    }
}

@Composable
fun SnakeGame() {
    val t = theme()
    val app = LocalApp.current
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val m = remember { SnakeModel(ctx, scope) }
    var unlocked by remember { mutableStateOf(listOf<Skin>()) }
    m.onRecord = { best -> unlocked = app.themeStore.report("snake-best", best) }

    // pause while the app is in the background; stop the loop when the game leaves the screen
    val owner = LocalLifecycleOwner.current
    DisposableEffect(owner) {
        val obs = LifecycleEventObserver { _, e ->
            if (e == Lifecycle.Event.ON_PAUSE) m.paused = true else if (e == Lifecycle.Event.ON_RESUME) m.paused = false
        }
        owner.lifecycle.addObserver(obs)
        onDispose { owner.lifecycle.removeObserver(obs); m.stop() }
    }

    GameFrame(
        stats = listOf(Stat("score", "${m.score}", t.green), Stat("best", if (m.best == 0) "-" else "${m.best}")),
        action = actionTitle(m.status),
        onAction = { unlocked = emptyList(); m.start() },
    ) {
        Box(Modifier.widthIn(max = 360.dp).fillMaxWidth().aspectRatio(1f).align(Alignment.CenterHorizontally)) {
            Board(m)
            if (m.status != RoundStatus.PLAYING) GameOverlay {
                if (m.status == RoundStatus.IDLE) {
                    Centered("eat the dots, don't eat yourself.", t.text)
                    Centered("swipe on the board, or use the pad.", t.dim)
                } else {
                    Centered("${if (m.won) "board cleared: " else "segfault: "}${m.score} eaten", t.text)
                    Centered(if (m.newBest) "new best!" else "one more try?", t.dim)
                    UnlockNote(unlocked)
                }
            }
        }
        DPad(m)
    }
}

@Composable
private fun Board(m: SnakeModel) {
    val t = theme()
    val n = SnakeCfg.GRID
    // turn as soon as the finger has moved far enough, then take that point as the new origin so one long stroke can turn twice
    Canvas(
        Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(t.r(8f).dp)).box(t, t.panel, radius = 8f)
            .pointerInput(Unit) {
                var acc = Offset.Zero
                detectDragGestures(onDragStart = { acc = Offset.Zero }, onDragEnd = { acc = Offset.Zero }) { change, drag ->
                    change.consume()
                    acc += drag
                    if (maxOf(kotlin.math.abs(acc.x), kotlin.math.abs(acc.y)) >= SnakeCfg.SWIPE_MIN_PX * density) {
                        m.turn(if (kotlin.math.abs(acc.x) > kotlin.math.abs(acc.y)) (if (acc.x > 0) Dir.RIGHT else Dir.LEFT) else (if (acc.y > 0) Dir.DOWN else Dir.UP))
                        acc = Offset.Zero
                    }
                }
            },
    ) {
        val cell = size.width / n
        for (x in 0 until n) for (y in 0 until n) if ((x + y) % 2 == 0) {
            drawRect(t.line, Offset(x * cell, y * cell), Size(cell, cell))
        }
        m.food?.let { f ->
            drawCircle(t.amber, radius = cell * 0.35f, center = Offset(f.x * cell + cell / 2, f.y * cell + cell / 2))
        }
        m.snake.forEachIndexed { i, s ->
            drawRect(t.green.copy(alpha = if (i == 0) 1f else 0.8f), Offset(s.x * cell + 1, s.y * cell + 1), Size(cell - 2, cell - 2))
        }
    }
}

@Composable
private fun DPad(m: SnakeModel) {
    val t = theme()
    @Composable fun key(label: String, d: Dir) =
        MText(label, t.text, 16f, align = androidx.compose.ui.text.style.TextAlign.Center,
            modifier = Modifier.size(44.dp).box(t, Color.Transparent, radius = 6f).tap { m.turn(d) }.padding(top = 10.dp))
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        key("↑", Dir.UP)
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { key("←", Dir.LEFT); key("↓", Dir.DOWN); key("→", Dir.RIGHT) }
    }
}
