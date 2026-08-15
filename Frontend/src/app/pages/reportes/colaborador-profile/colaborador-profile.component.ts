import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColaboradorService, Colaborador } from '../../../services/colaborador.service';
import { ReporteService } from '../../../services/reporte.service';
import { CalendarioService } from '../../../services/calendario.service';
import { endOfWeek, eachWeekOfInterval, format, parseISO, startOfWeek } from 'date-fns';
import { Subject, takeUntil } from 'rxjs';
import { Turno } from '../../../services/turno.service';
import { getEmpresaColor } from '../../../utils/color.util';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { EmptyStateComponent } from '../../../components/ui/empty-state/empty-state.component';
import { BadgeComponent } from '../../../components/ui/badge/badge.component';
import { SkeletonComponent } from '../../../components/ui/skeleton/skeleton.component';

// Semana con horas muy por fuera del promedio del rango seleccionado
// (ver calcularEstadisticasSemanales). 1.5 desviaciones estándar es un
// umbral simple para resaltar outliers sin marcar la variación normal.
const UMBRAL_SEMANA_CRITICA_EN_DESVIACIONES = 1.5;

// Espeja ReporteService.UMBRAL_HORAS_DIARIAS_DEFAULT (backend). Es el mismo
// tipo de duplicación ya documentada entre Turno.java y las queries SQL de
// reportes: acá no vale la pena traer el dato del backend solo para esto,
// pero si ese default cambia allá, hay que actualizarlo también acá.
const UMBRAL_HORAS_DIARIAS_DEFAULT = 8;

interface SemanaCritica {
  inicio: string;
  fin: string;
  horas: number;
  tipo: 'baja' | 'alta';
}

interface DistribucionTiendaVista {
  nombre: string;
  horas: number;
  porcentaje: number;
}

interface ExcepcionDia {
  fecha: string;
  horas: number;
  cantidadTurnos: number;
  esFeriado: boolean;
  partido: boolean;
  horasExtra: boolean;
}

@Component({
  selector: 'app-colaborador-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    EmptyStateComponent,
    BadgeComponent,
    SkeletonComponent,
  ],
  templateUrl: './colaborador-profile.component.html',
  styleUrls: ['./colaborador-profile.component.css']
})
export class ColaboradorProfileComponent implements OnInit, OnDestroy {
  readonly skeletonRows = Array.from({ length: 4 });

  colaborador: Colaborador | null = null;
  cargandoStats = false;
  fechaInicio: string = this.getDefaultFechaInicio();
  fechaFin: string = this.getDefaultFechaFin();

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
  desviacionEstandarSemanal: number = 0;
  semanasCriticas: SemanaCritica[] = [];
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

  ngOnInit(): void {
    const colaboradorId = this.route.snapshot.paramMap.get('id');
    if (colaboradorId) {
      this.loadProfile(+colaboradorId);
      this.loadStatistics(+colaboradorId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getDefaultFechaInicio(): string {
    const date = new Date();
    date.setMonth(0); // Enero
    date.setDate(1); // Primer día del mes
    return date.toISOString().split('T')[0];
  }

  getDefaultFechaFin(): string {
    const date = new Date();
    date.setMonth(11); // Diciembre
    date.setDate(31); // Último día del mes
    return date.toISOString().split('T')[0];
  }

  loadProfile(colaboradorId: number): void {
    this.colaboradorService.getColaboradorById(colaboradorId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: Colaborador) => this.colaborador = data
    });
  }

  private ordenarTurnosPorFecha(turnos: Turno[]): Turno[] {
    return turnos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  loadStatistics(colaboradorId: number): void {
    this.cargandoStats = true;
    // Un solo pedido de turnos para todo el rango. turnosFeriados es un
    // subconjunto exacto (Turno.esFeriado ya viene en el DTO) — antes esto
    // era una segunda llamada HTTP a /turnos/reporte/feriados que traía de
    // nuevo los mismos turnos.
    this.reporteService.getHorasTrabajadas(this.fechaInicio, this.fechaFin, [colaboradorId])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (horasTrabajadas) => {
          const turnosFeriados = horasTrabajadas.filter(t => t.esFeriado);

          const turnosOrdenados = this.ordenarTurnosPorFecha([...horasTrabajadas]);
          this.turnosRecientes = turnosOrdenados.slice(0, 5);

          this.totalTurnosFeriados = turnosFeriados.length;
          this.calcularComposicionHoras(horasTrabajadas, turnosFeriados);
          this.calcularEstadisticasSemanales(horasTrabajadas);
          this.calcularExcepciones(horasTrabajadas);
          this.loadTiendasTrabajadas(horasTrabajadas);
          this.cargandoStats = false;
        },
        error: () => {
          this.cargandoStats = false;
        }
      });
  }

  // Composición horas normales vs. feriado sobre el total trabajado en el
  // rango — turnosFeriados ya es un subconjunto de horasTrabajadas (mismos
  // turnos, filtrados por esFeriado), así que no se duplican horas.
  private calcularComposicionHoras(horasTrabajadas: Turno[], turnosFeriados: Turno[]): void {
    const horasTotales = horasTrabajadas.reduce((sum, t) => sum + (t.horasTrabajadas || 0), 0);
    this.horasFeriados = turnosFeriados.reduce((sum, t) => sum + (t.horasTrabajadas || 0), 0);
    this.horasNormales = Math.max(0, horasTotales - this.horasFeriados);

    const total = this.horasNormales + this.horasFeriados;
    this.porcentajeHorasNormales = total > 0 ? (this.horasNormales / total) * 100 : 0;
    this.porcentajeHorasFeriados = total > 0 ? (this.horasFeriados / total) * 100 : 0;
  }

