import SwiftUI
import UIKit

/// Banner maker (src/components/lab/BannerMaker/BannerMaker.jsx): four tabs design / frame / draw / code,
/// save as a PNG (share sheet) or copy the code. Preview on top, controls below (the web puts them side by side).
@MainActor
struct BannerMakerView: View {
    @EnvironmentObject private var ts: ThemeStore
    @StateObject private var m = BannerModel()
    @State private var shareURL: URL?
    @State private var thumbs: [String: CGImage] = [:]
    @State private var thumbKey = ""

    private let stageW: CGFloat = 296
    private let stageH: CGFloat = 330

    var body: some View {
        let t = ts.theme
        Panel {
            VStack(alignment: .leading, spacing: 16) {
                preview
                HStack(spacing: 8) {
                    action("random") { m.randomize() }
                    action("clear") { m.clear() }
                    action("save .png", color: t.green) { save() }
                }
                tabs
                Group {
                    switch m.tab {
                    case .design: design
                    case .frame: frameTab
                    case .draw: drawTab
                    case .code: codeTab
                    }
                }
                .font(.mono(13))
            }
        }
        .sheet(isPresented: Binding(get: { shareURL != nil }, set: { if !$0 { shareURL = nil } })) {
            if let url = shareURL { ShareSheet(items: [url]) }
        }
    }

    // MARK: preview
    private var preview: some View {
        let t = ts.theme
        let w = m.w, h = m.h
        let cell = max(3, floor(min(stageW / CGFloat(w), (stageH - (m.hanger ? 10 : 0)) / CGFloat(h))))
        let image = pixelImage(m.pixels, w, h)
        return ZStack {
            Rectangle().fill(t.panel)
            VStack(spacing: 2) {
                if m.hanger {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(LinearGradient(colors: [Color(hex: 0xA0703F), Color(hex: 0x6E4A26)], startPoint: .top, endPoint: .bottom))
                        .frame(width: CGFloat(w) * cell + 16, height: 8)
                }
                if let image {
                    Image(decorative: image, scale: 1)
                        .resizable().interpolation(.none)
                        .frame(width: CGFloat(w) * cell, height: CGFloat(h) * cell)
                        .gesture(DragGesture(minimumDistance: 0)
                            .onChanged { v in
                                guard m.drawing else { return }
                                let c = GridPoint(x: min(max(Int(v.location.x / cell), 0), w - 1), y: min(max(Int(v.location.y / cell), 0), h - 1))
                                if v.translation == .zero { m.beginStroke(c) } else { m.continueStroke(c) }
                            }
                            .onEnded { _ in m.endStroke() })
                        .accessibilityLabel("Banner preview")
                }
            }
            .rotationEffect(.degrees(m.drawing ? 0 : m.tilt))
            .shadow(color: .black.opacity(m.shadow > 0 ? 0.45 : 0), radius: m.shadow / 2, y: m.shadow / 2)
        }
        .frame(height: 400)
        .clipShape(RoundedRectangle(cornerRadius: t.r(8)))
        .overlay(RoundedRectangle(cornerRadius: t.r(8)).stroke(t.line, lineWidth: 1))
    }

