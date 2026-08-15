import { Component, ElementRef, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColaboradorService, Colaborador } from '../../../services/colaborador.service';
import { ReporteService } from '../../../services/reporte.service';
import { CalendarioService } from '../../../services/calendario.service';
import { format, parseISO } from 'date-fns';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { Turno } from '../../../services/turno.service';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { EmptyStateComponent } from '../../../components/ui/empty-state/empty-state.component';
import { BadgeComponent } from '../../../components/ui/badge/badge.component';
import { SkeletonComponent } from '../../../components/ui/skeleton/skeleton.component';
import {
  calcularComposicion,
  calcularDistribucionTiendas,
  calcularExcepciones,
  calcularResumenSemanal,
  DistribucionTiendaVista,
  ExcepcionDia,
  formatearFechaLocal,
  SemanaCarga,
} from './colaborador-analytics.util';

const UMBRAL_HORAS_DIARIAS_DEFAULT = 8;

@Component({
    selector: 'app-colaborador-profile',
    imports: [
        CommonModule,
        FormsModule,
        ButtonComponent,
        EmptyStateComponent,
        BadgeComponent,
        SkeletonComponent,
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './colaborador-profile.component.html'
})
export class ColaboradorProfileComponent implements OnInit, OnDestroy {
  readonly skeletonRows = Array.from({ length: 4 });

  colaborador: Colaborador | null = null;
  cargandoStats = false;
  errorMessage: string | null = null;
  fechaInicio: string = this.getDefaultFechaInicio();
  fechaFin: string = this.getDefaultFechaFin();
  umbralHorasDiarias = UMBRAL_HORAS_DIARIAS_DEFAULT;
  empresaIdContexto: number | null = null;
  nombreEmpresaContexto: string | null = null;

  turnosRecientes: Turno[] = [];
  tiendasTrabajadas: DistribucionTiendaVista[] = [];

  // Composición normal/feriado y estadísticas semanales del rango
  // seleccionado (ver calcularComposicionHoras y calcularEstadisticasSemanales).
  totalTurnosFeriados: number = 0;
  horasNormales: number = 0;
  horasFeriados: number = 0;
  porcentajeHorasNormales: number = 0;
  porcentajeHorasFeriados: number = 0;
  promedioSemanal: number = 0;
  semanasConActividad: number = 0;
  semanasMayorCarga: SemanaCarga[] = [];
  excepciones: ExcepcionDia[] = [];

  @ViewChild('fechaInicioInput') fechaInicioInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFinInput') fechaFinInput!: ElementRef<HTMLInputElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private colaboradorService: ColaboradorService,
    private reporteService: ReporteService,
    private calendarioService: CalendarioService
  ) { }

  private readonly destroy$ = new Subject<void>();
  private colaboradorId: number | null = null;
  private statsRequest?: Subscription;

  ngOnInit(): void {
    const idParam = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(idParam) || idParam <= 0) {
      this.errorMessage = 'El colaborador solicitado no es válido.';
      return;
    }

    this.colaboradorId = idParam;
    this.aplicarParametrosDeNavegacion();
    this.loadProfile(idParam);
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.statsRequest?.unsubscribe();
  }

  getDefaultFechaInicio(): string {
    return formatearFechaLocal(new Date(new Date().getFullYear(), 0, 1));
  }

  getDefaultFechaFin(): string {
    return formatearFechaLocal(new Date(new Date().getFullYear(), 11, 31));
  }

  loadProfile(colaboradorId: number): void {
    this.colaboradorService.getColaboradorById(colaboradorId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: Colaborador) => this.colaborador = data
    });
  }

  private ordenarTurnosPorFecha(turnos: Turno[]): Turno[] {
    return turnos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  loadStatistics(): void {
    if (!this.colaboradorId) return;
    this.statsRequest?.unsubscribe();
    if (!this.rangoValido()) {
      this.limpiarEstadisticas();
      this.cargandoStats = false;
      return;
    }

    this.cargandoStats = true;
    this.errorMessage = null;
    // Un solo pedido de turnos para todo el rango. turnosFeriados es un
    // subconjunto exacto (Turno.esFeriado ya viene en el DTO) — antes esto
    // era una segunda llamada HTTP a /turnos/reporte/feriados que traía de
    // nuevo los mismos turnos.
    this.statsRequest = this.reporteService.getHorasTrabajadas(this.fechaInicio, this.fechaFin, [this.colaboradorId])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (horasTrabajadas) => {
          const turnosDelContexto = this.empresaIdContexto == null
            ? horasTrabajadas
            : horasTrabajadas.filter(turno => turno.empresaId === this.empresaIdContexto);
          this.nombreEmpresaContexto = turnosDelContexto[0]?.nombreEmpresa ?? null;

          const turnosOrdenados = this.ordenarTurnosPorFecha([...turnosDelContexto]);
          this.turnosRecientes = turnosOrdenados.slice(0, 5);

          const composicion = calcularComposicion(turnosDelContexto);
          this.totalTurnosFeriados = composicion.totalTurnosFeriados;
          this.horasNormales = composicion.horasNormales;
          this.horasFeriados = composicion.horasFeriados;
          this.porcentajeHorasNormales = composicion.porcentajeHorasNormales;
          this.porcentajeHorasFeriados = composicion.porcentajeHorasFeriados;

          const resumenSemanal = calcularResumenSemanal(turnosDelContexto, this.fechaInicio, this.fechaFin);
          this.promedioSemanal = resumenSemanal.promedioSemanal;
          this.semanasConActividad = resumenSemanal.semanasConActividad;
          this.semanasMayorCarga = resumenSemanal.semanasMayorCarga;

          this.excepciones = calcularExcepciones(turnosDelContexto, this.umbralHorasDiarias);
          this.tiendasTrabajadas = calcularDistribucionTiendas(turnosDelContexto);
          this.cargandoStats = false;
        },
        error: () => {
          this.limpiarEstadisticas();
          this.errorMessage = 'No se pudo cargar el análisis para el rango seleccionado.';
          this.cargandoStats = false;
        }
      });
  }

  formatearHora(hora: string | undefined): string {
    if (!hora) return "00:00"; // Si no hay hora, devolver 00:00

    // Verificar si el formato es HH:mm
    if (hora.includes(":")) {
      const [horas, minutos] = hora.split(":").map(Number);
      return this.calendarioService.formatearHoras(horas + minutos / 60);
    }

    // Si solo es un número en string, convertirlo a float
    const horasTotales = parseFloat(hora);
    return this.calendarioService.formatearHoras(horasTotales);
  }

  formatearHorasDia(horasTrabajadas: number | undefined, type: boolean): string {
    return this.calendarioService.formatearHoras(horasTrabajadas ?? 0, type);
  }

  formatearFecha(fecha: string): string {
    return format(parseISO(fecha), 'dd/MM/yyyy');
  }

  goBack(): void {
    this.router.navigate(['/colaboradores']);
  }

  abrirCalendario(state: 'inicio' | 'fin'): void {
    state === 'inicio' ? this.fechaInicioInput.nativeElement.showPicker() : this.fechaFinInput.nativeElement.showPicker();
  }

  private aplicarParametrosDeNavegacion(): void {
    const params = this.route.snapshot.queryParamMap;
    const desde = params.get('desde');
    const hasta = params.get('hasta');
    const empresaId = Number(params.get('empresaId'));
    const umbral = Number(params.get('umbralHorasDiarias'));

    if (desde && this.esFechaIsoValida(desde)) this.fechaInicio = desde;
    if (hasta && this.esFechaIsoValida(hasta)) this.fechaFin = hasta;
    if (Number.isInteger(empresaId) && empresaId > 0) this.empresaIdContexto = empresaId;
    if (Number.isFinite(umbral) && umbral > 0) this.umbralHorasDiarias = umbral;
  }

  private rangoValido(): boolean {
    if (!this.esFechaIsoValida(this.fechaInicio) || !this.esFechaIsoValida(this.fechaFin)) {
      this.errorMessage = 'Selecciona ambas fechas del período.';
      return false;
    }
    if (this.fechaInicio > this.fechaFin) {
      this.errorMessage = 'La fecha inicial no puede ser posterior a la fecha final.';
      return false;
    }
    return true;
  }

  private esFechaIsoValida(fecha: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(parseISO(fecha).getTime());
  }

  private limpiarEstadisticas(): void {
    this.turnosRecientes = [];
    this.tiendasTrabajadas = [];
    this.totalTurnosFeriados = 0;
    this.horasNormales = 0;
    this.horasFeriados = 0;
    this.porcentajeHorasNormales = 0;
    this.porcentajeHorasFeriados = 0;
    this.promedioSemanal = 0;
    this.semanasConActividad = 0;
    this.semanasMayorCarga = [];
    this.excepciones = [];
    this.nombreEmpresaContexto = null;
  }

  trackByTurnoId(_index: number, turno: Turno): number {
    return turno.id;
  }

  trackByExcepcion(_index: number, excepcion: ExcepcionDia): string {
    return excepcion.fecha;
  }
}
