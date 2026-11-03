import SwiftUI

/// Port of BugSquash.jsx: a bug pops up in a random cell, tap it before it hides; they get quicker as time passes.
@MainActor
final class BugModel: ObservableObject {
    private typealias C = GameCfg.Bug
    private static let bestKey = "bugsquash-best"

    @Published private(set) var timeLeft = C.durationS
    @Published private(set) var score = 0
    @Published private(set) var misses = 0
    @Published private(set) var active = -1
    @Published private(set) var status: RoundStatus = .idle
    @Published private(set) var best = Best.read(BugModel.bestKey)
    @Published private(set) var newBest = false
    var onRecord: ((Int) -> Void)?

    private var clock: Task<Void, Never>?
    private var spawnTask: Task<Void, Never>?
    deinit { clock?.cancel(); spawnTask?.cancel() }

    var accuracy: Int { let total = score + misses; return total == 0 ? 0 : Int((Double(score) / Double(total) * 100).rounded()) }

    func start() {
        halt()
        timeLeft = C.durationS; score = 0; misses = 0; active = -1; newBest = false
        status = .playing
        run()
    }

    func stop() { halt(); active = -1 }

    /// app went to the background: stop clock and bugs (like Snake), `resume()` continues
    func pause() { if status == .playing { halt(); active = -1 } }
    func resume() { if status == .playing, clock == nil { run() } }

    private func halt() { clock?.cancel(); clock = nil; spawnTask?.cancel(); spawnTask = nil }

    private func run() {
        spawn()
        clock = Task { [weak self] in
            while true {
                guard await sleepMs(1000) else { return }
                guard let self else { return }
                self.timeLeft -= 1
                if self.timeLeft <= 0 { self.finish(); return }
            }
        }
    }

    private func spawn() {
        let elapsed = C.durationS - timeLeft
        let life = max(C.lifeMinMs, C.lifeStartMs - elapsed * C.lifeShrinkMsPerS) // bugs live shorter and shorter
        var next: Int
        repeat { next = Int.random(in: 0..<C.cells) } while next == active
        active = next
        spawnTask = Task { [weak self] in
            guard await sleepMs(life) else { return }
            self?.spawn()
        }
    }

    func press(_ i: Int) {
        guard status == .playing else { return }
        if i == active {
            score += 1
            active = -1
            spawnTask?.cancel()
            spawnTask = Task { [weak self] in
                guard await sleepMs(C.respawnAfterHitMs) else { return }
                self?.spawn() // the next bug pops up almost at once
            }
        } else {
            misses += 1
        }
    }

    private func finish() {
        halt()
        active = -1
        newBest = Best.record(Self.bestKey, score)
        best = Best.read(Self.bestKey)
        status = .over
        if newBest { onRecord?(best) }
    }
}

struct BugSquashGame: View {
    @EnvironmentObject private var ts: ThemeStore
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var m = BugModel()
    @State private var unlocked: [String] = []

    var body: some View {
        let t = ts.theme
        let n = 3
        GameFrame(stats: [("bugs", "\(m.score)", t.green), ("time", "\(m.timeLeft)s", t.amber), ("best", m.best == 0 ? "-" : "\(m.best)", nil)],
                  actionTitle: gameActionTitle(m.status), action: m.start) {
            ZStack {
                VStack(spacing: 12) {
                    ForEach(0..<n, id: \.self) { r in
                        HStack(spacing: 12) {
                            ForEach(0..<n, id: \.self) { c in
                                let i = r * n + c
                                ZStack {
                                    RoundedRectangle(cornerRadius: t.r(8)).fill(t.panel)
                                    if i == m.active {
                                        Text("bug").font(.mono(13, .bold)).foregroundColor(t.bg)
                                            .padding(.horizontal, 10).padding(.vertical, 4)
                                            .background(Capsule().fill(t.amber))
                                            .transition(.scale)
                                    }
                                }
                                .overlay(RoundedRectangle(cornerRadius: t.r(8)).stroke(t.line, lineWidth: 1))
                                .aspectRatio(1, contentMode: .fit)
                                .contentShape(Rectangle())
                                .onTapGesture { m.press(i) }
                                .accessibilityLabel(i == m.active ? "bug, squash it" : "empty cell")
                            }
                        }
                    }
                }
                .animation(.easeOut(duration: 0.12), value: m.active)

                if m.status != .playing {
                    GameOverlay {
                        if m.status == .idle {
                            Text("squash the bugs before time runs out.").foregroundColor(t.text)
                            Text("\(GameCfg.Bug.durationS) seconds. they get faster.").foregroundColor(t.dim)
                        } else {
                            (Text("ship it: ").foregroundColor(t.text) + Text("\(m.score)").foregroundColor(t.green) + Text(" bugs squashed").foregroundColor(t.text))
                            Text("accuracy \(m.accuracy)%\(m.newBest ? " · new best!" : "")").foregroundColor(t.dim)
                            UnlockNote(names: unlocked)
                        }
                    }
                }
            }
            .frame(maxWidth: 360)
        }
        .onAppear { m.onRecord = { best in unlocked = ts.report(game: "bugsquash-best", score: best).map(\.label) } }
        .onChange(of: m.status) { s in if s == .playing { unlocked = [] } }
        .onChange(of: scenePhase) { p in p == .active ? m.resume() : m.pause() }
        .onDisappear { m.stop() }
    }
}
