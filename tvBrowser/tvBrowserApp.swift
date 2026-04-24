import SwiftUI

@main
struct tvBrowserApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @State private var hasRestoredCookies = false

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            switch newPhase {
            case .active:
                if !hasRestoredCookies {
                    CookieManager.shared.restoreCookies()
                    hasRestoredCookies = true
                }
            case .background:
                CookieManager.shared.saveCookies()
            default:
                break
            }
        }
    }
}
