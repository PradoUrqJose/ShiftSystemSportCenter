// Duraciones compartidas para la animación de apertura/cierre de los modales
// "propios" de un componente (no el modal de página que maneja ModalService).
// Antes cada componente reimplementaba esto con su propio número mágico —
// varios coincidían en 300/50 por casualidad, pero turno-modal usaba 50ms
// también para el cierre de sus modales anidados (agregar/gestionar tienda)
// mientras la transición CSS real dura 300ms (`duration-300` en su html),
// así que el modal desaparecía de golpe a mitad de la animación de fade-out
// en vez de completarla.
//
// Estas dos constantes son números de TS (no se puede leer una CSS custom
// property acá sin un runtime lookup frágil), pero están en sincronía a
// propósito con los tokens de motion de src/app/styles/tokens.css — si se
// cambia una, cambiar la otra:
//
// MODAL_OPEN_DELAY_MS: tiempo entre montar el modal (*ngIf) y activar la
// clase de "visible", para que el navegador alcance a pintar el estado
// inicial antes de animar la transición de entrada. Sin equivalente directo
// en tokens.css (es un delay de pintado, no una duración de transición).
export const MODAL_OPEN_DELAY_MS = 50;

// MODAL_CLOSE_DELAY_MS: tiempo entre desactivar la clase de "visible" (arranca
// la animación de salida) y desmontar el modal — debe coincidir con la
// duración real de la transición CSS (`transition-all duration-300`) y con
// --duration-modal (tokens.css).
export const MODAL_CLOSE_DELAY_MS = 300;
