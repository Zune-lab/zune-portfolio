import SwiftUI

/// `zune.sav`: the little character sheet in the hero (src/components/home/SheetCard.jsx)
@MainActor struct SheetCard: View {
    @EnvironmentObject private var ts: ThemeStore
    @EnvironmentObject private var status: StatusStore
    @EnvironmentObject private var social: SocialStore
    @State private var cls = 0

    private let classes: [String?] = [nil] + Site.classes.map { Optional($0) }

    var body: some View {
        let t = ts.theme
        let info = status.info
        let level = social.level(status.key)
        let tone = t.color(toneOf(level))
        let maxed = social.maxed

        VStack(spacing: 0) {
            HStack {
                Text(maxed ? "\(Site.id).sav [MAX]" : "\(Site.id).sav").font(.mono(13)).foregroundColor(t.dim)
                Spacer()
                Button { status.cycle() } label: {
                    HStack(spacing: 6) {
                        Circle().fill(t.color(info.color)).frame(width: 8, height: 8)
                        Text(info.label + (info.isAuto ? " · auto" : "")).font(.mono(10.5, .semibold))
                    }
                    .foregroundColor(t.color(info.color))
                }.buttonStyle(.plain)
            }
            .padding(.horizontal, 16).padding(.vertical, 10)
            .background(t.panel)
            Rectangle().fill(t.line).frame(height: 1)

            VStack(alignment: .leading, spacing: 8) {
                row("class") {
                    Button { cls = (cls + 1) % classes.count } label: {
                        Text("\(classes[cls] ?? Site.role) ").foregroundColor(t.text) + Text("↻").foregroundColor(t.dim)
                    }.buttonStyle(.plain)
                }
                row("location") {
                    // 1 s clock
                    TimelineView(.periodic(from: .now, by: 1)) { ctx in
                        Text(Site.location).foregroundColor(t.text) + Text(" · \(SiteTime.clock(ctx.date)) \(SiteTime.gmtLabel(ctx.date))").foregroundColor(t.dim)
                    }
                }
                row("main quest") { Text(Profile.mainStack).foregroundColor(t.text) }
                row("side quest") { Text(Profile.learning).foregroundColor(t.text) }

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("social battery").foregroundColor(t.dim)
                        Spacer()
                        Text("\(level)%").foregroundColor(tone)
                    }
                    Meter(value: level, color: tone, rainbow: maxed)
                }.padding(.top, 8)

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("personality unlocked").foregroundColor(t.dim)
                        Spacer()
                        Text("\(social.personality)%").foregroundColor(t.amber)
                    }
                    Meter(value: social.personality, color: t.amber, rainbow: maxed)
                    Text("// needs 6+ months of friendship").font(.mono(12)).foregroundColor(t.dim)
                }
                .contentShape(Rectangle())
                .onTapGesture { social.friendship() }

                HStack(alignment: .top, spacing: 12) {
                    let asleep = social.isAsleep(status.key)
                    Button { social.sayHi(status.key) } label: {
                        Text("$ say hi").foregroundColor(t.text)
                            .padding(.horizontal, 12).padding(.vertical, 6)
                            .overlay(RoundedRectangle(cornerRadius: t.r(4)).stroke(t.line, lineWidth: 1))
                    }
                    .buttonStyle(.plain).disabled(asleep).opacity(asleep ? 0.4 : 1)
                    Text(social.reply).font(.mono(12.5)).foregroundColor(t.dim)
                        .frame(maxWidth: .infinity, minHeight: 36, alignment: .topLeading)
                        .padding(.top, 6)
                }.padding(.top, 8)
            }
            .font(.mono(13))
            .padding(16)
        }
        .background(t.inset)
        .clipShape(RoundedRectangle(cornerRadius: t.r(10)))
        .overlay(RoundedRectangle(cornerRadius: t.r(10)).stroke(maxed ? t.amber : t.line, lineWidth: 1))
        .shadow(color: maxed ? t.glow.opacity(0.5) : .clear, radius: 18)
        .animation(.easeOut(duration: 0.3), value: maxed)
    }

    private func row<V: View>(_ k: String, @ViewBuilder _ v: () -> V) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(k).foregroundColor(ts.theme.dim).frame(width: 84, alignment: .leading)
            v()
            Spacer(minLength: 0)
        }
    }
}

/// 10-cell battery bar (BATTERY_CELLS); `rainbow` when the personality easter egg is on
@MainActor struct Meter: View {
    @EnvironmentObject private var ts: ThemeStore
    let value: Int, color: Color
    var rainbow = false
    var body: some View {
        let on = Int((Double(value) / 100 * Double(batteryCells)).rounded())
        HStack(spacing: 3) {
            ForEach(0..<batteryCells, id: \.self) { i in
                RoundedRectangle(cornerRadius: ts.theme.r(2))
                    .fill(i < on ? (rainbow ? Color(hue: Double(i) * 0.1, saturation: 0.7, brightness: 0.95) : color) : ts.theme.line)
                    .frame(height: 12)
            }
        }
        .animation(.easeOut(duration: 0.3), value: on)
    }
}