    private func action(_ title: String, color: Color? = nil, _ run: @escaping () -> Void) -> some View {
        let t = ts.theme
        return Button(action: run) {
            Text(title).font(.mono(12)).foregroundColor(color ?? t.text)
                .frame(maxWidth: .infinity).padding(.vertical, 6)
                .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(t.line, lineWidth: 1))
        }.buttonStyle(.plain)
    }

    /// saves exactly the cloth (shape, border, drawing, transparent outside), without tilt or shadow
    private func save() {
        guard let data = bannerPNG(m.pixels, m.w, m.h) else { return }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("\(Site.id)-banner.png")
        do { try data.write(to: url); shareURL = url } catch { }
    }

    // MARK: tabs
    private var tabs: some View {
        let t = ts.theme
        return VStack(spacing: 0) {
            HStack(spacing: 4) {
                ForEach(BannerTab.allCases, id: \.self) { tab in
                    Button { m.tab = tab } label: {
                        Text(tab.rawValue).font(.mono(13)).foregroundColor(m.tab == tab ? t.text : t.dim)
                            .padding(.horizontal, 12).padding(.vertical, 6)
                            .overlay(alignment: .bottom) { Rectangle().fill(m.tab == tab ? t.amber : .clear).frame(height: 2) }
                    }.buttonStyle(.plain)
                }
                Spacer()
            }
            Rectangle().fill(t.line).frame(height: 1)
        }
    }

    private func chip(_ title: String, on: Bool, _ run: @escaping () -> Void) -> some View {
        let t = ts.theme
        return Button(action: run) {
            Text(title).font(.mono(12.5)).foregroundColor(on ? t.text : t.dim)
                .padding(.horizontal, 10).padding(.vertical, 4)
                .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(on ? t.amber : t.line, lineWidth: 1))
        }.buttonStyle(.plain)
    }

    private func swatch(_ c: String) -> some View {
        RoundedRectangle(cornerRadius: 2).fill(colorOf(c)).frame(width: 14, height: 14)
            .overlay(RoundedRectangle(cornerRadius: 2).stroke(ts.theme.line, lineWidth: 1))
    }

    // MARK: design
    private var design: some View {
        let t = ts.theme
        return VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("// layers \(m.layers.count)/\(BannerCfg.maxLayers)").font(.mono(12)).foregroundColor(t.dim)
                    Spacer()
                    Button { m.addLayer() } label: {
                        Text("+ layer").font(.mono(12)).foregroundColor(t.text)
                            .padding(.horizontal, 10).padding(.vertical, 3)
                            .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(t.line, lineWidth: 1))
                    }.buttonStyle(.plain).disabled(m.layers.count >= BannerCfg.maxLayers).opacity(m.layers.count >= BannerCfg.maxLayers ? 0.4 : 1)
                }
                if m.layers.isEmpty {
                    Text("// no layers yet. press + layer to stack a pattern on the base.").font(.mono(12)).foregroundColor(t.dim)
                }
                // top layer first; a new layer lands right under the "+ layer" button
                ForEach(Array(m.layers.enumerated()).reversed(), id: \.element.id) { i, l in
                    HStack(spacing: 0) {
                        Button { m.sel = i } label: {
                            HStack(spacing: 8) {
                                swatch(l.color)
                                Text(bannerPatternById[l.pattern]?.name ?? l.pattern).foregroundColor(t.text).lineLimit(1)
                                Text(colorName(l.color)).font(.mono(12)).foregroundColor(t.dim).lineLimit(1)
                                Spacer(minLength: 0)
                            }.padding(.horizontal, 8).padding(.vertical, 8).contentShape(Rectangle())
                        }.buttonStyle(.plain)
                        iconButton("↑", enabled: i < m.layers.count - 1) { m.move(i, 1) }
                        iconButton("↓", enabled: i > 0) { m.move(i, -1) }
                        iconButton("✕", enabled: true) { m.removeLayer(i) }
                    }
                    .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(m.sel == i ? t.amber : t.line, lineWidth: 1))
                }
                HStack(spacing: 4) {
                    selRow("base", m.base, on: m.sel == -1) { m.sel = -1 }
                    if m.frame.border > 0 { selRow("border", m.frame.borderColor, on: m.sel == -2) { m.sel = -2 } }
                }
            }

            if let layer = m.selLayer {
                let cols = [GridItem(.adaptive(minimum: 40), spacing: 4)]
                LazyVGrid(columns: cols, spacing: 4) {
                    ForEach(bannerPatterns, id: \.id) { p in
                        Button { m.setPattern(p.id) } label: {
                            thumb(p.id)
                                .frame(height: 40).frame(maxWidth: .infinity)
                                .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(layer.pattern == p.id ? t.amber : t.line, lineWidth: 1))
                        }.buttonStyle(.plain).accessibilityLabel(p.name)
                    }
                }
            } else {
                Text("// base and border take a color only. pick a layer to change its pattern.").font(.mono(12)).foregroundColor(t.dim)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(m.colorLabel).font(.mono(12)).foregroundColor(t.dim)
                DyePicker(value: m.activeColor, columns: 8) { m.setColor($0) }
            }
        }
    }

    private func iconButton(_ s: String, enabled: Bool, _ run: @escaping () -> Void) -> some View {
        Button(action: run) { Text(s).foregroundColor(ts.theme.dim).frame(width: 34, height: 36).contentShape(Rectangle()) }
            .buttonStyle(.plain).disabled(!enabled).opacity(enabled ? 1 : 0.3)
    }

    private func selRow(_ title: String, _ c: String, on: Bool, _ run: @escaping () -> Void) -> some View {
        let t = ts.theme
        return Button(action: run) {
            HStack(spacing: 8) {
                swatch(c); Text(title).foregroundColor(t.text); Text(colorName(c)).font(.mono(12)).foregroundColor(t.dim).lineLimit(1)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 8).padding(.vertical, 8).frame(maxWidth: .infinity)
            .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(on ? t.amber : t.line, lineWidth: 1))
        }.buttonStyle(.plain)
    }

    /// small picture of a pattern (white on grey) at the current cloth ratio; cached per size
    @ViewBuilder
    private func thumb(_ id: String) -> some View {
        let key = "\(id)|\(m.w)x\(m.h)"
        if let img = thumbs[key] ?? makeThumb(id, key) {
            Image(decorative: img, scale: 1).resizable().interpolation(.none).aspectRatio(contentMode: .fit).padding(2)
        } else { Color.clear }
    }
    private func makeThumb(_ id: String, _ key: String) -> CGImage? {
        let px = renderBanner("slate", [BannerLayer(id: 0, pattern: id, color: "chalk")], BannerFrame(w: m.w, h: m.h))
        let img = pixelImage(px, m.w, m.h)
        if let img { DispatchQueue.main.async { thumbs[key] = img } } // cache for the next frame (state can't change during body)
        return img
    }

    // MARK: frame
    private var frameTab: some View {
        let t = ts.theme
        return VStack(alignment: .leading, spacing: 16) {
            FlowLayout(spacing: 6) {
                ForEach(BannerModel.sizePresets, id: \.name) { p in
                    chip(p.name, on: m.w == p.w && m.h == p.h) { m.frame.w = p.w; m.frame.h = p.h }
                }
                ForEach(BannerShape.allCases, id: \.self) { s in chip(s.title, on: m.frame.shape == s) { m.frame.shape = s } }
                Button { m.resetFrame() } label: { Text("reset").foregroundColor(t.dim) }.buttonStyle(.plain)
            }
            VStack(spacing: 10) {
                slider("width", Double(m.w), BannerCfg.minSize...BannerCfg.maxSize, "px") { m.frame.w = Int($0) }
                slider("height", Double(m.h), BannerCfg.minSize...BannerCfg.maxSize, "px") { m.frame.h = Int($0) }
                slider("radius", Double(m.frame.radius), 0...50, "%", disabled: m.frame.shape == .oval) { m.frame.radius = Int($0) }
                slider("border", Double(m.frame.border), 0...4, "px") { m.setBorder(Int($0)) }
                slider("tilt", m.tilt, -30...30, "deg") { m.tilt = $0 }
                slider("shadow", m.shadow, 0...40, "px") { m.shadow = $0 }
            }
            Toggle(isOn: $m.hanger) { Text("wooden bar").foregroundColor(t.text) }.tint(t.amber)
            Text("// tilt, shadow and bar are preview only, not saved in the .png").font(.mono(12)).foregroundColor(t.dim)
        }
    }

    private func slider(_ label: String, _ value: Double, _ range: ClosedRange<Int>, _ unit: String, disabled: Bool = false,
                        _ set: @escaping (Double) -> Void) -> some View {
        slider(label, value, Double(range.lowerBound)...Double(range.upperBound), unit, disabled: disabled, set)
    }
    private func slider(_ label: String, _ value: Double, _ range: ClosedRange<Double>, _ unit: String, disabled: Bool = false,
                        _ set: @escaping (Double) -> Void) -> some View {
        let t = ts.theme
        return HStack(spacing: 10) {
            Text(label).foregroundColor(t.dim).frame(width: 64, alignment: .leading)
            Slider(value: Binding(get: { value }, set: { set($0.rounded()) }), in: range, step: 1).tint(t.amber).disabled(disabled)
            Text("\(Int(value))\(unit)").foregroundColor(t.green).frame(width: 52, alignment: .trailing)
        }.opacity(disabled ? 0.4 : 1)
    }

    // MARK: draw
    private var drawTab: some View {
        let t = ts.theme
        return VStack(alignment: .leading, spacing: 16) {
            FlowLayout(spacing: 8) {
                chip("pencil", on: m.tool == .pencil) { m.tool = .pencil }
                chip("eraser", on: m.tool == .eraser) { m.tool = .eraser }
                Toggle(isOn: $m.mirror) { Text("mirror").foregroundColor(t.text) }.tint(t.amber).fixedSize()
                Button { m.undo() } label: { Text("undo").foregroundColor(t.dim) }.buttonStyle(.plain).disabled(m.history.isEmpty).opacity(m.history.isEmpty ? 0.4 : 1)
                Button { m.clearPaint() } label: { Text("clear drawing").foregroundColor(t.dim) }.buttonStyle(.plain).disabled(m.paintCount == 0).opacity(m.paintCount == 0 ? 0.4 : 1)
            }
            VStack(alignment: .leading, spacing: 6) {
                Text("pencil color").font(.mono(12)).foregroundColor(t.dim)
                DyePicker(value: m.ink, columns: 8) { m.ink = $0; m.tool = .pencil }
            }
            VStack(alignment: .leading, spacing: 6) {
                Text("// touch and drag on the banner to paint pixels.").foregroundColor(t.dim)
                Text("// drawing sits on top of every layer and keeps its position when you resize; pixels outside the frame are hidden, not lost.").foregroundColor(t.dim)
                Text("\(m.paintCount) painted pixel\(m.paintCount == 1 ? "" : "s")").foregroundColor(t.text)
            }.font(.mono(12))
        }
    }

    // MARK: code
    private var codeTab: some View {
        let t = ts.theme
        return VStack(alignment: .trailing, spacing: 8) {
            Button { m.copy() } label: {
                Text(m.copied == .ok ? "copied!" : "copy code").font(.mono(12)).foregroundColor(m.copied == .ok ? t.green : t.dim)
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(t.line, lineWidth: 1))
            }.buttonStyle(.plain)
            ScrollView([.horizontal, .vertical]) {
                Text(m.code).font(.mono(12)).foregroundColor(t.text).textSelection(.enabled)
                    .padding(14).frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(height: 300)
            .background(RoundedRectangle(cornerRadius: t.r(8)).fill(t.panel))
            .overlay(RoundedRectangle(cornerRadius: t.r(8)).stroke(t.line, lineWidth: 1))
        }
    }
}

