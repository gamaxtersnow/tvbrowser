import SwiftUI
import WebKit

final class SharedProcessPool {
    static let `default` = WKProcessPool()
}

struct TVWebView: UIViewRepresentable {
    let url: URL
    let platform: Platform
    @ObservedObject var controller: WebViewController
    let onLoadingStateChange: ((Bool) -> Void)?
    let onTitleChange: ((String) -> Void)?
    let onError: ((Error) -> Void)?

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsPictureInPictureMediaPlayback = true
        config.processPool = SharedProcessPool.default

        let userContentController = config.userContentController
        let scripts = JSInjector.scripts(for: platform)
        for script in scripts {
            userContentController.addUserScript(script)
        }
        userContentController.add(context.coordinator, name: "tvOSBridge")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = false

        context.coordinator.webView = webView
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if webView.url?.absoluteString != url.absoluteString {
            let request = URLRequest(url: url)
            webView.load(request)
        }
    }

    func makeCoordinator() -> WebViewCoordinator {
        let coordinator = WebViewCoordinator(
            onLoadingStateChange: onLoadingStateChange,
            onTitleChange: onTitleChange,
            onError: onError
        )
        coordinator.controller = controller
        return coordinator
    }
}
