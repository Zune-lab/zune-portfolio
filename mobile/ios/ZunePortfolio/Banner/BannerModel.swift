import SwiftUI

enum BannerTab: String, CaseIterable { case design, frame, draw, code }
enum BannerTool { case pencil, eraser }
enum CopyState { case none, ok, fail }

/// state + actions of the banner maker (port of the hooks in BannerMaker.jsx)
@MainActor
final class BannerModel: ObservableObject {
    static let maxUndo = 50
    static let sizePresets: [(name: String, w: Int, h: Int)] = [("portrait", 20, 40), ("landscape", 40, 20), ("square", 30, 30)]

    @Published var tab: BannerTab = .design
    @Published var base = "indigo"
    @Published var layers: [BannerLayer] = [makeLayer("rhombus", "sky"), makeLayer("circle", "chalk")]
    @Published var frame = BannerFrame()
    @Published var tilt = 0.0
    @Published var shadow = 14.0
    @Published var hanger = true
    @Published var sel = 1                       // -1 = base, -2 = border
    @Published private(set) var paint: [GridPoint: String] = [:]
    @Published private(set) var history: [[GridPoint: String]] = []
    @Published var tool: BannerTool = .pencil
    @Published var mirror = false
    @Published var ink = "honey"
    @Published var copied: CopyState = .none

    private var strokeLast: GridPoint?
    private var strokePushed = false

    var w: Int { frame.w }
    var h: Int { frame.h }
    var drawing: Bool { tab == .draw }
    var selLayer: BannerLayer? { sel >= 0 && sel < layers.count ? layers[sel] : nil }
    var activeColor: String { selLayer?.color ?? (sel == -2 ? frame.borderColor : base) }
    var colorLabel: String { selLayer != nil ? "layer color" : sel == -2 ? "border color" : "base color" }

    /// hand-drawn pixels grouped by colour (for rendering and for the generated code)
    var groups: [PaintGroup] {
        var by: [String: [GridPoint]] = [:]
        for (p, c) in paint { by[c, default: []].append(p) }
        return by.map { PaintGroup(color: $0.key, cells: $0.value.sorted { ($0.y, $0.x) < ($1.y, $1.x) }) }
            .sorted { $0.color < $1.color }
    }

    var pixels: [UInt8] { renderBanner(base, layers, frame, groups) }

    // MARK: design
    func setColor(_ c: String) {
        if sel == -1 { base = c }
        else if sel == -2 { frame.borderColor = c }
        else if sel >= 0 && sel < layers.count { layers[sel].color = c }
    }
    func setPattern(_ p: String) { if sel >= 0 && sel < layers.count { layers[sel].pattern = p } }
    func setBorder(_ n: Int) { frame.border = n; if n == 0 && sel == -2 { sel = -1 } }

    func addLayer() {
        guard layers.count < BannerCfg.maxLayers else { return }
        let prev = layers.last?.color ?? base
        let color = dyes.filter { $0.id != prev }.randomElement()!
        layers.append(makeLayer(bannerPatterns.randomElement()!.id, color.id))
        sel = layers.count - 1
    }

    func removeLayer(_ i: Int) {
        let oldCount = layers.count
        layers.remove(at: i)
        sel = sel > i ? sel - 1 : sel == i ? min(i, oldCount - 2) : sel
    }

    func move(_ i: Int, _ dir: Int) {
        let j = i + dir
        guard j >= 0, j < layers.count else { return }
        layers.swapAt(i, j)
        sel = sel == i ? j : sel == j ? i : sel
    }

    func randomize() {
        let n = randInt(2, BannerCfg.maxLayers)
        let baseColor = dyes.randomElement()!.id
        var prev = baseColor
        let next: [BannerLayer] = (0..<n).map { _ in
            let c = dyes.filter { $0.id != prev }.randomElement()!.id
            prev = c
            return makeLayer(bannerPatterns.randomElement()!.id, c)
        }
        base = baseColor
        layers = next
        sel = next.count - 1
    }

