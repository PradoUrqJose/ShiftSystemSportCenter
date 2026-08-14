# Sistema de diseño — ShiftSystemSportCenter

Documento vivo de la línea de diseño del frontend (Angular 18 + Tailwind).
No es una propuesta: describe lo que ya está construido y aprobado en
pantalla (rediseño estilo Airbnb, cerrado el 14 ago 2026 — ver memoria
`rediseno-airbnb-frontend`), más el patrón de tabla de datos (fuente Inter,
ordenamiento y animaciones) agregado a continuación. Toda pantalla nueva
debería poder armarse combinando lo que hay acá, sin inventar un color, un
radio o una transición nuevos.

Fuente de verdad de **valores**: `Frontend/src/app/styles/tokens.css` y
`Frontend/src/app/styles/data-table.css`. Este documento explica el
*criterio* detrás de esos valores y cómo combinarlos — si hay diferencia
entre este archivo y el CSS, gana el CSS.

## Principios

1. **Un solo azul, un solo gris.** Antes había 3 azules "de marca"
   compitiendo y grises de Tailwind sin criterio. Ahora todo componente usa
   los tokens de `tokens.css` — nunca un hex nuevo a mano.
2. **Simplicidad visual por sobre densidad decorativa.** Jose cortó dos
   excesos de ruido durante el rediseño (badge de almuerzo, textura por
   celda) — el criterio por defecto es "menos, pero mejor", no "cuánto se
   puede sumar".
3. **Componentes presentacionales, "tontos" a propósito.** Avatar, Badge,
   TableShell, SortHeader no saben de negocio (turnos, colaboradores, etc.)
   — solo pintan. La página dueña de los datos decide qué hacer. Evita
   `::ng-deep` y acopla menos.
