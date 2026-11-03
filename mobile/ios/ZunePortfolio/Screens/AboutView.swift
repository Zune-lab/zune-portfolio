import SwiftUI

/// about.js / log.sh / skills.js (src/components/about/About.jsx)
@MainActor struct AboutView: View {
    @EnvironmentObject private var ts: ThemeStore
    @EnvironmentObject private var status: StatusStore

    private var facts: [(String, String)] {
        [("role", Site.role), ("based_in", "\(Site.location), \(Site.country)"), ("started_coding", String(Profile.startYear)),
         ("favorite_stack", Profile.mainStack), ("currently_learning", Profile.learning), ("fun_fact", Site.funFact),
         ("coffee_or_tea", Site.drink)]
    }

    var body: some View {
        let t = ts.theme
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 40) {
                    VStack(alignment: .leading, spacing: 6) {
                        SectionHead(num: "01", title: Tab.about.label).padding(.bottom, 0)
                        Text("// a few things about me").font(.mono(12.5)).foregroundColor(t.dim)
                    }
                    intro.id("intro")
                    journey.id("journey")
                    skills.id("skills")
                }
                .padding(.horizontal, 20).padding(.vertical, 24)
            }
            .overlay(alignment: .bottomTrailing) { jumpBar(proxy) }
        }
    }

    // sub-nav (about.js · log.sh · skills.js)
    private func jumpBar(_ proxy: ScrollViewProxy) -> some View {
        let t = ts.theme
        return HStack(spacing: 14) {
            ForEach([("about.js", "intro"), ("log.sh", "journey"), ("skills.js", "skills")], id: \.1) { label, id in
                Button { withAnimation { proxy.scrollTo(id, anchor: .top) } } label: { Text(label).font(.mono(11.5)).foregroundColor(t.dim) }
                    .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 8)
        .background(Capsule().fill(t.panel.opacity(0.95)))
        .overlay(Capsule().stroke(t.line, lineWidth: 1))
        .padding(12)
    }

    private var intro: some View {
        let t = ts.theme
        let info = status.info
        let years = Calendar.current.component(.year, from: Date()) - Profile.startYear
        return VStack(alignment: .leading, spacing: 20) {
            WinCard(title: "about.js", lang: "JavaScript", footer: ["Ln \(facts.count + 5), Col 1", "UTF-8", "Spaces: 2"]) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(code([("const ", t.cssLang), (Site.id, t.text), (" = {", t.dim)]))
                    ForEach(facts, id: \.0) { k, v in
                        Text(code([("  \(k): ", t.text), (k == "started_coding" ? v : "\"\(v)\"", k == "started_coding" ? t.js : t.green), (",", t.dim)]))
                    }
                    Text(code([("  status: ", t.text), ("\"\(info.key.rawValue)\"", t.color(info.color)), (",  ", t.dim), ("// chillax guys", t.dim)]))
                    Text(code([("};", t.dim)]))
                    Text("// tap the status on the hero card to change it").foregroundColor(t.dim).padding(.top, 6)
                    HelloLine()
                }
                .font(.mono(13)).lineSpacing(3)
            }

            Panel(padding: 18) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("// readme.md").font(.mono(12)).foregroundColor(t.dim)
                    Text(Profile.aboutBlurb.prefix(1).uppercased() + Profile.aboutBlurb.dropFirst())
                        .font(.system(size: 15)).foregroundColor(t.text).lineSpacing(5)
                }
            }

            HStack(spacing: 10) {
                stat(String(years), "years coding")
                stat(String(Profile.gitLog.count), "commits in life.log")
                stat(String(Profile.stack.count), "tools in the stack")
            }
        }
    }

    private func stat(_ n: String, _ label: String) -> some View {
        let t = ts.theme
        return VStack(spacing: 4) {
            Text(n).font(.mono(26, .bold)).foregroundColor(t.amber)
            Text(label).font(.mono(10.5)).foregroundColor(t.dim).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 14)
        .background(RoundedRectangle(cornerRadius: t.r(10)).fill(t.inset))
        .overlay(RoundedRectangle(cornerRadius: t.r(10)).stroke(t.line, lineWidth: 1))
    }

    // MARK: log.sh
    private func typeColor(_ type: String) -> Color {
        let t = ts.theme
        switch type {
        case "init": return t.text
        case "feat": return t.green
        case "fix": return t.danger
        case "chore": return t.dim
        case "refactor": return t.cssLang
        case "revert", "wip": return t.amber
        default: return t.dim
        }
    }

    private var journey: some View {
        let t = ts.theme
        return VStack(alignment: .leading, spacing: 14) {
            Text("// log.sh").font(.mono(12.5)).foregroundColor(t.dim)
            WinCard(title: "log.sh", lang: "bash") {
                VStack(alignment: .leading, spacing: 0) {
                    Text("$ git log --graph --oneline --reverse life").font(.mono(13)).foregroundColor(t.dim).padding(.bottom, 16)
                    let log = Profile.gitLog
                    ForEach(Array(log.enumerated()), id: \.element.id) { i, e in
                        let (type, text) = e.parts
                        let c = typeColor(type)
                        let isNow = e.date == "now"
                        HStack(alignment: .top, spacing: 14) {
                            VStack(spacing: 0) {
                                Circle().fill(c).frame(width: 10, height: 10)
                                    .overlay(Circle().stroke(c.opacity(isNow ? 0.5 : 0), lineWidth: 4))
                                if i < log.count - 1 { Rectangle().fill(t.line).frame(width: 1).frame(maxHeight: .infinity) }
                            }
                            VStack(alignment: .leading, spacing: 4) {
                                HStack(spacing: 8) {
                                    Text(e.hash).foregroundColor(t.amber)
                                    Text(e.date).foregroundColor(t.green)
                                    if !type.isEmpty {
                                        Text(type).font(.mono(10.5)).foregroundColor(c)
                                            .padding(.horizontal, 6).padding(.vertical, 1)
                                            .overlay(RoundedRectangle(cornerRadius: t.r(4)).stroke(c.opacity(0.5), lineWidth: 1))
                                    }
                                    if isNow { Text("HEAD → main").font(.mono(10.5, .bold)).foregroundColor(t.amber) }
                                }.font(.mono(12))
                                Text(text).font(.system(size: 14)).foregroundColor(t.text)
                            }
                            .padding(.bottom, 18)
                        }
                    }
                    HStack(spacing: 6) { Text("$").foregroundColor(t.dim); BlinkCursor(width: 8, height: 15) }.font(.mono(13)).padding(.top, 4)
                }
            }
        }
    }

    // MARK: skills.js
    private var skills: some View {
        let t = ts.theme
        return VStack(alignment: .leading, spacing: 14) {
            Text("// skills.js").font(.mono(12.5)).foregroundColor(t.dim)
            WinCard(title: "skills.js", lang: "JavaScript") {
                VStack(alignment: .leading, spacing: 20) {
                    ForEach(Profile.skills, id: \.0) { name, items in
                        VStack(alignment: .leading, spacing: 8) {
                            Text("// \(name)").font(.mono(12)).foregroundColor(t.dim)
                            FlowLayout(spacing: 8) {
                                ForEach(items, id: \.self) { s in
                                    HStack(spacing: 6) {
                                        Text(s)
                                        if Profile.learningSkills.contains(s) {
                                            Text("learning").font(.mono(10)).foregroundColor(t.amber).italic()
                                        }
                                    }
                                    .font(.mono(13)).foregroundColor(t.text)
                                    .padding(.horizontal, 10).padding(.vertical, 6)
                                    .background(RoundedRectangle(cornerRadius: t.r(6)).fill(t.panel))
                                    .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(t.line, lineWidth: 1))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/// `zune.hello()`: falls asleep when the social battery is empty (port of HelloLine in About.jsx, without the idle screensaver)
@MainActor private struct HelloLine: View {
    @EnvironmentObject private var ts: ThemeStore
    @EnvironmentObject private var status: StatusStore
    @EnvironmentObject private var social: SocialStore
    @State private var word = "hello"
    @State private var note = ""

    var body: some View {
        let t = ts.theme
        let asleep = social.isAsleep(status.key)
        HStack(spacing: 0) {
            Text(code([("\(Site.id).", t.text), (word, t.amber), ("()", t.text), (note, t.dim)]))
            BlinkCursor(width: 7, height: 14)
        }
        .padding(.top, 6)
        .opacity(asleep ? 0.55 : 1)
        .task(id: asleep) { await retype(asleep ? "sleep" : "hello", asleep: asleep) }
    }

    @MainActor private func retype(_ target: String, asleep: Bool) async {
        if word == target { return }
        note = ""
        while !word.isEmpty { try? await Task.sleep(nanoseconds: 60_000_000); if Task.isCancelled { return }; word.removeLast() }
        for ch in target { try? await Task.sleep(nanoseconds: 90_000_000); if Task.isCancelled { return }; word.append(ch) }
        note = asleep ? " // zzz... social battery: 0%" : " // oh. hi. battery recharged"
        if !asleep {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            if !Task.isCancelled { note = "" }
        }
    }
}
