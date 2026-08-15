import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CountUpModule } from 'ngx-countup';
import { ColaboradorService, Colaborador } from '../../../services/colaborador.service';
import { ReporteService } from '../../../services/reporte.service';
import { CalendarioService } from '../../../services/calendario.service';
import { eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, endOfWeek, format, isToday, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale'; // Importar localización en español
import { forkJoin, Subject, takeUntil } from 'rxjs';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Turno } from '../../../services/turno.service';
import { getEmpresaColor, getWallpStyles, lightenDarkenColor } from '../../../utils/color.util';
import { crearOpcionesGraficoMensual, crearOpcionesGraficoTiendas, crearOpcionesGraficoSemanaActual } from '../../../utils/chart-config.util';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { EmptyStateComponent } from '../../../components/ui/empty-state/empty-state.component';
import { BadgeComponent } from '../../../components/ui/badge/badge.component';

Chart.register(...registerables, ChartDataLabels);

// Semana con horas muy por fuera del promedio del rango seleccionado
// (ver calcularEstadisticasSemanales). 1.5 desviaciones estándar es un
// umbral simple para resaltar outliers sin marcar la variación normal.
const UMBRAL_SEMANA_CRITICA_EN_DESVIACIONES = 1.5;

interface SemanaCritica {
  inicio: string;
  fin: string;
  horas: number;
  tipo: 'baja' | 'alta';
}

@Component({
  selector: 'app-colaborador-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective, CountUpModule, ButtonComponent, EmptyStateComponent, BadgeComponent],
  templateUrl: './colaborador-profile.component.html',
  styleUrls: ['./colaborador-profile.component.css']
})
export class ColaboradorProfileComponent implements OnInit, OnDestroy {
  colaborador: Colaborador | null = null;
  fechaInicio: string = this.getDefaultFechaInicio();
  fechaFin: string = this.getDefaultFechaFin();
  totalTurnosFeriados: number = 0;
  turnosRecientes: Turno[] = [];
  tiendasTrabajadas: { nombre: string, horas: number }[] = [];
  totalHorasSemanaActual: number = 0;

  // Composición normal/feriado y estadísticas semanales del rango
  // seleccionado (ver calcularComposicionHoras y calcularEstadisticasSemanales).
  horasNormales: number = 0;
  horasFeriados: number = 0;
  porcentajeHorasNormales: number = 0;
  porcentajeHorasFeriados: number = 0;
  promedioSemanal: number = 0;
  desviacionEstandarSemanal: number = 0;
  semanasCriticas: SemanaCritica[] = [];
  @ViewChild('fechaInicioInput') fechaInicioInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFinInput') fechaFinInput!: ElementRef<HTMLInputElement>;

  barChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  // Las opciones de los 3 gráficos (Chart.js) viven en utils/chart-config.util.ts
  // — acá solo se les inyecta el formateador de horas del componente.
  barChartOptions = crearOpcionesGraficoMensual((h, t) => this.formatearHorasDia(h, t));

  horizontalBarChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  horizontalBarChartOptions = crearOpcionesGraficoTiendas((h, t) => this.formatearHorasDia(h, t));

