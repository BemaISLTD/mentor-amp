import { Component, type ErrorInfo, type ReactNode } from 'react'

type ScreenErrorBoundaryProps = {
  children: ReactNode
}

type ScreenErrorBoundaryState = {
  error: Error | null
}

export class ScreenErrorBoundary extends Component<ScreenErrorBoundaryProps, ScreenErrorBoundaryState> {
  state: ScreenErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ScreenErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Screen rendering failed.', error, errorInfo.componentStack)
  }

  private retry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <section className="panel" role="alert">
          <h2 className="section-title">This screen could not be displayed</h2>
          <p className="muted">{this.state.error.message || 'An unexpected error occurred.'}</p>
          <button className="button button-primary" onClick={this.retry}>Try again</button>
        </section>
      )
    }

    return this.props.children
  }
}
