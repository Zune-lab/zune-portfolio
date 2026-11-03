import SwiftUI
import UIKit

// Port of src/components/lab/BannerMaker/banner.js: a pixel cloth of any size, one base colour + up to 6 stacked patterns,
// a frame (shape, rounded corners, border) that is part of the picture, and hand-drawn paint on top.
// No UI in this file, so it could be unit-tested on its own.

enum BannerCfg {
    static let minSize = 12, maxSize = 48, maxLayers = 6
}

/// the site's own 16-colour palette
struct Dye { let id: String; let hex: Int }
let dyes: [Dye] = [
    Dye(id: "chalk", hex: 0xF2EFE9), Dye(id: "ash", hex: 0xA3A7AD), Dye(id: "slate", hex: 0x4A5058), Dye(id: "ink", hex: 0x1B1D22),
    Dye(id: "bark", hex: 0x7A5238), Dye(id: "ember", hex: 0xC4352B), Dye(id: "tangerine", hex: 0xF08A24), Dye(id: "honey", hex: 0xF5C93A),
    Dye(id: "moss", hex: 0x7FB23A), Dye(id: "pine", hex: 0x2F6B3F), Dye(id: "teal", hex: 0x1F9C93), Dye(id: "sky", hex: 0x4CB4E6),
    Dye(id: "indigo", hex: 0x3B43B0), Dye(id: "grape", hex: 0x8A3FBF), Dye(id: "orchid", hex: 0xD556B8), Dye(id: "blush", hex: 0xF4A1B8),
]
private let dyeById = Dictionary(uniqueKeysWithValues: dyes.map { ($0.id, $0) })

// a colour is an id from the 16 ('sky') or a custom hex ('#3ab0e6')
func isCustom(_ c: String) -> Bool { c.hasPrefix("#") }

