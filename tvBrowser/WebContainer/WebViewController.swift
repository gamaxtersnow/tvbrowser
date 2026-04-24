import SwiftUI
import Combine

@MainActor
final class WebViewController: ObservableObject {
    weak var coordinator: WebViewCoordinator?

    func evaluateJavaScript(_ script: String) {
        coordinator?.evaluateJavaScript(script)
    }

    func goBack() {
        coordinator?.goBack()
    }

    func canGoBack() -> Bool {
        coordinator?.canGoBack() ?? false
    }

    func reload() {
        coordinator?.reload()
    }
}
