import SwiftUI
import UIKit

/// A framed, non-interactive canvas that redraws every frame with the time since it appeared
/// (the web's "pure CSS animation" toys: the animation is redrawn by code here). Honors "Reduce Motion".
@MainActor
struct CanvasFrame: View {
    @EnvironmentObject private var ts: ThemeStore
    @Environment(\.scenePhase) private var scenePhase
    let background: Color
    var height: CGFloat = 340
    let draw: (Ctx2D, CGSize, Double, Theme) -> Void
    @State private var start = Date()

    var body: some View {
        let t = ts.theme
        let reduce = UIAccessibility.isReduceMotionEnabled
        TimelineView(.animation(paused: reduce || scenePhase != .active)) { tl in
            Canvas { gc, size in
                draw(Ctx2D(gc), size, reduce ? 0 : tl.date.timeIntervalSince(start), t)
            }
        }
        .frame(height: height)
        .background(background)
        .clipShape(RoundedRectangle(cornerRadius: t.r(10)))
        .overlay(RoundedRectangle(cornerRadius: t.r(10)).stroke(t.line, lineWidth: 1))
    }
}

// MARK: CSS helpers for the CSS-drawn toys

/// a CSS box with `border-radius: rx / tl tr br bl`: if two neighbouring radii don't fit a side, ALL radii shrink by the same factor (CSS rule)
func cssBox(_ g: Ctx2D, _ x: Double, _ y: Double, _ w: Double, _ h: Double, rx rx0: Double, _ tl0: Double, _ tr0: Double, _ br0: Double, _ bl0: Double) {
    var f = 1.0
    if rx0 > 0 { f = min(f, w / (2 * rx0)) }
    if tl0 + bl0 > 0 { f = min(f, h / (tl0 + bl0)) }
    if tr0 + br0 > 0 { f = min(f, h / (tr0 + br0)) }
    let rx = rx0 * f, tl = tl0 * f, tr = tr0 * f, br = br0 * f, bl = bl0 * f
    g.beginPath()
    g.moveTo(x + rx, y)
    g.lineTo(x + w - rx, y)
    g.ellipse(x + w - rx, y + tr, rx, tr, 0, -.pi / 2, 0)
    g.lineTo(x + w, y + h - br)
    g.ellipse(x + w - rx, y + h - br, rx, br, 0, 0, .pi / 2)
    g.lineTo(x + rx, y + h)
    g.ellipse(x + rx, y + h - bl, rx, bl, 0, .pi / 2, .pi)
    g.lineTo(x, y + tl)
    g.ellipse(x + rx, y + tl, rx, tl, 0, .pi, 3 * .pi / 2)
    g.closePath()
}

/// `border-radius: 50%`
func cssOval(_ g: Ctx2D, _ x: Double, _ y: Double, _ w: Double, _ h: Double) {
    cssBox(g, x, y, w, h, rx: w / 2, h / 2, h / 2, h / 2, h / 2)
}

/// run `body` with the canvas rotated by `deg` around (cx, cy) (CSS `transform: rotate()` with its transform-origin)
func rotated(_ g: Ctx2D, _ cx: Double, _ cy: Double, _ deg: Double, _ body: () -> Void) {
    g.save()
    g.translate(cx, cy); g.rotate(deg * .pi / 180); g.translate(-cx, -cy)
    body()
    g.restore()
}

/// CSS keyframes: linear interpolation between (progress 0…1, value) stops
func keyframes(_ p: Double, _ stops: [(Double, Double)]) -> Double {
    for i in 1..<stops.count where p <= stops[i].0 {
        let (p0, v0) = stops[i - 1], (p1, v1) = stops[i]
        return p1 == p0 ? v1 : v0 + (v1 - v0) * (p - p0) / (p1 - p0)
    }
    return stops[stops.count - 1].1
}
/// 0 → 1 → 0 over one cycle: an animation with a single `50%` keyframe
func tri(_ p: Double) -> Double { p < 0.5 ? p * 2 : (1 - p) * 2 }
