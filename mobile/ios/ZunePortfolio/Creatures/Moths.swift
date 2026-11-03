import SwiftUI

// Port of src/components/lab/Moths/moths.js. Your finger is the lamp: moths spiral round it (dive in, get zapped, bounce out),
// their wings glow as they get close. Tap = lamp off: the swarm lands on the frame edge. Tap again: lamp on, they take off.
// Extras: wing dust, sparks + dizziness on a zap, blinking eyes in the dark, a candle (tap it to blow out; half the swarm prefers it),
// shake the lamp to scare them, and now and then a bat dives at the swarm.

private enum Edge { case top, bottom, left, right }

private final class Moth {
    var x: Double, y: Double, vx: Double, vy: Double, ang: Double
    let size: Double
    var ph: Double
    let flap: Double, orbit: Double, dir: Double, speed: Double, seed: Double
    let spots: Int
    var dive = 0.0, nextDive: Double
    var fan: Bool              // "candle party": likes the candle more than the lamp
    var t = 0                  // which light it follows when both are on: 0 = lamp, 1 = candle
    var nextPick: Double
    var scare = 0.0, sx = 0.0, sy = 0.0   // > 0: panicking, flying away from (sx, sy)
    var dizzy = 0.0, spin = 0.0           // just zapped: seconds left and spin rate (rad/s)
    var resting = false
    var wake = 0.0
    let edge: Edge
    let fx: Double             // resting spot as a fraction along the edge (independent of the frame size)

    init(_ w: Double, _ h: Double) {
        edge = [Edge.top, .top, .left, .right, .bottom].randomElement()!
        x = rand(0, w); y = rand(0, h); vx = rand(-40, 40); vy = rand(-40, 40)
        ang = rand(0, TAU); size = rand(6, 9); ph = rand(0, TAU); flap = rand(15, 21)
        orbit = rand(35, 105); dir = Bool.random() ? -1 : 1; speed = rand(70, 115); seed = rand(0, TAU)
        spots = randInt(0, 2); nextDive = rand(3, 9); fan = Bool.random(); nextPick = rand(3, 9)
        fx = rand(0.06, 0.94)
    }
}

private final class Light { var x = 0.0, y = 0.0; let c: Bool; init(c: Bool) { self.c = c } }

/// wing dust, sparks and candle smoke share one shape
private final class Particle {
    var x = 0.0, y = 0.0, vx = 0.0, vy = 0.0, life = 0.0, max = 1.0, r = 1.0, sw = 0.0, a = 0.0, sp = 0.0
}

private final class Bat {
    var x: Double, y: Double, ang: Double
    var ph = 0.0, age = 0.0, hunt = 5.0
    var hunting = true
    let exitX: Double, exitY: Double
    init(_ w: Double, _ h: Double) {
        let side: Double = Bool.random() ? -1 : 1
        x = side < 0 ? -50 : w + 50
        y = rand(0.1, 0.5) * h
        ang = side < 0 ? 0 : .pi
        exitX = side < 0 ? w + 90 : -90
        exitY = rand(0.1, 0.6) * h
    }
}

private func restPoint(_ m: Moth, _ w: Double, _ h: Double) -> (x: Double, y: Double, ang: Double) {
    let pad = 9.0
    switch m.edge {
    case .top: return (m.fx * w, pad, -.pi / 2)
    case .bottom: return (m.fx * w, h - pad, .pi / 2)
    case .left: return (pad, m.fx * h, .pi)
    case .right: return (w - pad, m.fx * h, 0)
    }
}

final class MothsCreature: Creature {
    private let moths: [Moth]
    private let n: Int
    private var lamp = true
    private var seen = 0
    private var glowLevel = 1.0       // 0…1, eased when the lamp goes on/off
    private var zaps = 0              // times a moth hit a light
    private var bump = 0.0, bumpC = 0.0 // 0…1: the lamp / candle flashes when it zaps a moth
    private var dust: [Particle] = []
    private var sparks: [Particle] = []
    private var smoke: [Particle] = []
    private var smokeFor = 0.0, smokeAcc = 0.0
    // the candle stands at the bottom of the frame; its place is a fraction, so resizing keeps it right
    private let candleFx = rand(0.15, 0.85)
    private var candleOn = true
    private var candleLevel = 1.0
    private let lampL = Light(c: false), candL = Light(c: true)
    private var clock = 0.0
    private var shake = 0.0           // smoothed pointer speed (px/s)
    private var prevAx: Double?, prevAy: Double?
    private var startleCd = 0.0
    private var startledUntil = -1.0
    private var bat: Bat?
    private var batTimer = rand(12, 20)

