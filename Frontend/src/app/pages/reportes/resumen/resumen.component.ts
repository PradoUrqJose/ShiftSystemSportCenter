import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';

import { ButtonComponent } from '../../../components/ui/button/button.component';
import { EmptyStateComponent } from '../../../components/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../components/ui/skeleton/skeleton.component';
import { CalendarioService } from '../../../services/calendario.service';
import { Empresa, EmpresaService } from '../../../services/empresa.service';
import { ExcepcionReporte, ReporteService, ResumenReporte, ResumenSemana } from '../../../services/reporte.service';
import { formatearFechaLocal } from '../colaborador-profile/colaborador-analytics.util';

@Component({
    selector: 'app-resumen-reportes',
    imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, EmptyStateComponent, SkeletonComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './resumen.component.html'
})
export class ResumenComponent implements OnInit, OnDestroy {
  readonly skeletonRows = Array.from({ length: 4 });

  mes = formatearFechaLocal(new Date()).slice(0, 7);
  empresaId: number | null = null;
  empresas: Empresa[] = [];
  reporte: ResumenReporte | null = null;
  cargando = false;
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
    const periodo = this.periodoSeleccionado();
    if (!periodo) {
      this.reporte = null;
      this.errorMessage = 'Selecciona un mes válido.';
      return;
    }

    this.request?.unsubscribe();
    this.cargando = true;
    this.errorMessage = null;
    this.request = this.reporteService.getResumen(
      periodo.desde, periodo.hasta, this.empresaId ?? undefined,
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: reporte => {
        this.reporte = reporte;
        this.cargando = false;
      },
      error: () => {
        this.reporte = null;
        this.cargando = false;
        this.errorMessage = 'No se pudo cargar el resumen. Revisa el período e intenta nuevamente.';
      },
    });
  }

  get anioSeleccionado(): number {
    return Number(this.mes.split('-')[0]);
  }

  get numeroMesSeleccionado(): number {
    return Number(this.mes.split('-')[1]);
  }

  get nombreEmpresa(): string {
    return this.empresas.find(empresa => empresa.id === this.empresaId)?.nombre ?? 'Todas las empresas';
  }

  get tiendasPrincipales() {
    return this.reporte?.tiendas.slice(0, 6) ?? [];
  }

  get maximoHorasSemana(): number {
    return Math.max(1, ...(this.reporte?.semanas.map(s => s.horasRegulares + s.horasEnFeriado) ?? [0]));
  }

  alturaRegular(semana: ResumenSemana): number {
    return semana.horasRegulares * 100 / this.maximoHorasSemana;
  }

  alturaFeriado(semana: ResumenSemana): number {
    return semana.horasEnFeriado * 100 / this.maximoHorasSemana;
  }

  formatearHoras(horas: number): string {
    return this.calendarioService.formatearHoras(horas);
  }

  formatearRango(semana: ResumenSemana): string {
    return `${semana.inicio.slice(8, 10)}/${semana.inicio.slice(5, 7)}–${semana.fin.slice(8, 10)}/${semana.fin.slice(5, 7)}`;
  }

  etiquetaSeveridad(excepcion: ExcepcionReporte): string {
    return ({
      ERROR: 'Error de datos',
      RIESGO: 'Por conciliar',
      ADVERTENCIA: 'Advertencia',
      INFORMACION: 'Información',
    })[excepcion.severidad];
  }

  trackByAtencion(index: number, excepcion: ExcepcionReporte): string {
    return `${excepcion.codigo}-${excepcion.colaboradorId}-${excepcion.fechaInicio}-${index}`;
  }

  private periodoSeleccionado(): { desde: string; hasta: string } | null {
    if (!/^\d{4}-\d{2}$/.test(this.mes)) return null;
    const [anio, mes] = this.mes.split('-').map(Number);
    if (mes < 1 || mes > 12 || anio < 2000 || anio > 2100) return null;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    return {
      desde: `${this.mes}-01`,
      hasta: `${this.mes}-${String(ultimoDia).padStart(2, '0')}`,
    };
  }
}
