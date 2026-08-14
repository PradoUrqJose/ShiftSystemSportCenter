import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ReporteFiltrosService } from '../../services/reporte-filtros.service';
import { ButtonComponent } from '../ui/button/button.component';

// Extraído de horas-trabajadas y turnos-feriados (Fase 4 del rediseño): las
// 2 páginas tenían este grid de filtros (fechas, empresa, estado,
// colaboradores) duplicado casi línea por línea. ReporteFiltrosService ya
// concentraba el estado/lógica — esto extrae el HTML/CSS que quedaba
// repetido encima.
//
// No sabe nada de exportar a Excel ni de qué hace "Buscar" con los datos:
// [toolbar-extra] proyecta el botón de exportar (columnas/nombre de archivo
// distintos por página) y (buscar) delega la búsqueda en sí al consumidor.
// [filtros] llega como referencia estable de ReporteFiltrosService (inyectado
// en el padre) — los cambios via ngModel disparan sus propios eventos DOM
// dentro de esta misma vista, así que OnPush no bloquea la actualización
// (mismo patrón ya probado en filter-bar.component.ts).
@Component({
  selector: 'app-reporte-filtros-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, ButtonComponent],
  templateUrl: './reporte-filtros-toolbar.component.html',
  styleUrls: ['./reporte-filtros-toolbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteFiltrosToolbarComponent {
  @Input({ required: true }) filtros!: ReporteFiltrosService;
  @Input() buscando: boolean = false;
  @Output() buscar = new EventEmitter<void>();
}
