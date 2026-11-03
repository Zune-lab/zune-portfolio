import SwiftUI

// Port of src/config/skins.js (types + helpers). The data itself is generated into SkinData.swift.
enum Mode: String, Hashable { case dark, light }

enum SkinGroup: String {
    case original, editor, special, secret
    var title: String {
        switch self {
        case .original: return "default"
        case .editor: return "editor themes"
        case .special: return "whole-site skins"
        case .secret: return "secret"
        }
    }
}

struct Unlock { let game: String, min: Int, hint: String }

/// The 15 colour tokens every skin defines (same names as the CSS variables, camel-cased).
struct Palette {
    let bg, panel, inset, line, text, textDim, amber, amberDim, onAmber, glow, glowGreen, green, js, cssLang, danger: Int
}

struct Skin: Identifiable {
    let id: String
    let group: SkinGroup
    let label: String, note: String
    let modes: [Mode]
    let rk: Double            // corner-roundness factor (0 = square)
    let unlock: Unlock?
    let palettes: [Mode: Palette]

    /// a skin with a single mode locks light/dark to it
    var lockedMode: Mode? { modes.count == 1 ? modes[0] : nil }
    func palette(for mode: Mode) -> Palette {
        palettes[lockedMode ?? mode] ?? palettes.values.first!
    }
}

enum SkinCatalog {
    static let byId: [String: Skin] = Dictionary(uniqueKeysWithValues: SkinData.all.map { ($0.id, $0) })
    static let fallback = byId[SkinData.defaultSkin]!
}

extension Color {
    init(hex: Int, opacity: Double = 1) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255,
                  opacity: opacity)
    }
}

/// Resolved colours for the current skin + mode: what views read.
struct Theme {
    let p: Palette
    let rk: Double

    var bg: Color { Color(hex: p.bg) }
    var panel: Color { Color(hex: p.panel) }
    var inset: Color { Color(hex: p.inset) }
    var line: Color { Color(hex: p.line) }
    var text: Color { Color(hex: p.text) }
    var dim: Color { Color(hex: p.textDim) }
    var amber: Color { Color(hex: p.amber) }
    var amberDim: Color { Color(hex: p.amberDim) }
    var onAmber: Color { Color(hex: p.onAmber) }
    var glow: Color { Color(hex: p.glow) }
    var green: Color { Color(hex: p.green) }
    var js: Color { Color(hex: p.js) }
    var cssLang: Color { Color(hex: p.cssLang) }
    var danger: Color { Color(hex: p.danger) }
    // fixed "macOS window" dots (same in every skin on the web)
    var dotYellow: Color { Color(hex: 0xFFBD2E) }
    var dotGreen: Color { Color(hex: 0x27C93F) }

    /// every border-radius on the web is multiplied by the skin's --rk
    func r(_ base: CGFloat) -> CGFloat { base * CGFloat(rk) }

    func color(_ role: ColorRole) -> Color {
        switch role {
        case .green: return green
        case .dim: return dim
        case .amber: return amber
        case .cssLang: return cssLang
        case .danger: return danger
        case .text: return text
        }
    }

    func color(_ c: ProjectColor) -> Color { c == .js ? js : cssLang }
    func color(_ tone: Tone) -> Color { tone == .hi ? green : tone == .mid ? amber : danger }
}
