import Foundation

// Port of src/config/site.js + src/data/profile.js + src/data/socials.js + src/projects/*/meta.js + src/config/lab-items.js.
// Single source of "everything that belongs to the site owner" on iOS: fork the app and edit only this file.

enum Site {
    static let name = "Zune"
    static let realName = "Vuong"
    static let id = "zune"
    static let handle = "zune.dev"
    static let year = 2026

    static let role = "Web Developer"
    static let location = "Ho Chi Minh City"
    static let country = "VN"
    static let host = "hcmc"
    static let email = "nguyenhaivuong06@gmail.com"
    static let phone = "84909840611"

    static let timezone = "Asia/Ho_Chi_Minh"
    /// Start hour of each part of the day (owner's timezone). online = [day, night)
    static let schedule = (dawn: 5, day: 8, dusk: 17, night: 23)

    static let githubUser = "Zune-lab"
    static let repo = "zune-portfolio"
    static let description = "Zune's portfolio: a web developer building small, playful things with React."

    static let phrases = ["I code for fun.", "I fix 3am bugs.", "I play with CSS.", "I make tiny pages."]
    static let heroIntro = "I love messing around with CSS and building tiny pages just to see if they work."
    static let heroNote = "// introvert by default. say hi anyway →"
    static let mood = "chillax guys. code for fun, ship small weird things."
    static let teaLine = "tea > coffee. always."
    static let funFact = "debugging CSS all night and never getting bored"
    static let drink = "tea"
    static let classes = ["Bug Summoner", "CSS Wizard", "Tea Enjoyer", "Introvert (lvl 99)"]

    static var githubURL: URL { URL(string: "https://github.com/\(githubUser)")! }
    static func repoURL(_ name: String = repo) -> URL { URL(string: "https://github.com/\(githubUser)/\(name)")! }
    static var webURL: URL { URL(string: "https://\(githubUser.lowercased()).github.io/\(repo)/")! }
    static func storageKey(_ n: String) -> String { "\(id)-\(n)" }
}

enum Profile {
    static let startYear = 2022
    static let mainStack = "React + Tailwind"
    static let learning = "Next.js App Router"
    static var aboutBlurb: String {
        "coding since \(startYear). Favorite stack is \(mainStack), and I'm currently learning the \(learning)."
    }
    static let stack = ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Node.js", "Next.js", "Tailwind CSS", "Figma"]
    static let skillGroups: [(String, [String])] = [
        ("languages", ["HTML", "CSS", "JavaScript", "TypeScript"]),
        ("frameworks", ["React", "Next.js", "Tailwind CSS", "Node.js"]),
        ("design", ["Figma"]),
    ]
    static let learningSkills: Set<String> = ["TypeScript", "Next.js"]

    /// skills.js: groups from `skillGroups`, anything left over falls into "other"
    static var skills: [(String, [String])] {
        let grouped = Set(skillGroups.flatMap { $0.1 })
        let groups = skillGroups + [("other", stack.filter { !grouped.contains($0) })]
        return groups.map { ($0.0, $0.1.filter { stack.contains($0) }) }.filter { !$0.1.isEmpty }
    }

    /// Brand colours of the tech chips (hex); missing = follow the text colour (Next.js)
    static let techColors: [String: Int] = [
        "HTML": 0xFF6B3D, "CSS": 0xA98AE8, "JavaScript": 0xF1C40F, "TypeScript": 0x3B8EEA, "React": 0x61DAFB,
        "Node.js": 0x6CC24A, "Tailwind CSS": 0x38BDF8, "Figma": 0xF24E8F,
    ]

