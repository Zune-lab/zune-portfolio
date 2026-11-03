import SwiftUI

// Port of src/components/lab/Reptile/creature.js: a procedural lizard (random number of legs) that follows your finger.
// The skeleton is a chain of `Segment`s; legs are inverse-kinematics `LegSystem`s that step towards a foothold.

private final class Env { var g: Ctx2D!; var mx: Double = 0, my: Double = 0 }
private let env = Env()

private class Node {
    var x: Double, y: Double, absAngle: Double
    var children: [Segment] = []
    init(x: Double, y: Double, absAngle: Double) { self.x = x; self.y = y; self.absAngle = absAngle }
}

private final class Segment: Node {
    let parent: Node
    let size: Double
    var relAngle: Double
    let defAngle: Double
    let range: Double
    let stiffness: Double

    init(_ parent: Node, _ size: Double, _ angle: Double, _ range: Double, _ stiffness: Double) {
        self.parent = parent; self.size = size
        self.relAngle = angle; self.defAngle = angle
        self.range = range; self.stiffness = stiffness
        super.init(x: 0, y: 0, absAngle: parent.absAngle + angle)
        parent.children.append(self)
        updateRelative(false, true)
    }

    func updateRelative(_ iter: Bool, _ flex: Bool) {
        relAngle = relAngle - 2 * .pi * floor((relAngle - defAngle) / 2 / .pi + 0.5)
        if flex {
            relAngle = min(defAngle + range / 2, max(defAngle - range / 2, (relAngle - defAngle) / stiffness + defAngle))
        }
        absAngle = parent.absAngle + relAngle
        x = parent.x + cos(absAngle) * size
        y = parent.y + sin(absAngle) * size
        if iter { for c in children { c.updateRelative(iter, flex) } }
    }

    /// only adds a line to the current path: `Body.draw` strokes once for the whole animal
    func draw(_ iter: Bool) {
        env.g.moveTo(parent.x, parent.y)
        env.g.lineTo(x, y)
        if iter { for c in children { c.draw(true) } }
    }

    func follow(_ iter: Bool) {
        let px = parent.x, py = parent.y
        let dist = max(pow((x - px) * (x - px) + (y - py) * (y - py), 0.5), 1e-9) // never divide by 0: NaN would ruin the whole animal
        x = px + size * (x - px) / dist
        y = py + size * (y - py) / dist
        absAngle = atan2(y - py, x - px)
        relAngle = absAngle - parent.absAngle
        updateRelative(false, true)
        if iter { for c in children { c.follow(true) } }
    }
}

private class LimbSystem {
    let end: Segment
    var length: Int
    unowned let creature: Body
    let speed: Double
    var nodes: [Segment] = []
    let hip: Node

    /// the chain of segments from the limb's root down to `end`, and the node it hangs from (the hip);
    /// stops early when it reaches the body (a non-segment), so `length` can come out shorter
    static func chain(_ end: Segment, _ length: Int) -> (nodes: [Segment], hip: Node, length: Int) {
        var node: Node = end
        var nodes: [Segment] = []
        var len = max(1, length)
        for i in 0..<length {
            nodes.insert(node as! Segment, at: 0)
            node = (node as! Segment).parent
            if !(node is Segment) { len = i + 1; break }
        }
        return (nodes, nodes[0].parent, len)
    }

    init(_ end: Segment, _ length: Int, _ speed: Double, _ creature: Body) {
        let c = LimbSystem.chain(end, length)
        self.end = end
        self.length = c.length
        self.creature = creature
        self.speed = speed
        self.nodes = c.nodes
        self.hip = c.hip
        creature.systems.append(self)
    }

    func moveTo(_ tx: Double, _ ty: Double) {
        var x = tx, y = ty
        nodes[0].updateRelative(true, true)
        let dist = pow((x - end.x) * (x - end.x) + (y - end.y) * (y - end.y), 0.5)
        var len = max(0, dist - speed)
        for i in stride(from: nodes.count - 1, through: 0, by: -1) {
            let node = nodes[i]
            let ang = atan2(node.y - y, node.x - x)
            node.x = x + len * cos(ang)
            node.y = y + len * sin(ang)
            x = node.x; y = node.y
            len = node.size
        }
        for node in nodes {
            node.absAngle = atan2(node.y - node.parent.y, node.x - node.parent.x)
            node.relAngle = node.absAngle - node.parent.absAngle
            for child in node.children where !nodes.contains(where: { $0 === child }) {
                child.updateRelative(true, false)
            }
        }
    }

    func update() { moveTo(env.mx, env.my) }
}

