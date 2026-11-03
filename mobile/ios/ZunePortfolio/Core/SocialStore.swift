import Foundation

// Port of src/lib/social.js: Zune's "social battery". Saying hi drains it, it recharges ~1%/second,
// and tapping the personality bar 6 times unlocks the 100% easter egg (which also unlocks the secret skins).
let batteryCells = 10
enum Tone { case hi, mid, lo }
func toneOf(_ level: Int) -> Tone { level > 50 ? .hi : level > 20 ? .mid : .lo }

@MainActor
final class SocialStore: ObservableObject {
    private static let base: [StatusKey: Int] = [.online: 80, .busy: 40, .focus: 20, .offline: 10]
    private static let replies = ["hi.", "oh. hello again.", "ok, that was a lot of talking", "running low on words..."]

    @Published private(set) var drain = 0
    @Published private(set) var months = 0
    @Published private(set) var maxed = false
    @Published private(set) var reply = ""
    var onKonami: (() -> Void)?
    private var maxTask: Task<Void, Never>?

    init() {
        Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard let self else { return }
                if self.drain > 0 { self.drain -= 1 }
            }
        }
    }

    func level(_ key: StatusKey) -> Int { maxed ? 100 : max(0, Self.base[key, default: 0] - drain) }
    func isAsleep(_ key: StatusKey) -> Bool { !maxed && Self.base[key, default: 0] - drain <= 0 }
    var personality: Int { maxed ? 100 : 12 + months }

    func sayHi(_ key: StatusKey) {
        if maxed { reply = "HI!!! :D (this is not normal)"; return }
        let b = Self.base[key, default: 0]
        if b - drain <= 0 { return } // out of battery: no more talking
        let next = drain + 20
        drain = next
        reply = b - next <= 0
            ? "\(Site.id) has left the chat. (recharging...)"
            : Self.replies[min(Int((Double(next) / 20).rounded(.up)) - 1, Self.replies.count - 1)]
    }

    func friendship() {
        if maxed { return }
        if months + 1 >= 6 { return unlock("6 months of friendship in 6 clicks. speedrun accepted.") }
        months += 1
        reply = "month \(months)/6... keep going"
    }

    func konami() { unlock("konami accepted. personality 100%. who let this happen?") }

    private func unlock(_ msg: String) {
        maxTask?.cancel()
        maxed = true; months = 0; reply = msg
        onKonami?() // bonus: unlock every secret skin
        maxTask = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 9_000_000_000)
            guard !Task.isCancelled, let self else { return }
            self.maxed = false
            self.reply = "ok. that is enough personality for today."
        }
    }
}
