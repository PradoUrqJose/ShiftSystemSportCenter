import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ReporteService, PreliquidacionMensual, DistribucionTienda } from '../../../services/reporte.service';
import { EmpresaService, Empresa } from '../../../services/empresa.service';
import { CalendarioService } from '../../../services/calendario.service';
import { ExportExcelComponent, ExportSheet } from '../../../components/export-excel/export-excel.component';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { BadgeComponent } from '../../../components/ui/badge/badge.component';
import { EmptyStateComponent } from '../../../components/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../components/ui/skeleton/skeleton.component';
import { SortState, nextSortState, sortRows } from '../../../utils/table-sort.util';

type PreliqSortField = 'apellido' | 'empresa' | 'dias' | 'horas' | 'feriado' | 'extra';

const SORT_SELECTORS: Record<PreliqSortField, (f: PreliquidacionMensual) => unknown> = {
  apellido: (f) => `${f.apellido} ${f.nombre}`,
  empresa: (f) => f.nombreEmpresa,
  dias: (f) => f.diasProgramados,
  horas: (f) => f.totalHorasMes,
  feriado: (f) => f.horasEnFeriados,
  extra: (f) => f.horasExtraCandidatas,
};

const MESES = [
  { valor: 1, nombre: 'Enero' },
  { valor: 2, nombre: 'Febrero' },
  { valor: 3, nombre: 'Marzo' },
  { valor: 4, nombre: 'Abril' },
  { valor: 5, nombre: 'Mayo' },
  { valor: 6, nombre: 'Junio' },
  { valor: 7, nombre: 'Julio' },
  { valor: 8, nombre: 'Agosto' },
  { valor: 9, nombre: 'Septiembre' },
  { valor: 10, nombre: 'Octubre' },
  { valor: 11, nombre: 'Noviembre' },
  { valor: 12, nombre: 'Diciembre' },
];

// Reporte de solo lectura, siempre recalculado a partir de los turnos del
// mes: no persiste estado ni observaciones (ver GET /api/reportes/preliquidacion).
// Diseño propio, sin reusar la composición toolbar+tabla de horas-trabajadas/
// turnos-feriados: filtro simple de mes/año/empresa, tira de totales, y un
// listado en el que cada fila lleva al perfil analítico del colaborador
// (/reportes/colaborador-profile) en vez de abrir un detalle propio.
@Component({
  selector: 'app-preliquidacion-mensual',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ExportExcelComponent,
    ButtonComponent,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './preliquidacion-mensual.component.html',
  styleUrl: './preliquidacion-mensual.component.css',
})
export class PreliquidacionMensualComponent implements OnInit, OnDestroy {
  readonly meses = MESES;
  readonly skeletonRows = Array.from({ length: 6 });

  mes: number = new Date().getMonth() + 1;
  anio: number = new Date().getFullYear();
  empresaId: number | null = null;
  empresas: Empresa[] = [];

