package dev.zune.portfolio.creatures

import androidx.compose.ui.graphics.Color
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.random.Random

// Port of src/components/lab/Moths/moths.js. Your finger is the lamp: moths spiral round it (dive in, get zapped, bounce out),
// their wings glow as they get close. Tap = lamp off: the swarm lands on the frame edge. Tap again: lamp on, they take off.
// Extras: wing dust, sparks + dizziness on a zap, blinking eyes in the dark, a candle (tap it to blow out; half the swarm prefers it),
// shake the lamp to scare them, and now and then a bat dives at the swarm.

private enum class Edge { TOP, BOTTOM, LEFT, RIGHT }

private class Moth(w: Double, h: Double) {
    val edge = listOf(Edge.TOP, Edge.TOP, Edge.LEFT, Edge.RIGHT, Edge.BOTTOM).random()
    var x = rand(0.0, w)
    var y = rand(0.0, h)
    var vx = rand(-40.0, 40.0)
    var vy = rand(-40.0, 40.0)
    var ang = rand(0.0, TAU)
    val size = rand(6.0, 9.0)
    var ph = rand(0.0, TAU)
    val flap = rand(15.0, 21.0)
    val orbit = rand(35.0, 105.0)
    val dir = if (Random.nextBoolean()) -1.0 else 1.0
    val speed = rand(70.0, 115.0)
    val seed = rand(0.0, TAU)
    val spots = randInt(0, 2)
    var dive = 0.0
    var nextDive = rand(3.0, 9.0)
    var fan = Random.nextBoolean()   // "candle party": likes the candle more than the lamp
    var t = 0                        // which light it follows when both are on: 0 = lamp, 1 = candle
    var nextPick = rand(3.0, 9.0)
    var scare = 0.0                  // > 0: panicking, flying away from (sx, sy)
    var sx = 0.0
    var sy = 0.0
    var dizzy = 0.0                  // just zapped: seconds left and spin rate (rad/s)
    var spin = 0.0
    var resting = false
    var wake = 0.0
    val fx = rand(0.06, 0.94)        // resting spot as a fraction along the edge (independent of the frame size)
}

private class Light(val c: Boolean) { var x = 0.0; var y = 0.0 }

/** wing dust, sparks and candle smoke share one shape */
private class Particle {
    var x = 0.0; var y = 0.0; var vx = 0.0; var vy = 0.0
    var life = 0.0; var max = 1.0; var r = 1.0; var sw = 0.0; var a = 0.0; var sp = 0.0
}

private class Bat(w: Double, h: Double) {
    private val side = if (Random.nextBoolean()) -1.0 else 1.0
    var x = if (side < 0) -50.0 else w + 50
    var y = rand(0.1, 0.5) * h
    var ang = if (side < 0) 0.0 else PI
    var ph = 0.0
    var age = 0.0
    var hunt = 5.0
    var hunting = true
    val exitX = if (side < 0) w + 90 else -90.0
    val exitY = rand(0.1, 0.6) * h
}

private class RestPoint(val x: Double, val y: Double, val ang: Double)

private fun restPoint(m: Moth, w: Double, h: Double): RestPoint {
    val pad = 9.0
    return when (m.edge) {
        Edge.TOP -> RestPoint(m.fx * w, pad, -PI / 2)
        Edge.BOTTOM -> RestPoint(m.fx * w, h - pad, PI / 2)
        Edge.LEFT -> RestPoint(pad, m.fx * h, PI)
        Edge.RIGHT -> RestPoint(w - pad, m.fx * h, 0.0)
    }
}

