import SwiftUI

struct BrowserView: View {
    let platform: Platform
    @State private var isLoading = true
    @State private var pageTitle = ""
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            TVWebView(
                url: platform.url,
                platform: platform,
                onLoadingStateChange: { loading in
                    isLoading = loading
                },
                onTitleChange: { title in
                    pageTitle = title
                }
            )
            .ignoresSafeArea()

            if isLoading {
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
        }
        .onMoveCommand { direction in
            // TODO: Unit 4 实现遥控器映射
        }
        .onExitCommand {
            dismiss()
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
