import SwiftUI

/// Skin picker (src/components/layout/Skin/SkinPalette.jsx): tap = apply live, secret skins are locked until earned.
@MainActor struct SkinPickerView: View {
    @EnvironmentObject private var ts: ThemeStore
    @Environment(\.dismiss) private var dismiss

    private let groups: [SkinGroup] = [.original, .editor, .special, .secret]

    var body: some View {
        let t = ts.theme
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    section("auto") {
                        row(id: ThemeStore.auto, label: "auto", note: "picks a skin by the time of day in \(Site.location)",
                            swatch: SkinData.autoByTod.values.sorted().compactMap { SkinCatalog.byId[$0] }.map { swatchHexes($0) }.map { $0[2] },
                            locked: false)
                    }
                    ForEach(groups, id: \.rawValue) { g in
                        section(g.title) {
                            ForEach(SkinData.all.filter { $0.group == g }) { s in
                                row(id: s.id, label: s.label, note: ts.isLocked(s) ? (s.unlock?.hint ?? "locked") : s.note,
                                    swatch: swatchHexes(s), locked: ts.isLocked(s))
                            }
                        }
                    }
                }
                .padding(20)
            }
            .background(t.bg.ignoresSafeArea())
            .navigationTitle("skins")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("done") { dismiss() } } }
        }
        .preferredColorScheme(ts.colorScheme)
    }

    /// [bg, panel, accent, text] of the skin in the current mode (the web's swatch)
    private func swatchHexes(_ s: Skin) -> [Int] {
        let p = s.palette(for: ts.mode)
        return [p.bg, p.panel, p.amber, p.text]
    }

    private func section<C: View>(_ title: String, @ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.mono(12)).foregroundColor(ts.theme.dim).textCase(.uppercase)
            content()
        }
    }

    private func row(id: String, label: String, note: String, swatch: [Int], locked: Bool) -> some View {
        let t = ts.theme
        let on = ts.skinChoice == id
        return Button { ts.pick(id) } label: {
            HStack(spacing: 12) {
                HStack(spacing: 0) {
                    ForEach(Array(swatch.enumerated()), id: \.offset) { _, hex in Rectangle().fill(Color(hex: hex)) }
                }
                .frame(width: 56, height: 28)
                .clipShape(RoundedRectangle(cornerRadius: 5))
                .overlay(RoundedRectangle(cornerRadius: 5).stroke(t.line, lineWidth: 1))
                VStack(alignment: .leading, spacing: 2) {
                    Text(label).font(.mono(14, .semibold)).foregroundColor(t.text)
                    Text(note).font(.mono(11.5)).foregroundColor(t.dim).multilineTextAlignment(.leading)
                }
                Spacer()
                if locked { Image(systemName: "lock.fill").foregroundColor(t.dim) }
                else if on { Image(systemName: "checkmark").foregroundColor(t.amber) }
            }
            .padding(12)
            .background(RoundedRectangle(cornerRadius: t.r(8)).fill(t.inset))
            .overlay(RoundedRectangle(cornerRadius: t.r(8)).stroke(on ? t.amber : t.line, lineWidth: 1))
            .opacity(locked ? 0.55 : 1)
        }
        .buttonStyle(.plain)
        .disabled(locked)
    }
}
