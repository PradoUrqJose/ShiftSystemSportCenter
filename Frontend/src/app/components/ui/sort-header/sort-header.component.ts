
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { SortDirection } from '../../../utils/table-sort.util';

// Header de columna ordenable, para usar adentro de un <th> de cualquier
// tabla envuelta en <app-table-shell>. Puramente presentacional (mismo
// criterio que TableShell/Avatar/Badge): no sabe ordenar nada, solo pinta
// la etiqueta + flechita y avisa con (sort) — la página dueña de los datos
// decide qué hacer (ver table-sort.util.ts).
@Component({
    selector: 'app-sort-header',
    imports: [],
    templateUrl: './sort-header.component.html',
    styleUrls: ['./sort-header.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SortHeaderComponent {
  @Input() active = false;
  @Input() direction: SortDirection = 'asc';
  @Output() sort = new EventEmitter<void>();
}
