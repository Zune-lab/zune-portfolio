package dev.zune.portfolio.creatures

import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

// Port of src/components/lab/Reptile/creature.js: a procedural lizard (random number of legs) that follows your finger.
// The skeleton is a chain of `Segment`s; legs are inverse-kinematics `LegSystem`s that step towards a foothold.

private class Env { lateinit var g: Ctx2D; var mx = 0.0; var my = 0.0 }
private val env = Env()

private open class Node(var x: Double, var y: Double, var absAngle: Double) {
    val children = ArrayList<Segment>()
}

private class Segment(val parent: Node, val size: Double, angle: Double, val range: Double, val stiffness: Double) :
    Node(0.0, 0.0, parent.absAngle + angle) {
    var relAngle = angle
    val defAngle = angle

    init {
        parent.children.add(this)
        updateRelative(false, true)
    }

    fun updateRelative(iter: Boolean, flex: Boolean) {
        relAngle -= 2 * PI * floor((relAngle - defAngle) / 2 / PI + 0.5)
        if (flex) relAngle = min(defAngle + range / 2, max(defAngle - range / 2, (relAngle - defAngle) / stiffness + defAngle))
        absAngle = parent.absAngle + relAngle
        x = parent.x + cos(absAngle) * size
        y = parent.y + sin(absAngle) * size
        if (iter) for (c in children) c.updateRelative(iter, flex)
    }

    /** only adds a line to the current path: `Body.draw` strokes once for the whole animal */
    fun draw(iter: Boolean) {
        env.g.moveTo(parent.x.toFloat(), parent.y.toFloat())
        env.g.lineTo(x.toFloat(), y.toFloat())
        if (iter) for (c in children) c.draw(true)
    }

    fun follow(iter: Boolean) {
        val px = parent.x
        val py = parent.y
        val dist = max(((x - px) * (x - px) + (y - py) * (y - py)).pow(0.5), 1e-9) // never divide by 0: NaN would ruin the whole animal
        x = px + size * (x - px) / dist
        y = py + size * (y - py) / dist
        absAngle = atan2(y - py, x - px)
        relAngle = absAngle - parent.absAngle
        updateRelative(false, true)
        if (iter) for (c in children) c.follow(true)
    }
}

/** the chain of segments from the limb's root down to `end`; stops early at the body, so `length` can come out shorter */
private class Chain(end: Segment, length: Int) {
    val nodes = ArrayList<Segment>()
    var length = max(1, length)
    init {
        var node: Node = end
        for (i in 0 until length) {
            nodes.add(0, node as Segment)
            node = node.parent
            if (node !is Segment) { this.length = i + 1; break }
        }
    }
    val hip: Node get() = nodes[0].parent
}

private open class LimbSystem(val end: Segment, length: Int, val speed: Double, val creature: Body) {
    private val chain = Chain(end, length)
    val nodes: List<Segment> = chain.nodes
    val hip: Node = chain.hip

    init { creature.systems.add(this) }

    fun moveTo(tx: Double, ty: Double) {
        var x = tx
        var y = ty
        nodes[0].updateRelative(true, true)
        val dist = ((x - end.x) * (x - end.x) + (y - end.y) * (y - end.y)).pow(0.5)
        var len = max(0.0, dist - speed)
        for (i in nodes.indices.reversed()) {
            val node = nodes[i]
            val ang = atan2(node.y - y, node.x - x)
            node.x = x + len * cos(ang)
            node.y = y + len * sin(ang)
            x = node.x; y = node.y
            len = node.size
        }
        for (node in nodes) {
            node.absAngle = atan2(node.y - node.parent.y, node.x - node.parent.x)
            node.relAngle = node.absAngle - node.parent.absAngle
            for (child in node.children) if (nodes.none { it === child }) child.updateRelative(true, false)
        }
    }

    open fun update() = moveTo(env.mx, env.my)
}

private class LegSystem(end: Segment, length: Int, speed: Double, creature: Body) : LimbSystem(end, length, speed, creature) {
    var goalX = end.x
    var goalY = end.y
    var step = 0            // 0 stand still, 1 move forward, 2 move towards foothold
    var forwardness = 0.0
    val reach = 0.9 * ((end.x - hip.x) * (end.x - hip.x) + (end.y - hip.y) * (end.y - hip.y)).pow(0.5)
    val swing: Double
    val swingOffset: Double

