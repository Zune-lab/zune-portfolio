import SwiftUI

struct MemoryCard: Identifiable { let id: Int; let sym: String }

/// Port of MemoryMatch.jsx: flip two cards at a time, match the 6 code symbols in the fewest moves.
@MainActor
final class MemoryModel: ObservableObject {
    private static let bestKey = "memory-best" // record = fewest moves

    @Published private(set) var deck: [MemoryCard] = []
    @Published private(set) var flipped: [Int] = []
    @Published private(set) var done: Set<String> = []
    @Published private(set) var moves = 0
    @Published private(set) var round = 0
    @Published private(set) var best = Best.read(MemoryModel.bestKey)
    @Published private(set) var newBest = false
    var onRecord: ((Int) -> Void)?
    private var timer: Task<Void, Never>?

    init() { deck = Self.shuffle() }
    deinit { timer?.cancel() }

    private static func shuffle() -> [MemoryCard] {
        (GameCfg.Memory.symbols + GameCfg.Memory.symbols).enumerated().map { MemoryCard(id: $0.offset, sym: $0.element) }.shuffled()
    }

    var won: Bool { done.count == GameCfg.Memory.symbols.count }

    func reset() {
        timer?.cancel()
        deck = Self.shuffle()
        round += 1
        flipped = []; done = []; moves = 0; newBest = false
    }

    func flip(_ i: Int) {
        guard flipped.count < 2, !flipped.contains(i), !done.contains(deck[i].sym) else { return }
        flipped.append(i)
        guard flipped.count == 2 else { return }
        moves += 1
        let (a, b) = (flipped[0], flipped[1])
        if deck[a].sym == deck[b].sym {
            done.insert(deck[a].sym)
            flipped = []
            if won {
                newBest = Best.record(Self.bestKey, moves, lowerIsBetter: true)
                best = Best.read(Self.bestKey)
                if newBest { onRecord?(best) }
            }
        } else {
            timer = Task { [weak self] in
                guard await sleepMs(GameCfg.Memory.mismatchMs) else { return }
                self?.flipped = []
            }
        }
    }
}

/// a card that turns around its vertical axis; shows the front below 90°, the mirrored back above
private struct FlipCard<Front: View, Back: View>: View, Animatable {
    var angle: Double
    let front: Front, back: Back
    var animatableData: Double { get { angle } set { angle = newValue } }
    var body: some View {
        ZStack {
            if angle < 90 { front } else { back.scaleEffect(x: -1) }
        }
        .rotation3DEffect(.degrees(angle), axis: (x: 0, y: 1, z: 0))
    }
}

struct MemoryMatchGame: View {
    @EnvironmentObject private var ts: ThemeStore
    @StateObject private var m = MemoryModel()
    @State private var unlocked: [String] = []

    var body: some View {
        let t = ts.theme
        let cols = Array(repeating: GridItem(.flexible(), spacing: 12), count: 4)
        GameFrame(stats: [("moves", "\(m.moves)", t.amber), ("pairs", "\(m.done.count)/\(GameCfg.Memory.symbols.count)", t.green), ("best", m.best == 0 ? "-" : "\(m.best)", nil)],
                  actionTitle: m.won ? "play again" : "shuffle", action: m.reset) {
            ZStack {
                LazyVGrid(columns: cols, spacing: 12) {
                    ForEach(Array(m.deck.enumerated()), id: \.element.id) { i, c in
                        let matched = m.done.contains(c.sym)
                        let up = matched || m.flipped.contains(i)
                        let tint = matched ? t.green : t.amber
                        FlipCard(angle: up ? 180 : 0,
                                 front: face(t, "?", t.dim, t.line),
                                 back: face(t, c.sym, tint, tint, bold: true))
                            .aspectRatio(1, contentMode: .fit)
                            .contentShape(Rectangle())
                            .onTapGesture { m.flip(i) }
                            .accessibilityLabel(up ? "card \(c.sym)" : "face-down card")
                    }
                }
                .id(m.round) // rebuild the cards each game so they don't slide to new places while face down
                .animation(.easeInOut(duration: 0.3), value: m.flipped)

                if m.won {
                    GameOverlay {
                        (Text("all merged in ").foregroundColor(t.text) + Text("\(m.moves)").foregroundColor(t.green) + Text(" moves").foregroundColor(t.text))
                        Text(m.newBest ? "new best!" : "can you do it in fewer?").foregroundColor(t.dim)
                        UnlockNote(names: unlocked)
                    }
                }
            }
            .frame(maxWidth: 360)
        }
        .onAppear { m.onRecord = { best in unlocked = ts.report(game: "memory-best", score: best).map(\.label) } }
        .onChange(of: m.round) { _ in unlocked = [] }
    }

    private func face(_ t: Theme, _ text: String, _ color: Color, _ border: Color, bold: Bool = false) -> some View {
        RoundedRectangle(cornerRadius: t.r(8)).fill(t.panel)
            .overlay(RoundedRectangle(cornerRadius: t.r(8)).stroke(border, lineWidth: 1))
            .overlay(Text(text).font(.mono(bold ? 16 : 15, bold ? .bold : .regular)).foregroundColor(color))
    }
}
