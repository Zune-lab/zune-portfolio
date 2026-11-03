import SwiftUI
import UIKit

/// Feedback form + socials (src/components/home/Feedback.jsx, Socials.jsx).
/// No backend: the message opens the mail app via `mailto:`, exactly like the web.
@MainActor struct ContactSection: View {
    @EnvironmentObject private var ts: ThemeStore
    @Environment(\.openURL) private var openURL
    @State private var text = ""
    @State private var mood: Mood?
    @State private var note = ""
    @State private var copied = false

    enum Mood: String {
        case good, bad
        var tag: String { self == .good ? " (liked it)" : " (not a fan)" }
        var symbol: String { self == .good ? "hand.thumbsup" : "hand.thumbsdown" }
        var label: String { self == .good ? "I like this page" : "Not a fan" }
    }

    private let maxMailto = 1900

    var body: some View {
        let t = ts.theme
        VStack(alignment: .leading, spacing: 28) {
            VStack(alignment: .leading, spacing: 14) {
                Text("// even a one-line note is fine, I read everything").font(.mono(12.5)).foregroundColor(t.dim)
                Panel(padding: 16) {
                    VStack(alignment: .leading, spacing: 14) {
                        ZStack(alignment: .topLeading) {
                            TextEditor(text: $text)
                                .font(.system(size: 15))
                                .scrollContentBackground(.hidden)
                                .foregroundColor(t.text)
                                .frame(minHeight: 110)
                                .padding(6)
                            if text.isEmpty {
                                Text("Write something about this page...").font(.system(size: 15)).foregroundColor(t.dim)
                                    .padding(.horizontal, 12).padding(.vertical, 14).allowsHitTesting(false)
                            }
                        }
                        .background(RoundedRectangle(cornerRadius: t.r(8)).fill(t.panel))
                        .overlay(RoundedRectangle(cornerRadius: t.r(8)).stroke(t.line, lineWidth: 1))

                        HStack {
                            HStack(spacing: 8) {
                                moodButton(.good); moodButton(.bad)
                            }
                            Spacer()
                            TermButton(title: "send →", disabled: text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, action: send)
                        }
                        if !note.isEmpty { Text(note).font(.mono(12)).foregroundColor(t.green) }
                    }
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("// no mail app? copy my email and write from anywhere").font(.mono(12.5)).foregroundColor(t.dim)
                Button(action: copyEmail) {
                    HStack {
                        Text(Site.email).font(.mono(13)).foregroundColor(t.text)
                        Spacer()
                        Text(copied ? "copied ✓" : "copy").font(.mono(12)).foregroundColor(copied ? t.green : t.amber)
                    }
                    .padding(14)
                    .background(RoundedRectangle(cornerRadius: t.r(8)).fill(t.inset))
                    .overlay(RoundedRectangle(cornerRadius: t.r(8)).stroke(t.line, lineWidth: 1))
                }.buttonStyle(.plain)
            }

            VStack(alignment: .leading, spacing: 12) {
                Text("// find me elsewhere").font(.mono(12.5)).foregroundColor(t.dim)
                FlowLayout(spacing: 10) {
                    ForEach(Socials.all) { s in
                        Button { openURL(s.url) } label: {
                            HStack(spacing: 8) {
                                Text(s.glyph).font(.mono(11, .bold)).foregroundColor(.white)
                                    .frame(width: 26, height: 26)
                                    .background(Circle().fill(Color(hex: s.brand)))
                                    .overlay(Circle().stroke(t.line, lineWidth: 1))
                                Text(s.name).font(.mono(13)).foregroundColor(t.text)
                            }
                            .padding(.horizontal, 10).padding(.vertical, 6)
                            .background(RoundedRectangle(cornerRadius: t.r(8)).fill(t.inset))
                            .overlay(RoundedRectangle(cornerRadius: t.r(8)).stroke(t.line, lineWidth: 1))
                        }.buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func moodButton(_ m: Mood) -> some View {
        let t = ts.theme
        let on = mood == m
        return Button { mood = on ? nil : m } label: {
            Image(systemName: m.symbol)
                .foregroundColor(on ? t.onAmber : t.dim)
                .frame(width: 38, height: 38)
                .background(RoundedRectangle(cornerRadius: t.r(8)).fill(on ? t.amber : t.panel))
                .overlay(RoundedRectangle(cornerRadius: t.r(8)).stroke(on ? t.amber : t.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(m.label)
    }

    private func copyEmail() {
        UIPasteboard.general.string = Site.email
        copied = true
        Task { try? await Task.sleep(nanoseconds: 2_000_000_000); copied = false }
    }

    /// mailto: links longer than ~2000 chars are silently cut by some mail clients: trim first and tell the user
    private func send() {
        let message = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !message.isEmpty else { return }
        let allowed = CharacterSet.urlQueryAllowed.subtracting(CharacterSet(charactersIn: "&+=?#/:@"))
        func enc(_ s: String) -> String { s.addingPercentEncoding(withAllowedCharacters: allowed) ?? "" }

        let head = "mailto:\(Site.email)?subject=\(enc("Feedback from \(Site.handle)\(mood?.tag ?? "")"))&body="
        var body = enc(message)
        var cut = false
        if head.count + body.count > maxMailto {
            cut = true
            var chars = Array(message)
            while !chars.isEmpty, head.count + enc(String(chars)).count > maxMailto { chars.removeLast(min(50, chars.count)) }
            body = enc(String(chars))
            UIPasteboard.general.string = message // the full text stays in the clipboard
        }
        if let url = URL(string: head + body) { openURL(url) }
        note = cut
            ? "Message was too long for a mail link, so it was trimmed (full text copied to clipboard). Or email \(Site.email) directly."
            : "Mail app should open. If nothing happens, email \(Site.email) directly - thanks!"
    }
}
