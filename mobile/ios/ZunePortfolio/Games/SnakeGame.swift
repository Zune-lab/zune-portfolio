import SwiftUI

struct GridPoint: Hashable { var x: Int; var y: Int }

enum Dir {
    case up, down, left, right
    var delta: (Int, Int) {
        switch self { case .up: return (0, -1); case .down: return (0, 1); case .left: return (-1, 0); case .right: return (1, 0) }
    }
    var opposite: Dir {
        switch self { case .up: return .down; case .down: return .up; case .left: return .right; case .right: return .left }
    }
}

/// Snake rules (port of Snake.jsx): 18×18 board, speeds up per dot eaten, wall or body = game over, full board = win.
@MainActor
final class SnakeModel: ObservableObject {
    private typealias C = GameCfg.Snake
    private static let bestKey = "snake-best"

    @Published private(set) var snake: [GridPoint] = []
    @Published private(set) var food: GridPoint?
    @Published private(set) var score = 0
    @Published private(set) var status: RoundStatus = .idle
    @Published private(set) var won = false
    @Published private(set) var best = Best.read(SnakeModel.bestKey)
    @Published private(set) var newBest = false
    /// the app is in the background: freeze the snake instead of letting it die unseen
    var paused = false
    var onRecord: ((Int) -> Void)?

    private var dir: Dir = .right
    private var queue: [Dir] = []
    private var loop: Task<Void, Never>?

    init() { reset() }
    deinit { loop?.cancel() }

    private func reset() {
        snake = (0..<C.startLength).map { GridPoint(x: C.startX - $0, y: C.startY) }
        dir = .right; queue = []; score = 0; won = false
        food = placeFood()
    }

    private func placeFood() -> GridPoint? {
        let taken = Set(snake.map { $0.y * C.grid + $0.x })
        let free = (0..<(C.grid * C.grid)).filter { !taken.contains($0) }
        return free.randomElement().map { GridPoint(x: $0 % C.grid, y: $0 / C.grid) }
    }

    func start() {
        loop?.cancel()
        reset()
        newBest = false
        status = .playing
        loop = Task { await run() }
    }

    func stop() { loop?.cancel() }

    func turn(_ d: Dir) {
        guard status == .playing else { return }
        let last = queue.last ?? dir
        if d == last || d == last.opposite || queue.count >= C.maxQueuedTurns { return }
        queue.append(d)
    }

    /// one step; false = dead (wall, body) or board cleared
    private func tick() -> Bool {
        if !queue.isEmpty { dir = queue.removeFirst() }
        let (dx, dy) = dir.delta
        let head = snake[0]
        let nx = head.x + dx, ny = head.y + dy
        let eating = food.map { $0.x == nx && $0.y == ny } ?? false
        let body = eating ? snake : Array(snake.dropLast()) // the tail moves away, so it doesn't count
        if nx < 0 || ny < 0 || nx >= C.grid || ny >= C.grid || body.contains(where: { $0.x == nx && $0.y == ny }) { return false }
        snake.insert(GridPoint(x: nx, y: ny), at: 0)
        if !eating { snake.removeLast(); return true }
        score += 1
        food = placeFood()
        if food == nil { won = true }
        return food != nil
    }

    private func run() async {
        var wait = C.firstStepMs
        while status == .playing {
            guard await sleepMs(wait) else { return }
            if paused { wait = 50; continue }
            if !tick() { finish(); return }
            wait = max(C.minStepMs, C.stepMs - score * C.speedUpMs)
        }
    }

    private func finish() {
        newBest = Best.record(Self.bestKey, score)
        best = Best.read(Self.bestKey)
        status = .over
        if newBest { onRecord?(best) }
    }
}

struct SnakeGame: View {
    @EnvironmentObject private var ts: ThemeStore
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var m = SnakeModel()
    @State private var swipeOrigin: CGPoint?
    @State private var unlocked: [String] = []

