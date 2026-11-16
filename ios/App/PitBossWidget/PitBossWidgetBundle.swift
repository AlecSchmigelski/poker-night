import SwiftUI
import WidgetKit

// The extension's entry point. Only the live activity lives here; there is no
// home screen widget, because nothing in this app is worth a static tile when
// no game is running.
@main
struct PitBossWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.2, *) {
            PitBossLiveActivity()
        }
    }
}
