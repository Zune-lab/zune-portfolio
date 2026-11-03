import SwiftUI

extension Font {
    static func mono(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }
}

/// `01  projects/ ────────` section title (src/components/ui/SectionHead.jsx)
@MainActor struct SectionHead: View {
    @EnvironmentObject private var ts: ThemeStore
    let num: String, title: String
    var body: some View {
        let t = ts.theme
        HStack(spacing: 12) {
            Text(num).font(.mono(12)).foregroundColor(t.amber)
            Text(title).font(.mono(22, .bold)).foregroundColor(t.text)
            Rectangle().fill(t.line).frame(height: 1)
        }
        .padding(.bottom, 20)
    }
}

/// bordered surface with the skin's corner roundness
@MainActor struct Panel<Content: View>: View {
    @EnvironmentObject private var ts: ThemeStore
    var raised = false
    var padding: CGFloat = 16
    @ViewBuilder var content: Content
    var body: some View {
        let t = ts.theme
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: t.r(10)).fill(raised ? t.panel : t.inset))
            .overlay(RoundedRectangle(cornerRadius: t.r(10)).stroke(t.line, lineWidth: 1))
    }
}

/// editor / terminal window with the three dots and a title bar (about.js, log.sh, skills.js)
@MainActor struct WinCard<Content: View>: View {
    @EnvironmentObject private var ts: ThemeStore
    let title: String, lang: String
    var footer: [String] = []
    @ViewBuilder var content: Content
    var body: some View {
        let t = ts.theme
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                HStack(spacing: 6) {
                    Circle().fill(t.danger).frame(width: 10, height: 10)
                    Circle().fill(t.dotYellow).frame(width: 10, height: 10)
                    Circle().fill(t.dotGreen).frame(width: 10, height: 10)
                }
                Text(title).font(.mono(12)).foregroundColor(t.dim)
                Spacer()
                Text(lang).font(.mono(11)).foregroundColor(t.dim)
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .background(t.panel)
            Rectangle().fill(t.line).frame(height: 1)
            content.padding(16).frame(maxWidth: .infinity, alignment: .leading)
            if !footer.isEmpty {
                Rectangle().fill(t.line).frame(height: 1)
                HStack(spacing: 14) { ForEach(footer, id: \.self) { Text($0) }; Spacer() }
                    .font(.mono(10.5)).foregroundColor(t.dim)
                    .padding(.horizontal, 14).padding(.vertical, 6).background(t.panel)
            }
        }
        .background(t.inset)
        .clipShape(RoundedRectangle(cornerRadius: t.r(10)))
        .overlay(RoundedRectangle(cornerRadius: t.r(10)).stroke(t.line, lineWidth: 1))
    }
}

@MainActor struct Chip: View {
    @EnvironmentObject private var ts: ThemeStore
    let text: String
    var tint: Color? = nil
    var body: some View {
        let t = ts.theme
        let c = tint ?? t.amber
        Text(text)
            .font(.mono(12.5))
            .foregroundColor(c)
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(RoundedRectangle(cornerRadius: t.r(6)).fill(c.opacity(0.12)))
            .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(c.opacity(0.4), lineWidth: 1))
    }
}

/// primary action (Btn31): filled amber, dark text; `ghost` = outlined
@MainActor struct TermButton: View {
    @EnvironmentObject private var ts: ThemeStore
    let title: String
    var ghost = false
    var disabled = false
    let action: () -> Void
    var body: some View {
        let t = ts.theme
        Button(action: action) {
            Text(title).font(.mono(14, .semibold))
                .foregroundColor(ghost ? t.text : t.onAmber)
                .padding(.horizontal, 18).padding(.vertical, 11)
                .background(RoundedRectangle(cornerRadius: t.r(8)).fill(ghost ? Color.clear : t.amber))
                .overlay(RoundedRectangle(cornerRadius: t.r(8)).stroke(ghost ? t.line : t.amber, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.4 : 1)
    }
}

/// `Scroll to continue ↓` style link
@MainActor struct HeroLink: View {
    @EnvironmentObject private var ts: ThemeStore
    let title: String, arrow: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text("\(title) \(arrow)").font(.mono(13)).foregroundColor(ts.theme.text)
        }.buttonStyle(.plain)
    }
}

/// blinking block cursor (`.term-cursor`)
@MainActor struct BlinkCursor: View {
    @EnvironmentObject private var ts: ThemeStore
    var width: CGFloat = 10, height: CGFloat = 22
    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.5)) { ctx in
            Rectangle().fill(ts.theme.amber)
                .frame(width: width, height: height)
                .opacity(Int(ctx.date.timeIntervalSinceReferenceDate * 2) % 2 == 0 ? 1 : 0)
        }
    }
}

/// wrap-to-next-line layout for chips
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(width: proposal.width ?? .infinity, subviews: subviews).size
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let r = arrange(width: bounds.width, subviews: subviews)
        for (i, p) in r.origins.enumerated() {
            subviews[i].place(at: CGPoint(x: bounds.minX + p.x, y: bounds.minY + p.y), proposal: .unspecified)
        }
    }
    private func arrange(width: CGFloat, subviews: Subviews) -> (size: CGSize, origins: [CGPoint]) {
        var x: CGFloat = 0, y: CGFloat = 0, rowH: CGFloat = 0, maxX: CGFloat = 0
        var origins: [CGPoint] = []
        for s in subviews {
            let sz = s.sizeThatFits(.unspecified)
            if x > 0, x + sz.width > width { x = 0; y += rowH + spacing; rowH = 0 }
            origins.append(CGPoint(x: x, y: y))
            x += sz.width + spacing; rowH = max(rowH, sz.height); maxX = max(maxX, x - spacing)
        }
        return (CGSize(width: maxX, height: y + rowH), origins)
    }
}

/// build a coloured string for code-looking lines
func code(_ parts: [(String, Color)]) -> AttributedString {
    var out = AttributedString()
    for (s, c) in parts {
        var a = AttributedString(s)
        a.foregroundColor = c
        out += a
    }
    return out
}

func tintFor(_ tech: String, _ t: Theme) -> Color {
    Profile.techColors[tech].map { Color(hex: $0) } ?? t.text
}

/// types the owner's phrases, deletes them, types the next (Hero.jsx Typewriter)
@MainActor struct Typewriter: View {
    @EnvironmentObject private var ts: ThemeStore
    @State private var text = Site.phrases[0]
    var body: some View {
        HStack(alignment: .lastTextBaseline, spacing: 6) {
            Text(text)
            BlinkCursor(width: 12, height: 30)
        }
        .task { await run() }
    }

    private func nap(_ ms: Int) async -> Bool {
        do { try await Task.sleep(nanoseconds: UInt64(ms) * 1_000_000); return true } catch { return false }
    }

    @MainActor private func run() async {
        let phrases = Site.phrases
        var i = 0
        guard await nap(2800) else { return }
        while !Task.isCancelled {
            for n in stride(from: phrases[i].count - 1, through: 0, by: -1) {
                text = String(phrases[i].prefix(n))
                guard await nap(32) else { return }
            }
            i = (i + 1) % phrases.count
            guard await nap(280) else { return }
            for n in 1...phrases[i].count {
                text = String(phrases[i].prefix(n))
                guard await nap(75) else { return }
            }
            guard await nap(2600) else { return }
        }
    }
}