private final class LegSystem: LimbSystem {
    var goalX: Double, goalY: Double
    var step = 0            // 0 stand still, 1 move forward, 2 move towards foothold
    var forwardness = 0.0
    let reach: Double
    let swing: Double
    let swingOffset: Double

    override init(_ end: Segment, _ length: Int, _ speed: Double, _ creature: Body) {
        goalX = end.x; goalY = end.y
        // where the foot goal is placed, relative to the hip
        let hip = LimbSystem.chain(end, length).hip
        reach = 0.9 * pow((end.x - hip.x) * (end.x - hip.x) + (end.y - hip.y) * (end.y - hip.y), 0.5)
        var relAngle = creature.absAngle - atan2(end.y - hip.y, end.x - hip.x)
        relAngle -= 2 * .pi * floor(relAngle / 2 / .pi + 0.5)
        swing = -relAngle + (relAngle < 0 ? 1.0 : -1.0) * .pi / 2
        swingOffset = creature.absAngle - hip.absAngle
        super.init(end, length, speed, creature)
    }

    override func update() {
        moveTo(goalX, goalY)
        if step == 0 {
            let dist = pow((end.x - goalX) * (end.x - goalX) + (end.y - goalY) * (end.y - goalY), 0.5)
            if dist > 1 {
                step = 1
                goalX = hip.x + reach * cos(swing + hip.absAngle + swingOffset) + (2 * Double.random(in: 0..<1) - 1) * reach / 2
                goalY = hip.y + reach * sin(swing + hip.absAngle + swingOffset) + (2 * Double.random(in: 0..<1) - 1) * reach / 2
            }
        } else if step == 1 {
            let theta = atan2(end.y - hip.y, end.x - hip.x) - hip.absAngle
            let dist = pow((end.x - hip.x) * (end.x - hip.x) + (end.y - hip.y) * (end.y - hip.y), 0.5)
            let forwardness2 = dist * cos(theta)
            let dF = forwardness - forwardness2
            forwardness = forwardness2
            if dF * dF < 1 {
                step = 0
                goalX = hip.x + (end.x - hip.x)
                goalY = hip.y + (end.y - hip.y)
            }
        }
    }
}

private final class Body: Node {
    var fSpeed = 0.0, speed = 0.0, rSpeed = 0.0
    let fAccel: Double, fFric: Double, fRes: Double, fThresh: Double
    let rAccel: Double, rFric: Double, rRes: Double, rThresh: Double
    var systems: [LimbSystem] = []

    init(x: Double, y: Double, angle: Double, fAccel: Double, fFric: Double, fRes: Double, fThresh: Double,
         rAccel: Double, rFric: Double, rRes: Double, rThresh: Double) {
        self.fAccel = fAccel; self.fFric = fFric; self.fRes = fRes; self.fThresh = fThresh
        self.rAccel = rAccel; self.rFric = rFric; self.rRes = rRes; self.rThresh = rThresh
        super.init(x: x, y: y, absAngle: angle)
    }

    /// physics only: the stage draws separately so a 120 Hz screen doesn't run the lizard 4× too fast
    func follow(_ tx: Double, _ ty: Double) {
        let dist = pow((x - tx) * (x - tx) + (y - ty) * (y - ty), 0.5)
        let angle = atan2(ty - y, tx - x)
        // forward
        var accel = fAccel
        if !systems.isEmpty {
            let still = systems.filter { ($0 as? LegSystem)?.step == 0 }.count
            accel *= Double(still) / Double(systems.count)
        }
        fSpeed += accel * (dist > fThresh ? 1 : 0)
        fSpeed *= 1 - fRes
        speed = max(0, fSpeed - fFric)
        // rotation
        var dif = absAngle - angle
        dif -= 2 * .pi * floor(dif / (2 * .pi) + 0.5)
        if abs(dif) > rThresh && dist > fThresh { rSpeed -= rAccel * (dif > 0 ? 1 : -1) }
        rSpeed *= 1 - rRes
        if abs(rSpeed) > rFric { rSpeed -= rFric * (rSpeed > 0 ? 1 : -1) } else { rSpeed = 0 }
        // position
        absAngle += rSpeed
        absAngle -= 2 * .pi * floor(absAngle / (2 * .pi) + 0.5)
        x += speed * cos(absAngle)
        y += speed * sin(absAngle)
        absAngle += .pi
        for c in children { c.follow(true) }
        for s in systems { s.update() }
        absAngle -= .pi
    }