4. **Motion con propósito, nunca decorativo puro.** Cada transición marca un
   cambio de estado real (hover = interactivo, entrada de fila = "esto es
   nuevo en pantalla", ícono de orden rotando = "cambió la dirección").
   Todo respeta `prefers-reduced-motion`.

## Tipografía

**Inter es la fuente principal de toda la app** (`body` en `styles.css`,
también `fontFamily.sans` en `tailwind.config.js`). Se eligió por ser la
misma fuente ya usada en el patrón de tabla de datos que se adoptó como
referencia visual, y porque cubre bien números tabulares (relevante: horas,
DNI, montos).

```
font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
```

Pesos usados: 400 (texto de celda/párrafo), 500–600 (labels, botones
secundarios), 700–800 (headers de tabla, títulos de sección, botones
primarios — el sistema ya venía usando `font-weight: 800` bastante seguido,
ver `button.component.css` / `badge.component.css`, así que Inter 800 es el
peso "fuerte" por defecto en vez de 700).

Excepción documentada, no accidente: `.nunito`, `.quicksand` y
`.poiret-one` en `styles.css` siguen vivas para dos acentos puntuales que ya
existían antes del rediseño (números grandes del calendario mensual y del
perfil de colaborador). No son la fuente base — si una pantalla nueva
necesita un acento así, primero preguntar si el diseño lo pide de verdad o
si es arrastre legacy a limpiar.

## Color

Todos los valores viven en `tokens.css`; acá el mapa de *para qué sirve
cada grupo*.

| Grupo | Uso |
|---|---|
| `--color-brand*` | Único azul de marca — CTA primario, estado activo, texto de énfasis (`text-brand`). |
| `--color-ink*` / `--color-line*` / `--color-paper` / `--color-surface` | Escala neutra: texto, bordes, fondos. `ink` = texto, `line` = borde, `paper` = fondo sutil (header de tabla, fila deshabilitada), `surface` = blanco de tarjeta. |
| `--hue-teal*` / `--hue-violet*` | Acentos por *familia de acción* (ej. duplicar vs. operar en lote), no por severidad. |
| `--shift-*` | Estados de turno (normal, partido, horas extra, feriado, hoy) — dominio de Turnos, no reusar fuera de esa vista. |
| `--color-avatar-bg` | Fondo del círculo sin foto. Coincide en valor con `--shift-split-1-bg` por casualidad — son conceptos distintos, no acoplar. |

## Radio, sombra y motion

```
--radius-sm: 8px     /* controles chicos */
--radius-md: 12px    /* botones icon, inputs */
--radius-lg: 18px    /* tarjetas: TableShell, modales */
--radius-pill: 999px /* botones, badges, chips */

--shadow-hover: 0 2px 6px rgba(0,0,0,.12)   /* hover de elementos flotantes */
--shadow-soft:  0 10px 32px rgba(0,0,0,.16), 0 2px 8px rgba(0,0,0,.06) /* modales */

--duration-fast: 120ms   /* hover de ícono/borde */
--duration-base: 160ms   /* hover de fila, transiciones de color */
--duration-modal: 300ms  /* apertura/cierre de modal, entrada de fila de tabla */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)
```

## Componentes compartidos (`src/app/components/ui/`)

| Componente | Qué es | No hace |
|---|---|---|
| `app-button` | Botón `primary` / `secondary` / `icon`, con spinner de loading incorporado y tooltip CSS puro vía `[data-tooltip]`. | No sabe de la acción que dispara. |
| `app-badge` | Chip de una palabra con `tone` (`holiday`\|`overtime`\|`warning`\|`neutral`\|`brand`). | No decide el tone — lo calcula el consumidor. |
| `app-avatar` | Círculo con foto o iniciales, tamaño configurable (`size`, px). | No sabe de hover, tooltip de "ver perfil" ni navegación. |
| `app-skeleton` | Placeholder shimmer para loading (ancho/alto/forma configurables). | No decide cuándo mostrarse — el `*ngIf` es del consumidor. |
| `app-empty-state` | Icono + título + descripción para listas vacías. | — |
| `app-table-shell` | Marco de tarjeta para toda tabla: `[table-toolbar]`, scroll horizontal contenido, `[table-footer]`. | No sabe de columnas, filas ni orden — eso es `app-table` + `app-sort-header` (abajo). |
| `app-sort-header` | Label + flechita clickeable para un `<th>` ordenable; anima la flecha al cambiar de dirección. | No ordena nada — emite `(sort)`, la página aplica `sortRows()` (ver abajo). |

## Tablas de datos

Patrón único para las 6 tablas de la app: **Colaboradores, Empresas,
Puestos, Feriados** (CRUD) y **Horas Trabajadas, Turnos en Feriados**
(reportes). Las 6 viven dentro de `<app-table-shell>` y comparten
`src/app/styles/data-table.css` vía la clase `.app-table`.

### Estructura

```html
<app-table-shell>
  <table class="app-table">
    <thead>
      <tr>
        <th class="text-left">
          <app-sort-header [active]="sort.field==='nombre'" [direction]="sort.direction"
                            (sort)="onSort('nombre')">Nombre</app-sort-header>
        </th>
        <!-- ...resto de columnas ordenables... -->
        <th class="text-center"><i class="fa-solid fa-gear"></i></th> <!-- acciones: no ordenable -->
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let fila of datos; let i = index; trackBy: trackById" [style.--row-i]="i">
        <td class="p-4">{{ fila.campo }}</td>
        ...
      </tr>
    </tbody>
  </table>
  <div table-footer>...totales / paginación...</div>
</app-table-shell>
```

`.app-table` (global, `data-table.css`) resuelve por sí solo: fondo/color
del header, padding de celdas, borde entre filas y el hover
(`background-color: var(--color-paper)` con transición `--duration-base`).
Antes cada página repetía `bg-paper text-ink` y `border-t border-line-soft
hover:bg-paper transition` a mano — quedó centralizado para que las 6
tablas no puedan desincronizarse entre sí.

El scroll interno (`.app-table-shell__scroll`, y `.table-wrapper` de la
grilla de turnos) sigue siendo funcional con rueda/trackpad/drag, pero sin
la barra nativa visible (`styles.css`, regla `.app-table-shell__scroll,
.table-wrapper, .scrollbar-hidden`) — antes flasheaba ~1s en las tablas
CRUD mientras cargaba el skeleton, y quedaba fija en la tabla de turnos.
`.scrollbar-hidden` es la clase para reusar el mismo criterio en cualquier
otro contenedor con scroll fuera del patrón de tabla (ver
`semana-normal.component.html`).

### Ordenamiento

`src/app/utils/table-sort.util.ts` da dos funciones puras, sin estado:

- `sortRows(rows, selector, direction)` — copia ordenada, no muta.
  `selector` es `(fila) => valor`, no `keyof T`, a propósito: permite
  ordenar por columnas calculadas (ej. conteo de colaboradores por puesto)
  igual que por un campo directo.
- `nextSortState(current, field)` — mismo campo → invierte dirección; campo
  nuevo → arranca en `asc`.

Cada página guarda su propio `sort: SortState<'campo1'|'campo2'|...>` y
reaplica `sortRows()` tanto al cargar datos como en `onSort()`. No hay un
servicio de tabla genérico ni un `<app-data-table>` con inputs de columnas
— se evaluó y se descartó (ver comentario original en
`table-shell.component.ts`): cada tabla tiene su propio modelo de datos y
casos borde (fila deshabilitada, columna calculada, total en el footer), y
repetir ~10 líneas de wiring por página sale más barato que una capa
genérica que terminaría con vías de escape por todos lados.

### Animación de entrada

Cada `<tr>` de datos anima con `app-table-row-in` (fade + `translateY(6px)`,
`--duration-modal`, `--ease-standard`), en cascada fila por fila vía
`animation-delay: calc(var(--row-i) * 30ms)`. `--row-i` lo setea el
`*ngFor` de cada página (`let i = index`, `[style.--row-i]="i"`) — no hay
JS de por medio, es CSS puro. Se desactiva completo bajo
`prefers-reduced-motion: reduce`.

Turnos (weekly-view y monthly-view) no usa `.app-table` — su paleta y
estructura son del dominio de Turnos, no del patrón de tabla genérico —
pero repite el mismo mecanismo (`--row-i` + keyframe fade/translateY) a
mano en su propio CSS de componente, para que ninguna vista de la app se
sienta distinta al cargar.

### Loading

Mientras la data no llegó, cada tabla muestra `skeletonRows` (un
`Array.from({length: 5})`) con `<app-skeleton>` del mismo ancho que el
contenido real esperado — no un spinner centrado tapando la tabla. Ya
estaba así antes del agregado de ordenamiento/animación; se mantiene igual.

### Paginación

Hoy ninguna de las 6 tablas pagina de verdad (todas traen el dataset
completo del backend y filtran/ordenan en cliente). El slot
`[table-footer]` de `TableShell` ya existe para esto — cuando haga falta
paginar (dataset grande), el control de página va ahí, con el mismo look
que ya usan Colaboradores/Empresas para "mostrar deshabilitados": pill
`bg-white border border-line rounded-lg`, no reinventar un componente de
paginación aparte todavía.

## Cómo armar una tabla CRUD nueva (checklist)

1. Envolver el `<table>` en `<app-table-shell>`, clase `app-table` en la
   tabla (no `w-full` — ya lo trae `.app-table`).
2. Cada columna ordenable: `<app-sort-header [active]="sort.field==='x'"
   [direction]="sort.direction" (sort)="onSort('x')">Label</app-sort-header>`
   adentro del `<th>`. Columnas de ícono/acciones no lo llevan.
3. En el componente: `sort: SortState<'campo1'|'campo2'> = { field: '...',
   direction: 'asc' }`, un `onSort(field)` que llama `nextSortState` +
   reordena, y reordenar también justo después de cargar los datos.
4. En el `*ngFor` de filas: `let i = index` + `[style.--row-i]="i"` para la
   animación de entrada.
5. Importar `SortHeaderComponent` en el array `imports` del `@Component`
   (todas las páginas son standalone).

## Fuera de alcance (documentado a propósito)

- **Turno partido** en las vistas de calendario: deuda ya documentada en el
  plan de mantenibilidad, no se toca acá.
- **`.nunito` / `.quicksand` / `.poiret-one`**: acentos legacy puntuales,
  no se migran a Inter salvo que Jose pida ese rediseño específico.
- **Paginación real**: diseño reservado (`[table-footer]`), sin implementar
  hasta que un dataset lo necesite.
