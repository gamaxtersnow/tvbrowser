import WebKit

enum JSInjector {
    static func scripts(for platform: Platform) -> [WKUserScript] {
        var scripts: [WKUserScript] = []

        // 通用脚本
        if let focusScript = loadScript(named: "focus-navigation") {
            scripts.append(focusScript)
        }
        if let visualScript = loadScript(named: "visual-adaptation") {
            scripts.append(visualScript)
        }
        if let videoScript = loadScript(named: "video-autofullscreen") {
            scripts.append(videoScript)
        }

        // 平台专用补丁
        let patchName: String
        switch platform {
        case .youku:
            patchName = "youku"
        case .tencent:
            patchName = "tencent"
        case .iqiyi:
            patchName = "iqiyi"
        }

        if let patchScript = loadScript(named: "platform-patches/\(patchName)") {
            scripts.append(patchScript)
        }

        return scripts
    }

    private static func loadScript(named name: String) -> WKUserScript? {
        guard let url = Bundle.main.url(forResource: name, withExtension: "js"),
              let source = try? String(contentsOf: url, encoding: .utf8) else {
            return nil
        }
        return WKUserScript(
            source: source,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: false
        )
    }
}
