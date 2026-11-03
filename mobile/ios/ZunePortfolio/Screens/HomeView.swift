import SwiftUI

enum Tab: String, CaseIterable, Identifiable {
    case home, about, projects, lab
    var id: String { rawValue }
    /// nav labels = src/config/pages.js
    var label: String {
        switch self {
        case .home: return "home"
        case .about: return "about.js"
        case .projects: return "projects/"
        case .lab: return "lab.css"
        }
    }
    var symbol: String {
        switch self {
        case .home: return "terminal"
        case .about: return "person.text.rectangle"
        case .projects: return "folder"
        case .lab: return "flask"
        }
    }
}

/// Home = Hero → Terminal → Featured → About teaser → Lab teaser → Contact (same order as App.jsx)
@MainActor struct HomeView: View {
    @EnvironmentObject private var ts: ThemeStore
    @Environment(\.openURL) private var openURL
    let onNavigate: (Tab) -> Void
    @State private var selected = 0

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 56) {
                    hero(proxy)
                    terminalSection.id("terminal")
                    featured.id("featured")
                    aboutTeaser
                    labTeaser
                    VStack(alignment: .leading, spacing: 0) {
                        SectionHead(num: "04", title: "contact.sh").id("contact")
                        ContactSection()
                    }
                    footer
                }
                .padding(.horizontal, 20).padding(.top, 24).padding(.bottom, 40)
            }
        }
    }

    // MARK: hero
    private func hero(_ proxy: ScrollViewProxy) -> some View {
        let t = ts.theme
        return VStack(alignment: .leading, spacing: 22) {
            VStack(alignment: .leading, spacing: 4) {
                (Text("Hi, I'm ").foregroundColor(t.text) + Text(Site.name).foregroundColor(t.amber) + Text(".").foregroundColor(t.text))
                    .accessibilityLabel("Hi, I'm \(Site.name). \(Site.phrases[0])")
                Typewriter().foregroundColor(t.text)
            }
            .font(.mono(34, .bold))
            .minimumScaleFactor(0.6)

            Text(Site.heroIntro).font(.system(size: 17)).foregroundColor(t.text).lineSpacing(4)
            Text(Site.heroNote).font(.mono(13)).foregroundColor(t.dim)

            HStack(spacing: 12) {
                TermButton(title: "view projects") { withAnimation { proxy.scrollTo("featured", anchor: .top) } }
                TermButton(title: "contact", ghost: true) { withAnimation { proxy.scrollTo("contact", anchor: .top) } }
            }
            SheetCard()
            HStack {
                HeroLink(title: "Scroll to continue", arrow: "↓") { withAnimation { proxy.scrollTo("terminal", anchor: .top) } }
                Spacer()
                HeroLink(title: "Projects", arrow: "↗") { onNavigate(.projects) }
            }
        }
    }

    // MARK: terminal (the web hides it on the retro-os skin, where Clippy takes over: Clippy arrives in phase 4)
    private var terminalSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("// type a command, or just tap a question below").font(.mono(12.5)).foregroundColor(ts.theme.dim)
            TerminalView(onNavigate: onNavigate)
        }
    }

    // MARK: featured projects (accordion; the web swaps a CSS art preview, which is a phase-4 item)
    private var featured: some View {
        let t = ts.theme
        let list = Projects.featured
        let p = list[min(selected, list.count - 1)]
        return VStack(alignment: .leading, spacing: 0) {
            SectionHead(num: "01", title: Tab.projects.label)
            ZStack(alignment: .bottomLeading) {
                RoundedRectangle(cornerRadius: t.r(10)).fill(t.panel)
                RoundedRectangle(cornerRadius: t.r(10))
                    .fill(LinearGradient(colors: [t.color(p.color).opacity(0.22), .clear], startPoint: .topLeading, endPoint: .bottomTrailing))
                Text(p.file).font(.mono(12)).foregroundColor(t.dim).padding(.leading, 16).padding(.bottom, 12)
                Text("</>").font(.mono(54, .bold)).foregroundColor(t.color(p.color).opacity(0.85))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .frame(height: 180)
            .overlay(RoundedRectangle(cornerRadius: t.r(10)).stroke(t.line, lineWidth: 1))
            .onTapGesture { openURL(p.href) }
            .padding(.bottom, 20)

            VStack(spacing: 0) {
                ForEach(Array(list.enumerated()), id: \.element.id) { n, q in
                    featuredRow(n, q)
                }
                Rectangle().fill(t.line).frame(height: 1)
            }

            HeroLink(title: "All projects", arrow: "→") { onNavigate(.projects) }.padding(.top, 28)
        }
    }

    private func featuredRow(_ n: Int, _ q: Project) -> some View {
        let t = ts.theme
        let on = n == selected
        return VStack(alignment: .leading, spacing: 0) {
            Rectangle().fill(t.line).frame(height: 1)
            Button { withAnimation(.easeOut(duration: 0.35)) { selected = n } } label: {
                HStack(spacing: 12) {
                    Text(String(format: "%02d", n + 1)).font(.mono(12)).foregroundColor(t.dim)
                    Text(q.file).font(.mono(15)).foregroundColor(on ? t.amber : t.text)
                    Spacer()
                    Text("›").foregroundColor(t.dim).rotationEffect(.degrees(on ? 90 : 0))
                }
                .padding(.vertical, 16).contentShape(Rectangle())
            }.buttonStyle(.plain)
            if on {
                VStack(alignment: .leading, spacing: 6) {
                    Text(q.desc).font(.system(size: 14)).foregroundColor(t.dim)
                    ForEach(q.facts) { f in
                        HStack(alignment: .top, spacing: 12) {
                            Text(f.key).foregroundColor(t.dim).frame(width: 84, alignment: .leading)
                            Text(f.value).foregroundColor(t.text)
                        }.font(.mono(13))
                    }
                    Button { openURL(q.href) } label: { Text("open →").font(.mono(13)).foregroundColor(t.amber) }
                        .buttonStyle(.plain).padding(.top, 4)
                }
                .padding(.leading, 28).padding(.bottom, 16)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .overlay(alignment: .leading) { Rectangle().fill(t.amber).frame(width: 2).opacity(on ? 1 : 0) }
    }

    // MARK: about teaser
    private var aboutTeaser: some View {
        let t = ts.theme
        return VStack(alignment: .leading, spacing: 0) {
            SectionHead(num: "02", title: Tab.about.label)
            Text("\(Site.role) in \(Site.location), \(Profile.aboutBlurb)")
                .font(.system(size: 17)).foregroundColor(t.text).lineSpacing(4)
            FlowLayout(spacing: 8) {
                ForEach(Profile.stack, id: \.self) { Chip(text: $0, tint: tintFor($0, t)) }
            }.padding(.top, 20)
            Panel {
                VStack(alignment: .leading, spacing: 6) {
                    Text("$ git log --oneline -5").foregroundColor(t.dim).padding(.bottom, 4)
                    ForEach(Profile.gitLog.suffix(5)) { e in
                        VStack(alignment: .leading, spacing: 0) {
                            Text(code([(e.hash + "  ", t.amber), (e.date, t.green)]))
                            Text(e.msg).foregroundColor(t.text)
                        }.padding(.bottom, 4)
                    }
                }.font(.mono(13))
            }.padding(.top, 24)
            HeroLink(title: "More about me", arrow: "→") { onNavigate(.about) }.padding(.top, 24)
        }
    }

    // MARK: lab teaser
    private var labTeaser: some View {
        let t = ts.theme
        return VStack(alignment: .leading, spacing: 0) {
            SectionHead(num: "03", title: Tab.lab.label)
            Text("Tiny games and toys I build just to see if they work.").font(.system(size: 16)).foregroundColor(t.dim)
            FlowLayout(spacing: 10) {
                ForEach(Lab.items) { i in
                    Button { onNavigate(.lab) } label: { Chip(text: i.file, tint: labTint(i.kind, t)) }.buttonStyle(.plain)
                }
            }.padding(.top, 20)
            HeroLink(title: "Open the lab", arrow: "→") { onNavigate(.lab) }.padding(.top, 24)
        }
    }

    private var footer: some View {
        let t = ts.theme
        return VStack(alignment: .leading, spacing: 4) {
            Rectangle().fill(t.line).frame(height: 1).padding(.bottom, 12)
            Text("© \(Site.year) \(Site.name) · \(Site.mood)").font(.mono(11.5)).foregroundColor(t.dim)
            Text("code: MIT · personal content: all rights reserved").font(.mono(11)).foregroundColor(t.dim.opacity(0.8))
        }
    }
}

func labTint(_ k: LabKind, _ t: Theme) -> Color {
    switch k {
    case .game: return t.green
    case .toy: return t.cssLang
    case .tool: return t.amber
    }
}
