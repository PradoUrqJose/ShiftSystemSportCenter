import { Component, OnDestroy, OnInit } from '@angular/core';
import { ReporteService } from '../../../services/reporte.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarioService } from '../../../services/calendario.service';
import { Colaborador, ColaboradorService } from '../../../services/colaborador.service';
import { NgLabelTemplateDirective, NgOptionTemplateDirective, NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { ExportExcelComponent, ExportColumn } from '../../../components/export-excel/export-excel.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-horas-trabajadas',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, ExportExcelComponent],
  templateUrl: './horas-trabajadas.component.html',
  styleUrl: './horas-trabajadas.component.css'
})
export class HorasTrabajadasComponent implements OnInit, OnDestroy {
  reportes: any[] = [];
  fechaInicio: string = '';
  fechaFin: string = '';
  colaboradores: Colaborador[] = [];
  colaboradoresSeleccionados: number[] = []; // Ahora solo almacena IDs
  errorMessage: string | null = null;
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
  // Filtros adicionales
  empresas: { id: number; nombre: string }[] = [];
  empresaSeleccionada: number | 'all' = 'all';
  estadoSeleccionado: 'all' | true | false = 'all';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private reporteService: ReporteService,
    private calendarioService: CalendarioService,
    private colaboradorService: ColaboradorService,
  ) { }

  ngOnInit(): void {
    this.setFechasMesActual();
    this.getColaboradores();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.colaboradorService.getColaboradores().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.colaboradores = data;
        const mapa = new Map<number, string>();
        data.forEach(c => { if (c.empresaId) mapa.set(c.empresaId, c.empresaNombre); });
        this.empresas = [{ id: -1, nombre: 'Todas las empresas' }, ...Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre: nombre || 'Sin Empresa' }))];
      },
      error: () => {
        this.errorMessage = 'Error al obtener colaboradores.';
      },
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

  obtenerHorasTrabajadas() {
    if (!this.fechaInicio || !this.fechaFin) return;

    const colaboradoresIds = this.colaboradoresSeleccionados;

    this.reporteService.getHorasTrabajadas(this.fechaInicio, this.fechaFin, colaboradoresIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // 🔥 Fusionar datos del reporte con los colaboradores para agregar apellidos
          this.reportes = data.map(reporte => {
            const colaborador = this.colaboradores.find(c => c.id === reporte.colaboradorId);
            return {
              ...reporte,
              apellido: colaborador ? colaborador.apellido : "Desconocido" // 🛠 Agrega el apellido si existe
            };
          });
        }
      });
  }

  formatearHora(hora: string | undefined): string {
    if (!hora) return '';
    const partes = hora.split(':');
    return partes.length >= 2 ? `${partes[0]}:${partes[1]}` : hora;
  }

  formatearHorasTrabajadas(horas: number | string): string {
    const horasTotales = typeof horas === 'string' ? parseFloat(horas) : horas;
    return this.calendarioService.formatearHoras(horasTotales);
  }

  calcularTotalHoras(): string {
    const totalHoras = this.reportes.reduce((total, reporte) => total + (parseFloat(reporte.horasTrabajadas) || 0), 0);
    return this.calendarioService.formatearHoras(totalHoras);
  }

  obtenerNumerosDeTienda(nombreTienda: string): string {
    return nombreTienda.replace(/[^0-9]/g, '');
  }

  trackByEmpresaId(_index: number, empresa: { id: number }): number {
    return empresa.id;
  }

  trackByReporte(_index: number, reporte: any): string {
    return `${reporte.colaboradorId}-${reporte.fecha}-${reporte.horaEntrada}`;
  }

}
