import SwiftUI

/// A tiny HTML-canvas-like drawing surface over SwiftUI's `GraphicsContext`, so the lab creatures
/// (written for `canvas.getContext('2d')` on the web) can be ported almost line by line.
/// Paths are built in the coordinates of the moment (translate/rotate/scale apply when the path is painted,
/// which matches how the creatures use them: `save(); translate(...); beginPath(); ...; fill(); restore()`).
final class Ctx2D {
    enum Paint { case color(Color), shading(GraphicsContext.Shading) }
    enum Align { case left, center, right }

    private struct Saved {
        var gc: GraphicsContext
        var fill: Paint, stroke: Paint
        var lineWidth: CGFloat
        var cap: CGLineCap, join: CGLineJoin
        var alpha: Double
        var fontSize: CGFloat
        var align: Align
    }

    private var gc: GraphicsContext
    private var path = Path()
    private var stack: [Saved] = []

    var fillStyle: Paint = .color(.black)
    var strokeStyle: Paint = .color(.black)
    var lineWidth: CGFloat = 1
    var lineCap: CGLineCap = .butt
    var lineJoin: CGLineJoin = .miter
    var globalAlpha: Double = 1 { didSet { gc.opacity = globalAlpha } }
    var fontSize: CGFloat = 14
    var textAlign: Align = .left

    init(_ gc: GraphicsContext) { self.gc = gc }

    // MARK: style helpers
    func fillColor(_ c: Color) { fillStyle = .color(c) }
    func strokeColor(_ c: Color) { strokeStyle = .color(c) }

    func linearGradient(_ x0: CGFloat, _ y0: CGFloat, _ x1: CGFloat, _ y1: CGFloat, _ stops: [(Double, Color)]) -> Paint {
        .shading(.linearGradient(Gradient(stops: stops.map { .init(color: $0.1, location: $0.0) }),
                                 startPoint: CGPoint(x: x0, y: y0), endPoint: CGPoint(x: x1, y: y1)))
    }
    /// same-centre radial gradient (the only kind the creatures use)
    func radialGradient(_ cx: CGFloat, _ cy: CGFloat, _ r0: CGFloat, _ r1: CGFloat, _ stops: [(Double, Color)]) -> Paint {
        .shading(.radialGradient(Gradient(stops: stops.map { .init(color: $0.1, location: $0.0) }),
                                 center: CGPoint(x: cx, y: cy), startRadius: r0, endRadius: r1))
    }

    private func shading(_ p: Paint) -> GraphicsContext.Shading {
        switch p { case .color(let c): return .color(c); case .shading(let s): return s }
    }

    // MARK: state
    func save() {
        stack.append(Saved(gc: gc, fill: fillStyle, stroke: strokeStyle, lineWidth: lineWidth, cap: lineCap, join: lineJoin,
                           alpha: globalAlpha, fontSize: fontSize, align: textAlign))
    }
    func restore() {
        guard let s = stack.popLast() else { return }
        gc = s.gc; fillStyle = s.fill; strokeStyle = s.stroke; lineWidth = s.lineWidth
        lineCap = s.cap; lineJoin = s.join; fontSize = s.fontSize; textAlign = s.align
        globalAlpha = s.alpha
    }
    func translate(_ x: CGFloat, _ y: CGFloat) { gc.translateBy(x: x, y: y) }
    func rotate(_ a: CGFloat) { gc.rotate(by: .radians(Double(a))) }
    func scale(_ x: CGFloat, _ y: CGFloat) { gc.scaleBy(x: x, y: y) }

    // MARK: path
    func beginPath() { path = Path() }
    func closePath() { path.closeSubpath() }
    func moveTo(_ x: CGFloat, _ y: CGFloat) { path.move(to: CGPoint(x: x, y: y)) }
    func lineTo(_ x: CGFloat, _ y: CGFloat) {
        let p = CGPoint(x: x, y: y)
        if path.currentPoint == nil { path.move(to: p) } else { path.addLine(to: p) }
    }
    func quadraticCurveTo(_ cx: CGFloat, _ cy: CGFloat, _ x: CGFloat, _ y: CGFloat) {
        if path.currentPoint == nil { path.move(to: CGPoint(x: cx, y: cy)) }
        path.addQuadCurve(to: CGPoint(x: x, y: y), control: CGPoint(x: cx, y: cy))
    }
    func bezierCurveTo(_ c1x: CGFloat, _ c1y: CGFloat, _ c2x: CGFloat, _ c2y: CGFloat, _ x: CGFloat, _ y: CGFloat) {
        if path.currentPoint == nil { path.move(to: CGPoint(x: c1x, y: c1y)) }
        path.addCurve(to: CGPoint(x: x, y: y), control1: CGPoint(x: c1x, y: c1y), control2: CGPoint(x: c2x, y: c2y))
    }
    func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) { path.addRect(CGRect(x: x, y: y, width: w, height: h)) }

    /// canvas `arc`: clockwise on screen unless `ccw`; joins the current point with a line, like the browser does
    func arc(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat, _ a0: CGFloat, _ a1: CGFloat, ccw: Bool = false) {
        ellipse(x, y, r, r, 0, a0, a1, ccw: ccw)
    }

    func ellipse(_ x: CGFloat, _ y: CGFloat, _ rx: CGFloat, _ ry: CGFloat, _ rot: CGFloat,
                 _ a0: CGFloat, _ a1: CGFloat, ccw: Bool = false) {
        let tau = CGFloat.pi * 2
        var sweep = a1 - a0
        if !ccw {
            if sweep >= tau { sweep = tau } else { sweep = sweep.truncatingRemainder(dividingBy: tau); if sweep < 0 { sweep += tau } }
        } else {
            if sweep <= -tau { sweep = -tau } else { sweep = sweep.truncatingRemainder(dividingBy: tau); if sweep > 0 { sweep -= tau } }
        }
        let n = max(2, Int((abs(sweep) / 0.12).rounded(.up)))
        let cr = cos(rot), sr = sin(rot)
        for i in 0...n {
            let a = a0 + sweep * CGFloat(i) / CGFloat(n)
            let lx = rx * cos(a), ly = ry * sin(a)
            let p = CGPoint(x: x + lx * cr - ly * sr, y: y + lx * sr + ly * cr)
            if i == 0 && path.currentPoint == nil { path.move(to: p) } else { path.addLine(to: p) }
        }
    }

    /// clips everything painted until the matching `restore()` to the current path (canvas `clip`)
    func clip() { gc.clip(to: path) }

    // MARK: paint
    func fill() { gc.fill(path, with: shading(fillStyle)) }
    func stroke() {
        gc.stroke(path, with: shading(strokeStyle), style: StrokeStyle(lineWidth: lineWidth, lineCap: lineCap, lineJoin: lineJoin))
    }
    func fillRect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) {
        gc.fill(Path(CGRect(x: x, y: y, width: w, height: h)), with: shading(fillStyle))
    }
    func fillText(_ s: String, _ x: CGFloat, _ y: CGFloat) {
        let anchor: UnitPoint = textAlign == .center ? .center : textAlign == .right ? .trailing : .leading
        gc.draw(Text(s).font(.system(size: fontSize, design: .monospaced)), at: CGPoint(x: x, y: y), anchor: anchor)
    }
}

/// `rgba(r,g,b,a)` with 0…255 channels, like the CSS strings the web creatures build
func rgba(_ r: Double, _ g: Double, _ b: Double, _ a: Double = 1) -> Color {
    Color(.sRGB, red: r / 255, green: g / 255, blue: b / 255, opacity: a)
}
