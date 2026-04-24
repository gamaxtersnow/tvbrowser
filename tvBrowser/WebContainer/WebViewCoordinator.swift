import WebKit

final class WebViewCoordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    weak var webView: WKWebView?
    weak var controller: WebViewController?

    private let onLoadingStateChange: ((Bool) -> Void)?
    private let onTitleChange: ((String) -> Void)?
    private let onError: ((Error) -> Void)?

    init(
        onLoadingStateChange: ((Bool) -> Void)? = nil,
        onTitleChange: ((String) -> Void)? = nil,
        onError: ((Error) -> Void)? = nil
    ) {
        self.onLoadingStateChange = onLoadingStateChange
        self.onTitleChange = onTitleChange
        self.onError = onError
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
        onError?(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        onLoadingStateChange?(false)
        onError?(error)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        if let url = webView.url {
            webView.load(URLRequest(url: url))
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url {
            let scheme = url.scheme?.lowercased() ?? ""
            if scheme != "http" && scheme != "https" && scheme != "about" {
                decisionHandler(.cancel)
                return
            }
        }
        decisionHandler(.allow)
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
            enterVideoFullscreen()
        case "videoEnded":
            break
        default:
            break
        }
    }

    private func enterVideoFullscreen() {
        evaluateJavaScript("""
            (function() {
                var videos = document.querySelectorAll('video');
                for (var i = 0; i < videos.length; i++) {
                    var v = videos[i];
                    if (!v.paused) {
                        if (v.webkitEnterFullscreen) {
                            v.webkitEnterFullscreen();
                        } else if (v.requestFullscreen) {
                            v.requestFullscreen();
                        }
                        break;
                    }
                }
            })();
        """)
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