    var body: some View {
        let t = ts.theme
        GameFrame(stats: [("score", "\(m.score)", t.green), ("best", m.best == 0 ? "-" : "\(m.best)", nil)],
                  actionTitle: gameActionTitle(m.status), action: m.start) {
            ZStack {
                board
                if m.status != .playing {
                    GameOverlay {
                        if m.status == .idle {
                            Text("eat the dots, don't eat yourself.").foregroundColor(t.text)
                            Text("swipe on the board, or use the pad.").foregroundColor(t.dim)
                        } else {
                            (Text(m.won ? "board cleared: " : "segfault: ").foregroundColor(t.text)
                                + Text("\(m.score)").foregroundColor(t.green) + Text(" eaten").foregroundColor(t.text))
                            Text(m.newBest ? "new best!" : "one more try?").foregroundColor(t.dim)
                            UnlockNote(names: unlocked)
                        }
                    }
                }
            }
            .frame(maxWidth: 360)
            .aspectRatio(1, contentMode: .fit)

            dpad
        }
        .onAppear {
            m.onRecord = { best in unlocked = ts.report(game: "snake-best", score: best).map(\.label) }
        }
        .onChange(of: m.status) { s in if s == .playing { unlocked = [] } }
        .onChange(of: scenePhase) { m.paused = $0 != .active }
        .onDisappear { m.stop() }
    }

    private var board: some View {
        let t = ts.theme
        let n = GameCfg.Snake.grid
        return Canvas { ctx, size in
            let cell = size.width / CGFloat(n)
            ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .color(t.panel))
            for x in 0..<n { for y in 0..<n where (x + y) % 2 == 0 {
                ctx.fill(Path(CGRect(x: CGFloat(x) * cell, y: CGFloat(y) * cell, width: cell, height: cell)), with: .color(t.line))
            } }
            if let f = m.food {
                let r = cell / 2 - 3
                ctx.fill(Path(ellipseIn: CGRect(x: CGFloat(f.x) * cell + cell / 2 - r, y: CGFloat(f.y) * cell + cell / 2 - r, width: r * 2, height: r * 2)),
                         with: .color(t.amber))
            }
            for (i, s) in m.snake.enumerated() {
                ctx.fill(Path(CGRect(x: CGFloat(s.x) * cell + 1, y: CGFloat(s.y) * cell + 1, width: cell - 2, height: cell - 2)),
                         with: .color(t.green.opacity(i == 0 ? 1 : 0.8)))
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: t.r(8)))
        .overlay(RoundedRectangle(cornerRadius: t.r(8)).stroke(t.line, lineWidth: 1))
        // turn as soon as the finger has moved far enough, then take that point as the new origin so one long stroke can turn twice
        .gesture(DragGesture(minimumDistance: 0)
            .onChanged { v in
                guard m.status == .playing else { return }
                let o = swipeOrigin ?? v.startLocation
                swipeOrigin = o
                let dx = v.location.x - o.x, dy = v.location.y - o.y
                if max(abs(dx), abs(dy)) < GameCfg.Snake.swipeMinPx { return }
                m.turn(abs(dx) > abs(dy) ? (dx > 0 ? .right : .left) : (dy > 0 ? .down : .up))
                swipeOrigin = v.location
            }
            .onEnded { _ in swipeOrigin = nil })
    }

    private var dpad: some View {
        let t = ts.theme
        func key(_ label: String, _ d: Dir) -> some View {
            Button { m.turn(d) } label: {
                Text(label).font(.mono(16)).foregroundColor(t.text)
                    .frame(width: 44, height: 44)
                    .overlay(RoundedRectangle(cornerRadius: t.r(6)).stroke(t.line, lineWidth: 1))
            }.buttonStyle(.plain).accessibilityLabel("turn \(d)")
        }
        return VStack(spacing: 6) {
            key("↑", .up)
            HStack(spacing: 6) { key("←", .left); key("↓", .down); key("→", .right) }
        }.frame(maxWidth: .infinity)
    }
}
