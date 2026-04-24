import WebKit

final class WebViewCoordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    weak var webView: WKWebView?
    weak var controller: WebViewController?

    private let onLoadingStateChange: ((Bool) -> Void)?
    private let onTitleChange: ((String) -> Void)?

    init(
        onLoadingStateChange: ((Bool) -> Void)? = nil,
        onTitleChange: ((String) -> Void)? = nil
    ) {
        self.onLoadingStateChange = onLoadingStateChange
        self.onTitleChange = onTitleChange
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        onLoadingStateChange?(true)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        onLoadingStateChange?(false)
        if let title = webView.title, !title.isEmpty {
            onTitleChange?(title)
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        onLoadingStateChange?(false)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        onLoadingStateChange?(false)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        if let url = webView.url {
            webView.load(URLRequest(url: url))
        }
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any],
              let type = body["type"] as? String else {
            return
        }

        switch type {
        case "videoPlaying":
            break
        case "videoEnded":
            break
        default:
            break
        }
    }

    // MARK: - Public Helpers

    func goBack() {
        webView?.goBack()
    }

    func canGoBack() -> Bool {
        webView?.canGoBack ?? false
    }

    func reload() {
        webView?.reload()
    }

    func evaluateJavaScript(_ script: String, completion: ((Any?, Error?) -> Void)? = nil) {
        webView?.evaluateJavaScript(script, completionHandler: completion)
    }
}
