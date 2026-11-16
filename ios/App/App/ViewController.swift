import Capacitor

// Capacitor auto-discovers plugins that ship inside packages, but one written
// in the app target is not found that way — it has to be handed to the bridge.
// Without this the plugin compiles, links, and is simply never registered:
// `Capacitor.Plugins.LiveActivity` is undefined and every call no-ops, which
// looks exactly like a device that does not support live activities.
class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(LiveActivityPlugin())
    }
}
