import SwiftUI

/// Minecraft torch light/dark switch (src/components/layout/ThemeToggleTorch).
/// The web builds a 3D CSS cube; here the same cube (rotateX(-30deg) rotateY(45deg), same cell colours) is projected by hand
/// and painted as flat polygons. Lit = dark mode (the torch lights the page), unlit = light mode.
enum TorchGeometry {
    struct Cell { let pts: [CGPoint]; let lit: Int; let unlit: Int }

    // same projection as the CSS: rotateY(45°) then rotateX(-30°), orthographic, y points down
    private static func project(_ x: Double, _ y: Double, _ z: Double) -> CGPoint {
        let a = Double.pi / 4, b = -Double.pi / 6
        let x1 = x * cos(a) + z * sin(a)
        let z1 = -x * sin(a) + z * cos(a)
        return CGPoint(x: x1, y: y * cos(b) - z1 * sin(b))
    }

    /// the flame cube is 30 wide; unlit colours are the translucent (#xx60) cells over the black face = colour * 0.376
    private static func dim(_ c: Int) -> Int {
        func ch(_ s: Int) -> Int { Int(Double((c >> s) & 0xFF) * 0.376) }
        return (ch(16) << 16) | (ch(8) << 8) | ch(0)
    }

    // children 1…4 of each head face, row-major
    private static let topCells = [0xFFFF97, 0xFFD800, 0xFFFFFF, 0xFF8F00]
    private static let sideCells = [0xFFD800, 0xFF8F00, 0xFFFF97, 0xFFFFFF]
    // children 1…16 of the stick (2 columns × 8 rows)
    private static let stickLit = [0x7C623E, 0x4C3D26, 0x937344, 0x3C2F1C, 0x937344, 0x423522, 0x9F7F50, 0x403320,
                                   0x977748, 0x3C2F1C, 0x675231, 0x3D301D, 0x987849, 0x3B2E1B, 0x675231, 0x271E10]
    private static let stickUnlit = [0x443622, 0x2E2517, 0x4B3B23, 0x251E12, 0x4B3B23, 0x292115, 0x4B3C26, 0x292115,
                                     0x4B3A21, 0x251E12, 0x3D311D, 0x2C2315, 0x493A22, 0x2B2114, 0x3D311D, 0x271E10]

    private static func grid(cols: Int, rows: Int, at: (Double, Double) -> CGPoint, lit: [Int], unlit: [Int]) -> [Cell] {
        var out: [Cell] = []
        for r in 0..<rows {
            for c in 0..<cols {
                let u0 = Double(c) / Double(cols), u1 = Double(c + 1) / Double(cols)
                let v0 = Double(r) / Double(rows), v1 = Double(r + 1) / Double(rows)
                out.append(Cell(pts: [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)], lit: lit[r * cols + c], unlit: unlit[r * cols + c]))
            }
        }
        return out
    }

    /// painter's order: stick first, flame cube on top
    static let cells: [Cell] = {
        let stickR = grid(cols: 2, rows: 8, at: { u, v in project(-15 + 30 * u, 20 + 120 * v, 15) }, lit: stickLit, unlit: stickUnlit)
        let stickL = grid(cols: 2, rows: 8, at: { u, v in project(-15, 20 + 120 * v, -15 + 30 * u) }, lit: stickLit, unlit: stickUnlit)
        let right = grid(cols: 2, rows: 2, at: { u, v in project(-15 + 30 * u, 30 * v, 15) }, lit: sideCells, unlit: sideCells.map(dim))
        let left = grid(cols: 2, rows: 2, at: { u, v in project(-15, 30 * v, -15 + 30 * u) }, lit: sideCells, unlit: sideCells.map(dim))
        let top = grid(cols: 2, rows: 2, at: { u, v in project(-15 + 30 * u, 0, -15 + 30 * v) }, lit: topCells, unlit: topCells.map(dim))
        return stickL + stickR + left + right + top
    }()

    static let bounds: CGRect = {
        let all = cells.flatMap(\.pts)
        let minX = all.map(\.x).min()!, maxX = all.map(\.x).max()!
        let minY = all.map(\.y).min()!, maxY = all.map(\.y).max()!
        return CGRect(x: minX, y: minY, width: maxX - minX, height: maxY - minY)
    }()
}

@MainActor struct TorchSwitch: View {
    let lit: Bool
    var enabled = true
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 1) {
                Canvas { ctx, size in
                    let b = TorchGeometry.bounds
                    let s = min(size.width / b.width, size.height / b.height) * 0.9
                    let ox = (size.width - b.width * s) / 2 - b.minX * s
                    let oy = (size.height - b.height * s) / 2 - b.minY * s
                    func map(_ p: CGPoint) -> CGPoint { CGPoint(x: p.x * s + ox, y: p.y * s + oy) }

                    if lit { // the glow around the flame
                        let c = map(CGPoint(x: 0, y: 12))
                        let r = size.height * 0.75
                        ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2)),
                                 with: .radialGradient(Gradient(colors: [Color(hex: 0xFFED9C, opacity: 0.55), .clear]),
                                                       center: c, startRadius: 0, endRadius: r))
                    }
                    for cell in TorchGeometry.cells {
                        var path = Path()
                        path.addLines(cell.pts.map(map))
                        path.closeSubpath()
                        ctx.fill(path, with: .color(Color(hex: lit ? cell.lit : cell.unlit)))
                    }
                }
                .frame(width: 36, height: 34)
                Text("Tap me!").font(.mono(8, .bold)).opacity(0.85)
            }
        }
        .buttonStyle(.plain)
        .opacity(enabled ? 1 : 0.5)
        .accessibilityLabel(enabled ? (lit ? "dark mode, tap for light" : "light mode, tap for dark") : "This skin has a single mode")
    }
}