    /// clear removes the layers and the hand-drawn paint (the paint can still be undone)
    func clear() { base = "chalk"; layers = []; sel = -1; clearPaint() }

    func resetFrame() {
        frame = BannerFrame(); tilt = 0; shadow = 14; hanger = true
        if sel == -2 { sel = -1 }
    }

    // MARK: drawing
    private func pushHistory(_ snapshot: [GridPoint: String]) { history = Array((history + [snapshot]).suffix(Self.maxUndo)) }

    func clearPaint() {
        guard !paint.isEmpty else { return }
        pushHistory(paint)
        paint = [:]
    }

    func undo() {
        guard let last = history.last else { return }
        paint = last
        history.removeLast()
    }

    /// paints (or erases) cells, mirrored left-right when `mirror` is on;
    /// only a stroke that really changes the picture goes into the undo history
    private func stamp(_ cells: [GridPoint]) {
        let all = mirror ? cells.flatMap { [$0, GridPoint(x: w - 1 - $0.x, y: $0.y)] } : cells
        var next = paint
        var changed = false
        for p in all {
            if tool == .eraser {
                if next.removeValue(forKey: p) != nil { changed = true }
            } else if next[p] != ink {
                next[p] = ink; changed = true
            }
        }
        guard changed else { return }
        if !strokePushed { strokePushed = true; pushHistory(paint) }
        paint = next
    }

    func beginStroke(_ c: GridPoint) { strokeLast = c; strokePushed = false; stamp([c]) }
    func continueStroke(_ c: GridPoint) {
        guard let last = strokeLast, c != last else { return }
        stamp(Self.line(last, c))
        strokeLast = c
    }
    func endStroke() { strokeLast = nil }

    /// the cells on the straight line between two cells (Bresenham), so a fast drag leaves no gaps
    static func line(_ a: GridPoint, _ b: GridPoint) -> [GridPoint] {
        var cells: [GridPoint] = []
        let dx = abs(b.x - a.x), dy = -abs(b.y - a.y)
        let sx = a.x < b.x ? 1 : -1, sy = a.y < b.y ? 1 : -1
        var err = dx + dy, x = a.x, y = a.y
        while true {
            cells.append(GridPoint(x: x, y: y))
            if x == b.x && y == b.y { return cells }
            let e2 = 2 * err
            if e2 >= dy { err += dy; x += sx }
            if e2 <= dx { err += dx; y += sy }
        }
    }

    // MARK: code tab
    /// code that rebuilds the design on screen; it runs with `renderBanner` from banner.js
    var code: String {
        let rows = layers.map { "  { pattern: '\($0.pattern)', color: '\($0.color)' }," }.joined(separator: "\n")
        var out = """
        import { renderBanner } from './banner.js';

        const base = '\(base)';
        const layers = [\(rows.isEmpty ? "" : "\n\(rows)\n")];
        const frame = {
          w: \(frame.w), h: \(frame.h), shape: '\(frame.shape.rawValue)',
          radius: \(frame.radius), border: \(frame.border), borderColor: '\(frame.borderColor)',
        };

        """
        let g = groups
        if g.isEmpty { return out + "\n// RGBA pixels, w * h * 4\nconst pixels = renderBanner(base, layers, frame);" }
        let paintCode = g.map { group -> String in
            var lines: [String] = []
            var i = 0
            while i < group.cells.count {
                let chunk = group.cells[i..<min(i + 6, group.cells.count)]
                lines.append("      " + chunk.map { "[\($0.x), \($0.y)]" }.joined(separator: ", ") + ",")
                i += 6
            }
            return "  {\n    color: '\(group.color)',\n    cells: [\n\(lines.joined(separator: "\n"))\n    ],\n  },"
        }.joined(separator: "\n")
        out += "\nconst paint = [\n\(paintCode)\n];\n\n// RGBA pixels, w * h * 4\nconst pixels = renderBanner(base, layers, frame, paint);"
        return out
    }

    func copy() {
        UIPasteboard.general.string = code
        copied = .ok
        Task { try? await Task.sleep(nanoseconds: 1_500_000_000); copied = .none }
    }
}