private func parseHex(_ hex: String) -> (Int, Int, Int) {
    var h = hex.dropFirst()
    if h.count == 3 { h = Substring(h.map { "\($0)\($0)" }.joined()) }
    guard h.count == 6, let v = Int(h, radix: 16) else { return (0, 0, 0) }
    return ((v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF)
}
func rgbOf(_ c: String) -> (Int, Int, Int) {
    if isCustom(c) { return parseHex(c) }
    let d = dyeById[c] ?? dyeById["ink"]!
    return ((d.hex >> 16) & 0xFF, (d.hex >> 8) & 0xFF, d.hex & 0xFF)
}
func hexOf(_ c: String) -> String {
    if isCustom(c) { return c.lowercased() }
    return "#" + String(format: "%06x", (dyeById[c] ?? dyeById["ink"]!).hex)
}
func colorName(_ c: String) -> String { isCustom(c) ? c.lowercased() : (dyeById[c] != nil ? c : c) }
func colorOf(_ c: String) -> Color { let (r, g, b) = rgbOf(c); return Color(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255) }

private func clampInt(_ n: Double, _ lo: Int, _ hi: Int) -> Int { max(lo, min(hi, Int(floor(n + 0.5)))) }
private func clamp01(_ n: Double) -> Double { clamp(n, 0, 1) }

enum BannerShape: String, CaseIterable {
    case rect, swallow, point, arch, oval
    var title: String {
        switch self { case .rect: return "rectangle"; case .swallow: return "swallowtail"; case .point: return "pennant"; case .arch: return "arch"; case .oval: return "oval" }
    }
}

struct BannerFrame: Equatable {
    var w = 20, h = 40
    var shape: BannerShape = .rect
    var radius = 0, border = 0
    var borderColor = "ink"
}

struct BannerLayer: Identifiable, Equatable {
    let id: Int
    var pattern: String
    var color: String
}
private var layerUid = 0
func makeLayer(_ pattern: String, _ color: String) -> BannerLayer { layerUid += 1; return BannerLayer(id: layerUid, pattern: pattern, color: color) }

struct PaintGroup { let color: String; let cells: [GridPoint] }

/// what every pattern mask receives: (x, y) pixel, (u, v) its centre, (nx, ny) position 0…1 on the cloth, m = the shorter side
struct BannerCell { let x: Int, y: Int; let u: Double, v: Double; let w: Int, h: Int; let nx: Double, ny: Double; let m: Double }

struct BannerPattern { let id: String; let name: String; let mask: (BannerCell) -> Double }

/// bitmap patterns (bug, cat, bolt…): '#' is a filled pixel, scaled to the cloth size
private func bitmap(_ rows: [String]) -> (BannerCell) -> Double {
    let cols = rows[0].count
    let grid = rows.map { Array($0) }
    return { c in
        let s = max(1, min(Int(floor(Double(c.w) * 0.9 / Double(cols))), Int(floor(Double(c.h) * 0.8 / Double(rows.count)))))
        let ox = Int(floor(Double(c.w - cols * s) / 2 + 0.5)) // Math.round
        let oy = Int(floor(Double(c.h - rows.count * s) / 2 + 0.5))
        let bx = Int(floor(Double(c.x - ox) / Double(s)))
        let by = Int(floor(Double(c.y - oy) / Double(s)))
        guard by >= 0, by < rows.count, bx >= 0, bx < cols else { return 0 }
        return grid[by][bx] == "#" ? 1 : 0
    }
}

private let band = 0.11 // half width of a diagonal stripe, as a fraction of the cloth
private func diagDown(_ c: BannerCell) -> Bool { abs(c.ny - c.nx) < band }
private func diagUp(_ c: BannerCell) -> Bool { abs(c.ny - (1 - c.nx)) < band }
private func b(_ v: Bool) -> Double { v ? 1 : 0 }

let bannerPatterns: [BannerPattern] = [
    BannerPattern(id: "stripe_bottom", name: "bottom stripe") { b($0.ny >= 0.8) },
    BannerPattern(id: "stripe_top", name: "top stripe") { b($0.ny < 0.2) },
    BannerPattern(id: "stripe_left", name: "left stripe") { b($0.nx < 0.3) },
    BannerPattern(id: "stripe_right", name: "right stripe") { b($0.nx >= 0.7) },
    BannerPattern(id: "stripe_center", name: "center stripe") { b($0.nx >= 0.35 && $0.nx < 0.65) },
    BannerPattern(id: "stripe_middle", name: "middle stripe") { b($0.ny >= 0.4 && $0.ny < 0.6) },
    BannerPattern(id: "stripe_down", name: "diagonal ↘") { b(diagDown($0)) },
    BannerPattern(id: "stripe_up", name: "diagonal ↙") { b(diagUp($0)) },
    BannerPattern(id: "small_stripes", name: "small stripes") { b($0.x % 4 == 1 || $0.x % 4 == 2) },
    BannerPattern(id: "saltire", name: "saltire ✕") { b(diagDown($0) || diagUp($0)) },
    BannerPattern(id: "cross", name: "cross +") { b(abs($0.u - Double($0.w) / 2) < $0.m * 0.15 || abs($0.v - Double($0.h) / 2) < $0.m * 0.15) },
    BannerPattern(id: "border", name: "border") { c in
        let bd = max(1, Int(floor(c.m * 0.1 + 0.5)))
        return b(c.x < bd || c.x >= c.w - bd || c.y < bd || c.y >= c.h - bd)
    },
    BannerPattern(id: "gradient_top", name: "gradient ↓") { clamp01(1 - $0.ny / 0.7) },
    BannerPattern(id: "gradient_bottom", name: "gradient ↑") { clamp01(1 - (1 - $0.ny) / 0.7) },
    BannerPattern(id: "circle", name: "circle") { c in
        let dx = c.u - Double(c.w) / 2, dy = c.v - Double(c.h) / 2, r = c.m * 0.325
        return b(dx * dx + dy * dy <= r * r)
    },
    BannerPattern(id: "rhombus", name: "rhombus") { b(abs($0.nx - 0.5) / 0.4 + abs($0.ny - 0.5) / 0.4 <= 1) },
    BannerPattern(id: "half_top", name: "half top") { b($0.ny < 0.5) },
    BannerPattern(id: "half_bottom", name: "half bottom") { b($0.ny >= 0.5) },
    BannerPattern(id: "half_left", name: "half left") { b($0.nx < 0.5) },
    BannerPattern(id: "half_right", name: "half right") { b($0.nx >= 0.5) },
    BannerPattern(id: "corner_bl", name: "corner ◣") { b($0.ny > $0.nx) },
    BannerPattern(id: "corner_tr", name: "corner ◥") { b($0.ny < $0.nx) },
    BannerPattern(id: "corner_tl", name: "corner ◤") { b($0.ny < 1 - $0.nx) },
    BannerPattern(id: "corner_br", name: "corner ◢") { b($0.ny > 1 - $0.nx) },
    BannerPattern(id: "triangle_up", name: "triangle ▲") { b($0.ny > 0.5 && abs($0.nx - 0.5) <= $0.ny - 0.5) },
    BannerPattern(id: "triangle_down", name: "triangle ▼") { b($0.ny < 0.5 && abs($0.nx - 0.5) <= 0.5 - $0.ny) },
    BannerPattern(id: "bricks", name: "bricks") { b($0.y % 5 == 0 || ($0.x + (($0.y / 5) % 2) * 5) % 10 == 0) },
    BannerPattern(id: "bug", name: "bug", mask: bitmap(["..#...#..", "...#.#...", "..#####..", ".#######.", "#.#####.#", "..#####..", "#.#####.#", "...###..."])),
    BannerPattern(id: "cat", name: "cat", mask: bitmap(["#.......#", "##.....##", "#########", "##.###.##", "#########", "####.####", ".#######."])),
    BannerPattern(id: "moon", name: "moon", mask: bitmap(["..####..", ".###....", "###.....", "###.....", "###.....", ".###....", "..####.."])),
    BannerPattern(id: "bolt", name: "bolt", mask: bitmap(["....##", "...##.", "..##..", ".#####", "...##.", "..##..", ".##...", "##...."])),
    BannerPattern(id: "star", name: "star", mask: bitmap(["....#....", "...###...", "#########", ".#######.", "..#####..", "..##.##..", ".##...##."])),
    BannerPattern(id: "heart", name: "heart", mask: bitmap([".###.###.", "#########", "#########", "#########", ".#######.", "..#####..", "...###...", "....#...."])),
]
let bannerPatternById = Dictionary(uniqueKeysWithValues: bannerPatterns.map { ($0.id, $0) })

/// which pixels are inside the frame: shape + rounded corners (each pixel is in or out, no smoothing)
private func frameMask(_ w: Int, _ h: Int, _ shape: BannerShape, _ radius: Int) -> [Bool] {
    let m = Double(min(w, h))
    let r = Double(clampInt(Double(radius), 0, 50)) / 100 * m
    let W = Double(w), H = Double(h)
    var inside = [Bool](repeating: false, count: w * h)
    for y in 0..<h {
        for x in 0..<w {
            let u = Double(x) + 0.5, v = Double(y) + 0.5
            let cx = clamp(u, r, W - r), cy = clamp(v, r, H - r)
            var ok = (u - cx) * (u - cx) + (v - cy) * (v - cy) <= r * r
            let dx = abs(u - W / 2) / (W / 2)
            if ok && shape == .swallow { ok = v <= H - 0.22 * H * (1 - dx) }
            else if ok && shape == .point { ok = v <= H * 0.5 || dx <= (H - v) / (H * 0.5) }
            else if ok && shape == .arch {
                let rr = min(W / 2, H)
                ok = v >= rr || (u - W / 2) * (u - W / 2) + (v - rr) * (v - rr) <= rr * rr
            } else if shape == .oval {
                ok = dx * dx + ((v - H / 2) / (H / 2)) * ((v - H / 2) / (H / 2)) <= 1
            }
            inside[y * w + x] = ok
        }
    }
    return inside
}

/// blends every layer onto the base, then cuts to the frame: RGBA w*h*4, transparent outside the frame.
/// `paint` is the hand-drawn layer on top: [(colour, cells)]
func renderBanner(_ base: String, _ layers: [BannerLayer], _ f: BannerFrame, _ paint: [PaintGroup] = []) -> [UInt8] {
    let w = max(BannerCfg.minSize, min(BannerCfg.maxSize, f.w)), h = max(BannerCfg.minSize, min(BannerCfg.maxSize, f.h))
    let bw = max(0, min(4, f.border))
    let inside = frameMask(w, h, f.shape, f.radius)
    var out = [UInt8](repeating: 0, count: w * h * 4)
    let baseRgb = rgbOf(base), borderRgb = rgbOf(f.borderColor)
    let stack = layers.compactMap { l in bannerPatternById[l.pattern].map { ($0.mask, rgbOf(l.color)) } }
    let m = Double(min(w, h))
    func isOut(_ x: Int, _ y: Int) -> Bool { x < 0 || y < 0 || x >= w || y >= h || !inside[y * w + x] }
    // a pixel inside the frame, at most `bw` cells from its edge, is border
    func onBorder(_ x: Int, _ y: Int) -> Bool {
        for dy in -bw...bw { for dx in -bw...bw where abs(dx) + abs(dy) <= bw && isOut(x + dx, y + dy) { return true } }
        return false
    }
    func byte(_ v: Double) -> UInt8 { UInt8(max(0, min(255, v.rounded()))) } // Uint8ClampedArray

    for y in 0..<h {
        for x in 0..<w {
            if !inside[y * w + x] { continue }
            let i = (y * w + x) * 4
            if bw > 0 && onBorder(x, y) {
                out[i] = UInt8(borderRgb.0); out[i + 1] = UInt8(borderRgb.1); out[i + 2] = UInt8(borderRgb.2); out[i + 3] = 255
                continue
            }
            var r = Double(baseRgb.0), g = Double(baseRgb.1), bl = Double(baseRgb.2)
            let u = Double(x) + 0.5, v = Double(y) + 0.5
            let c = BannerCell(x: x, y: y, u: u, v: v, w: w, h: h, nx: u / Double(w), ny: v / Double(h), m: m)
            for (mask, rgb) in stack {
                let a = mask(c)
                if a > 0 {
                    r += (Double(rgb.0) - r) * a; g += (Double(rgb.1) - g) * a; bl += (Double(rgb.2) - bl) * a
                }
            }
            out[i] = byte(r); out[i + 1] = byte(g); out[i + 2] = byte(bl); out[i + 3] = 255
        }
    }
    // hand-drawn paint sits on top and shows only inside the frame; cells outside the cloth are kept but not drawn
    for group in paint {
        let rgb = rgbOf(group.color)
        for p in group.cells where p.x >= 0 && p.y >= 0 && p.x < w && p.y < h && inside[p.y * w + p.x] {
            let i = (p.y * w + p.x) * 4
            out[i] = UInt8(rgb.0); out[i + 1] = UInt8(rgb.1); out[i + 2] = UInt8(rgb.2); out[i + 3] = 255
        }
    }
    return out
}

/// RGBA bytes -> image with crisp square pixels (draw it with `.interpolation(.none)`)
func pixelImage(_ px: [UInt8], _ w: Int, _ h: Int) -> CGImage? {
    guard let provider = CGDataProvider(data: Data(px) as CFData) else { return nil }
    return CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: w * 4,
                   space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
                   provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent)
}

/// a PNG file of the cloth (long side ≈ 640 px), no tilt / shadow / bar: exactly the banner
func bannerPNG(_ px: [UInt8], _ w: Int, _ h: Int, longSide: Int = 640) -> Data? {
    guard let cg = pixelImage(px, w, h) else { return nil }
    let scale = max(4, longSide / max(w, h))
    let size = CGSize(width: w * scale, height: h * scale)
    let img = UIGraphicsImageRenderer(size: size).image { ctx in
        ctx.cgContext.interpolationQuality = .none
        UIImage(cgImage: cg).draw(in: CGRect(origin: .zero, size: size))
    }
    return img.pngData()
}