  // Promedio semanal, desviación estándar y semanas "atípicas" (a más de
  // UMBRAL_SEMANA_CRITICA_EN_DESVIACIONES desviaciones del promedio) dentro
  // del rango seleccionado. Las semanas futuras se excluyen del análisis:
  // si fechaFin cae después de hoy, todavía no pasaron y no son "semanas
  // en cero" reales, así que contarlas como críticas sería ruido.
  private calcularEstadisticasSemanales(turnos: Turno[]): void {
    const hoy = new Date();
    const desde = parseISO(this.fechaInicio);
    const hastaConfigurado = parseISO(this.fechaFin);
    const hasta = hastaConfigurado < hoy ? hastaConfigurado : hoy;

    if (desde > hasta) {
      this.promedioSemanal = 0;
      this.desviacionEstandarSemanal = 0;
      this.semanasCriticas = [];
      return;
    }

    const horasPorSemana = new Map<string, number>();
    turnos.forEach(turno => {
      const inicioSemana = startOfWeek(parseISO(turno.fecha), { weekStartsOn: 1 });
      const clave = format(inicioSemana, 'yyyy-MM-dd');
      horasPorSemana.set(clave, (horasPorSemana.get(clave) || 0) + (turno.horasTrabajadas || 0));
    });

    // Se generan todas las semanas del rango (no solo las que tienen
    // turnos) para que una semana sin ningún turno cuente como 0 horas
    // y pueda salir como atípica, en vez de desaparecer del cálculo.
    const semanas = eachWeekOfInterval({ start: desde, end: hasta }, { weekStartsOn: 1 })
      .map(inicioSemana => ({
        inicioSemana,
        horas: horasPorSemana.get(format(inicioSemana, 'yyyy-MM-dd')) || 0
      }));

    const sumaHoras = semanas.reduce((sum, s) => sum + s.horas, 0);
    this.promedioSemanal = sumaHoras / semanas.length;

    const varianza = semanas.reduce((sum, s) => sum + Math.pow(s.horas - this.promedioSemanal, 2), 0) / semanas.length;
    this.desviacionEstandarSemanal = Math.sqrt(varianza);

    const umbral = this.desviacionEstandarSemanal * UMBRAL_SEMANA_CRITICA_EN_DESVIACIONES;
    this.semanasCriticas = umbral > 0
      ? semanas
          .filter(s => Math.abs(s.horas - this.promedioSemanal) > umbral)
          .map(s => ({
            inicio: format(s.inicioSemana, 'dd/MM'),
            fin: format(endOfWeek(s.inicioSemana, { weekStartsOn: 1 }), 'dd/MM'),
            horas: s.horas,
            tipo: s.horas < this.promedioSemanal ? 'baja' as const : 'alta' as const
          }))
      : [];
  }

  // Excepciones acotadas a este colaborador: días con más de un turno
  // (turno partido, se infiere del conteo — no hay relación explícita en
  // el modelo) y/o con más horas que UMBRAL_HORAS_DIARIAS_DEFAULT (horas
  // extra candidatas, señal aproximada, no un cálculo legal). Mismas
  // señales que preliquidación, calculadas acá 100% en el cliente porque
  // el volumen (un solo colaborador) no justifica una query agregada.
  private calcularExcepciones(turnos: Turno[]): void {
    const porDia = new Map<string, { horas: number; cantidad: number; esFeriado: boolean }>();
    turnos.forEach(turno => {
      const actual = porDia.get(turno.fecha) || { horas: 0, cantidad: 0, esFeriado: false };
      actual.horas += turno.horasTrabajadas || 0;
      actual.cantidad += 1;
      actual.esFeriado = actual.esFeriado || !!turno.esFeriado;
      porDia.set(turno.fecha, actual);
    });

    this.excepciones = Array.from(porDia, ([fecha, dia]) => ({
      fecha,
      horas: dia.horas,
      cantidadTurnos: dia.cantidad,
      esFeriado: dia.esFeriado,
      partido: dia.cantidad > 1,
      horasExtra: dia.horas > UMBRAL_HORAS_DIARIAS_DEFAULT,
    }))
      .filter(dia => dia.partido || dia.horasExtra)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
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

  loadTiendasTrabajadas(turnos: Turno[]): void {
    const tiendasMap = new Map<string, number>();

    turnos.forEach(turno => {
      const tienda = turno.nombreTienda || 'Sin Tienda';
      tiendasMap.set(tienda, (tiendasMap.get(tienda) || 0) + (turno.horasTrabajadas || 0));
    });

    const totalHoras = Array.from(tiendasMap.values()).reduce((sum, h) => sum + h, 0);

    this.tiendasTrabajadas = Array.from(tiendasMap, ([nombre, horas]) => ({
      nombre,
      horas,
      porcentaje: totalHoras > 0 ? (horas / totalHoras) * 100 : 0,
    })).sort((a, b) => b.horas - a.horas);
  }

  goBack(): void {
    this.router.navigate(['/colaboradores']);
  }

  // Delega a utils/color.util.ts — el template lo llama directo (no puede
  // llamar funciones sueltas), es un wrapper fino. Se usa solo como acento
  // puntual (ej. borde/badge), no como fondo de página.
  getEmpresaColor(empresaNombre: string | undefined): string {
    return getEmpresaColor(empresaNombre);
  }

  abrirCalendario(state: string): void {
    state === 'inicio' ? this.fechaInicioInput.nativeElement.showPicker() : this.fechaFinInput.nativeElement.showPicker();
  }

  trackByTurnoId(_index: number, turno: Turno): number {
    return turno.id;
  }

  trackByExcepcion(_index: number, excepcion: ExcepcionDia): string {
    return excepcion.fecha;
  }
}
