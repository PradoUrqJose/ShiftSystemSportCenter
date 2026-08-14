import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ExportExcelComponent, ExportColumn } from '../../../components/export-excel/export-excel.component';
import { ReporteService } from '../../../services/reporte.service';
import { CalendarioService } from '../../../services/calendario.service';
import { Turno } from '../../../services/turno.service';
import { ReporteFiltrosService } from '../../../services/reporte-filtros.service';
import { Subject, takeUntil } from 'rxjs';

// TurnoDTO del backend + el apellido, agregado acá cruzando con la lista de
// colaboradores (el reporte solo trae el nombre).
type ReporteTurnoFeriado = Turno & { apellido: string };

@Component({
  selector: 'app-turnos-feriados',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, ExportExcelComponent],
  templateUrl: './turnos-feriados.component.html',
  styleUrls: ['./turnos-feriados.component.css'],
  // Instancia propia de ReporteFiltrosService para esta página (no singleton
  // de root) — ver el comentario en el servicio.
  providers: [ReporteFiltrosService],
})
export class TurnosFeriadosComponent implements OnInit, OnDestroy {
  reportes: ReporteTurnoFeriado[] = [];
  exportColumns: ExportColumn[] = [
    { key: 'nombreColaborador', label: 'Colaborador' },
    { key: 'dniColaborador', label: 'DNI' },
    { key: 'nombreEmpresa', label: 'Empresa' },
    { key: 'nombreTienda', label: 'Tienda' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'horaEntrada', label: 'Ingreso' },
    { key: 'horaSalida', label: 'Salida' },
    { key: 'horasTotalesSemana', label: 'Horas en Feriado' },
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

    this.reporteService
      .getTurnosFeriados(this.filtros.fechaInicio, this.filtros.fechaFin, this.filtros.colaboradoresSeleccionados)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.reportes = data.map((reporte) => {
            const colaborador = this.filtros.colaboradores.find((c) => c.id === reporte.colaboradorId);
            return { ...reporte, apellido: colaborador ? colaborador.apellido : 'Desconocido' };
          });
          this.filtros.errorMessage = null;
        },
        error: () => {
          this.filtros.errorMessage = 'Error al obtener el reporte de turnos en feriados.';
          this.reportes = [];
        }
      });
  }

  formatearHora(hora: string | undefined): string {
    const horasTotales = hora ? parseFloat(hora) : 0;
    return this.calendarioService.formatearHoras(horasTotales);
  }

  formatearHorasFeriado(reporte: ReporteTurnoFeriado): string {
    // Las horas en feriados están en horasTotalesSemana (calculadas en el backend)
    return this.calendarioService.formatearHoras(reporte.horasTotalesSemana ?? 0);
  }

  calcularTotalHorasFeriados(): string {
    const totalHorasFeriados = this.reportes.reduce((total, reporte) => total + (reporte.horasTotalesSemana ?? 0), 0);
    return this.calendarioService.formatearHoras(totalHorasFeriados);
  }

  obtenerNumerosDeTienda(nombreTienda: string | undefined): string {
    return (nombreTienda ?? '').replace(/[^0-9]/g, '');
  }

  trackByReporte(_index: number, reporte: ReporteTurnoFeriado): string {
    return `${reporte.colaboradorId}-${reporte.fecha}-${reporte.horaEntrada}`;
  }
}