class MothsCreature(w: Float, h: Float) : Creature {
    private val n = randInt(4, 9)
    private val moths: List<Moth> = List(n) { Moth(w.toDouble(), h.toDouble()) }.also { list ->
        list.forEach { it.t = if (it.fan) 1 else 0 }
        if (list.none { it.fan }) list[0].fan = true
    }
    private var lamp = true
    private var seen = 0
    private var glowLevel = 1.0         // 0…1, eased when the lamp goes on/off
    private var zaps = 0                // times a moth hit a light
    private var bump = 0.0              // 0…1: the lamp / candle flashes when it zaps a moth
    private var bumpC = 0.0
    private val dust = ArrayList<Particle>()
    private val sparks = ArrayList<Particle>()
    private val smoke = ArrayList<Particle>()
    private var smokeFor = 0.0
    private var smokeAcc = 0.0
    // the candle stands at the bottom of the frame; its place is a fraction, so resizing keeps it right
    private val candleFx = rand(0.15, 0.85)
    private var candleOn = true
    private var candleLevel = 1.0
    private val lampL = Light(false)
    private val candL = Light(true)
    private var clock = 0.0
    private var shake = 0.0             // smoothed pointer speed (px/s)
    private var prevAx: Double? = null
    private var prevAy: Double? = null
    private var startleCd = 0.0
    private var startledUntil = -1.0
    private var bat: Bat? = null
    private var batTimer = rand(12.0, 20.0)

    override val label = "$n moths · your cursor is the lamp · click to switch it off"

    override fun caption(): String? {
        if (bat != null) return "$n moths · something is hunting them"
        if (clock < startledUntil) return "$n moths · you scared them"
        if (!lamp) {
            return if (candleOn) "$n moths · lamp off, the candle is still lit · click it to blow it out"
            else "$n moths · lights out · click anywhere to switch the lamp back on"
        }
        val hint = HINTS[floor(clock / 6).toInt() % HINTS.size]
        return "$n moths${if (zaps > 0) " · zapped $zaps×" else ""} · $hint"
    }

    // which light attracts this moth (null = nothing to follow: fly to rest)
    private fun lightFor(m: Moth): Light? = when {
        lamp && candleOn -> if (m.t == 1) candL else lampL
        lamp -> lampL
        candleOn && m.fan -> candL
        else -> null
    }

    private fun glowAt(g: Ctx2D, x: Double, y: Double, r: Double, alpha: Double, light: Boolean) {
        // both ends must be the SAME colour (alpha 0 at the rim): fading to "transparent black" leaves a grey ring
        val c = if (light) rgba(255.0, 176.0, 32.0) else rgba(255.0, 200.0, 87.0)
        val c0 = if (light) rgba(255.0, 176.0, 32.0, 0.0) else rgba(255.0, 200.0, 87.0, 0.0)
        g.globalAlpha = min(1.0, alpha).toFloat()
        g.fillStyle = g.radialGradient(x, y, 0.0, r, listOf(0f to c, 1f to c0))
        g.fillRect(x - r, y - r, r * 2, r * 2)
        g.globalAlpha = 1f
    }

    private fun spawnDust(x: Double, y: Double, spread: Double = 1.0) {
        if (dust.size > 90) return
        dust += Particle().apply {
            this.x = x; this.y = y; vx = rand(-9.0, 9.0) * spread; vy = rand(-4.0, 14.0) * spread
            max = rand(1.6, 3.2); r = rand(0.6, 1.5); sw = rand(0.0, TAU)
        }
    }

    private fun zap(m: Moth, onCandle: Boolean) {
        zaps++
        if (onCandle) bumpC = 1.0 else bump = 1.0
        m.dizzy = rand(0.8, 1.2)
        m.spin = rand(9.0, 14.0) * (if (Random.nextBoolean()) -1 else 1)
        m.dive = 0.0
        repeat(9) {
            sparks += Particle().apply { x = m.x; y = m.y; a = rand(0.0, TAU); sp = rand(70.0, 150.0); max = rand(0.25, 0.5) }
        }
        repeat(6) { spawnDust(m.x, m.y, 1.6) } // a hard zap shakes off some dust
    }

