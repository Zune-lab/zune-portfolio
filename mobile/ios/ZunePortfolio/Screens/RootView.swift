import SwiftUI

/// Shell: top bar (logo, skin chip, light/dark switch) + page + bottom nav. Replaces Navbar.jsx.
@MainActor struct RootView: View {
    @EnvironmentObject private var ts: ThemeStore
    @EnvironmentObject private var social: SocialStore
    @State private var tab: Tab = .home
    @State private var showSkins = false

    var body: some View {
        let t = ts.theme
        VStack(spacing: 0) {
            topBar
            Rectangle().fill(t.line).frame(height: 1)
            Group {
                switch tab {
                case .home: HomeView(onNavigate: { tab = $0 })
                case .about: AboutView()
                case .projects: ProjectsView()
                case .lab: LabView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            Rectangle().fill(t.line).frame(height: 1)
            bottomBar
        }
        .background(t.bg.ignoresSafeArea())
        .preferredColorScheme(ts.colorScheme)
        .animation(.easeOut(duration: 0.25), value: ts.skin.id)
        .animation(.easeOut(duration: 0.25), value: ts.mode)
        .sheet(isPresented: $showSkins) { SkinPickerView().environmentObject(ts) }
        .onAppear { social.onKonami = { ts.unlockAll() } }
        // `auto` skin follows the clock
        .task { while !Task.isCancelled { try? await Task.sleep(nanoseconds: 60_000_000_000); ts.refreshAuto() } }
    }

    private var topBar: some View {
        let t = ts.theme
        return HStack(spacing: 12) {
            Button { tab = .home } label: {
                Text(code([("> ", t.amber), (Site.handle, t.text)])).font(.mono(15, .bold))
            }.buttonStyle(.plain)
            Spacer()
            Button { showSkins = true } label: {
                HStack(spacing: 6) {
                    Circle().fill(t.amber).frame(width: 9, height: 9)
                    Text(ts.isAuto ? "auto · \(ts.skin.label)" : ts.skin.label).font(.mono(12))
                }
                .foregroundColor(t.text)
                .padding(.horizontal, 10).padding(.vertical, 6)
                .overlay(Capsule().stroke(t.line, lineWidth: 1))
            }.buttonStyle(.plain)
            // light/dark: a single-mode skin locks it (the web's torch does the same)
            TorchSwitch(lit: ts.mode == .dark, enabled: ts.canToggleMode) { ts.toggleMode() }
                .foregroundColor(t.text)
        }
        .padding(.horizontal, 16).padding(.vertical, 8)
        .background(t.bg.opacity(0.95))
    }

    private var bottomBar: some View {
        let t = ts.theme
        return HStack {
            ForEach(Tab.allCases) { item in
                let on = item == tab
                Button { tab = item } label: {
                    VStack(spacing: 3) {
                        Image(systemName: item.symbol).font(.system(size: 17))
                        Text(item.label).font(.mono(10.5, on ? .semibold : .regular))
                    }
                    .foregroundColor(on ? t.amber : t.dim)
                    .frame(maxWidth: .infinity).padding(.vertical, 8)
                }.buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 8)
        .background(t.panel.ignoresSafeArea(edges: .bottom))
    }
}
