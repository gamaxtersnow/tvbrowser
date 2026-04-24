import SwiftUI

struct BrowserView: View {
    let platform: Platform
    @StateObject private var controller = WebViewController()
    @StateObject private var networkMonitor = NetworkMonitor.shared
    @State private var isLoading = true
    @State private var pageTitle = ""
    @State private var loadError: Error?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            TVWebView(
                url: platform.url,
                platform: platform,
                controller: controller,
                onLoadingStateChange: { loading in
                    isLoading = loading
                    if loading {
                        loadError = nil
                    }
                },
                onTitleChange: { title in
                    pageTitle = title
                },
                onError: { error in
                    loadError = error
                }
            )
            .ignoresSafeArea()

            if let error = loadError {
                VStack(spacing: 24) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 48))
                        .foregroundColor(.orange)

                    Text("加载失败")
                        .font(.title2)

                    Text(error.localizedDescription)
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)

                    Button("重试") {
                        loadError = nil
                        controller.reload()
                    }
                    .buttonStyle(.borderedProminent)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.black)
            } else if isLoading {
                VStack(spacing: 20) {
                    ProgressView()
                        .scaleEffect(1.5)
                    Text("加载中...")
                        .font(.title2)
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.black.opacity(0.8))
            }

            if !networkMonitor.isConnected {
                VStack {
                    HStack(spacing: 8) {
                        Image(systemName: "wifi.slash")
                        Text("网络未连接")
                    }
                    .font(.caption)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.red.opacity(0.8))
                    .clipShape(Capsule())
                    .padding(.top, 20)

                    Spacer()
                }
            }
        }
        .onMoveCommand { direction in
            let jsDirection: String
            switch direction {
            case .up: jsDirection = "up"
            case .down: jsDirection = "down"
            case .left: jsDirection = "left"
            case .right: jsDirection = "right"
            @unknown default: jsDirection = "down"
            }
            controller.evaluateJavaScript("tvOSFocus.move('\(jsDirection)')")
        }
        .onPlayPauseCommand {
            controller.evaluateJavaScript("tvOSFocus.select()")
        }
        .onExitCommand {
            if controller.canGoBack() {
                controller.goBack()
            } else {
                dismiss()
            }
        }
        .overlay(alignment: .top) {
            if !pageTitle.isEmpty {
                Text(pageTitle)
                    .font(.caption)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial)
                    .clipShape(Capsule())
                    .padding(.top, 20)
            }
        }
    }
}