    // ---- step
    override fun step(api: StageApi) {
        val g = api.g
        val w = api.w.toDouble()
        val h = api.h.toDouble()
        val t = api.t
        val dt = api.dt
        val colors = api.colors
        val ax = api.aimX.toDouble()
        val ay = api.aimY.toDouble()
        val mouse = api.mouse
        clock = t
        lampL.x = ax; lampL.y = ay
        candL.x = candleFx * w; candL.y = h - 49

        // ---- tap: on the candle = blow out / relight it, anywhere else = lamp off / on
        if (mouse.clicks != seen) {
            seen = mouse.clicks
            if (abs(mouse.x - candL.x) < 24 && mouse.y > h - 64 && mouse.y < h - 6) {
                candleOn = !candleOn
                if (candleOn) moths.filter { it.fan }.forEach { it.wake = rand(0.0, 0.9) } else smokeFor = 2.6
            } else {
                lamp = !lamp
                if (lamp) moths.forEach { it.wake = rand(0.0, 0.9) }
            }
        }
        glowLevel += ((if (lamp) 1 else 0) - glowLevel) * min(1.0, 5 * dt)
        candleLevel += ((if (candleOn) 1 else 0) - candleLevel) * min(1.0, 8 * dt)
        bump = max(0.0, bump - dt * 3.2)
        bumpC = max(0.0, bumpC - dt * 3.2)

        // ---- shaking the lamp hard scares the nearby swarm
        val px = prevAx
        val py = prevAy
        if (px != null && py != null) {
            val jump = hypot(ax - px, ay - py)
            // a huge jump in one frame is the pointer "teleporting" (re-entering the frame), not shaking; capped so one jerk can't trigger it
            val v = if (jump > 80) 0.0 else min(2500.0, jump / dt)
            shake += (v - shake) * min(1.0, 10 * dt)
        }
        prevAx = ax; prevAy = ay
        startleCd = max(0.0, startleCd - dt)
        if (lamp && shake > 1000 && startleCd <= 0) {
            startleCd = 1.5
            startledUntil = t + 2.2
            for (m in moths) {
                if (m.resting || hypot(m.x - ax, m.y - ay) > 280) continue
                m.scare = rand(0.7, 1.2); m.sx = ax; m.sy = ay
                repeat(3) { spawnDust(m.x, m.y, 2.0) }
            }
        }

        // ---- candle smoke
        if (smokeFor > 0) {
            smokeFor -= dt; smokeAcc += dt
            while (smokeAcc > 0.12) {
                smokeAcc -= 0.12
                smoke += Particle().apply {
                    x = candL.x + rand(-1.0, 1.0); y = h - 43; vx = rand(-3.0, 3.0); vy = -rand(14.0, 24.0)
                    max = rand(1.6, 2.6); r = rand(1.5, 2.5); sw = rand(0.0, TAU)
                }
            }
        }

        // ---- the bat: now and then it dives at the middle of the swarm, then leaves
        val b = bat
        if (b != null) {
            b.age += dt; b.ph += 11 * dt
            var tx = w / 2
            var ty = h / 2
            if (b.hunting) {
                var cx = 0.0; var cy = 0.0; var k = 0.0
                for (m in moths) if (!m.resting) { cx += m.x; cy += m.y; k += 1 }
                if (k > 0) { tx = cx / k; ty = cy / k }
                b.hunt -= dt
                if (b.hunt <= 0 || (k > 0 && hypot(tx - b.x, ty - b.y) < 30)) b.hunting = false
            } else { tx = b.exitX; ty = b.exitY }
            val want = atan2(ty - b.y, tx - b.x)
            b.ang += angDiff(want, b.ang) * min(1.0, 1.8 * dt)
            val sp = if (b.hunting) 200.0 else 250.0
            b.x += cos(b.ang) * sp * dt
            b.y += sin(b.ang) * sp * dt
            val out = b.x < -70 || b.x > w + 70 || b.y < -70 || b.y > h + 70
            if ((out && !b.hunting && b.age > 1) || b.age > 20) { bat = null; batTimer = rand(25.0, 45.0) }
        } else {
            if (lamp || candleOn) batTimer -= dt
            if (batTimer <= 0) bat = Bat(w, h)
        }

        // ---- moths
        for (m in moths) {
            val light = lightFor(m)
            if (m.resting && light != null) {
                m.wake -= dt
                if (m.wake <= 0) {
                    m.resting = false
                    val dx = light.x - m.x
                    val dy = light.y - m.y
                    val dl = hypot(dx, dy).let { if (it == 0.0) 1.0 else it }
                    m.vx = dx / dl * 130 + rand(-30.0, 30.0)
                    m.vy = dy / dl * 130 + rand(-30.0, 30.0)
                }
            }
            if (m.resting) {
                val r = restPoint(m, w, h)
                m.x = r.x; m.y = r.y; m.ang = r.ang
                continue
            }

            // both lights on: now and then change mind to the other one (the candle party rarely switches)
            if (lamp && candleOn) {
                m.nextPick -= dt
                if (m.nextPick <= 0) {
                    m.t = if (Random.nextDouble() < (if (m.fan) 0.75 else 0.25)) 1 else 0
                    m.nextPick = rand(6.0, 14.0)
                }
            }

            // a bat close by: panic
            bat?.let { bb ->
                if (hypot(m.x - bb.x, m.y - bb.y) < 130) { m.scare = max(m.scare, 0.45); m.sx = bb.x; m.sy = bb.y }
            }

            m.ph += m.flap * (if (m.dizzy > 0 || m.scare > 0) 1.7 else 1.0) * dt
            m.dizzy = max(0.0, m.dizzy - dt)
            m.spin *= 0.15.pow(dt)
            val dvx: Double
            val dvy: Double
            if (m.scare > 0) {
                // scared: fly straight away from the source, wings going wild
                m.scare -= dt
                val dx = m.x - m.sx
                val dy = m.y - m.sy
                val d = hypot(dx, dy).let { if (it == 0.0) 1.0 else it }
                dvx = dx / d * 240 + sin(t * 11 + m.seed) * 40
                dvy = dy / d * 240 + cos(t * 12 + m.seed) * 40
            } else if (light != null) {
                val dx = light.x - m.x
                val dy = light.y - m.y
                val d = hypot(dx, dy).let { if (it == 0.0) 1.0 else it }
                val ux = dx / d
                val uy = dy / d
                // near a light it sheds wing dust
                if (Random.nextDouble() < dt * 5 * clamp(1 - d / 150, 0.0, 1.0)) {
                    spawnDust(m.x - cos(m.ang) * m.size, m.y - sin(m.ang) * m.size)
                }
                // spiral round the light: a tangent part + pull/push to a preferred radius (slowly oscillating); a smaller, gentler loop round the candle
                m.nextDive -= dt
                if (m.nextDive <= 0) { m.dive = 0.9; m.nextDive = rand(3.5, 8.0) }
                m.dive = max(0.0, m.dive - dt)
                val oScale = if (light.c) 0.65 else 1.0
                val rPref = if (m.dive > 0) 4.0 else m.orbit * oScale * (0.6 + 0.4 * cos(t * 0.45 + m.seed))
                val radial = clamp((d - rPref) * 2.4, -100.0, 170.0)
                val flutter = (sin(t * 9 + m.seed * 3) + sin(t * 14.3 + m.seed)) * 22
                if (m.dizzy > 0) {
                    // dizzy: no steering, drifts and sinks
                    dvx = m.vx * 0.5 + sin(t * 17 + m.seed) * 30
                    dvy = m.vy * 0.5 + 35 + cos(t * 13 + m.seed) * 30
                } else {
                    val spd = m.speed * (if (light.c) 0.8 else 1.0)
                    dvx = -uy * m.dir * spd + ux * radial + -uy * flutter
                    dvy = ux * m.dir * spd + uy * radial + ux * flutter
                }
                // touching the light: zapped, bounces off + sparks + dizzy
                if (d < 9 && m.dizzy <= 0) {
                    m.vx -= ux * 220; m.vy -= uy * 220
                    zap(m, light.c)
                }
            } else {
                // no light left: fly straight to the resting spot, slowing down on arrival
                val r = restPoint(m, w, h)
                val dx = r.x - m.x
                val dy = r.y - m.y
                val d = hypot(dx, dy).let { if (it == 0.0) 1.0 else it }
                val sp = min(150.0, d * 2.6 + 18)
                dvx = dx / d * sp + sin(t * 8 + m.seed) * 14
                dvy = dy / d * sp + cos(t * 9 + m.seed) * 14
                if (d < 3.5) { m.resting = true; continue }
            }
            val k = min(1.0, 3.5 * dt)
            m.vx += (dvx - m.vx) * k
            m.vy += (dvy - m.vy) * k
            m.x = clamp(m.x + m.vx * dt, 6.0, w - 6)
            m.y = clamp(m.y + m.vy * dt, 6.0, h - 6)
            val sp = hypot(m.vx, m.vy)
            if (m.dizzy > 0 && light != null && m.scare <= 0) {
                m.ang += m.spin * dt
            } else if (sp > 8) {
                m.ang += angDiff(atan2(m.vy, m.vx), m.ang) * min(1.0, 9 * dt)
            }
        }

        // ================= DRAW =================
        // light skins: the skin's amber is a dark brown (for reading text), which makes the glow a dirty smear: use real lamp yellow
        val light = colors.panelLight

        // the lamp: glow + core (off = only a faint ring and the whole frame darkens)
        val flick = if (lamp) 1 + sin(t * 31) * 0.015 + sin(t * 13) * 0.02 else 1.0
        if (glowLevel > 0.01) {
            glowAt(g, ax, ay, 120 * flick * (1 + 0.3 * bump), (if (light) 0.42 else 0.3) * glowLevel * (1 + 0.8 * bump), light)
        }
        if (glowLevel < 0.99) {
            g.fillColor(Color.Black)
            g.globalAlpha = (0.32 * (1 - glowLevel)).toFloat()
            g.fillRect(0.0, 0.0, w, h)
            g.globalAlpha = 1f
        }

        // candle: drawn AFTER the darkness so one corner stays lit when the lamp is off
        if (candleLevel > 0.02) {
            val cf = 1 + sin(t * 23) * 0.03 + sin(t * 9 + 1) * 0.04
            glowAt(g, candL.x, candL.y, 95 * cf * (1 + 0.3 * bumpC), (if (light) 0.4 else 0.3) * candleLevel * (1 + 0.8 * bumpC), light)
        }
        drawCandle(g, colors, w, h, t)

        // candle smoke
        g.fillColor(colors.dim)
        for (i in smoke.indices.reversed()) {
            val p = smoke[i]
            p.life += dt
            if (p.life >= p.max) { smoke.removeAt(i); continue }
            p.x += (p.vx + sin(t * 2.5 + p.sw) * 7) * dt
            p.y += p.vy * dt
            g.globalAlpha = (0.45 * (1 - p.life / p.max)).toFloat()
            g.beginPath()
            g.arc(p.x, p.y, p.r + p.life * 3.2, 0.0, TAU)
            g.fill()
        }
        g.globalAlpha = 1f

        g.strokeColor(colors.amber); g.fillColor(colors.amber); g.lineWidth = 1.4f
        g.beginPath()
        g.arc(ax, ay, 4.5 * flick + 2.5 * bump, 0.0, TAU)
        if (lamp) g.fill() else g.stroke()
        if (lamp) {
            g.globalAlpha = 0.5f; g.lineWidth = 1f
            g.beginPath()
            for (i in 0 until 8) {
                val a = i / 8.0 * TAU + t * 0.3
                g.moveTo(ax + cos(a) * 8, ay + sin(a) * 8)
                g.lineTo(ax + cos(a) * 12, ay + sin(a) * 12)
            }
            g.stroke()
            g.globalAlpha = 1f
        }

        // wing dust: floats down; glints amber inside a lit area (lamp or candle), dim as dust outside
        for (i in dust.indices.reversed()) {
            val p = dust[i]
            p.life += dt
            if (p.life >= p.max) { dust.removeAt(i); continue }
            p.vx += sin(t * 2 + p.sw) * 6 * dt
            p.vy += 6 * dt
            p.x += p.vx * dt; p.y += p.vy * dt
            val lit = max(clamp(1 - hypot(ax - p.x, ay - p.y) / 130, 0.0, 1.0) * glowLevel,
                clamp(1 - hypot(candL.x - p.x, candL.y - p.y) / 95, 0.0, 1.0) * candleLevel)
            val fade = 1 - p.life / p.max
            g.fillColor(if (lit > 0.05) colors.amber else colors.ink)
            g.globalAlpha = (fade * (if (lit > 0.05) 0.25 + 0.65 * lit else 0.22) * (0.7 + 0.3 * sin(t * 12 + p.sw))).toFloat()
            g.beginPath()
            g.arc(p.x, p.y, p.r, 0.0, TAU)
            g.fill()
        }
        // sparks when a moth is zapped
        g.strokeColor(colors.amber); g.lineWidth = 1.3f
        for (i in sparks.indices.reversed()) {
            val p = sparks[i]
            p.life += dt
            if (p.life >= p.max) { sparks.removeAt(i); continue }
            p.sp *= 0.02.pow(dt)
            p.x += cos(p.a) * p.sp * dt
            p.y += sin(p.a) * p.sp * dt
            g.globalAlpha = (1 - p.life / p.max).toFloat()
            g.beginPath()
            g.moveTo(p.x, p.y)
            g.lineTo(p.x - cos(p.a) * (2 + p.sp * 0.05), p.y - sin(p.a) * (2 + p.sp * 0.05))
            g.stroke()
        }
        g.globalAlpha = 1f

        // moths: drawn after the lights; wings glow with the distance to the light they follow
        for (m in moths) {
            val l = if (m.resting) null else lightFor(m)
            val lvl = if (l != null) (if (l.c) candleLevel else glowLevel) else 0.0
            val glow = if (l != null) clamp(1 - hypot(l.x - m.x, l.y - m.y) / 150, 0.0, 1.0) * lvl else 0.0
            drawMoth(g, m, colors, glow, 1 - glowLevel, t * 1000)
        }
        bat?.let { drawBat(g, it, colors) }
    }

