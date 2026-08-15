import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportExcelComponent, ExportColumn } from '../../../components/export-excel/export-excel.component';
import { ReporteService } from '../../../services/reporte.service';
import { CalendarioService } from '../../../services/calendario.service';
import { Turno } from '../../../services/turno.service';
import { ReporteFiltrosService } from '../../../services/reporte-filtros.service';
import { ReporteFiltrosToolbarComponent } from '../../../components/reporte-filtros-toolbar/reporte-filtros-toolbar.component';
import { TableShellComponent } from '../../../components/ui/table-shell/table-shell.component';
import { EmptyStateComponent } from '../../../components/ui/empty-state/empty-state.component';
import { Subject, takeUntil } from 'rxjs';
import { SortHeaderComponent } from '../../../components/ui/sort-header/sort-header.component';
import { SortState, nextSortState, sortRows } from '../../../utils/table-sort.util';

// TurnoDTO del backend + el apellido, agregado acá cruzando con la lista de
// colaboradores (el reporte solo trae el nombre).
type ReporteTurnoFeriado = Turno & { apellido: string };

type ReporteFeriadoSortField = 'nombreColaborador' | 'dniColaborador' | 'nombreEmpresa' | 'nombreTienda' | 'fecha' | 'horaEntrada' | 'horaSalida' | 'horasTrabajadas';

const REPORTE_FERIADO_SORT_SELECTORS: Record<ReporteFeriadoSortField, (r: ReporteTurnoFeriado) => unknown> = {
  nombreColaborador: (r) => `${r.nombreColaborador} ${r.apellido}`,
  dniColaborador: (r) => r.dniColaborador,
  nombreEmpresa: (r) => r.nombreEmpresa,
  nombreTienda: (r) => r.nombreTienda,
  fecha: (r) => r.fecha,
  horaEntrada: (r) => r.horaEntrada,
  horaSalida: (r) => r.horaSalida,
  horasTrabajadas: (r) => r.horasTrabajadas,
};

@Component({
  selector: 'app-turnos-feriados',
  standalone: true,
  imports: [CommonModule, ExportExcelComponent, ReporteFiltrosToolbarComponent, TableShellComponent, EmptyStateComponent, SortHeaderComponent],
  templateUrl: './turnos-feriados.component.html',
  styleUrls: ['./turnos-feriados.component.css'],
  // Instancia propia de ReporteFiltrosService para esta página (no singleton
  // de root) — ver el comentario en el servicio.
  providers: [ReporteFiltrosService],
})
export class TurnosFeriadosComponent implements OnInit, OnDestroy {
  reportes: ReporteTurnoFeriado[] = [];
  buscando: boolean = false;
  sort: SortState<ReporteFeriadoSortField> = { field: 'fecha', direction: 'desc' };
  exportColumns: ExportColumn[] = [
    { key: 'nombreColaborador', label: 'Colaborador' },
    { key: 'dniColaborador', label: 'DNI' },
    { key: 'nombreEmpresa', label: 'Empresa' },
    { key: 'nombreTienda', label: 'Tienda' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'horaEntrada', label: 'Ingreso' },
    { key: 'horaSalida', label: 'Salida' },
    { key: 'horasTrabajadas', label: 'Horas en Feriado' },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    public filtros: ReporteFiltrosService,
    private reporteService: ReporteService,
    private calendarioService: CalendarioService,
  ) { }

  ngOnInit(): void {
    this.filtros.inicializar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  obtenerTurnosFeriados(): void {
    if (!this.filtros.fechaInicio || !this.filtros.fechaFin) {
      this.filtros.errorMessage = 'Por favor, seleccione un rango de fechas.';
      return;
    }

    this.buscando = true;
    this.reporteService
      .getTurnosFeriados(this.filtros.fechaInicio, this.filtros.fechaFin, this.filtros.colaboradoresSeleccionados)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.reportes = data.map((reporte) => {
            const colaborador = this.filtros.colaboradores.find((c) => c.id === reporte.colaboradorId);
            return { ...reporte, apellido: colaborador ? colaborador.apellido : 'Desconocido' };
          });
          this.aplicarOrden();
          this.filtros.errorMessage = null;
          this.buscando = false;
        },
        error: () => {
          this.filtros.errorMessage = 'Error al obtener el reporte de turnos en feriados.';
          this.reportes = [];
          this.buscando = false;
        }
      });
  }

  onSort(field: ReporteFeriadoSortField): void {
    this.sort = nextSortState(this.sort, field);
    this.aplicarOrden();
  }

  private aplicarOrden(): void {
    this.reportes = sortRows(this.reportes, REPORTE_FERIADO_SORT_SELECTORS[this.sort.field], this.sort.direction);
  }

  formatearHora(hora: string | undefined): string {
    const horasTotales = hora ? parseFloat(hora) : 0;
    return this.calendarioService.formatearHoras(horasTotales);
  }

  formatearHorasFeriado(reporte: ReporteTurnoFeriado): string {
    // Horas trabajadas en ese turno feriado puntual (no el acumulado del
    // colaborador: ese vive en horasTotalesSemana y sumarlo por fila
    // multiplicaba el total cuando un colaborador tenía varios turnos
    // feriados en el rango).
    return this.calendarioService.formatearHoras(reporte.horasTrabajadas ?? 0);
  }

  calcularTotalHorasFeriados(): string {
    const totalHorasFeriados = this.reportes.reduce((total, reporte) => total + (reporte.horasTrabajadas ?? 0), 0);
    return this.calendarioService.formatearHoras(totalHorasFeriados);
  }

  obtenerNumerosDeTienda(nombreTienda: string | undefined): string {
    return (nombreTienda ?? '').replace(/[^0-9]/g, '');
  }

  trackByReporte(_index: number, reporte: ReporteTurnoFeriado): string {
    return `${reporte.colaboradorId}-${reporte.fecha}-${reporte.horaEntrada}`;
  }
}
