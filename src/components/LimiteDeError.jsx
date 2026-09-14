import { Component } from "react";

export default class LimiteDeError extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Error al renderizar una sección de la aplicación.", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-boundary">
          <h1>Algo salió mal</h1>
          <p>No pudimos cargar esta sección. Puedes intentarlo nuevamente.</p>
          <div className="actions">
            <button type="button" onClick={() => window.location.reload()}>
              Reintentar
            </button>
            <a className="button secondary" href="/">
              Ir a la portada
            </a>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
