import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';

import { ExportExcelComponent, ExportSheet } from '../../../components/export-excel/export-excel.component';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { EmptyStateComponent } from '../../../components/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../components/ui/skeleton/skeleton.component';
import { Empresa, EmpresaService } from '../../../services/empresa.service';
import {
  ExcepcionReporte,
  ReporteExcepciones,
  ReporteService,
  SeveridadExcepcion,
} from '../../../services/reporte.service';
import { CalendarioService } from '../../../services/calendario.service';
import { formatearFechaLocal } from '../colaborador-profile/colaborador-analytics.util';

interface OpcionRegla {
  codigo: string;
  etiqueta: string;
}

@Component({
  selector: 'app-excepciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ExportExcelComponent,
    ButtonComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './excepciones.component.html',
  styleUrl: './excepciones.component.css',
})
export class ExcepcionesComponent implements OnInit, OnDestroy {
  readonly skeletonRows = Array.from({ length: 6 });
  readonly severidades: { valor: SeveridadExcepcion | ''; etiqueta: string }[] = [
    { valor: '', etiqueta: 'Todas las severidades' },
    { valor: 'ERROR', etiqueta: 'Errores de datos' },
    { valor: 'RIESGO', etiqueta: 'Riesgos por conciliar' },
    { valor: 'ADVERTENCIA', etiqueta: 'Advertencias' },
    { valor: 'INFORMACION', etiqueta: 'Información' },
  ];

  desde = formatearFechaLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  hasta = formatearFechaLocal(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  empresaId: number | null = null;
  umbralHorasDiarias = 8;
  umbralJornadaExtrema = 12;
  horizonteDias = 90;
  severidad: SeveridadExcepcion | '' = '';
  regla = '';

  empresas: Empresa[] = [];
  reporte: ReporteExcepciones | null = null;
  cargando = false;
  yaBuscado = false;
  errorMessage: string | null = null;

  private readonly destroy$ = new Subject<void>();
  private request?: Subscription;

  constructor(
    private readonly reporteService: ReporteService,
    private readonly empresaService: EmpresaService,
    private readonly calendarioService: CalendarioService,
  ) {}

  ngOnInit(): void {
    this.empresaService.getEmpresas().pipe(takeUntil(this.destroy$)).subscribe({
      next: empresas => (this.empresas = empresas),
    });
    this.buscar();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  buscar(): void {
    this.errorMessage = this.validarFiltros();
    if (this.errorMessage) {
      this.reporte = null;
      this.yaBuscado = true;
      return;
    }

    this.request?.unsubscribe();
    this.cargando = true;
    this.errorMessage = null;
    this.request = this.reporteService.getExcepciones(
      this.desde,
      this.hasta,
      this.empresaId ?? undefined,
      this.umbralHorasDiarias,
      this.umbralJornadaExtrema,
      this.horizonteDias,
    ).subscribe({
      next: reporte => {
        this.reporte = reporte;
        this.cargando = false;
        this.yaBuscado = true;
        this.normalizarFiltrosResultado();
      },
      error: () => {
        this.reporte = null;
        this.cargando = false;
        this.yaBuscado = true;
        this.errorMessage = 'No se pudo generar el reporte. Revisa los filtros e intenta nuevamente.';
      },
    });
  }

  get excepcionesFiltradas(): ExcepcionReporte[] {
    const excepciones = this.reporte?.excepciones ?? [];
    return excepciones.filter(excepcion =>
      (!this.severidad || excepcion.severidad === this.severidad)
      && (!this.regla || excepcion.codigo === this.regla));
  }

  get reglas(): OpcionRegla[] {
    const unicas = new Map<string, string>();
    (this.reporte?.excepciones ?? []).forEach(excepcion => unicas.set(excepcion.codigo, excepcion.titulo));
    return Array.from(unicas, ([codigo, etiqueta]) => ({ codigo, etiqueta }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  }

  get totalHallazgos(): number {
    return this.reporte?.excepciones.length ?? 0;
  }

  get hojasExport(): ExportSheet[] {
    return [{
      name: 'Excepciones',
      columns: [
        { key: 'severidad', label: 'Severidad' },
        { key: 'regla', label: 'Regla' },
        { key: 'colaborador', label: 'Colaborador' },
        { key: 'dni', label: 'DNI' },
        { key: 'empresa', label: 'Empresa' },
        { key: 'desde', label: 'Desde' },
        { key: 'hasta', label: 'Hasta' },
        { key: 'horas', label: 'Horas programadas' },
        { key: 'turnos', label: 'Turnos involucrados' },
        { key: 'detalle', label: 'Qué revisar' },
      ],
      data: this.excepcionesFiltradas.map(excepcion => ({
        severidad: this.etiquetaSeveridad(excepcion.severidad),
        regla: excepcion.titulo,
        colaborador: excepcion.nombreColaborador,
        dni: excepcion.dni ?? '',
        empresa: excepcion.nombreEmpresa,
        desde: excepcion.fechaInicio ?? '',
        hasta: excepcion.fechaFin ?? '',
        horas: excepcion.horasProgramadas ?? '',
        turnos: excepcion.turnoIds.join(', '),
        detalle: excepcion.detalle,
      })),
    }];
  }

  get nombreArchivoExport(): string {
    return `excepciones-${this.desde}-${this.hasta}`;
  }

  etiquetaSeveridad(severidad: SeveridadExcepcion): string {
    return ({
      ERROR: 'Error de datos',
      RIESGO: 'Requiere conciliación',
      ADVERTENCIA: 'Advertencia',
      INFORMACION: 'Información',
    })[severidad];
  }

  formatearHoras(horas: number | null): string {
    return horas == null ? '—' : this.calendarioService.formatearHoras(horas);
  }

  rangoFecha(excepcion: ExcepcionReporte): string {
    if (!excepcion.fechaInicio) return 'Sin fecha';
    if (!excepcion.fechaFin || excepcion.fechaFin === excepcion.fechaInicio) {
      return this.formatearFecha(excepcion.fechaInicio);
    }
    return `${this.formatearFecha(excepcion.fechaInicio)} – ${this.formatearFecha(excepcion.fechaFin)}`;
  }

  trackByExcepcion(index: number, excepcion: ExcepcionReporte): string {
    return `${excepcion.codigo}-${excepcion.colaboradorId}-${excepcion.fechaInicio}-${excepcion.turnoIds.join('.')}-${index}`;
  }

  private validarFiltros(): string | null {
    if (!this.desde || !this.hasta) return 'Selecciona ambas fechas.';
    if (this.desde > this.hasta) return 'La fecha inicial no puede ser posterior a la final.';
    if (this.umbralHorasDiarias <= 0) return 'El umbral diario debe ser mayor que cero.';
    if (this.umbralJornadaExtrema <= this.umbralHorasDiarias) {
      return 'El umbral extremo debe ser mayor que el umbral diario.';
    }
    if (this.horizonteDias < 1 || this.horizonteDias > 365) {
      return 'El horizonte debe estar entre 1 y 365 días.';
    }
    return null;
  }

  private normalizarFiltrosResultado(): void {
    if (this.severidad && !this.reporte?.excepciones.some(e => e.severidad === this.severidad)) {
      this.severidad = '';
    }
    if (this.regla && !this.reporte?.excepciones.some(e => e.codigo === this.regla)) {
      this.regla = '';
    }
  }

  private formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }
}