    let label: String

    init(_ w: CGFloat, _ h: CGFloat) {
        let count = randInt(4, 9)
        n = count
        let list = (0..<count).map { _ in Moth(Double(w), Double(h)) }
        list.forEach { $0.t = $0.fan ? 1 : 0 }
        if !list.contains(where: { $0.fan }) { list[0].fan = true }
        moths = list
        label = "\(count) moths · your cursor is the lamp · click to switch it off"
    }

    private static let hints = [
        "your cursor is the lamp", "click to switch the lamp off", "click the candle to blow it out", "shake the lamp to scare them",
    ]

    func caption() -> String? {
        if bat != nil { return "\(n) moths · something is hunting them" }
        if clock < startledUntil { return "\(n) moths · you scared them" }
        if !lamp {
            return candleOn ? "\(n) moths · lamp off, the candle is still lit · click it to blow it out"
                            : "\(n) moths · lights out · click anywhere to switch the lamp back on"
        }
        let hint = Self.hints[Int(floor(clock / 6)) % Self.hints.count]
        return "\(n) moths\(zaps > 0 ? " · zapped \(zaps)×" : "") · \(hint)"
    }

    // which light attracts this moth (nil = nothing to follow: fly to rest)
    private func lightFor(_ m: Moth) -> Light? {
        if lamp && candleOn { return m.t == 1 ? candL : lampL }
        if lamp { return lampL }
        if candleOn && m.fan { return candL }
        return nil
    }

    private func glowAt(_ g: Ctx2D, _ x: Double, _ y: Double, _ r: Double, _ alpha: Double, _ light: Bool) {
        // both ends must be the SAME colour (alpha 0 at the rim): fading to "transparent black" leaves a grey ring
        let c = light ? rgba(255, 176, 32) : rgba(255, 200, 87)
        let c0 = light ? rgba(255, 176, 32, 0) : rgba(255, 200, 87, 0)
        g.globalAlpha = min(1, alpha)
        g.fillStyle = g.radialGradient(x, y, 0, r, [(0, c), (1, c0)])
        g.fillRect(x - r, y - r, r * 2, r * 2)
        g.globalAlpha = 1
    }

    private func spawnDust(_ x: Double, _ y: Double, _ spread: Double = 1) {
        if dust.count > 90 { return }
        let p = Particle()
        p.x = x; p.y = y; p.vx = rand(-9, 9) * spread; p.vy = rand(-4, 14) * spread
        p.max = rand(1.6, 3.2); p.r = rand(0.6, 1.5); p.sw = rand(0, TAU)
        dust.append(p)
    }

    private func zap(_ m: Moth, _ onCandle: Bool) {
        zaps += 1
        if onCandle { bumpC = 1 } else { bump = 1 }
        m.dizzy = rand(0.8, 1.2)
        m.spin = rand(9, 14) * (Bool.random() ? -1 : 1)
        m.dive = 0
        for _ in 0..<9 {
            let p = Particle()
            p.x = m.x; p.y = m.y; p.a = rand(0, TAU); p.sp = rand(70, 150); p.max = rand(0.25, 0.5)
            sparks.append(p)
        }
        for _ in 0..<6 { spawnDust(m.x, m.y, 1.6) } // a hard zap shakes off some dust
    }