    // ---- drawing
    private fun drawMoth(g: Ctx2D, m: Moth, colors: StageColors, glow: Double, dark: Double, now: Double) {
        val s = m.size
        // now and then (each moth out of phase) the antennae twitch and the wings tremble while resting
        val tw = if (m.resting) max(0.0, sin(now / 1700 + m.seed * 2) - 0.6) * 2.5 else 0.0
        g.save()
        g.translate(m.x, m.y)
        g.rotate(m.ang)
        g.strokeColor(colors.ink)
        g.lineWidth = 1.2f

        fun wing(path: () -> Unit) {
            g.beginPath()
            path()
            g.closePath()
            g.fillColor(colors.panel)
            g.globalAlpha = 1f
            g.fill()
            if (glow > 0.02) {
                g.fillColor(colors.amber)
                g.globalAlpha = (0.5 * glow).toFloat()
                g.fill()
                g.globalAlpha = 1f
            }
            g.stroke()
        }

        if (m.resting) {
            // wings folded into a flat triangle, breathing softly
            val br = 1 + sin(m.seed + now / 700) * 0.04 + sin(now / 35) * 0.05 * tw
            wing {
                g.moveTo(0.5 * s, 0.0)
                g.lineTo(-2.3 * s * br, 1.15 * s)
                g.lineTo(-3 * s * br, 0.0)
                g.lineTo(-2.3 * s * br, -1.15 * s)
            }
            g.beginPath()
            g.moveTo(-0.3 * s, 0.0)
            g.lineTo(-2.7 * s * br, 0.0)
            g.globalAlpha = 0.6f
            g.stroke()
            g.globalAlpha = 1f
        } else {
            val f = 0.18 + 0.82 * abs(sin(m.ph))
            for (sg in doubleArrayOf(-1.0, 1.0)) {
                // hind wing (drawn first)
                wing {
                    g.moveTo(-0.4 * s, sg * 0.3 * s)
                    g.quadraticCurveTo(-0.9 * s, sg * 2.2 * s * f, -2.3 * s, sg * 1.6 * s * f)
                    g.quadraticCurveTo(-2.5 * s, sg * 0.7 * s * f, -1.7 * s, sg * 0.2 * s)
                }
                // fore wing
                wing {
                    g.moveTo(0.5 * s, sg * 0.35 * s)
                    g.quadraticCurveTo(0.3 * s, sg * 2.6 * s * f, -1.4 * s, sg * 2.2 * s * f)
                    g.quadraticCurveTo(-1.7 * s, sg * 0.9 * s * f, -0.9 * s, sg * 0.3 * s)
                }
                if (m.spots > 0) {
                    g.fillColor(colors.amber)
                    for (k in 0 until m.spots) {
                        g.beginPath()
                        g.arc((-0.2 - k * 0.8) * s, sg * (1.2 + k * 0.2) * s * f, 0.28 * s, 0.0, TAU)
                        g.fill()
                    }
                }
            }
        }

        // body, head, antennae
        g.fillColor(colors.ink)
        g.beginPath(); g.ellipse(-0.7 * s, 0.0, 1.5 * s, 0.38 * s, 0.0, 0.0, TAU); g.fill()
        g.beginPath(); g.arc(0.95 * s, 0.0, 0.38 * s, 0.0, TAU); g.fill()
        g.lineWidth = 1f
        g.beginPath()
        val aw = 1 + 0.35 * tw * sin(now / 55 + m.seed)
        g.moveTo(1.1 * s, 0.15 * s)
        g.quadraticCurveTo(1.8 * s, 0.4 * s, 2.1 * s, 1 * s * aw)
        g.moveTo(1.1 * s, -0.15 * s)
        g.quadraticCurveTo(1.8 * s, -0.4 * s, 2.1 * s, -1 * s * (2 - aw))
        g.stroke()
        // resting in the dark: two glowing eye dots (they blink now and then)
        if (m.resting && dark > 0.05) {
            val blink = if (sin(m.seed * 5 + now / 2300) > 0.96) 0.0 else 1.0
            g.fillColor(colors.amber)
            g.globalAlpha = (0.9 * dark * blink).toFloat()
            for (sg in doubleArrayOf(-1.0, 1.0)) {
                g.beginPath()
                g.arc(1.15 * s, sg * 0.2 * s, 0.14 * s + 0.4, 0.0, TAU)
                g.fill()
            }
            g.globalAlpha = 1f
        }
        g.restore()
    }

