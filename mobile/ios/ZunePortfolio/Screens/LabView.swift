import SwiftUI

/// lab.css: grid of tiny toys, games and tools (src/components/lab/Lab/Lab.jsx).
/// The 10 experiments themselves (canvas games, creatures, sound) are ported in phase 4: for now each card shows its blurb.
@MainActor struct LabView: View {
    @EnvironmentObject private var ts: ThemeStore
    @State private var kind: LabKind?
    @State private var playing: LabItem?

    var body: some View {
        let items = Lab.items.filter { kind == nil || $0.kind == kind }
        if let item = playing { detail(item) } else { list(items) }
    }

    /// slugs that already have a native version (the rest arrive in the next phase)
    private static let playable: Set<String> = ["snake", "bug-squash", "memory-match", "reptile", "moths", "banner-maker", "cat"]

    @ViewBuilder
    private func game(_ item: LabItem) -> some View {
        switch item.slug {
        case "snake": SnakeGame()
        case "bug-squash": BugSquashGame()
        case "memory-match": MemoryMatchGame()
        case "reptile": CreatureStage(make: makeReptile)
        case "moths": CreatureStage(make: makeMoths)
        case "banner-maker": BannerMakerView()
        case "cat": CatToy()
        default: EmptyView()
        }
    }

    private func detail(_ item: LabItem) -> some View {
        let t = ts.theme
        return ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Button { playing = nil } label: { Text("← \(Tab.lab.label)").font(.mono(13)).foregroundColor(t.amber) }.buttonStyle(.plain)
                HStack {
                    Text(item.file).font(.mono(20, .bold)).foregroundColor(t.text)
                    Spacer()
                    Chip(text: item.kind.rawValue, tint: labTint(item.kind, t))
                }
                Text(item.blurb).font(.system(size: 14)).foregroundColor(t.dim).lineSpacing(3)
                game(item)
            }
            .padding(.horizontal, 20).padding(.vertical, 24)
        }
    }

    private func list(_ items: [LabItem]) -> some View {
        let t = ts.theme
        return ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SectionHead(num: "01", title: Tab.lab.label).padding(.bottom, 0)
                Text("Tiny games and toys I build just to see if they work.").font(.system(size: 16)).foregroundColor(t.dim)

                FlowLayout(spacing: 8) {
                    filterChip("all", on: kind == nil) { kind = nil }
                    ForEach(LabKind.allCases, id: \.self) { k in
                        filterChip(k.rawValue, on: kind == k) { kind = kind == k ? nil : k }
                    }
                }

                ForEach(items) { i in
                    let playable = Self.playable.contains(i.slug)
                    Panel(raised: false, padding: 16) {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Text(i.file).font(.mono(15, .semibold)).foregroundColor(t.text)
                                Spacer()
                                Chip(text: i.kind.rawValue, tint: labTint(i.kind, t))
                            }
                            Text(i.blurb).font(.system(size: 14)).foregroundColor(t.dim).lineSpacing(3)
                            Text(playable ? "play →" : "// native port: coming in the next phase")
                                .font(.mono(11.5)).foregroundColor(playable ? t.amber : t.dim.opacity(0.7))
                        }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture { if playable { playing = i } }
                }
            }
            .padding(.horizontal, 20).padding(.vertical, 24)
        }
    }

    private func filterChip(_ label: String, on: Bool, action: @escaping () -> Void) -> some View {
        let t = ts.theme
        return Button(action: action) {
            Text(label).font(.mono(12.5))
                .foregroundColor(on ? t.onAmber : t.dim)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(RoundedRectangle(cornerRadius: t.r(6)).fill(on ? t.amber : Color.clear))
                .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(on ? t.amber : t.line, lineWidth: 1))
        }.buttonStyle(.plain)
    }
}