    // MARK: step
    func step(_ api: StageAPI) {
        let g = api.g!
        let w = Double(api.w), h = Double(api.h), t = api.t, dt = api.dt
        let colors = api.colors
        let ax = Double(api.aim.x), ay = Double(api.aim.y)
        let mouse = api.mouse
        clock = t
        lampL.x = ax; lampL.y = ay
        candL.x = candleFx * w; candL.y = h - 49

        // ---- tap: on the candle = blow out / relight it, anywhere else = lamp off / on
        if mouse.clicks != seen {
            seen = mouse.clicks
            if abs(Double(mouse.x) - candL.x) < 24 && Double(mouse.y) > h - 64 && Double(mouse.y) < h - 6 {
                candleOn.toggle()
                if candleOn { for m in moths where m.fan { m.wake = rand(0, 0.9) } } else { smokeFor = 2.6 }
            } else {
                lamp.toggle()
                if lamp { for m in moths { m.wake = rand(0, 0.9) } }
            }
        }
        glowLevel += ((lamp ? 1 : 0) - glowLevel) * min(1, 5 * dt)
        candleLevel += ((candleOn ? 1 : 0) - candleLevel) * min(1, 8 * dt)
        bump = max(0, bump - dt * 3.2)
        bumpC = max(0, bumpC - dt * 3.2)

        // ---- shaking the lamp hard scares the nearby swarm
        if let px = prevAx, let py = prevAy {
            let jump = hypot(ax - px, ay - py)
            // a huge jump in one frame is the pointer "teleporting" (re-entering the frame), not shaking; capped so one jerk can't trigger it
            let v = jump > 80 ? 0 : min(2500, jump / dt)
            shake += (v - shake) * min(1, 10 * dt)
        }
        prevAx = ax; prevAy = ay
        startleCd = max(0, startleCd - dt)
        if lamp && shake > 1000 && startleCd <= 0 {
            startleCd = 1.5
            startledUntil = t + 2.2
            for m in moths where !m.resting && hypot(m.x - ax, m.y - ay) <= 280 {
                m.scare = rand(0.7, 1.2); m.sx = ax; m.sy = ay
                for _ in 0..<3 { spawnDust(m.x, m.y, 2) }
            }
        }

        // ---- candle smoke
        if smokeFor > 0 {
            smokeFor -= dt; smokeAcc += dt
            while smokeAcc > 0.12 {
                smokeAcc -= 0.12
                let p = Particle()
                p.x = candL.x + rand(-1, 1); p.y = h - 43; p.vx = rand(-3, 3); p.vy = -rand(14, 24)
                p.max = rand(1.6, 2.6); p.r = rand(1.5, 2.5); p.sw = rand(0, TAU)
                smoke.append(p)
            }
        }

        // ---- the bat: now and then it dives at the middle of the swarm, then leaves
        if let b = bat {
            b.age += dt; b.ph += 11 * dt
            var tx = w / 2, ty = h / 2
            if b.hunting {
                var cx = 0.0, cy = 0.0, k = 0.0
                for m in moths where !m.resting { cx += m.x; cy += m.y; k += 1 }
                if k > 0 { tx = cx / k; ty = cy / k }
                b.hunt -= dt
                if b.hunt <= 0 || (k > 0 && hypot(tx - b.x, ty - b.y) < 30) { b.hunting = false }
            } else { tx = b.exitX; ty = b.exitY }
            let want = atan2(ty - b.y, tx - b.x)
            b.ang += angDiff(want, b.ang) * min(1, 1.8 * dt)
            let sp = b.hunting ? 200.0 : 250.0
            b.x += cos(b.ang) * sp * dt
            b.y += sin(b.ang) * sp * dt
            let out = b.x < -70 || b.x > w + 70 || b.y < -70 || b.y > h + 70
            if (out && !b.hunting && b.age > 1) || b.age > 20 { bat = nil; batTimer = rand(25, 45) }
        } else {
            if lamp || candleOn { batTimer -= dt }
            if batTimer <= 0 { bat = Bat(w, h) }
        }

        // ---- moths
        for m in moths {
            let L = lightFor(m)
            if m.resting, let L = L {
                m.wake -= dt
                if m.wake <= 0 {
                    m.resting = false
                    let dx = L.x - m.x, dy = L.y - m.y
                    let dl = hypot(dx, dy) == 0 ? 1 : hypot(dx, dy)
                    m.vx = dx / dl * 130 + rand(-30, 30)
                    m.vy = dy / dl * 130 + rand(-30, 30)
                }
            }
            if m.resting {
                let r = restPoint(m, w, h)
                m.x = r.x; m.y = r.y; m.ang = r.ang
                continue
            }

            // both lights on: now and then change mind to the other one (the candle party rarely switches)
            if lamp && candleOn {
                m.nextPick -= dt
                if m.nextPick <= 0 {
                    m.t = Double.random(in: 0..<1) < (m.fan ? 0.75 : 0.25) ? 1 : 0
                    m.nextPick = rand(6, 14)
                }
            }

            // a bat close by: panic
            if let b = bat, hypot(m.x - b.x, m.y - b.y) < 130 {
                m.scare = max(m.scare, 0.45); m.sx = b.x; m.sy = b.y
            }

            m.ph += m.flap * (m.dizzy > 0 || m.scare > 0 ? 1.7 : 1) * dt
            m.dizzy = max(0, m.dizzy - dt)
            m.spin *= pow(0.15, dt)
            var dvx: Double, dvy: Double
            if m.scare > 0 {
                // scared: fly straight away from the source, wings going wild
                m.scare -= dt
                let dx = m.x - m.sx, dy = m.y - m.sy
                let d = hypot(dx, dy) == 0 ? 1 : hypot(dx, dy)
                dvx = dx / d * 240 + sin(t * 11 + m.seed) * 40
                dvy = dy / d * 240 + cos(t * 12 + m.seed) * 40
            } else if let L = L {
                let dx = L.x - m.x, dy = L.y - m.y
                let d = hypot(dx, dy) == 0 ? 1 : hypot(dx, dy)
                let ux = dx / d, uy = dy / d
                // near a light it sheds wing dust
                if Double.random(in: 0..<1) < dt * 5 * clamp(1 - d / 150, 0, 1) {
                    spawnDust(m.x - cos(m.ang) * m.size, m.y - sin(m.ang) * m.size)
                }
                // spiral round the light: a tangent part + pull/push to a preferred radius (slowly oscillating); a smaller, gentler loop round the candle
                m.nextDive -= dt
                if m.nextDive <= 0 { m.dive = 0.9; m.nextDive = rand(3.5, 8) }
                m.dive = max(0, m.dive - dt)
                let oScale = L.c ? 0.65 : 1.0
                let rPref = m.dive > 0 ? 4.0 : m.orbit * oScale * (0.6 + 0.4 * cos(t * 0.45 + m.seed))
                let radial = clamp((d - rPref) * 2.4, -100, 170)
                let flutter = (sin(t * 9 + m.seed * 3) + sin(t * 14.3 + m.seed)) * 22
                if m.dizzy > 0 {
                    // dizzy: no steering, drifts and sinks
                    dvx = m.vx * 0.5 + sin(t * 17 + m.seed) * 30
                    dvy = m.vy * 0.5 + 35 + cos(t * 13 + m.seed) * 30
                } else {
                    let spd = m.speed * (L.c ? 0.8 : 1)
                    dvx = -uy * m.dir * spd + ux * radial + -uy * flutter
                    dvy = ux * m.dir * spd + uy * radial + ux * flutter
                }
                // touching the light: zapped, bounces off + sparks + dizzy
                if d < 9 && m.dizzy <= 0 {
                    m.vx -= ux * 220; m.vy -= uy * 220
                    zap(m, L.c)
                }
            } else {
                // no light left: fly straight to the resting spot, slowing down on arrival
                let r = restPoint(m, w, h)
                let dx = r.x - m.x, dy = r.y - m.y
                let d = hypot(dx, dy) == 0 ? 1 : hypot(dx, dy)
                let sp = min(150, d * 2.6 + 18)
                dvx = dx / d * sp + sin(t * 8 + m.seed) * 14
                dvy = dy / d * sp + cos(t * 9 + m.seed) * 14
                if d < 3.5 { m.resting = true; continue }
            }
            let k = min(1, 3.5 * dt)
            m.vx += (dvx - m.vx) * k
            m.vy += (dvy - m.vy) * k
            m.x = clamp(m.x + m.vx * dt, 6, w - 6)
            m.y = clamp(m.y + m.vy * dt, 6, h - 6)
            let sp = hypot(m.vx, m.vy)
            if m.dizzy > 0 && L != nil && m.scare <= 0 {
                m.ang += m.spin * dt
            } else if sp > 8 {
                m.ang += angDiff(atan2(m.vy, m.vx), m.ang) * min(1, 9 * dt)
            }
        }

        // ================= DRAW =================
        // light skins: the skin's amber is a dark brown (for reading text), which makes the glow a dirty smear: use real lamp yellow
        let light = colors.panelLight

        // the lamp: glow + core (off = only a faint ring and the whole frame darkens)
        let flick = lamp ? 1 + sin(t * 31) * 0.015 + sin(t * 13) * 0.02 : 1
        if glowLevel > 0.01 {
            glowAt(g, ax, ay, 120 * flick * (1 + 0.3 * bump), (light ? 0.42 : 0.3) * glowLevel * (1 + 0.8 * bump), light)
        }
        if glowLevel < 0.99 {
            g.fillColor(.black)
            g.globalAlpha = 0.32 * (1 - glowLevel)
            g.fillRect(0, 0, w, h)
            g.globalAlpha = 1
        }

        // candle: drawn AFTER the darkness so one corner stays lit when the lamp is off
        if candleLevel > 0.02 {
            let cf = 1 + sin(t * 23) * 0.03 + sin(t * 9 + 1) * 0.04
            glowAt(g, candL.x, candL.y, 95 * cf * (1 + 0.3 * bumpC), (light ? 0.4 : 0.3) * candleLevel * (1 + 0.8 * bumpC), light)
        }
        drawCandle(g, colors, w, h, t)

        // candle smoke
        g.fillColor(colors.dim)
        for i in stride(from: smoke.count - 1, through: 0, by: -1) {
            let p = smoke[i]
            p.life += dt
            if p.life >= p.max { smoke.remove(at: i); continue }
            p.x += (p.vx + sin(t * 2.5 + p.sw) * 7) * dt
            p.y += p.vy * dt
            g.globalAlpha = 0.45 * (1 - p.life / p.max)
            g.beginPath()
            g.arc(p.x, p.y, p.r + p.life * 3.2, 0, TAU)
            g.fill()
        }
        g.globalAlpha = 1

        g.strokeColor(colors.amber); g.fillColor(colors.amber); g.lineWidth = 1.4
        g.beginPath()
        g.arc(ax, ay, 4.5 * flick + 2.5 * bump, 0, TAU)
        if lamp { g.fill() } else { g.stroke() }
        if lamp {
            g.globalAlpha = 0.5; g.lineWidth = 1
            g.beginPath()
            for i in 0..<8 {
                let a = Double(i) / 8 * TAU + t * 0.3
                g.moveTo(ax + cos(a) * 8, ay + sin(a) * 8)
                g.lineTo(ax + cos(a) * 12, ay + sin(a) * 12)
            }
            g.stroke()
            g.globalAlpha = 1
        }

        // wing dust: floats down; glints amber inside a lit area (lamp or candle), dim as dust outside
        for i in stride(from: dust.count - 1, through: 0, by: -1) {
            let p = dust[i]
            p.life += dt
            if p.life >= p.max { dust.remove(at: i); continue }
            p.vx += sin(t * 2 + p.sw) * 6 * dt
            p.vy += 6 * dt
            p.x += p.vx * dt; p.y += p.vy * dt
            let lit = max(clamp(1 - hypot(ax - p.x, ay - p.y) / 130, 0, 1) * glowLevel,
                          clamp(1 - hypot(candL.x - p.x, candL.y - p.y) / 95, 0, 1) * candleLevel)
            let fade = 1 - p.life / p.max
            g.fillColor(lit > 0.05 ? colors.amber : colors.ink)
            g.globalAlpha = fade * (lit > 0.05 ? 0.25 + 0.65 * lit : 0.22) * (0.7 + 0.3 * sin(t * 12 + p.sw))
            g.beginPath()
            g.arc(p.x, p.y, p.r, 0, TAU)
            g.fill()
        }
        // sparks when a moth is zapped
        g.strokeColor(colors.amber); g.lineWidth = 1.3
        for i in stride(from: sparks.count - 1, through: 0, by: -1) {
            let p = sparks[i]
            p.life += dt
            if p.life >= p.max { sparks.remove(at: i); continue }
            p.sp *= pow(0.02, dt)
            p.x += cos(p.a) * p.sp * dt
            p.y += sin(p.a) * p.sp * dt
            g.globalAlpha = 1 - p.life / p.max
            g.beginPath()
            g.moveTo(p.x, p.y)
            g.lineTo(p.x - cos(p.a) * (2 + p.sp * 0.05), p.y - sin(p.a) * (2 + p.sp * 0.05))
            g.stroke()
        }
        g.globalAlpha = 1

        // moths: drawn after the lights; wings glow with the distance to the light they follow
        for m in moths {
            let L = m.resting ? nil : lightFor(m)
            let lvl = L.map { $0.c ? candleLevel : glowLevel } ?? 0
            let glow = L.map { clamp(1 - hypot($0.x - m.x, $0.y - m.y) / 150, 0, 1) * lvl } ?? 0
            drawMoth(g, m, colors, glow, 1 - glowLevel, t * 1000)
        }
        if let b = bat { drawBat(g, b, colors) }
    }

