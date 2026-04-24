import WebKit

final class CookieManager {
    static let shared = CookieManager()
    private let cookieStoreKey = "tvBrowser.savedCookies"
    private let queue = DispatchQueue(label: "tvBrowser.cookieManager")

    private init() {}

    func saveCookies() {
        let cookieStore = WKWebsiteDataStore.default().httpCookieStore
        cookieStore.getAllCookies { [weak self] cookies in
            self?.queue.async {
                self?.persist(cookies: cookies)
            }
        }
    }

    func restoreCookies() {
        queue.async { [weak self] in
            guard let self = self else { return }
            let cookies = self.loadPersistedCookies()
            let cookieStore = WKWebsiteDataStore.default().httpCookieStore
            DispatchQueue.main.async {
                for cookie in cookies {
                    cookieStore.setCookie(cookie)
                }
            }
        }
    }

    private func persist(cookies: [HTTPCookie]) {
        let validCookies = cookies.filter { $0.expiresDate == nil || $0.expiresDate! > Date() }
        do {
            let data = try NSKeyedArchiver.archivedData(withRootObject: validCookies, requiringSecureCoding: true)
            UserDefaults.standard.set(data, forKey: cookieStoreKey)
        } catch {
            print("Failed to archive cookies: \(error)")
        }
    }

    private func loadPersistedCookies() -> [HTTPCookie] {
        guard let data = UserDefaults.standard.data(forKey: cookieStoreKey) else {
            return []
        }
        do {
            let cookies = try NSKeyedUnarchiver.unarchivedArrayOfObjects(ofClass: HTTPCookie.self, from: data)
            return cookies ?? []
        } catch {
            print("Failed to unarchive cookies: \(error)")
            return []
        }
    }
}