    init {
        // where the foot goal is placed, relative to the hip
        var relAngle = creature.absAngle - atan2(end.y - hip.y, end.x - hip.x)
        relAngle -= 2 * PI * floor(relAngle / 2 / PI + 0.5)
        swing = -relAngle + (if (relAngle < 0) 1.0 else -1.0) * PI / 2
        swingOffset = creature.absAngle - hip.absAngle
    }

    override fun update() {
        moveTo(goalX, goalY)
        if (step == 0) {
            val dist = ((end.x - goalX) * (end.x - goalX) + (end.y - goalY) * (end.y - goalY)).pow(0.5)
            if (dist > 1) {
                step = 1
                goalX = hip.x + reach * cos(swing + hip.absAngle + swingOffset) + (2 * Random.nextDouble() - 1) * reach / 2
                goalY = hip.y + reach * sin(swing + hip.absAngle + swingOffset) + (2 * Random.nextDouble() - 1) * reach / 2
            }
        } else if (step == 1) {
            val theta = atan2(end.y - hip.y, end.x - hip.x) - hip.absAngle
            val dist = ((end.x - hip.x) * (end.x - hip.x) + (end.y - hip.y) * (end.y - hip.y)).pow(0.5)
            val forwardness2 = dist * cos(theta)
            val dF = forwardness - forwardness2
            forwardness = forwardness2
            if (dF * dF < 1) {
                step = 0
                goalX = hip.x + (end.x - hip.x)
                goalY = hip.y + (end.y - hip.y)
            }
        }
    }
}

private class Body(
    x: Double, y: Double, angle: Double,
    val fAccel: Double, val fFric: Double, val fRes: Double, val fThresh: Double,
    val rAccel: Double, val rFric: Double, val rRes: Double, val rThresh: Double,
) : Node(x, y, angle) {
    var fSpeed = 0.0
    var speed = 0.0
    var rSpeed = 0.0
    val systems = ArrayList<LimbSystem>()

    /** physics only: the stage draws separately so a 120 Hz screen doesn't run the lizard 4× too fast */
    fun follow(tx: Double, ty: Double) {
        val dist = ((x - tx) * (x - tx) + (y - ty) * (y - ty)).pow(0.5)
        val angle = atan2(ty - y, tx - x)
        // forward
        var accel = fAccel
        if (systems.isNotEmpty()) accel *= systems.count { (it as? LegSystem)?.step == 0 }.toDouble() / systems.size
        fSpeed += if (dist > fThresh) accel else 0.0
        fSpeed *= 1 - fRes
        speed = max(0.0, fSpeed - fFric)
        // rotation
        var dif = absAngle - angle
        dif -= 2 * PI * floor(dif / (2 * PI) + 0.5)
        if (abs(dif) > rThresh && dist > fThresh) rSpeed -= rAccel * (if (dif > 0) 1 else -1)
        rSpeed *= 1 - rRes
        if (abs(rSpeed) > rFric) rSpeed -= rFric * (if (rSpeed > 0) 1 else -1) else rSpeed = 0.0
        // position
        absAngle += rSpeed
        absAngle -= 2 * PI * floor(absAngle / (2 * PI) + 0.5)
        x += speed * cos(absAngle)
        y += speed * sin(absAngle)
        absAngle += PI
        for (c in children) c.follow(true)
        for (s in systems) s.update()
        absAngle -= PI
    }

    fun draw() {
        val g = env.g
        val r = 4.0
        g.beginPath()
        g.arc(x.toFloat(), y.toFloat(), r.toFloat(), (PI / 4 + absAngle).toFloat(), (7 * PI / 4 + absAngle).toFloat())
        g.moveTo((x + r * cos(7 * PI / 4 + absAngle)).toFloat(), (y + r * sin(7 * PI / 4 + absAngle)).toFloat())
        g.lineTo((x + r * cos(absAngle) * sqrt(2.0)).toFloat(), (y + r * sin(absAngle) * sqrt(2.0)).toFloat())
        g.lineTo((x + r * cos(PI / 4 + absAngle)).toFloat(), (y + r * sin(PI / 4 + absAngle)).toFloat())
        for (c in children) c.draw(true)
        g.stroke() // one stroke for head + the whole body, legs and tail
    }
}