    // MARK: drawing
    private func drawMoth(_ g: Ctx2D, _ m: Moth, _ colors: StageColors, _ glow: Double, _ dark: Double, _ now: Double) {
        let s = m.size
        // now and then (each moth out of phase) the antennae twitch and the wings tremble while resting
        let tw = m.resting ? max(0, sin(now / 1700 + m.seed * 2) - 0.6) * 2.5 : 0
        g.save()
        g.translate(m.x, m.y)
        g.rotate(m.ang)
        g.strokeColor(colors.ink)
        g.lineWidth = 1.2

        func wing(_ path: () -> Void) {
            g.beginPath()
            path()
            g.closePath()
            g.fillColor(colors.panel)
            g.globalAlpha = 1
            g.fill()
            if glow > 0.02 {
                g.fillColor(colors.amber)
                g.globalAlpha = 0.5 * glow
                g.fill()
                g.globalAlpha = 1
            }
            g.stroke()
        }

        if m.resting {
            // wings folded into a flat triangle, breathing softly
            let br = 1 + sin(m.seed + now / 700) * 0.04 + sin(now / 35) * 0.05 * tw
            wing {
                g.moveTo(0.5 * s, 0)
                g.lineTo(-2.3 * s * br, 1.15 * s)
                g.lineTo(-3 * s * br, 0)
                g.lineTo(-2.3 * s * br, -1.15 * s)
            }
            g.beginPath()
            g.moveTo(-0.3 * s, 0)
            g.lineTo(-2.7 * s * br, 0)
            g.globalAlpha = 0.6
            g.stroke()
            g.globalAlpha = 1
        } else {
            let f = 0.18 + 0.82 * abs(sin(m.ph))
            for sg in [-1.0, 1.0] {
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
                if m.spots > 0 {
                    g.fillColor(colors.amber)
                    for k in 0..<m.spots {
                        g.beginPath()
                        g.arc((-0.2 - Double(k) * 0.8) * s, sg * (1.2 + Double(k) * 0.2) * s * f, 0.28 * s, 0, TAU)
                        g.fill()
                    }
                }
            }
        }

        // body, head, antennae
        g.fillColor(colors.ink)
        g.beginPath(); g.ellipse(-0.7 * s, 0, 1.5 * s, 0.38 * s, 0, 0, TAU); g.fill()
        g.beginPath(); g.arc(0.95 * s, 0, 0.38 * s, 0, TAU); g.fill()
        g.lineWidth = 1
        g.beginPath()
        let aw = 1 + 0.35 * tw * sin(now / 55 + m.seed)
        g.moveTo(1.1 * s, 0.15 * s)
        g.quadraticCurveTo(1.8 * s, 0.4 * s, 2.1 * s, 1 * s * aw)
        g.moveTo(1.1 * s, -0.15 * s)
        g.quadraticCurveTo(1.8 * s, -0.4 * s, 2.1 * s, -1 * s * (2 - aw))
        g.stroke()
        // resting in the dark: two glowing eye dots (they blink now and then)
        if m.resting && dark > 0.05 {
            let blink: Double = sin(m.seed * 5 + now / 2300) > 0.96 ? 0 : 1
            g.fillColor(colors.amber)
            g.globalAlpha = 0.9 * dark * blink
            for sg in [-1.0, 1.0] {
                g.beginPath()
                g.arc(1.15 * s, sg * 0.2 * s, 0.14 * s + 0.4, 0, TAU)
                g.fill()
            }
            g.globalAlpha = 1
        }
        g.restore()
    }

