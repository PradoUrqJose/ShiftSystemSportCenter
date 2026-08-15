
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SkeletonComponent } from '../skeleton/skeleton.component';

// Grilla-fantasma con la forma real de la vista semanal de turnos
// (avatar+nombre a la izquierda, una pill por día) — reemplaza el spinner
// .sk-circle genérico. Extraído de turnos.component.html (Fase 2) porque
// semana-normal.component.html (Fase 4) es la misma tabla WeeklyView con
// otro origen de datos y necesitaba el mismo loading state; vivía repetido
// a mano en las 2 páginas.
@Component({
    selector: 'app-weekly-schedule-skeleton',
    imports: [SkeletonComponent],
    templateUrl: './weekly-schedule-skeleton.component.html',
    styleUrls: ['./weekly-schedule-skeleton.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeeklyScheduleSkeletonComponent {
  @Input() rows: number = 6;
  @Input() cols: number = 7;

  get rowsArray(): unknown[] {
    return Array.from({ length: this.rows });
  }

  get colsArray(): unknown[] {
    return Array.from({ length: this.cols });
  }
}
