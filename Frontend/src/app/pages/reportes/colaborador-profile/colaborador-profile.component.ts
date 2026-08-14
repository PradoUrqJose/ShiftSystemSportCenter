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
import { eachDayOfInterval, endOfWeek, format, isToday, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale'; // Importar localización en español
import { forkJoin, Subject, takeUntil } from 'rxjs';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Turno, TurnoService } from '../../../services/turno.service';
import { getEmpresaColor, getWallpStyles, lightenDarkenColor } from '../../../utils/color.util';
import { crearOpcionesGraficoMensual, crearOpcionesGraficoTiendas, crearOpcionesGraficoSemanaActual } from '../../../utils/chart-config.util';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { EmptyStateComponent } from '../../../components/ui/empty-state/empty-state.component';

Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-colaborador-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective, CountUpModule, ButtonComponent, EmptyStateComponent],
  templateUrl: './colaborador-profile.component.html',
  styleUrls: ['./colaborador-profile.component.css']
})
export class ColaboradorProfileComponent implements OnInit, OnDestroy {
  colaborador: Colaborador | null = null;
  fechaInicio: string = this.getDefaultFechaInicio();
  fechaFin: string = this.getDefaultFechaFin();
  totalTurnos: number = 0;
  totalTurnosFeriados: number = 0;
  turnosRecientes: Turno[] = [];
  horasPorMes: number[] = [];
  horasFeriados: number = 0;
  turnosFeriados: Turno[] = [];
  tiendasTrabajadas: { nombre: string, horas: number }[] = [];
  totalHorasSemanaActual: number = 0;
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
    private calendarioService: CalendarioService,
    private turnoService: TurnoService
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
      turnos: this.turnoService.getTurnosByColaboradorId(colaboradorId),
      horasTrabajadas: this.reporteService.getHorasTrabajadas(this.fechaInicio, this.fechaFin, colaboradores),
      turnosFeriados: this.reporteService.getTurnosFeriados(this.fechaInicio, this.fechaFin, colaboradores)
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ turnos, horasTrabajadas, turnosFeriados }) => {
        const turnosOrdenados = this.ordenarTurnosPorFecha(turnos);
        this.turnosRecientes = turnosOrdenados.slice(0, 5);
        this.horasPorMes = this.calcularHorasPorMes(horasTrabajadas);

        const mesActual = new Date().getMonth(); // 0-based: Ene=0, Feb=1, etc.
        const empresaColor = getEmpresaColor(this.colaborador?.empresaNombre);

        // Asignar colores: empresa para el mes actual, gris oscuro para los demás
        const backgroundColors = this.horasPorMes.map((_, index) =>
          index === mesActual ? lightenDarkenColor(empresaColor, -100) : 'rgba(0, 0, 0, 0.7)'
        );
        this.barChartData = {
          labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
          datasets: [{
            data: this.horasPorMes,
            backgroundColor: backgroundColors,
            hoverBackgroundColor: backgroundColors.map(color =>
              color === lightenDarkenColor(empresaColor, -100) ? lightenDarkenColor(empresaColor, -70) : 'rgba(0, 0, 0, 0.9)'
            )
          }]
        };

        this.totalTurnosFeriados = turnosFeriados.length;
        this.loadTiendasTrabajadas(horasTrabajadas);
        this.loadSemanaActual(horasTrabajadas);
      }
    });
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

  calcularHorasPorMes(turnos: Turno[]): number[] {
    const horasPorMes = new Array(12).fill(0);
    turnos.forEach(turno => {
      const fecha = parseISO(turno.fecha);
      const mes = fecha.getMonth();
      horasPorMes[mes] += turno.horasTrabajadas || 0;
    });
    return horasPorMes;
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