/** a vertebra with two thin "ribs"; neck and tail share it, only the rib tip length differs */
private fun addRibbedSegment(spinal: Node, s: Double, tipLen: Double): Segment {
    val seg = Segment(spinal, s * 4, 0.0, 3.1415 * 2 / 3, 1.1)
    for (ii in doubleArrayOf(-1.0, 1.0)) {
        var node = Segment(seg, s * 3, ii, 0.1, 2.0)
        repeat(3) { node = Segment(node, tipLen, -ii * 0.1, 0.1, 2.0) }
    }
    return seg
}

private fun setupLizard(size: Double, legs: Int, tail: Int, w: Double, h: Double): Body {
    val s = size
    // (x, y, angle, fAccel, fFric, fRes, fThresh, rAccel, rFric, rRes, rThresh)
    val critter = Body(w / 2, h / 2, 0.0, s * 10, s * 2, 0.5, 16.0, 0.5, 0.085, 0.5, 0.3)
    var spinal: Node = critter
    // neck
    repeat(6) { spinal = addRibbedSegment(spinal, s, s * 0.1) }
    // torso and legs
    for (i in 0 until legs) {
        if (i > 0) {
            // vertebrae and ribs
            repeat(6) {
                spinal = Segment(spinal, s * 4, 0.0, 1.571, 1.5)
                for (iii in doubleArrayOf(-1.0, 1.0)) {
                    var node = Segment(spinal, s * 3, iii * 1.571, 0.1, 1.5)
                    repeat(3) { node = Segment(node, s * 3, -iii * 0.3, 0.1, 2.0) }
                }
            }
        }
        // legs and shoulders
        for (ii in doubleArrayOf(-1.0, 1.0)) {
            var node = Segment(spinal, s * 12, ii * 0.785, 0.0, 8.0)            // hip
            node = Segment(node, s * 16, -ii * 0.785, 6.28, 1.0)                // humerus
            node = Segment(node, s * 16, ii * 1.571, 3.1415, 2.0)               // forearm
            for (iii in 0 until 4) Segment(node, s * 4, (iii / 3.0 - 0.5) * 1.571, 0.1, 4.0) // fingers
            LegSystem(node, 3, s * 12, critter)
        }
    }
    // tail
    for (i in 0 until tail) spinal = addRibbedSegment(spinal, s, (s * 3 * (tail - i)) / tail)
    return critter
}

class ReptileCreature(w: Float, h: Float) : Creature {
    private val critter: Body
    override val label: String
    private var acc = 0.0

    init {
        // a new animal for the stage: random number of legs and tail length (same as the original, scaled to fit the frame)
        val legs = (1..12).random()
        val size = 4.5 / sqrt(legs.toDouble())
        val tail = (4..(4 + legs * 8)).random()
        // rough body length: a narrow frame (phone) with a long animal would coil into a heap, so shrink it to ~55% of the diagonal
        val length = size * (6 + 24 * (legs - 1) + tail)
        val fit = max(0.5, min(1.0, (hypot(w.toDouble(), h.toDouble()) * 0.55) / length))
        critter = setupLizard(size * fit, legs, tail, w.toDouble(), h.toDouble())
        label = "move your cursor, it follows · $legs legs"
    }

    override fun step(api: StageApi) {
        env.g = api.g
        env.mx = api.mouse.x.toDouble(); env.my = api.mouse.y.toDouble()
        api.g.lineWidth = 1f; api.g.lineCap = StrokeCap.Butt; api.g.lineJoin = StrokeJoin.Miter // thin default stroke, like the original
        acc += api.dt
        var n = 0
        while (acc >= STEP_S && n < 4) { critter.follow(env.mx, env.my); acc -= STEP_S; n++ }
        if (n == 4) acc = 0.0
        critter.draw()
    }

    private companion object { const val STEP_S = 1.0 / 30 } // the web caps this creature at ~30 frames per second
}

fun makeReptile(w: Float, h: Float): Creature = ReptileCreature(w, h)