    private fun drawBat(g: Ctx2D, b: Bat, colors: StageColors) {
        val s = 11.0
        val f = 0.3 + 0.7 * abs(sin(b.ph))
        g.save()
        g.translate(b.x, b.y)
        g.rotate(b.ang)
        g.strokeColor(colors.ink)
        g.lineWidth = 1.3f
        for (sg in doubleArrayOf(-1.0, 1.0)) {
            fun Y(v: Double) = sg * v * s * f
            g.beginPath()
            g.moveTo(0.3 * s, Y(0.3))
            g.quadraticCurveTo(0.4 * s, Y(2.4), -0.5 * s, Y(4.0))
            // scalloped trailing edge
            g.quadraticCurveTo(-0.5 * s, Y(3.2), -1.4 * s, Y(2.9))
            g.quadraticCurveTo(-1.05 * s, Y(2.1), -1.7 * s, Y(1.5))
            g.quadraticCurveTo(-1.1 * s, Y(0.9), -1.5 * s, Y(0.35))
            g.closePath()
            g.fillColor(colors.panel)
            g.fill()
            g.stroke()
            g.globalAlpha = 0.5f
            g.beginPath()
            g.moveTo(0.1 * s, Y(0.4)); g.lineTo(-1.4 * s, Y(2.9))
            g.moveTo(0.1 * s, Y(0.4)); g.lineTo(-1.7 * s, Y(1.5))
            g.stroke()
            g.globalAlpha = 1f
        }
        g.fillColor(colors.ink)
        g.beginPath(); g.ellipse(-0.6 * s, 0.0, 1.3 * s, 0.45 * s, 0.0, 0.0, TAU); g.fill()
        g.beginPath(); g.arc(0.9 * s, 0.0, 0.5 * s, 0.0, TAU); g.fill()
        for (sg in doubleArrayOf(-1.0, 1.0)) { // ears
            g.beginPath()
            g.moveTo(1.0 * s, sg * 0.3 * s)
            g.lineTo(1.5 * s, sg * 0.85 * s)
            g.lineTo(1.3 * s, sg * 0.2 * s)
            g.fill()
        }
        g.fillColor(colors.amber)
        for (sg in doubleArrayOf(-1.0, 1.0)) { // eyes
            g.beginPath()
            g.arc(1.2 * s, sg * 0.2 * s, 0.13 * s + 0.3, 0.0, TAU)
            g.fill()
        }
        g.restore()
    }