    func draw() {
        let g = env.g!
        let r = 4.0
        g.beginPath()
        g.arc(x, y, r, .pi / 4 + absAngle, 7 * .pi / 4 + absAngle)
        g.moveTo(x + r * cos(7 * .pi / 4 + absAngle), y + r * sin(7 * .pi / 4 + absAngle))
        g.lineTo(x + r * cos(absAngle) * 2.0.squareRoot(), y + r * sin(absAngle) * 2.0.squareRoot())
        g.lineTo(x + r * cos(.pi / 4 + absAngle), y + r * sin(.pi / 4 + absAngle))
        for c in children { c.draw(true) }
        g.stroke() // one stroke for head + the whole body, legs and tail
    }
}

/// a vertebra with two thin "ribs"; neck and tail share it, only the rib tip length differs
@discardableResult
private func addRibbedSegment(_ spinal: Node, _ s: Double, _ tipLen: Double) -> Segment {
    let seg = Segment(spinal, s * 4, 0, 3.1415 * 2 / 3, 1.1)
    for ii in [-1.0, 1.0] {
        var node = Segment(seg, s * 3, ii, 0.1, 2)
        for _ in 0..<3 { node = Segment(node, tipLen, -ii * 0.1, 0.1, 2) }
    }
    return seg
}

private func setupLizard(_ size: Double, _ legs: Int, _ tail: Int, _ w: Double, _ h: Double) -> Body {
    let s = size
    // (x, y, angle, fAccel, fFric, fRes, fThresh, rAccel, rFric, rRes, rThresh)
    let critter = Body(x: w / 2, y: h / 2, angle: 0, fAccel: s * 10, fFric: s * 2, fRes: 0.5, fThresh: 16,
                       rAccel: 0.5, rFric: 0.085, rRes: 0.5, rThresh: 0.3)
    var spinal: Node = critter
    // neck
    for _ in 0..<6 { spinal = addRibbedSegment(spinal, s, s * 0.1) }
    // torso and legs
    for i in 0..<legs {
        if i > 0 {
            // vertebrae and ribs
            for _ in 0..<6 {
                spinal = Segment(spinal, s * 4, 0, 1.571, 1.5)
                for iii in [-1.0, 1.0] {
                    var node = Segment(spinal, s * 3, iii * 1.571, 0.1, 1.5)
                    for _ in 0..<3 { node = Segment(node, s * 3, -iii * 0.3, 0.1, 2) }
                }
            }
        }
        // legs and shoulders
        for ii in [-1.0, 1.0] {
            var node = Segment(spinal, s * 12, ii * 0.785, 0, 8)            // hip
            node = Segment(node, s * 16, -ii * 0.785, 6.28, 1)               // humerus
            node = Segment(node, s * 16, ii * 1.571, 3.1415, 2)              // forearm
            for iii in 0..<4 { _ = Segment(node, s * 4, (Double(iii) / 3 - 0.5) * 1.571, 0.1, 4) } // fingers
            _ = LegSystem(node, 3, s * 12, critter)
        }
    }
    // tail
    for i in 0..<tail { spinal = addRibbedSegment(spinal, s, (s * 3 * Double(tail - i)) / Double(tail)) }
    return critter
}

final class ReptileCreature: Creature {
    private let critter: Body
    let label: String
    private var acc = 0.0
    private static let stepS = 1.0 / 30 // the web caps this creature at ~30 frames per second

    /// a new animal for the stage: random number of legs and tail length (same as the original, scaled to fit the frame)
    init(_ w: CGFloat, _ h: CGFloat) {
        let legs = Int.random(in: 1...12)
        let size = 4.5 / Double(legs).squareRoot()
        let tail = Int.random(in: 4...(4 + legs * 8))
        // rough body length: a narrow frame (phone) with a long animal would coil into a heap, so shrink it to ~55% of the diagonal
        let length = size * Double(6 + 24 * (legs - 1) + tail)
        let fit = max(0.5, min(1, (Double(hypot(w, h)) * 0.55) / length))
        critter = setupLizard(size * fit, legs, tail, Double(w), Double(h))
        label = "move your cursor, it follows · \(legs) legs"
    }

    func step(_ api: StageAPI) {
        env.g = api.g
        env.mx = Double(api.mouse.x); env.my = Double(api.mouse.y)
        api.g.lineWidth = 1; api.g.lineCap = .butt; api.g.lineJoin = .miter // thin default stroke, like the original
        acc += api.dt
        var n = 0
        while acc >= Self.stepS && n < 4 { critter.follow(env.mx, env.my); acc -= Self.stepS; n += 1 }
        if n == 4 { acc = 0 }
        critter.draw()
    }
}

func makeReptile(_ w: CGFloat, _ h: CGFloat) -> Creature { ReptileCreature(w, h) }
