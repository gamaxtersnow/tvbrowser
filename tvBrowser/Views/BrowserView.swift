import SwiftUI

struct BrowserView: View {
    let platform: Platform

    var body: some View {
        VStack {
            Text("加载 \(platform.rawValue)...")
                .font(.largeTitle)
                .padding()

            ProgressView()
                .scaleEffect(1.5)
        }
        .background(Color.black)
        .ignoresSafeArea()
    }
}
