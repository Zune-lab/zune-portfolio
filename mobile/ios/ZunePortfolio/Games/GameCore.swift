import SwiftUI

// Port of src/config/games.js: every hard number of the mini games lives here.
enum GameCfg {
    enum Snake {
        static let grid = 18
        static let startX = 5, startY = 9, startLength = 3
        static let firstStepMs = 140, stepMs = 140, minStepMs = 60, speedUpMs = 3
        static let swipeMinPx: CGFloat = 20
        static let maxQueuedTurns = 2
    }
    enum Bug {
        static let cells = 9
        static let durationS = 30
        static let lifeStartMs = 900, lifeMinMs = 450, lifeShrinkMsPerS = 15
        static let respawnAfterHitMs = 120
    }
    enum Memory {
        static let symbols = ["{ }", "</>", "[ ]", "=>", "&&", "#!"]
        static let mismatchMs = 750
    }
}

/// Port of src/lib/useBest.js: records live in UserDefaults under the same keys as the web's localStorage.
enum Best {
    static func read(_ key: String) -> Int { UserDefaults.standard.integer(forKey: Site.storageKey(key)) }

    /// returns true when `n` beats the record (lowerIsBetter: fewest moves; no record yet = the first game always counts)
    @discardableResult
    static func record(_ key: String, _ n: Int, lowerIsBetter: Bool = false) -> Bool {
        let cur = read(key)
        let beats = lowerIsBetter ? (cur == 0 || n < cur) : n > cur
        if beats { UserDefaults.standard.set(n, forKey: Site.storageKey(key)) }
        return beats
    }
}

enum RoundStatus { case idle, playing, over }

func gameActionTitle(_ s: RoundStatus) -> String { s == .playing ? "restart" : s == .over ? "play again" : "start" }

func sleepMs(_ ms: Int) async -> Bool {
    do { try await Task.sleep(nanoseconds: UInt64(ms) * 1_000_000); return true } catch { return false }
}

/// stat bar + main button (GameShell.jsx GameFrame)
struct GameFrame<Content: View>: View {
    @EnvironmentObject private var ts: ThemeStore
    let stats: [(label: String, value: String, color: Color?)]
    let actionTitle: String
    let action: () -> Void
    @ViewBuilder var content: Content

    var body: some View {
        let t = ts.theme
        Panel {
            VStack(spacing: 20) {
                HStack(alignment: .center, spacing: 12) {
                    HStack(spacing: 16) {
                        ForEach(stats, id: \.label) { s in
                            HStack(spacing: 5) {
                                Text(s.label).foregroundColor(t.dim)
                                Text(s.value).foregroundColor(s.color ?? t.text)
                            }
                        }
                    }
                    Spacer(minLength: 0)
                    Button(action: action) {
                        Text(actionTitle).foregroundColor(t.text)
                            .padding(.horizontal, 14).padding(.vertical, 6)
                            .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(t.line, lineWidth: 1))
                    }.buttonStyle(.plain)
                }
                .font(.mono(13))
                content
            }
        }
    }
}

/// translucent cover over the board (start / game over screens)
struct GameOverlay<Content: View>: View {
    @EnvironmentObject private var ts: ThemeStore
    @ViewBuilder var content: Content
    var body: some View {
        let t = ts.theme
        VStack(spacing: 8) { content }
            .font(.mono(13))
            .multilineTextAlignment(.center)
            .padding(16)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(RoundedRectangle(cornerRadius: t.r(8)).fill(t.bg.opacity(0.82)))
    }
}

/// "skin unlocked: matrix" (the web shows it as a toast)
struct UnlockNote: View {
    @EnvironmentObject private var ts: ThemeStore
    let names: [String]
    var body: some View {
        if !names.isEmpty {
            Text("\(names.count > 1 ? "skins" : "skin") unlocked: \(names.joined(separator: ", "))")
                .font(.mono(12)).foregroundColor(ts.theme.amber)
        }
    }
}