    static let gitLog: [GitEntry] = [
        GitEntry(hash: "9f3a1c0", date: "day-0", msg: "init: born (no consent was asked)"),
        GitEntry(hash: "a1b2c3d", date: "2022-01", msg: "chore: started learning HTML/CSS"),
        GitEntry(hash: "d4e5f6a", date: "2022-06", msg: "feat: wrote my first line of JavaScript"),
        GitEntry(hash: "3c8e2f1", date: "2022-09", msg: "fix: introvert mode enabled by default"),
        GitEntry(hash: "b7c8d9e", date: "2023-03", msg: "feat: got to know React"),
        GitEntry(hash: "e0f1a2b", date: "2023-11", msg: "feat: build a-dumb-gift, a-gift-for-u"),
        GitEntry(hash: "6d1a9b4", date: "2024-01", msg: "revert: \"rewrite everything in one night\""),
        GitEntry(hash: "c3d4e5f", date: "2024-05", msg: "feat: tried symphony (audio + JS)"),
        GitEntry(hash: "4e7b0c2", date: "2024-08", msg: "fix: 3am CSS bug. it was a missing semicolon"),
        GitEntry(hash: "f6a7b8c", date: "2025-01", msg: "refactor: learning TypeScript"),
        GitEntry(hash: "8a2d5e7", date: "2025-09", msg: "wip: unlock full personality (requires 6+ months of friendship)"),
        GitEntry(hash: "a9b0c1d", date: "now", msg: "feat: building \(Site.handle)"),
    ]
}

struct GitEntry: Identifiable {
    let hash: String, date: String, msg: String
    var id: String { hash }
    /// "feat: x" -> ("feat", "x"); unknown prefix -> ("", whole message)
    var parts: (type: String, text: String) {
        let known = ["init", "feat", "fix", "chore", "refactor", "revert", "wip"]
        guard let i = msg.firstIndex(of: ":") else { return ("", msg) }
        let type = String(msg[..<i])
        guard known.contains(type) else { return ("", msg) }
        return (type, String(msg[msg.index(after: i)...]).trimmingCharacters(in: .whitespaces))
    }
}

struct Social: Identifiable {
    let name: String, url: URL, brand: Int, glyph: String
    var id: String { name }
}

enum Socials {
    // The web draws Font Awesome paths; natively we show a brand-coloured badge with a short glyph.
    static let all: [Social] = [
        Social(name: "facebook", url: URL(string: "https://www.facebook.com/zuongnguyn06")!, brand: 0x1877F2, glyph: "f"),
        Social(name: "instagram", url: URL(string: "https://www.instagram.com/zun.nguyn/")!, brand: 0xD6249F, glyph: "ig"),
        Social(name: "x", url: URL(string: "https://x.com/Zunne06")!, brand: 0x181818, glyph: "X"),
        Social(name: "discord", url: URL(string: "https://discord.com/users/1537980605940105331")!, brand: 0x7289DA, glyph: "dc"),
        Social(name: "zalo", url: URL(string: "https://zalo.me/\(Site.phone)")!, brand: 0x0068FF, glyph: "Z"),
        Social(name: "whatsapp", url: URL(string: "https://wa.me/\(Site.phone)")!, brand: 0x075E54, glyph: "wa"),
        Social(name: "github", url: Site.githubURL, brand: 0x181818, glyph: "gh"),
    ]
}

enum ProjectColor { case js, cssLang }

struct Fact: Identifiable { let key: String, value: String; var id: String { key } }

struct Project: Identifiable {
    let order: Int
    let file: String, desc: String
    let color: ProjectColor
    let href: URL
    let tags: [String]
    let facts: [Fact]
    var id: String { file }
}

