import SwiftUI

enum Platform: String, CaseIterable, Identifiable {
    case youku = "优酷"
    case tencent = "腾讯视频"
    case iqiyi = "爱奇艺"

    var id: String { rawValue }

    var url: URL {
        switch self {
        case .youku:
            return URL(string: "https://www.youku.com")!
        case .tencent:
            return URL(string: "https://v.qq.com")!
        case .iqiyi:
            return URL(string: "https://www.iqiyi.com")!
        }
    }

    var brandColor: Color {
        switch self {
        case .youku:
            return Color(red: 0.0, green: 0.55, blue: 1.0)
        case .tencent:
            return Color(red: 0.12, green: 0.72, blue: 0.4)
        case .iqiyi:
            return Color(red: 0.0, green: 0.75, blue: 0.35)
        }
    }
}

struct PlatformListView: View {
    @FocusState private var focusedPlatform: Platform?

    var body: some View {
        VStack(spacing: 40) {
            Text("选择平台")
                .font(.system(size: 48, weight: .bold))
                .padding(.top, 60)

            HStack(spacing: 60) {
                ForEach(Platform.allCases) { platform in
                    NavigationLink(value: platform) {
                        PlatformCard(platform: platform)
                    }
                    .focused($focusedPlatform, equals: platform)
                    .buttonStyle(.card)
                }
            }
            .padding(.horizontal, 80)

            Spacer()
        }
        .navigationDestination(for: Platform.self) { platform in
            BrowserView(platform: platform)
        }
        .background(Color.black)
        .onAppear {
            focusedPlatform = .youku
        }
    }
}

struct PlatformCard: View {
    let platform: Platform

    var body: some View {
        VStack(spacing: 20) {
            RoundedRectangle(cornerRadius: 20)
                .fill(platform.brandColor)
                .frame(width: 280, height: 180)
                .overlay(
                    Text(platform.rawValue)
                        .font(.system(size: 36, weight: .semibold))
                        .foregroundColor(.white)
                )
        }
        .padding(20)
    }
}