    // candle body + flame (its glow is drawn separately in `step`, after the darkness layer)
    private fun drawCandle(g: Ctx2D, colors: StageColors, w: Double, h: Double, t: Double) {
        val cx = candleFx * w
        val base = h - 16
        val top = base - 24
        g.strokeColor(colors.ink)
        g.fillColor(colors.panel)
        g.lineWidth = 1.2f
        g.globalAlpha = 1f
        g.beginPath()
        g.rect(cx - 4, top, 8.0, 24.0)
        g.fill()
        g.stroke()
        g.beginPath()
        g.moveTo(cx - 10, base); g.lineTo(cx + 10, base)
        g.moveTo(cx, top); g.lineTo(cx, top - 3)
        g.stroke()
        // dripping wax
        g.beginPath()
        g.moveTo(cx + 4, top + 1)
        g.lineTo(cx + 4, top + 7 + (if (candleOn) sin(t * 0.5) * 1 else 0.0))
        g.stroke()
        if (candleLevel > 0.02) {
            val fl = 1 + sin(t * 23 + cx) * 0.08 + sin(t * 9) * 0.1 + bumpC * 0.3
            val sway = sin(t * 7 + cx * 0.1) * 1.3
            g.beginPath()
            g.moveTo(cx, top - 3)
            g.quadraticCurveTo(cx - 4.5, top - 8, cx + sway, top - 3 - 12 * fl * candleLevel)
            g.quadraticCurveTo(cx + 4.5, top - 8, cx, top - 3)
            g.fillColor(colors.amber)
            g.globalAlpha = candleLevel.toFloat()
            g.fill()
            g.globalAlpha = 1f
        }
    }

    private companion object {
        val HINTS = listOf("your cursor is the lamp", "click to switch the lamp off", "click the candle to blow it out", "shake the lamp to scare them")
    }
}

fun makeMoths(w: Float, h: Float): Creature = MothsCreature(w, h)