extension BannerModel { var paintCount: Int { paint.count } }

/// 16 dyes + a last cell that opens the system colour picker for any colour
@MainActor
struct DyePicker: View {
    @EnvironmentObject private var ts: ThemeStore
    let value: String
    var columns = 8
    let onChange: (String) -> Void
    @State private var custom = Color.white

    var body: some View {
        let t = ts.theme
        let grid = Array(repeating: GridItem(.flexible(), spacing: 6), count: columns)
        LazyVGrid(columns: grid, spacing: 6) {
            ForEach(dyes, id: \.id) { d in
                Button { onChange(d.id) } label: {
                    RoundedRectangle(cornerRadius: t.r(6)).fill(Color(hex: d.hex))
                        .aspectRatio(1, contentMode: .fit)
                        .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(value == d.id ? t.amber : t.line, lineWidth: 2))
                }.buttonStyle(.plain).accessibilityLabel(d.id)
            }
            ColorPicker("", selection: Binding(get: { isCustom(value) ? colorOf(value) : custom }, set: { c in
                custom = c
                onChange(hexString(c))
            }), supportsOpacity: false)
                .labelsHidden()
                .opacity(0.015) // the real control is invisible; the rainbow cell below is what you see
                .frame(maxWidth: .infinity).aspectRatio(1, contentMode: .fit)
                .background(
                    RoundedRectangle(cornerRadius: t.r(6))
                        .fill(isCustom(value) ? AnyShapeStyle(colorOf(value)) : AnyShapeStyle(AngularGradient(colors: [.red, .yellow, .green, .cyan, .purple, .pink, .red], center: .center)))
                        .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(isCustom(value) ? t.amber : t.line, lineWidth: 2))
                )
        }
    }

    private func hexString(_ c: Color) -> String {
        let u = UIColor(c)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        u.getRed(&r, green: &g, blue: &b, alpha: &a)
        return String(format: "#%02x%02x%02x", Int((r * 255).rounded()), Int((g * 255).rounded()), Int((b * 255).rounded()))
    }
}

/// the system share sheet (save to Photos / Files, AirDrop, Messages…)
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: items, applicationActivities: nil) }
    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}
