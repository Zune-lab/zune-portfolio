import SwiftUI

// Port of src/lib/skin.js + src/lib/useSkin.js: which skin (or "auto") and which light/dark mode is active.
// A skin with one mode forces the mode but remembers the user's own pick for when they leave it.
@MainActor
final class ThemeStore: ObservableObject {
    static let auto = "auto"
    private enum Key {
        static let skin = Site.storageKey("skin")
        static let theme = Site.storageKey("theme")
        static let unlocked = Site.storageKey("skins-unlocked")
    }

    @Published private(set) var skinChoice: String
    @Published private(set) var modePref: Mode
    @Published private(set) var unlocked: Set<String>
    private let d = UserDefaults.standard

    init() {
        let saved = UserDefaults.standard.string(forKey: Key.skin)
        skinChoice = (saved == ThemeStore.auto || saved.flatMap { SkinCatalog.byId[$0] } != nil) ? saved! : SkinData.defaultSkin
        modePref = Mode(rawValue: UserDefaults.standard.string(forKey: Key.theme) ?? "") ?? .dark
        unlocked = Set(UserDefaults.standard.stringArray(forKey: Key.unlocked) ?? [])
    }

    // MARK: resolved state
    var isAuto: Bool { skinChoice == Self.auto }

    var skin: Skin {
        let id = isAuto ? (SkinData.autoByTod[SiteTime.timeOfDay().rawValue] ?? SkinData.defaultSkin) : skinChoice
        guard let s = SkinCatalog.byId[id], !isLocked(s) else { return SkinCatalog.fallback }
        return s
    }
    var mode: Mode { skin.lockedMode ?? modePref }
    var theme: Theme { Theme(p: skin.palette(for: mode), rk: skin.rk) }
    var canToggleMode: Bool { skin.lockedMode == nil }
    var colorScheme: ColorScheme { mode == .dark ? .dark : .light }

    /// id of the skin actually shown (resolves `auto`)
    var skinId: String { skin.id }
    func isUnlocked(_ id: String) -> Bool { SkinCatalog.byId[id].map { !isLocked($0) } ?? false }

    // MARK: secret skins
    func isLocked(_ s: Skin) -> Bool { s.unlock != nil && !unlocked.contains(s.id) }
    func unlockAll() {
        unlocked = Set(SkinData.all.filter { $0.unlock != nil }.map(\.id))
        d.set(Array(unlocked), forKey: Key.unlocked)
    }
    /// call with a game's record; unlocks the skins whose condition it reaches and returns them (for the "skin unlocked" note)
    @discardableResult
    func report(game: String, score: Int) -> [Skin] {
        let add = SkinData.all.filter { s in
            guard let u = s.unlock else { return false }
            return u.game == game && score >= u.min && !unlocked.contains(s.id)
        }
        if !add.isEmpty {
            unlocked.formUnion(add.map(\.id))
            d.set(Array(unlocked), forKey: Key.unlocked)
        }
        return add
    }

    // MARK: actions
    func pick(_ id: String) {
        guard id == Self.auto || (SkinCatalog.byId[id].map { !isLocked($0) } ?? false) else { return }
        skinChoice = id
        d.set(id, forKey: Key.skin)
    }
    func toggleMode() {
        guard canToggleMode else { return }
        modePref = mode == .dark ? .light : .dark
        d.set(modePref.rawValue, forKey: Key.theme)
    }
    /// re-evaluate the auto skin (time of day changed)
    func refreshAuto() { if isAuto { objectWillChange.send() } }
}
