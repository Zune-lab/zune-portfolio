import SwiftUI
import UIKit

private struct TLine: Identifiable {
    let id = UUID()
    let isCmd: Bool
    var text: String
}

/// The terminal window of the home page (src/components/home/Terminal/Terminal.jsx):
/// types its own intro when it scrolls into view, then accepts commands, or you tap a question chip.
@MainActor struct TerminalView: View {
    @EnvironmentObject private var ts: ThemeStore
    @EnvironmentObject private var status: StatusStore
    @EnvironmentObject private var social: SocialStore
    let onNavigate: (Tab) -> Void

    @State private var lines: [TLine] = []
    @State private var ready = false
    @State private var busy = false
    @State private var started = false
    @State private var value = ""
    @State private var history: [String] = []
    @State private var hIdx = -1
    @FocusState private var focused: Bool

    private var ctx: TerminalEngine.Context {
        .init(theme: ts, social: social, status: status.key, navigate: onNavigate)
    }

    var body: some View {
        let t = ts.theme
        VStack(spacing: 0) {
            // title bar
            HStack(spacing: 8) {
                Circle().fill(t.danger).frame(width: 11, height: 11)
                Circle().fill(t.dotYellow).frame(width: 11, height: 11)
                Circle().fill(t.dotGreen).frame(width: 11, height: 11)
                Text("\(Site.id)@\(Site.host): ~").font(.mono(12)).foregroundColor(t.dim).padding(.leading, 4)
                Spacer()
            }
            .padding(.horizontal, 14).padding(.vertical, 10).background(t.panel)
            Rectangle().fill(t.line).frame(height: 1)

            // output + prompt
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(lines) { l in
                            if l.isCmd {
                                (Text("$ ").foregroundColor(t.green) + Text(l.text).foregroundColor(t.text))
                                    .padding(.bottom, 2)
                            } else {
                                Text(l.text).foregroundColor(t.dim).padding(.bottom, 8)
                            }
                        }
                        if !ready {
                            HStack(spacing: 0) { Text("$ ").foregroundColor(t.green); BlinkCursor(width: 8, height: 16) }
                        } else {
                            HStack(spacing: 0) {
                                Text("$ ").foregroundColor(t.green)
                                TextField("", text: $value)
                                    .focused($focused)
                                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                                    .submitLabel(.send)
                                    .onSubmit(submit)
                                    .foregroundColor(t.text).tint(t.amber)
                                    .accessibilityLabel("terminal input")
                            }
                        }
                        Color.clear.frame(height: 1).id("end")
                    }
                    .font(.mono(13.5))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20).padding(.vertical, 22)
                }
                .frame(height: 260)
                .contentShape(Rectangle())
                .onTapGesture { if ready { focused = true } }
                .onChange(of: lines.count) { _ in withAnimation { proxy.scrollTo("end", anchor: .bottom) } }
                .onChange(of: focused) { f in if f { withAnimation { proxy.scrollTo("end", anchor: .bottom) } } }
            }

            // quick questions (+ history, there is no ↑ key on a phone)
            Rectangle().fill(t.line).frame(height: 1)
            FlowLayout(spacing: 8) {
                if ready {
                    Text("ask:").foregroundColor(t.dim)
                    ForEach(TerminalEngine.quick, id: \.cmd) { q in
                        Button { Task { await run(q.cmd) } } label: {
                            Text(q.label).foregroundColor(t.dim)
                                .padding(.horizontal, 10).padding(.vertical, 5)
                                .overlay(RoundedRectangle(cornerRadius: t.r(2)).stroke(t.line, lineWidth: 1))
                        }.buttonStyle(.plain).disabled(busy).opacity(busy ? 0.5 : 1)
                    }
                    ForEach(["↑", "↓"], id: \.self) { arrow in
                        Button { browse(arrow == "↑" ? 1 : -1) } label: {
                            Text(arrow).foregroundColor(t.dim).padding(.horizontal, 10).padding(.vertical, 5)
                                .overlay(RoundedRectangle(cornerRadius: t.r(2)).stroke(t.line, lineWidth: 1))
                        }.buttonStyle(.plain).accessibilityLabel(arrow == "↑" ? "previous command" : "next command")
                    }
                }
            }
            .font(.mono(12))
            .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
            .padding(.horizontal, 20).padding(.vertical, 12)
        }
        .background(t.inset)
        .clipShape(RoundedRectangle(cornerRadius: t.r(10)))
        .overlay(RoundedRectangle(cornerRadius: t.r(10)).stroke(t.line, lineWidth: 1))
        .onAppear { started = true }          // the stack is lazy: this fires when the terminal is about to be seen
        .task(id: started) { if started && !ready && lines.isEmpty { await playIntro() } }
    }

    // MARK: animation helpers
    private func nap(_ ms: Int) async -> Bool {
        do { try await Task.sleep(nanoseconds: UInt64(ms) * 1_000_000); return true } catch { return false }
    }

    @MainActor private func playIntro() async {
        let reduce = UIAccessibility.isReduceMotionEnabled
        var buf: [TLine] = []
        for s in TerminalEngine.intro(status.info.blurb) {
            buf.append(TLine(isCmd: true, text: reduce ? s.cmd : ""))
            lines = buf
            if !reduce {
                for i in 1...s.cmd.count {
                    guard await nap(45) else { return }
                    buf[buf.count - 1].text = String(s.cmd.prefix(i))
                    lines = buf
                }
            }
            guard await nap(250) else { return }
            buf.append(TLine(isCmd: false, text: s.out))
            lines = buf
            guard await nap(350) else { return }
        }
        ready = true
    }

    // MARK: commands
    private func submit() {
        guard !busy else { return }  // a chip is typing: run() edits the last line, a manual command would mix with it
        let raw = value
        if !raw.trimmingCharacters(in: .whitespaces).isEmpty { history.append(raw) }
        hIdx = -1
        value = ""
        let r = TerminalEngine.exec(raw, ctx)
        if r.clear { lines = []; focused = true; return }
        lines = Array((lines + [TLine(isCmd: true, text: raw)] + r.lines.map { TLine(isCmd: false, text: $0) }).suffix(200))
        focused = true
    }

    /// tapping a question: the command types itself, then prints, so visitors don't need to know any command
    @MainActor private func run(_ cmd: String) async {
        guard ready, !busy else { return }
        busy = true
        defer { busy = false }
        lines.append(TLine(isCmd: true, text: ""))
        for i in 1...cmd.count {
            guard await nap(35) else { return }
            lines[lines.count - 1].text = String(cmd.prefix(i))
        }
        guard await nap(250) else { return }
        let r = TerminalEngine.exec(cmd, ctx)
        lines = Array((lines + r.lines.map { TLine(isCmd: false, text: $0) }).suffix(200))
    }

    /// +1 = older, -1 = newer (arrow keys in the web terminal; ↓ only while browsing so it never wipes what you typed)
    private func browse(_ dir: Int) {
        if dir > 0, !history.isEmpty {
            hIdx = min(hIdx + 1, history.count - 1)
            value = history[history.count - 1 - hIdx]
        } else if dir < 0, hIdx >= 0 {
            hIdx = max(hIdx - 1, -1)
            value = hIdx == -1 ? "" : history[history.count - 1 - hIdx]
        }
    }
}
