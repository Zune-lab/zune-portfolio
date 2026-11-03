import SwiftUI

@main
struct ZunePortfolioApp: App {
    @StateObject private var theme = ThemeStore()
    @StateObject private var status = StatusStore()
    @StateObject private var social = SocialStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(theme)
                .environmentObject(status)
                .environmentObject(social)
        }
    }
}