  barChartSemanaActualData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  barChartSemanaActualOptions = crearOpcionesGraficoSemanaActual((h, t) => this.formatearHorasDia(h, t));

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
    const colaboradores = [colaboradorId];
    forkJoin({
      horasTrabajadas: this.reporteService.getHorasTrabajadas(this.fechaInicio, this.fechaFin, colaboradores),
      turnosFeriados: this.reporteService.getTurnosFeriados(this.fechaInicio, this.fechaFin, colaboradores)
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ horasTrabajadas, turnosFeriados }) => {
        // "Recientes" sale de horasTrabajadas (ya filtrado por fechaInicio/
        // fechaFin) en vez de pedir todos los turnos del colaborador, para
        // que respete el rango seleccionado y no dispare un fetch aparte.
        const turnosOrdenados = this.ordenarTurnosPorFecha([...horasTrabajadas]);
        this.turnosRecientes = turnosOrdenados.slice(0, 5);

        this.actualizarGraficoMensual(horasTrabajadas);
        this.totalTurnosFeriados = turnosFeriados.length;
        this.calcularComposicionHoras(horasTrabajadas, turnosFeriados);
        this.calcularEstadisticasSemanales(horasTrabajadas);
        this.loadTiendasTrabajadas(horasTrabajadas);
        this.loadSemanaActual(horasTrabajadas);
      }
    });
  }

  private actualizarGraficoMensual(turnos: Turno[]): void {
    const meses = this.calcularHorasPorMes(turnos);
    const empresaColor = getEmpresaColor(this.colaborador?.empresaNombre);
    const colorMesActual = lightenDarkenColor(empresaColor, -100);
    const claveMesActual = format(new Date(), 'yyyy-MM');

    // Asignar colores: empresa para el mes actual, gris oscuro para los demás
    const backgroundColors = meses.map(mes =>
      format(mes.fecha, 'yyyy-MM') === claveMesActual ? colorMesActual : 'rgba(0, 0, 0, 0.7)'
    );

    this.barChartData = {
      labels: meses.map(mes => mes.label),
      datasets: [{
        data: meses.map(mes => mes.horas),
        backgroundColor: backgroundColors,
        hoverBackgroundColor: backgroundColors.map(color =>
          color === colorMesActual ? lightenDarkenColor(empresaColor, -70) : 'rgba(0, 0, 0, 0.9)'
        )
      }]
    };
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

  loadSemanaActual(horasTrabajadas: Turno[]): void {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); // Lunes 17 de febrero
    const end = endOfWeek(today, { weekStartsOn: 1 }); // Domingo 23 de febrero
    const daysOfWeek = eachDayOfInterval({ start, end });

    // Usar localización en español para los días de la semana
    const labels = daysOfWeek.map(day => format(day, 'EEE', { locale: es })); // "Lun", "Mar", "Mié", etc.
    const data = daysOfWeek.map(day => {
      const dayString = format(day, 'yyyy-MM-dd');
      const horasDia = horasTrabajadas
        .filter(turno => turno.fecha === dayString)
        .reduce((sum, turno) => sum + (turno.horasTrabajadas || 0), 0);
      return horasDia;
    });

    this.totalHorasSemanaActual = data.reduce((sum, horas) => sum + horas, 0);
    const empresaColor = getEmpresaColor(this.colaborador?.empresaNombre);
    const backgroundColors = daysOfWeek.map(day => isToday(day) ? empresaColor : 'rgba(0, 0, 0, 0.7)');

    this.barChartSemanaActualData = {
      labels, // Ahora en español: "Lun", "Mar", "Mié", etc.
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderWidth: 0,
        barThickness: 18 // Mover barThickness aquí para hacer las barras más delgadas
      }]
    };
  }

  // Agrupa por año-mes (no solo por número de mes) para que un rango de
  // varios años no mezcle "enero" de años distintos en la misma barra.
  private calcularHorasPorMes(turnos: Turno[]): { fecha: Date; label: string; horas: number }[] {
    const desde = parseISO(this.fechaInicio);
    const hasta = parseISO(this.fechaFin);
    if (desde > hasta) return [];

    const horasPorClave = new Map<string, number>();
    turnos.forEach(turno => {
      const clave = turno.fecha.slice(0, 7); // "yyyy-MM"
      horasPorClave.set(clave, (horasPorClave.get(clave) || 0) + (turno.horasTrabajadas || 0));
    });

    return eachMonthOfInterval({ start: desde, end: hasta }).map(fecha => ({
      fecha,
      label: this.capitalizar(format(fecha, 'MMM yyyy', { locale: es })), // date-fns/es da "ene 2026" en minúscula
      horas: horasPorClave.get(format(fecha, 'yyyy-MM')) || 0
    }));
  }

  private capitalizar(texto: string): string {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
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

  loadTiendasTrabajadas(turnos: Turno[]): void {
    const tiendasMap = new Map<string, number>();

    turnos.forEach(turno => {
      const tienda = turno.nombreTienda || 'Sin Tienda';
      tiendasMap.set(tienda, (tiendasMap.get(tienda) || 0) + (turno.horasTrabajadas || 0));
    });

    // Ordenar tiendas por horas trabajadas y tomar solo las 5 más altas
    this.tiendasTrabajadas = Array.from(tiendasMap, ([nombre, horas]) => ({ nombre, horas }))
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 6); // Limitar a las 5 más trabajadas

    const empresaColor = getEmpresaColor(this.colaborador?.empresaNombre);
    const backgroundColors = lightenDarkenColor(empresaColor, -100);

    this.horizontalBarChartData = {
      labels: this.tiendasTrabajadas.map(t => t.nombre),
      datasets: [{
        data: this.tiendasTrabajadas.map(t => t.horas),
        backgroundColor: backgroundColors,
        borderWidth: 0,
        barThickness: 19, // Mantener barras delgadas
      }]
    };
  }
  goBack(): void {
    this.router.navigate(['/colaboradores']);
  }

  // Delegan a utils/color.util.ts — el template las llama directo (no puede
  // llamar funciones sueltas), estos son wrappers finos.
  getEmpresaColor(empresaNombre: string | undefined): string {
    return getEmpresaColor(empresaNombre);
  }

  getWallpStyles(empresaNombre: string | undefined, conPatron: boolean): Record<string, string | number> {
    return getWallpStyles(empresaNombre, conPatron);
  }

  abrirCalendario(state: string): void {
    state === 'inicio' ? this.fechaInicioInput.nativeElement.showPicker() : this.fechaFinInput.nativeElement.showPicker();
  }

  trackByTurnoId(_index: number, turno: Turno): number {
    return turno.id;
  }
}
