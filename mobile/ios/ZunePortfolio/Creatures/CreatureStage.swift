import SwiftUI

// Port of src/components/lab/CreatureStage/CreatureStage.jsx: the shared stage for lab creatures.
// A creature is just an object with `step(api)`; the stage does the canvas, theme colours, pointer, the loop and "respawn".

struct StageColors {
    var ink = Color.white, amber = Color.orange, dim = Color.gray, green = Color.green, line = Color.gray, panel = Color.black
    /// the panel is a light colour (light skins): glows need real lamp yellow there, not the skin's dark amber
    var panelLight = false
}
struct StageMouse { var x: CGFloat = 0, y: CGFloat = 0; var down = false; var inside = false; var clicks = 0 }

final class StageAPI {
    var g: Ctx2D!
    var w: CGFloat = 0, h: CGFloat = 0
    var t: Double = 0, dt: Double = 0
    var colors = StageColors()
    var mouse = StageMouse()
    /// where the creature should look / walk: the finger, or a slow wander when nobody touches for 2.5 s
    var aim = CGPoint.zero
    /// seconds since the pointer last moved
    var idle: Double = 3.5
}

protocol Creature: AnyObject {
    /// small text in the corner of the frame
    var label: String { get }
    /// optional live text that replaces the label (asked every frame)
    func caption() -> String?
    /// called every frame: simulate and draw on `api.g`
    func step(_ api: StageAPI)
    /// called inside the touch event (audio can only start from a user gesture)
    func unlock()
    func destroy()
}
extension Creature {
    func caption() -> String? { nil }
    func unlock() {}
    func destroy() {}
}

private let idleSeconds = 2.5

@MainActor
final class StageHost {
    let api = StageAPI()
    private(set) var creature: Creature?
    private var last: Double = 0
    private var lastLabel = ""
    var text = ""

    func respawn() { creature?.destroy(); creature = nil; last = 0 }
    func shutdown() { creature?.destroy(); creature = nil }

    func frame(date: Date, size: CGSize, gc: GraphicsContext, theme t: Theme, make: (CGFloat, CGFloat) -> Creature) {
        guard size.width > 1, size.height > 1 else { return }
        api.w = size.width; api.h = size.height
        let p = t.p.panel
        let lum = (Double((p >> 16) & 0xFF) * 299 + Double((p >> 8) & 0xFF) * 587 + Double(p & 0xFF) * 114) / 1000
        api.colors = StageColors(ink: t.text, amber: t.amber, dim: t.dim, green: t.green, line: t.line, panel: t.panel, panelLight: lum > 140)
        if creature == nil {
            api.mouse = StageMouse(x: size.width * 0.75, y: size.height * 0.4)
            api.t = 0; api.idle = idleSeconds + 1
            let c = make(size.width, size.height)
            creature = c
            text = touchText(c.label)
        }
        let now = date.timeIntervalSinceReferenceDate
        api.dt = last == 0 ? 1.0 / 60 : min(0.05, now - last)
        last = now
        api.t += api.dt
        api.idle += api.dt
        if api.idle > idleSeconds {
            // nobody is touching: the creature wanders on a slow Lissajous path
            api.aim = CGPoint(x: size.width * (0.5 + 0.34 * sin(api.t * 0.37)), y: size.height * (0.5 + 0.3 * sin(api.t * 0.53 + 1)))
        } else {
            api.aim = CGPoint(x: api.mouse.x, y: api.mouse.y)
        }
        let g = Ctx2D(gc)
        g.lineCap = .round; g.lineJoin = .round; g.lineWidth = 1.2
        g.strokeColor(t.text); g.fillColor(t.text)
        api.g = g
        creature?.step(api)
        if let c = creature?.caption() { text = touchText(c) }
    }

    // pointer input (the web's pointermove / pointerdown / pointerup / pointerleave)
    func move(_ p: CGPoint) { api.mouse.x = p.x; api.mouse.y = p.y; api.mouse.inside = true; api.idle = 0 }
    func down(_ p: CGPoint) {
        move(p)
        if !api.mouse.down { api.mouse.down = true; api.mouse.clicks += 1; creature?.unlock() }
    }
    func up() { api.mouse.down = false; creature?.unlock() }
    func leave() { api.mouse.down = false; api.mouse.inside = false }
}

/// "move your cursor" → "drag your finger", "click" → "tap" (lib/env.js touchText, for touch screens)
func touchText(_ s: String) -> String {
    s.replacingOccurrences(of: "move your cursor", with: "drag your finger", options: .caseInsensitive)
        .replacingOccurrences(of: "move the cursor", with: "drag your finger", options: .caseInsensitive)
        .replacingOccurrences(of: "cursor", with: "finger", options: .caseInsensitive)
        .replacingOccurrences(of: "clicked", with: "tapped", options: .caseInsensitive)
        .replacingOccurrences(of: "clicking", with: "tapping", options: .caseInsensitive)
        .replacingOccurrences(of: "click", with: "tap", options: .caseInsensitive)
}

@MainActor
struct CreatureStage: View {
    @EnvironmentObject private var ts: ThemeStore
    @Environment(\.scenePhase) private var scenePhase
    let make: (CGFloat, CGFloat) -> Creature
    var height: CGFloat = 380
    @State private var host = StageHost()
    @State private var play = true  // true: dragging plays with the creature, false: dragging scrolls the page

    var body: some View {
        let t = ts.theme
        Panel {
            VStack(alignment: .leading, spacing: 16) {
                ZStack(alignment: .topLeading) {
                    TimelineView(.animation(paused: scenePhase != .active)) { tl in
                        ZStack(alignment: .topLeading) {
                            Canvas { gc, size in
                                host.frame(date: tl.date, size: size, gc: gc, theme: t, make: make)
                            }
                            Text(host.text).font(.mono(12)).foregroundColor(t.dim)
                                .padding(.horizontal, 12).padding(.top, 10).allowsHitTesting(false)
                        }
                    }
                    .allowsHitTesting(play)
                    .gesture(DragGesture(minimumDistance: 0)
                        .onChanged { v in host.down(v.location); host.move(v.location) }
                        .onEnded { _ in host.up(); host.leave() })
                    .onContinuousHover { phase in
                        switch phase {
                        case .active(let p): host.move(p)
                        case .ended: host.leave()
                        }
                    }
                }
                .frame(height: height)
                .background(t.panel)
                .clipShape(RoundedRectangle(cornerRadius: t.r(8)))
                .overlay(RoundedRectangle(cornerRadius: t.r(8)).stroke(t.line, lineWidth: 1))

                HStack(spacing: 10) {
                    Button { host.respawn() } label: {
                        Text("respawn").font(.mono(13)).foregroundColor(t.text)
                            .padding(.horizontal, 14).padding(.vertical, 6)
                            .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(t.line, lineWidth: 1))
                    }.buttonStyle(.plain)
                    // the canvas fills much of the screen, so touch needs a way to scroll the page again
                    Button { play.toggle() } label: {
                        Text(play ? "drag: play" : "drag: scroll").font(.mono(13)).foregroundColor(t.text)
                            .padding(.horizontal, 14).padding(.vertical, 6)
                            .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(play ? t.amber : t.line, lineWidth: 1))
                    }.buttonStyle(.plain).accessibilityAddTraits(play ? .isSelected : [])
                }
            }
        }
        .onDisappear { host.shutdown() }
    }
}
