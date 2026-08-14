import { Component, OnDestroy, OnInit } from '@angular/core';
import { ReporteService } from '../../../services/reporte.service';
import { CommonModule } from '@angular/common';
import { CalendarioService } from '../../../services/calendario.service';
import { Turno } from '../../../services/turno.service';
import { ExportExcelComponent, ExportColumn } from '../../../components/export-excel/export-excel.component';
import { ReporteFiltrosService } from '../../../services/reporte-filtros.service';
import { ReporteFiltrosToolbarComponent } from '../../../components/reporte-filtros-toolbar/reporte-filtros-toolbar.component';
import { TableShellComponent } from '../../../components/ui/table-shell/table-shell.component';
import { EmptyStateComponent } from '../../../components/ui/empty-state/empty-state.component';
import { Subject, takeUntil } from 'rxjs';

// TurnoDTO del backend + el apellido, que se agrega acá mismo cruzando con
// la lista de colaboradores (el reporte solo trae el nombre).
type ReporteHoras = Turno & { apellido: string };

@Component({
  selector: 'app-horas-trabajadas',
  standalone: true,
  imports: [CommonModule, ExportExcelComponent, ReporteFiltrosToolbarComponent, TableShellComponent, EmptyStateComponent],
  templateUrl: './horas-trabajadas.component.html',
  styleUrl: './horas-trabajadas.component.css',
  // Instancia propia de ReporteFiltrosService para esta página (no singleton
  // de root) — ver el comentario en el servicio.
  providers: [ReporteFiltrosService],
})
export class HorasTrabajadasComponent implements OnInit, OnDestroy {
  reportes: ReporteHoras[] = [];
  buscando: boolean = false;
  exportColumns: ExportColumn[] = [
    { key: 'nombreColaborador', label: 'Colaborador' },
    { key: 'dniColaborador', label: 'DNI' },
    { key: 'nombreEmpresa', label: 'Empresa' },
    { key: 'nombreTienda', label: 'Tienda' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'horaEntrada', label: 'Ingreso' },
    { key: 'horaSalida', label: 'Salida' },
    { key: 'horasTrabajadas', label: 'SubTotal' },
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

  obtenerHorasTrabajadas(): void {
    if (!this.filtros.fechaInicio || !this.filtros.fechaFin) return;

    this.buscando = true;
    this.reporteService
      .getHorasTrabajadas(this.filtros.fechaInicio, this.filtros.fechaFin, this.filtros.colaboradoresSeleccionados)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.reportes = data.map((reporte) => {
            const colaborador = this.filtros.colaboradores.find((c) => c.id === reporte.colaboradorId);
            return { ...reporte, apellido: colaborador ? colaborador.apellido : 'Desconocido' };
          });
          this.buscando = false;
        },
        error: () => {
          this.buscando = false;
        },
      });
  }

  formatearHora(hora: string | undefined): string {
    if (!hora) return '';
    const partes = hora.split(':');
    return partes.length >= 2 ? `${partes[0]}:${partes[1]}` : hora;
  }

  formatearHorasTrabajadas(horas: number | string | undefined): string {
    const horasTotales = typeof horas === 'string' ? parseFloat(horas) : (horas ?? 0);
    return this.calendarioService.formatearHoras(horasTotales);
  }

  calcularTotalHoras(): string {
    const totalHoras = this.reportes.reduce((total, reporte) => total + (reporte.horasTrabajadas ?? 0), 0);
    return this.calendarioService.formatearHoras(totalHoras);
  }

  obtenerNumerosDeTienda(nombreTienda: string | undefined): string {
    return (nombreTienda ?? '').replace(/[^0-9]/g, '');
  }

  trackByReporte(_index: number, reporte: ReporteHoras): string {
    return `${reporte.colaboradorId}-${reporte.fecha}-${reporte.horaEntrada}`;
  }
}