    private func drawBat(_ g: Ctx2D, _ b: Bat, _ colors: StageColors) {
        let s = 11.0
        let f = 0.3 + 0.7 * abs(sin(b.ph))
        g.save()
        g.translate(b.x, b.y)
        g.rotate(b.ang)
        g.strokeColor(colors.ink)
        g.lineWidth = 1.3
        for sg in [-1.0, 1.0] {
            func Y(_ v: Double) -> Double { sg * v * s * f }
            g.beginPath()
            g.moveTo(0.3 * s, Y(0.3))
            g.quadraticCurveTo(0.4 * s, Y(2.4), -0.5 * s, Y(4))
            // scalloped trailing edge
            g.quadraticCurveTo(-0.5 * s, Y(3.2), -1.4 * s, Y(2.9))
            g.quadraticCurveTo(-1.05 * s, Y(2.1), -1.7 * s, Y(1.5))
            g.quadraticCurveTo(-1.1 * s, Y(0.9), -1.5 * s, Y(0.35))
            g.closePath()
            g.fillColor(colors.panel)
            g.fill()
            g.stroke()
            g.globalAlpha = 0.5
            g.beginPath()
            g.moveTo(0.1 * s, Y(0.4)); g.lineTo(-1.4 * s, Y(2.9))
            g.moveTo(0.1 * s, Y(0.4)); g.lineTo(-1.7 * s, Y(1.5))
            g.stroke()
            g.globalAlpha = 1
        }
        g.fillColor(colors.ink)
        g.beginPath(); g.ellipse(-0.6 * s, 0, 1.3 * s, 0.45 * s, 0, 0, TAU); g.fill()
        g.beginPath(); g.arc(0.9 * s, 0, 0.5 * s, 0, TAU); g.fill()
        for sg in [-1.0, 1.0] { // ears
            g.beginPath()
            g.moveTo(1.0 * s, sg * 0.3 * s)
            g.lineTo(1.5 * s, sg * 0.85 * s)
            g.lineTo(1.3 * s, sg * 0.2 * s)
            g.fill()
        }
        g.fillColor(colors.amber)
        for sg in [-1.0, 1.0] { // eyes
            g.beginPath()
            g.arc(1.2 * s, sg * 0.2 * s, 0.13 * s + 0.3, 0, TAU)
            g.fill()
        }
        g.restore()
    }