enum Projects {
    static let all: [Project] = [
        Project(order: 1, file: "a-dumb-gift.js", desc: "a small gift, hand-coded, runs straight in the browser", color: .js,
                href: Site.repoURL("a-dumb-gift"), tags: ["gift", "html"],
                facts: [Fact(key: "type", value: "gift page"), Fact(key: "runs", value: "straight in the browser"), Fact(key: "mood", value: "dumb but cute")]),
        Project(order: 2, file: "symphony.js", desc: "experiments with sound and interaction on the web", color: .js,
                href: Site.repoURL("symphony"), tags: ["sound", "js"],
                facts: [Fact(key: "type", value: "sound toy"), Fact(key: "made with", value: "audio + JS"), Fact(key: "mood", value: "press things, hear things")]),
        Project(order: 3, file: "illusion.css", desc: "playing with visual illusions in pure CSS", color: .cssLang,
                href: Site.repoURL("illusion"), tags: ["css", "visual"],
                facts: [Fact(key: "type", value: "visual illusion"), Fact(key: "made with", value: "pure CSS"), Fact(key: "mood", value: "stare at it for a while")]),
        Project(order: 4, file: "le-tot-nghiep.js", desc: "a keepsake page for graduation day", color: .js,
                href: Site.repoURL("le-tot-nghiep"), tags: ["page", "css"],
                facts: [Fact(key: "type", value: "keepsake page"), Fact(key: "made for", value: "graduation day")]),
        Project(order: 5, file: "calendar.js", desc: "a compact little calendar app, built by hand", color: .js,
                href: Site.repoURL("calender"), tags: ["app", "js"],
                facts: [Fact(key: "type", value: "calendar app"), Fact(key: "built", value: "by hand")]),
        Project(order: 6, file: "a-gift-for-u.css", desc: "another gift page, focused on CSS details", color: .cssLang,
                href: Site.repoURL("a-gift-for-u"), tags: ["gift", "css"],
                facts: [Fact(key: "type", value: "gift page"), Fact(key: "focus", value: "CSS details")]),
    ].sorted { $0.order < $1.order }

    static var tags: [String] { Array(Set(all.flatMap { $0.tags })).sorted() }
    /// the web shows the first 3 by order when none is flagged `featured`
    static var featured: [Project] { Array(all.prefix(3)) }
}

enum LabKind: String, CaseIterable { case game, toy, tool }

struct LabItem: Identifiable {
    let slug: String, file: String, name: String, kind: LabKind, blurb: String
    var id: String { slug }
}

enum Lab {
    static let items: [LabItem] = [
        LabItem(slug: "reptile", file: "reptile.js", name: "Reptile", kind: .toy, blurb: "A procedural lizard with a random number of legs. Hit the button for a new one."),
        LabItem(slug: "mother", file: "mother.js", name: "Mother", kind: .toy, blurb: "She sleeps in the dark under a lot of hair. Poke her and her children crawl out. When she opens her eyes, do not move."),
        LabItem(slug: "choir", file: "choir.js", name: "Choir", kind: .toy, blurb: "They stand in the dark and stare straight out of the screen. Keep them singing. If you stop, they come closer. Sound on."),
        LabItem(slug: "moths", file: "moths.js", name: "Moths", kind: .toy, blurb: "Your cursor is a lamp and the moths cannot leave it alone. Switch it off, blow out the candle, shake the lamp, and watch out for the bat."),
        LabItem(slug: "cat", file: "cat.css", name: "Upside-down cat", kind: .toy, blurb: "A cat running upside-down. Pure CSS animation, no JavaScript state."),
        LabItem(slug: "ghost", file: "ghost.css", name: "Floating ghost", kind: .toy, blurb: "A floating CSS ghost. Poke it, flip day and night, find the hidden lines."),
        LabItem(slug: "banner-maker", file: "banner-maker.js", name: "Banner maker", kind: .tool, blurb: "Stack patterns and dyes into a banner, then copy the code."),
        LabItem(slug: "bug-squash", file: "bug-squash.js", name: "Bug squash", kind: .game, blurb: "Squash bugs for 30 seconds. Beat your best score."),
        LabItem(slug: "memory-match", file: "memory-match.js", name: "Memory match", kind: .game, blurb: "Flip cards and match the code symbols in the fewest moves."),
        LabItem(slug: "snake", file: "snake.js", name: "Snake", kind: .game, blurb: "Classic snake on an 18×18 grid. Keyboard or on-screen pad."),
    ]
}
