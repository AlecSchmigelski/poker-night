import { Component } from 'react'

// Without this, any render error is a black screen with nothing to act on —
// which is indistinguishable from "the app didn't load". Persisted state is the
// most likely culprit, so the recovery offered is to clear it.
export class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Poker Night crashed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="app">
        <header className="hdr">
          <div className="lamp" />
          <div className="left">
            <div className="title">Something broke</div>
            <div className="hint">The app hit an error while drawing</div>
          </div>
        </header>
        <div className="scroll">
          <div className="empty" style={{ paddingTop: 40 }}>
            <div className="ring" />
            <h4>This is a bug, not something you did.</h4>
            <p>
              Reloading usually clears it. If it keeps happening, the saved data on
              this phone is the likely cause — clearing it starts you fresh, and
              loses your roster and past games.
            </p>
          </div>
          <div className="linkbox" style={{ marginTop: 8 }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
        </div>
        <div className="dock">
          <div className="dock-inner">
            <button className="btn" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button
              className="btn ghost danger"
              style={{ marginTop: 8 }}
              onClick={() => {
                localStorage.removeItem('poker-night/v1')
                window.location.reload()
              }}
            >
              Clear saved data and restart
            </button>
          </div>
        </div>
      </div>
    )
  }
}
