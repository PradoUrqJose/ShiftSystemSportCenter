import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ExportExcelComponent, ExportColumn } from '../../../components/export-excel/export-excel.component';
import { ReporteService } from '../../../services/reporte.service';
import { CalendarioService } from '../../../services/calendario.service';
import { ColaboradorService, Colaborador } from '../../../services/colaborador.service';

@Component({
  selector: 'app-turnos-feriados',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, ExportExcelComponent],
  templateUrl: './turnos-feriados.component.html',
  styleUrls: ['./turnos-feriados.component.css']
})
export class TurnosFeriadosComponent implements OnInit {
  reportes: any[] = [];
  fechaInicio: string = '';
  fechaFin: string = '';
  colaboradores: Colaborador[] = [];
  colaboradoresSeleccionados: number[] = []; // Almacena IDs de colaboradores seleccionados
  errorMessage: string | null = null;
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
  empresas: { id: number; nombre: string }[] = [];
  empresaSeleccionada: number | 'all' = 'all';
  estadoSeleccionado: 'all' | true | false = 'all';

  constructor(
    private reporteService: ReporteService,
    private calendarioService: CalendarioService,
    private colaboradorService: ColaboradorService
  ) { }

  ngOnInit(): void {
    this.setFechasMesActual();
    this.getColaboradores();
  }

  private setFechasMesActual(): void {
    const hoy = new Date();
    const first = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const last = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    this.fechaInicio = this.formatDate(first);
    this.fechaFin = this.formatDate(last);
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  getColaboradores(): void {
    this.colaboradorService.getColaboradores().subscribe({
      next: (data) => {
        this.colaboradores = data;
        const mapa = new Map<number, string>();
        data.forEach(c => { if (c.empresaId) mapa.set(c.empresaId, c.empresaNombre); });
        this.empresas = [{ id: -1, nombre: 'Todas las empresas' }, ...Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre: nombre || 'Sin Empresa' }))];
      },
      error: () => {
        this.errorMessage = 'Error al obtener colaboradores.';
      }
    });
  }

  toggleSelection(colaboradorId: number) {
    const index = this.colaboradoresSeleccionados.indexOf(colaboradorId);
    if (index === -1) {
      this.colaboradoresSeleccionados.push(colaboradorId);
    } else {
      this.colaboradoresSeleccionados.splice(index, 1);
    }
  }

  onEmpresaChange(): void {
    if (this.empresaSeleccionada === 'all' && this.estadoSeleccionado === 'all') {
      this.colaboradoresSeleccionados = [];
      return;
    }
    this.updateSelectionFromFilters();
  }

  onEstadoChange(): void {
    if (this.empresaSeleccionada === 'all' && this.estadoSeleccionado === 'all') {
      this.colaboradoresSeleccionados = [];
      return;
    }
    this.updateSelectionFromFilters();
  }

  private updateSelectionFromFilters(): void {
    const ids = this.colaboradores
      .filter(c => (this.empresaSeleccionada === 'all' || c.empresaId === this.empresaSeleccionada)
        && (this.estadoSeleccionado === 'all' || c.habilitado === this.estadoSeleccionado))
      .map(c => c.id);
    this.colaboradoresSeleccionados = ids;
  }

  obtenerTurnosFeriados() {
    if (!this.fechaInicio || !this.fechaFin) {
      this.errorMessage = 'Por favor, seleccione un rango de fechas.';
      return;
    }

    const colaboradoresIds = this.colaboradoresSeleccionados;

    this.reporteService.getTurnosFeriados(this.fechaInicio, this.fechaFin, colaboradoresIds)
      .subscribe({
        next: (data) => {
          // Fusionar datos con apellidos de colaboradores
          this.reportes = data.map(reporte => {
            const colaborador = this.colaboradores.find(c => c.id === reporte.colaboradorId);
            return {
              ...reporte,
              apellido: colaborador ? colaborador.apellido : "Desconocido"
            };
          });
          this.errorMessage = null;
        },
        error: (error) => {
          console.error("❌ Error al obtener reportes de turnos en feriados:", error);
          this.errorMessage = 'Error al obtener el reporte de turnos en feriados.';
          this.reportes = [];
        }
      });
  }

  formatearHora(hora: string | undefined): string {
    const horasTotales = hora ? parseFloat(hora) : 0;
    return this.calendarioService.formatearHoras(horasTotales);
  }

  formatearHorasFeriado(reporte: any): string {
    // Las horas en feriados están en horasTotalesSemana (calculadas en el backend)
    const horasFeriado = reporte.horasTotalesSemana || 0;
    return this.calendarioService.formatearHoras(horasFeriado);
  }

  calcularTotalHorasFeriados(): string {
    const totalHorasFeriados = this.reportes.reduce((total, reporte) => total + (reporte.horasTotalesSemana || 0), 0);
    return this.calendarioService.formatearHoras(totalHorasFeriados);
  }

  obtenerNumerosDeTienda(nombreTienda: string): string {
    return nombreTienda.replace(/[^0-9]/g, '');
  }
}
