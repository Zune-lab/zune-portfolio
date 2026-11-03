import SwiftUI

/// projects/: `$ ls projects/ | grep <q>` + tag chips (src/projects/Projects.jsx; the per-project CSS art is phase 4)
@MainActor struct ProjectsView: View {
    @EnvironmentObject private var ts: ThemeStore
    @Environment(\.openURL) private var openURL
    @State private var query = ""
    @State private var tag = ""

    /// matches name, description or tag, like the web
    private var filtered: [Project] {
        let s = query.trimmingCharacters(in: .whitespaces).lowercased()
        return Projects.all.filter { p in
            (tag.isEmpty || p.tags.contains(tag)) &&
            (s.isEmpty || ([p.file, p.desc] + p.tags).joined(separator: " ").lowercased().contains(s))
        }
    }

    var body: some View {
        let t = ts.theme
        let list = filtered
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SectionHead(num: "01", title: Tab.projects.label).padding(.bottom, 0)

                HStack(spacing: 8) {
                    Text("$ ls projects/ | grep").font(.mono(13)).foregroundColor(t.dim)
                    TextField("…", text: $query)
                        .font(.mono(14)).foregroundColor(t.text)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                    if !query.isEmpty {
                        Button { query = "" } label: { Image(systemName: "xmark.circle.fill").foregroundColor(t.dim) }.buttonStyle(.plain)
                    }
                    Text("\(list.count)/\(Projects.all.count)").font(.mono(12)).foregroundColor(t.dim)
                }
                .padding(12)
                .background(RoundedRectangle(cornerRadius: t.r(8)).fill(t.inset))
                .overlay(RoundedRectangle(cornerRadius: t.r(8)).stroke(t.line, lineWidth: 1))

                FlowLayout(spacing: 8) {
                    ForEach([""] + Projects.tags, id: \.self) { tg in
                        let on = tag == tg
                        Button { tag = on ? "" : tg } label: {
                            Text(tg.isEmpty ? "all" : "--\(tg)").font(.mono(12.5))
                                .foregroundColor(on ? t.onAmber : t.dim)
                                .padding(.horizontal, 10).padding(.vertical, 5)
                                .background(RoundedRectangle(cornerRadius: t.r(6)).fill(on ? t.amber : Color.clear))
                                .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(on ? t.amber : t.line, lineWidth: 1))
                        }.buttonStyle(.plain)
                    }
                }

                if list.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("grep: no match.").font(.mono(13)).foregroundColor(t.dim)
                        Button { query = ""; tag = "" } label: { Text("clear filters").font(.mono(13)).foregroundColor(t.amber) }.buttonStyle(.plain)
                    }.padding(.top, 8)
                } else {
                    ForEach(list) { p in
                        Button { openURL(p.href) } label: { card(p) }.buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 20).padding(.vertical, 24)
        }
    }

    private func card(_ p: Project) -> some View {
        let t = ts.theme
        return VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .bottomLeading) {
                LinearGradient(colors: [t.color(p.color).opacity(0.25), .clear], startPoint: .topLeading, endPoint: .bottomTrailing)
                Text("</>").font(.mono(40, .bold)).foregroundColor(t.color(p.color).opacity(0.85))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                Text(p.tags.joined(separator: " ")).font(.mono(11)).foregroundColor(t.dim).padding(12)
            }
            .frame(height: 110).background(t.panel)
            Rectangle().fill(t.line).frame(height: 1)
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(p.file).font(.mono(15, .semibold)).foregroundColor(t.color(p.color))
                    Spacer()
                    Text("open ↗").font(.mono(12)).foregroundColor(t.amber)
                }
                Text(p.desc).font(.system(size: 14)).foregroundColor(t.dim).lineSpacing(3)
                ForEach(p.facts) { f in
                    HStack(alignment: .top, spacing: 12) {
                        Text(f.key).foregroundColor(t.dim).frame(width: 84, alignment: .leading)
                        Text(f.value).foregroundColor(t.text)
                    }.font(.mono(12.5))
                }
            }.padding(16)
        }
        .background(t.inset)
        .clipShape(RoundedRectangle(cornerRadius: t.r(10)))
        .overlay(RoundedRectangle(cornerRadius: t.r(10)).stroke(t.line, lineWidth: 1))
    }
}
