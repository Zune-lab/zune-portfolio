import Foundation

// Port of src/lib/status.js. online/offline is inferred from the owner's clock (no backend);
// busy/focus can only be picked by hand. The choice is saved on this device only.
enum StatusKey: String { case online, offline, busy, focus }
enum StatusOverride: String, CaseIterable { case auto, busy, focus, offline }
enum ColorRole { case green, dim, amber, cssLang, danger, text }

struct StatusInfo {
    let key: StatusKey
    let isAuto: Bool
    let label: String      // shown on the zune.sav badge
    let blurb: String      // printed by the terminal
    let color: ColorRole
    let pulse: Bool
}

@MainActor
final class StatusStore: ObservableObject {
    @Published private(set) var choice: StatusOverride
    /// bumped once a minute so an `auto` status re-evaluates the clock
    @Published private(set) var minute = 0
    private let defaults = UserDefaults.standard
    private let storeKey = Site.storageKey("status-override")

    init() {
        choice = StatusOverride(rawValue: UserDefaults.standard.string(forKey: Site.storageKey("status-override")) ?? "") ?? .auto
        Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 60_000_000_000)
                guard let self else { return }
                self.minute += 1
            }
        }
    }

    var key: StatusKey {
        choice == .auto ? (SiteTime.isOnlineHour() ? .online : .offline) : (StatusKey(rawValue: choice.rawValue) ?? .offline)
    }

    var info: StatusInfo {
        let k = key
        let isAuto = choice == .auto
        switch k {
        case .online: return StatusInfo(key: k, isAuto: isAuto, label: "online", blurb: "open to new projects", color: .green, pulse: true)
        case .offline: return StatusInfo(key: k, isAuto: isAuto, label: "offline", blurb: "offline right now, will reply later", color: .dim, pulse: false)
        case .busy: return StatusInfo(key: k, isAuto: isAuto, label: "busy - replies may be slow", blurb: "busy, replies may be slow", color: .amber, pulse: false)
        case .focus: return StatusInfo(key: k, isAuto: isAuto, label: "in focus mode", blurb: "in focus mode, replies may be slow", color: .cssLang, pulse: false)
        }
    }

    /// auto → busy → focus → offline → auto
    func cycle() {
        let all = StatusOverride.allCases
        choice = all[(all.firstIndex(of: choice)! + 1) % all.count]
        defaults.set(choice == .auto ? nil : choice.rawValue, forKey: storeKey)
    }
}