    // candle body + flame (its glow is drawn separately in `step`, after the darkness layer)
    private func drawCandle(_ g: Ctx2D, _ colors: StageColors, _ w: Double, _ h: Double, _ t: Double) {
        let cx = candleFx * w
        let base = h - 16
        let top = base - 24
        g.strokeColor(colors.ink)
        g.fillColor(colors.panel)
        g.lineWidth = 1.2
        g.globalAlpha = 1
        g.beginPath()
        g.rect(cx - 4, top, 8, 24)
        g.fill()
        g.stroke()
        g.beginPath()
        g.moveTo(cx - 10, base); g.lineTo(cx + 10, base)
        g.moveTo(cx, top); g.lineTo(cx, top - 3)
        g.stroke()
        // dripping wax
        g.beginPath()
        g.moveTo(cx + 4, top + 1)
        g.lineTo(cx + 4, top + 7 + (candleOn ? sin(t * 0.5) * 1 : 0))
        g.stroke()
        if candleLevel > 0.02 {
            let fl = 1 + sin(t * 23 + cx) * 0.08 + sin(t * 9) * 0.1 + bumpC * 0.3
            let sway = sin(t * 7 + cx * 0.1) * 1.3
            g.beginPath()
            g.moveTo(cx, top - 3)
            g.quadraticCurveTo(cx - 4.5, top - 8, cx + sway, top - 3 - 12 * fl * candleLevel)
            g.quadraticCurveTo(cx + 4.5, top - 8, cx, top - 3)
            g.fillColor(colors.amber)
            g.globalAlpha = candleLevel
            g.fill()
            g.globalAlpha = 1
        }
    }
}

func makeMoths(_ w: CGFloat, _ h: CGFloat) -> Creature { MothsCreature(w, h) }