  filas: PreliquidacionMensual[] = [];
  buscando = false;
  yaBuscado = false;
  errorMessage: string | null = null;
  sort: SortState<PreliqSortField> = { field: 'apellido', direction: 'asc' };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private reporteService: ReporteService,
    private empresaService: EmpresaService,
    private calendarioService: CalendarioService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.empresaService
      .getEmpresas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (empresas) => (this.empresas = empresas) });
    if (this.aplicarParametrosDeNavegacion()) this.buscar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buscar(): void {
    if (!this.mes || !this.anio) return;

    this.buscando = true;
    this.errorMessage = null;
    this.reporteService
      .getPreliquidacionMensual(this.mes, this.anio, this.empresaId ?? undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.filas = sortRows(data, SORT_SELECTORS[this.sort.field], this.sort.direction);
          this.buscando = false;
          this.yaBuscado = true;
        },
        error: () => {
          this.buscando = false;
          this.yaBuscado = true;
          this.errorMessage = 'No se pudo generar el reporte. Intenta de nuevo.';
        },
      });
  }

  ordenarPor(field: PreliqSortField): void {
    this.sort = nextSortState(this.sort, field);
    this.filas = sortRows(this.filas, SORT_SELECTORS[this.sort.field], this.sort.direction);
  }

  indicadorOrden(field: PreliqSortField): string {
    if (this.sort.field !== field) return '';
    return this.sort.direction === 'asc' ? ' ▲' : ' ▼';
  }

  formatearHoras(horas: number): string {
    return this.calendarioService.formatearHoras(horas);
  }

  formatearDistribucion(distribucion: DistribucionTienda[]): string {
    if (!distribucion || distribucion.length === 0) return '—';
    return distribucion.map((t) => `${t.nombreTienda}: ${this.formatearHoras(t.horas)}`).join(' · ');
  }

  get totalHoras(): number {
    return this.filas.reduce((acc, f) => acc + f.totalHorasMes, 0);
  }

  get totalHorasFeriado(): number {
    return this.filas.reduce((acc, f) => acc + f.horasEnFeriados, 0);
  }

  get totalHorasExtra(): number {
    return this.filas.reduce((acc, f) => acc + f.horasExtraCandidatas, 0);
  }

  get hojasExport(): ExportSheet[] {
    const resumen: ExportSheet = {
      name: 'Resumen',
      columns: [
        { key: 'dni', label: 'DNI' },
        { key: 'colaborador', label: 'Colaborador' },
        { key: 'empresa', label: 'Empresa' },
        { key: 'puesto', label: 'Puesto actual' },
        { key: 'dias', label: 'Días programados' },
        { key: 'horas', label: 'Horas totales' },
        { key: 'horasFeriado', label: 'Horas en feriado' },
        { key: 'horasExtra', label: 'Horas extra candidatas' },
        { key: 'turnosPartidos', label: 'Turnos partidos' },
        { key: 'tiendas', label: 'Distribución por tienda' },
      ],
      data: this.filas.map((f) => ({
        dni: f.dni,
        colaborador: `${f.nombre} ${f.apellido}`,
        empresa: f.nombreEmpresa,
        puesto: f.nombrePuesto,
        dias: f.diasProgramados,
        horas: f.totalHorasMes,
        horasFeriado: f.horasEnFeriados,
        horasExtra: f.horasExtraCandidatas,
        turnosPartidos: f.turnosPartidos,
        tiendas: this.formatearDistribucion(f.distribucionPorTienda),
      })),
    };

    const detalle: ExportSheet = {
      name: 'Detalle',
      columns: [
        { key: 'nombreColaborador', label: 'Colaborador' },
        { key: 'dniColaborador', label: 'DNI' },
        { key: 'nombreEmpresa', label: 'Empresa' },
        { key: 'nombreTienda', label: 'Tienda' },
        { key: 'fecha', label: 'Fecha' },
        { key: 'horaEntrada', label: 'Ingreso' },
        { key: 'horaSalida', label: 'Salida' },
        { key: 'horasTrabajadas', label: 'Horas' },
        { key: 'esFeriadoTexto', label: 'Feriado' },
      ],
      data: this.filas.flatMap((f) =>
        f.turnos.map((t) => ({ ...t, esFeriadoTexto: t.esFeriado ? 'Sí' : 'No' })),
      ),
    };

    return [resumen, detalle];
  }

  get nombreArchivoExport(): string {
    return `preliquidacion-${this.anio}-${String(this.mes).padStart(2, '0')}`;
  }

  get fechaInicioPeriodo(): string {
    return `${this.anio}-${String(this.mes).padStart(2, '0')}-01`;
  }

  get fechaFinPeriodo(): string {
    const ultimoDia = new Date(this.anio, this.mes, 0).getDate();
    return `${this.anio}-${String(this.mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  }

  trackByFila(_index: number, fila: PreliquidacionMensual): string {
    return `${fila.colaboradorId}-${fila.empresaId}`;
  }

  private aplicarParametrosDeNavegacion(): boolean {
    const params = this.route.snapshot.queryParamMap;
    if (!params.has('mes') || !params.has('anio')) return false;
    const mes = Number(params.get('mes'));
    const anio = Number(params.get('anio'));
    const empresaId = Number(params.get('empresaId'));
    if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      return false;
    }
    this.mes = mes;
    this.anio = anio;
    if (Number.isInteger(empresaId) && empresaId > 0) this.empresaId = empresaId;
    return true;
  }
}
