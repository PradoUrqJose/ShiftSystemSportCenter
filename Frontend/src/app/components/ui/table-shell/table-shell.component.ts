
import { ChangeDetectionStrategy, Component } from '@angular/core';

// Envoltorio visual de composición para las tablas CRUD (Fase 3) y de
// reportes (Fase 4) — a propósito NO es un <app-data-table> genérico de
// datos: no sabe de columnas, filas ni ordenamiento, solo da el marco
// (tarjeta redondeada, slot de toolbar, scroll horizontal contenido, slot
// de pie/paginación). Cada página sigue armando su propio <table> adentro
// vía content projection; el hover de fila y el resto de la semántica de
// datos quedan del lado del consumidor (evita ::ng-deep entre componentes).
@Component({
    selector: 'app-table-shell',
    imports: [],
    templateUrl: './table-shell.component.html',
    styleUrls: ['./table-shell.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableShellComponent {}
