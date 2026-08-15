import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { forkJoin, Subject, Subscription, takeUntil } from 'rxjs';

import { ExportExcelComponent, ExportSheet } from '../../../components/export-excel/export-excel.component';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { EmptyStateComponent } from '../../../components/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../components/ui/skeleton/skeleton.component';
import { Colaborador, ColaboradorService } from '../../../services/colaborador.service';
import { Empresa, EmpresaService } from '../../../services/empresa.service';
import { ProgramacionContable, ReporteService } from '../../../services/reporte.service';
import { formatearFechaLocal } from '../colaborador-profile/colaborador-analytics.util';

@Component({
  selector: 'app-exportacion-contable',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, ExportExcelComponent, ButtonComponent, EmptyStateComponent, SkeletonComponent],
  templateUrl: './exportacion-contable.component.html',
})
export class ExportacionContableComponent implements OnInit, OnDestroy {
  readonly skeletonRows = Array.from({ length: 4 });

  desde = formatearFechaLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  hasta = formatearFechaLocal(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  empresaId: number | null = null;
  colaboradoresSeleccionados: number[] = [];
  empresas: Empresa[] = [];
  colaboradores: Colaborador[] = [];
  reporte: ProgramacionContable | null = null;
  cargando = false;
  errorMessage: string | null = null;

  private readonly destroy$ = new Subject<void>();
  private request?: Subscription;

  constructor(
    private readonly reporteService: ReporteService,
    private readonly empresaService: EmpresaService,
    private readonly colaboradorService: ColaboradorService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      empresas: this.empresaService.getEmpresas(),
      colaboradores: this.colaboradorService.getColaboradores(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ empresas, colaboradores }) => {
        this.empresas = empresas;
        this.colaboradores = colaboradores;
      },
      error: () => (this.errorMessage = 'No se pudieron cargar las opciones de empresa y trabajadores.'),
    });
    this.generar();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  generar(): void {
    this.errorMessage = this.validar();
    if (this.errorMessage) {
      this.reporte = null;
      return;
    }

    this.request?.unsubscribe();
    this.cargando = true;
    this.request = this.reporteService.getProgramacionContable(
      this.desde,
      this.hasta,
      this.empresaId ?? undefined,
      this.colaboradoresSeleccionados,
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: reporte => {
        this.reporte = reporte;
        this.cargando = false;
      },
      error: () => {
        this.reporte = null;
        this.cargando = false;
        this.errorMessage = 'No se pudo preparar la exportación. Revisa los filtros e intenta nuevamente.';
      },
    });
  }

  get nombreEmpresa(): string {
    return this.empresas.find(empresa => empresa.id === this.empresaId)?.nombre ?? 'Todas las empresas';
  }

  get alcanceTrabajadores(): string {
    if (this.colaboradoresSeleccionados.length === 0) return 'Todos los trabajadores';
    if (this.colaboradoresSeleccionados.length === 1) return '1 trabajador seleccionado';
    return `${this.colaboradoresSeleccionados.length} trabajadores seleccionados`;
  }

  get nombreArchivo(): string {
    return `programacion-contable-${this.desde}-${this.hasta}`;
  }

  get hojasExport(): ExportSheet[] {
    if (!this.reporte) return [];
    const decimal = '0.00';
    return [
      {
        name: 'Resumen por trabajador',
        columns: [
          { key: 'desde', label: 'Desde', width: 12 },
          { key: 'hasta', label: 'Hasta', width: 12 },
          { key: 'dni', label: 'DNI', width: 12 },
          { key: 'trabajador', label: 'Trabajador', width: 28 },
          { key: 'empresa', label: 'Empresa histórica', width: 28 },
          { key: 'ruc', label: 'RUC', width: 14 },
          { key: 'dias', label: 'Días programados', width: 16 },
          { key: 'turnos', label: 'Cantidad de turnos', width: 18 },
          { key: 'horasRegulares', label: 'Horas regulares', width: 16, numFmt: decimal },
          { key: 'horasFeriado', label: 'Horas en feriado', width: 16, numFmt: decimal },
          { key: 'horasTotales', label: 'Horas programadas', width: 18, numFmt: decimal },
          { key: 'horasSobreUmbral', label: `Horas sobre ${this.reporte.umbralHorasDiarias.toFixed(2)} h (referencial)`, width: 28, numFmt: decimal },
          { key: 'turnosPartidos', label: 'Días con turno partido', width: 22 },
        ],
        data: this.reporte.resumen.map(fila => ({
          desde: this.reporte!.desde,
          hasta: this.reporte!.hasta,
          dni: fila.dni,
          trabajador: `${fila.apellido}, ${fila.nombre}`,
          empresa: fila.nombreEmpresa,
          ruc: fila.rucEmpresa,
          dias: fila.diasProgramados,
          turnos: fila.cantidadTurnos,
          horasRegulares: this.redondear(fila.horasRegulares),
          horasFeriado: this.redondear(fila.horasEnFeriado),
          horasTotales: this.redondear(fila.totalHorasProgramadas),
          horasSobreUmbral: this.redondear(fila.horasSobreUmbralDiario),
          turnosPartidos: fila.diasConTurnoPartido,
        })),
      },
      {
        name: 'Detalle de turnos',
        columns: [
          { key: 'turnoId', label: 'ID turno', width: 11 },
          { key: 'dni', label: 'DNI', width: 12 },
          { key: 'trabajador', label: 'Trabajador', width: 28 },
          { key: 'empresa', label: 'Empresa histórica', width: 28 },
          { key: 'ruc', label: 'RUC', width: 14 },
          { key: 'tienda', label: 'Tienda', width: 24 },
          { key: 'fecha', label: 'Fecha', width: 12 },
          { key: 'entrada', label: 'Entrada', width: 10 },
          { key: 'salida', label: 'Salida', width: 10 },
          { key: 'horas', label: 'Horas programadas decimales', width: 26, numFmt: decimal },
          { key: 'almuerzo', label: 'Descuento de almuerzo', width: 22 },
          { key: 'feriado', label: 'Feriado', width: 11 },
          { key: 'partido', label: 'Turno partido', width: 15 },
        ],
        data: this.reporte.turnos.map(turno => ({
          turnoId: turno.turnoId,
          dni: turno.dni,
          trabajador: `${turno.apellido}, ${turno.nombre}`,
          empresa: turno.nombreEmpresa,
          ruc: turno.rucEmpresa,
          tienda: turno.nombreTienda,
          fecha: turno.fecha,
          entrada: this.formatearHora(turno.horaEntrada),
          salida: this.formatearHora(turno.horaSalida),
          horas: this.redondear(turno.horasProgramadas),
          almuerzo: turno.descuentoAlmuerzo ? 'Sí' : 'No',
          feriado: turno.feriado ? 'Sí' : 'No',
          partido: turno.turnoPartido ? 'Sí' : 'No',
        })),
      },
    ];
  }

  trackByResumen(_index: number, fila: ProgramacionContable['resumen'][number]): string {
    return `${fila.colaboradorId}-${fila.empresaId}`;
  }

  private validar(): string | null {
    if (!this.desde || !this.hasta) return 'Selecciona ambas fechas.';
    if (this.desde > this.hasta) return 'La fecha inicial no puede ser posterior a la final.';
    return null;
  }

  private formatearHora(hora: string): string {
    return hora?.slice(0, 5) ?? '';
  }

  private redondear(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }
}
