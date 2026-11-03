import Foundation

/// Port of the command interpreter in src/components/home/Terminal/Terminal.jsx (`exec`, `themeCmd`, FILES, QUICK).
/// Pure logic: the view (TerminalView) only types text and prints what this returns.
@MainActor
enum TerminalEngine {
    static let whoami = "\(Site.id) - \(Site.role.lowercased()), \(Site.location)"
    static let hire = "hire \(Site.id)"
    /// the pages `cd` can enter (src/config/pages.js)
    static let pages: [Tab] = [.about, .projects, .lab]

    static let files: [(name: String, text: String)] = [
        ("mood.txt", Site.mood),
        ("tea.txt", Site.teaLine),
        ("stack.txt", Profile.stack.joined(separator: "  ")),
    ]

    static let quick: [(label: String, cmd: String)] = [
        ("who are you?", "whoami"),
        ("your mood?", "cat mood.txt"),
        ("what do you use?", "cat stack.txt"),
        ("show projects", "cd projects"),
        ("can I hire you?", "sudo \(hire)"),
        ("surprise me", "theme random"),
    ]

    /// the status line follows the badge in the hero (same store), so the two never contradict each other
    static func intro(_ blurb: String) -> [(cmd: String, out: String)] {
        [("whoami", whoami), ("cat mood.txt", Site.mood), ("echo $STATUS", "\(blurb) - type help to play around")]
    }

    struct Context {
        let theme: ThemeStore
        let social: SocialStore
        let status: StatusKey
        let navigate: (Tab) -> Void
    }
    struct Result { var lines: [String]; var clear = false }

    static func exec(_ raw: String, _ cx: Context) -> Result {
        let words = raw.split(whereSeparator: { $0.isWhitespace }).map(String.init)
        let cmd = words.first ?? ""
        let arg = words.dropFirst().joined(separator: " ")
        var dir = arg
        if let r = dir.range(of: "/") { dir.removeSubrange(r) } // JS: arg.replace('/', '') (first slash only)

        switch cmd {
        case "":
            return Result(lines: [])
        case "help":
            let tabs = pages.map(\.rawValue).joined(separator: "|")
            return Result(lines: ["help | ls | cat <file> | cd <\(tabs)> | whoami | date | battery | theme | clear",
                                  "try: sudo \(hire), or theme list"])
        case "whoami":
            return Result(lines: [whoami])
        case "ls":
            return Result(lines: [files.map(\.name).joined(separator: "  ") + pages.map { "  \($0.rawValue)/" }.joined()])
        case "cat":
            if let f = files.first(where: { $0.name == arg }) { return Result(lines: [f.text]) }
            return Result(lines: ["cat: \(arg.isEmpty ? "?" : arg): No such file or directory"])
        case "cd":
            if let tab = pages.first(where: { $0.rawValue == dir }) {
                cx.navigate(tab)
                return Result(lines: ["-> \(dir)/"])
            }
            return Result(lines: ["cd: \(arg.isEmpty ? "?" : arg): No such file or directory"])
        case "date":
            return Result(lines: [SiteTime.dateTime()])
        case "theme", "skin":
            return Result(lines: themeCmd(arg, cx.theme))
        case "sudo":
            return arg == hire
                ? Result(lines: ["[sudo] password for you: ********", "permission granted - message me in the contact section!"])
                : Result(lines: ["sudo: you are not in the sudoers file. this incident will be reported."])
        case "battery":
            // the same battery as the sav card in the hero
            let lv = cx.social.level(cx.status)
            let on = Int((Double(lv) / 100 * Double(batteryCells)).rounded())
            let bar = String(repeating: "#", count: on) + String(repeating: ".", count: batteryCells - on)
            let note = cx.social.maxed ? "personality overflow. please stand back."
                : lv <= 0 ? "\(Site.id) is asleep. zzz"
                : lv <= 20 ? "running on fumes. maybe let \(Site.id) rest."
                : "ok, still some words left."
            return Result(lines: ["social battery: \(lv)% [\(bar)]", note])
        case "konami":
            cx.social.konami()
            return Result(lines: ["up up down down left right left right b a", "personality: 100%. scroll up and look at \(Site.id).sav"])
        case "clear":
            return Result(lines: [], clear: true)
        default:
            return Result(lines: ["\(cmd): command not found - type help"])
        }
    }

    // MARK: theme  (theme | theme list | theme set <name> | theme <name> | theme random | theme auto)
    private static func pad(_ s: String, _ n: Int) -> String { s + String(repeating: " ", count: max(1, n - s.count)) }
    private static func modeNote(_ s: Skin) -> String { s.modes.count > 1 ? "dark+light" : "\(s.modes[0].rawValue) only" }

    private static func themeCmd(_ arg: String, _ ts: ThemeStore) -> [String] {
        var parts = arg.lowercased().split(whereSeparator: { $0.isWhitespace }).map(String.init)
        guard !parts.isEmpty else {
            let now = ts.isAuto ? "auto (\(ts.skinId))" : ts.skinId
            return ["skin: \(now)", "theme list | theme set <name> | theme random | theme auto   (or tap the skin chip)"]
        }
        let first = parts.removeFirst()
        let rest = parts

        if first == "list" || first == "ls" {
            var rows = ["\(ts.isAuto ? "*" : " ") \(pad("auto", 13))follows the time of day"]
            for s in SkinData.all {
                let locked = s.unlock != nil && !ts.isUnlocked(s.id)
                let info = locked ? "[locked] \(s.unlock?.hint ?? "")" : modeNote(s)
                rows.append("\(!ts.isAuto && ts.skinChoice == s.id ? "*" : " ") \(pad(s.id, 13))\(info)")
            }
            return [rows.joined(separator: "\n")]
        }
        if first == "random" {
            let pool = SkinData.all.filter { ts.isUnlocked($0.id) && $0.id != ts.skinId }
            guard let s = pool.randomElement() else { return ["theme: nothing else to pick yet"] }
            ts.pick(s.id)
            return ["-> \(s.id)"]
        }
        let target = (first == "set" || first == "use" ? rest : [first] + rest).joined(separator: "-")
        if target.isEmpty { return ["theme: set what? try theme list"] }
        if target == ThemeStore.auto {
            ts.pick(ThemeStore.auto)
            return ["-> auto (changes with the time of day)"]
        }
        guard let s = SkinCatalog.byId[target] else { return ["theme: \(target): no such skin - try theme list"] }
        if !ts.isUnlocked(target) { return ["theme: \(target) is locked - \(s.unlock?.hint ?? "")"] }
        ts.pick(target)
        if let lock = s.lockedMode { return ["-> \(target) (\(lock.rawValue) only: the torch switch is locked)"] }
        return ["-> \(target)"]
    }
}
