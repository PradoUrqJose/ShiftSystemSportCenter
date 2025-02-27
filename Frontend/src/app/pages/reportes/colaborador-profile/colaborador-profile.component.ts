import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, ChartOptions, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CountUpModule } from 'ngx-countup';
import { ColaboradorService, Colaborador } from '../../../services/colaborador.service';
import { ReporteService } from '../../../services/reporte.service';
import { CalendarioService } from '../../../services/calendario.service';
import { eachDayOfInterval, endOfWeek, format, isToday, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale'; // Importar localización en español
import { forkJoin } from 'rxjs';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Turno } from '../../../services/turno.service';

Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-colaborador-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective, CountUpModule],
  templateUrl: './colaborador-profile.component.html',
  styleUrls: ['./colaborador-profile.component.css']
})
export class ColaboradorProfileComponent implements OnInit {
  colaborador: Colaborador | null = null;
  fechaInicio: string = this.getDefaultFechaInicio();
  fechaFin: string = this.getDefaultFechaFin();
  totalTurnos: number = 0;
  totalTurnosFeriados: number = 0;
  turnosRecientes: Turno[] = [];
  horasPorMes: number[] = [];
  horasFeriados: number = 0;
  turnosFeriados: any[] = [];
  tiendasTrabajadas: { nombre: string, horas: number }[] = [];
  totalHorasSemanaActual: number = 0;
  @ViewChild('fechaInicioInput') fechaInicioInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFinInput') fechaFinInput!: ElementRef<HTMLInputElement>;


  barChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {

      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Horas' }
      }
    },
    plugins: {

      legend: { display: false },
      datalabels: {
        display: (context) => {
          const value = context.dataset.data[context.dataIndex] as number; // Obtener el valor sin formatear
          return value > 0; // Solo mostrar la etiqueta si el valor es mayor a 0
        },
        anchor: 'end',
        align: 'end',
        color: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 6,
        borderRadius: 10,
        font: { size: 10, weight: 'bold' },
        formatter: (value) => `${parseFloat(value).toFixed(0)} h`
      }, // Desactivar etiquetas en las barras
      tooltip: {
        mode: 'nearest',
        intersect: false,
        callbacks: {
          label: (tooltipItem) => {
            const value = tooltipItem.raw;
            if (typeof value === 'number') {
              return `${this.formatearHorasDia(value, true)} h`;
            }
            return ''; // En caso de que no sea un número, evitar errores
          }
        }
      },
    },
    elements: {
      bar: {
        borderRadius: 10
      },
    },
  };

  horizontalBarChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  horizontalBarChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, title: { display: false, text: 'Horas' } },
    },
    plugins: {
      legend: { display: false },
      datalabels: {
        display: true,
        anchor: 'end',
        align: 'right',
        color: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 6,
        borderRadius: 10,
        font: { size: 10, weight: 'bold' },
        formatter: (value) => `${value} h`
      }, // Desactivar etiquetas en las barras
      tooltip: { mode: 'index', intersect: false }
    },
    elements: {
      bar: {
        borderRadius: 20
      }
    },
    animation: { duration: 1500, easing: 'easeOutBounce' }
  };

  barChartSemanaActualData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  barChartSemanaActualOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: { color: '#6b7280', font: { size: 12 } }
      },
      y: {
        display: false,
        beginAtZero: true, // Comienza en 0
        max: 14 // Límite máximo para reducir la altura de las barras (ajústalo según necesites)
      }
    },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: { enabled: false },
      datalabels: {
        display: (context) => isToday(new Date()) && context.dataIndex === new Date().getDay() - 1,
        anchor: 'end',
        align: 'top',
        color: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 6,
        borderRadius: 10,
        font: { size: 10, weight: 'bold' },
        formatter: (value) => `${value} h`
      }
    },
    elements: {
      bar: {
        borderRadius: 20
      }
    }
  };

  private coloresEmpresas: string[] = [
    '#fff3cc', // Amarillo pastel
    '#cce5ff', // Azul pastel
    '#f0e5de', // Beige claro (ya existente)
    '#b3e0ff', // Celeste pastel
    '#d4f4dd', // Verde menta suave
    '#ffccd9', // Rosa empolvado
    '#e6ccff', // Lila suave
    '#ffddcc', // Melocotón pastel
  ];


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private colaboradorService: ColaboradorService,
    private reporteService: ReporteService,
    private calendarioService: CalendarioService
  ) { }

  ngOnInit(): void {
    const colaboradorId = this.route.snapshot.paramMap.get('id');
    if (colaboradorId) {
      this.loadProfile(+colaboradorId);
      this.loadStatistics(+colaboradorId);
    }
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
    this.colaboradorService.getColaboradorById(colaboradorId).subscribe({
      next: (data: Colaborador) => this.colaborador = data,
      error: () => console.error('Error al cargar perfil del colaborador')
    });
  }

  loadStatistics(colaboradorId: number): void {
    const colaboradores = [colaboradorId];
    forkJoin({
      turnos: this.colaboradorService.getTurnosByColaboradorId(colaboradorId),
      horasTrabajadas: this.reporteService.getHorasTrabajadas(this.fechaInicio, this.fechaFin, colaboradores),
      turnosFeriados: this.reporteService.getTurnosFeriados(this.fechaInicio, this.fechaFin, colaboradores)
    }).subscribe({
      next: ({ turnos, horasTrabajadas, turnosFeriados }) => {
        const turnosOrdenados = this.ordenarTurnosPorFecha(turnos);
        this.turnosRecientes = turnosOrdenados.slice(0, 5);
        this.horasPorMes = this.calcularHorasPorMes(horasTrabajadas);

        // Determinar el mes actual (febrero en este contexto: índice 1)
        const mesActual = 1; // Febrero (0-based: Ene=0, Feb=1, etc.)
        const empresaColor = this.getEmpresaColor(this.colaborador?.empresaNombre);

        // Asignar colores: empresa para el mes actual, gris oscuro para los demás
        const backgroundColors = this.horasPorMes.map((_, index) =>
          index === mesActual ? this.lightenDarkenColor(empresaColor, -100) : 'rgba(0, 0, 0, 0.7)'
        );
        this.barChartData = {
          labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
          datasets: [{
            data: this.horasPorMes,
            backgroundColor: backgroundColors,
            hoverBackgroundColor: backgroundColors.map(color =>
              color === this.lightenDarkenColor(empresaColor, -100) ? this.lightenDarkenColor(empresaColor, -70) : 'rgba(0, 0, 0, 0.9)'
            )
          }]
        };

        this.totalTurnosFeriados = turnosFeriados.length;
        this.loadTiendasTrabajadas(horasTrabajadas);
        this.loadSemanaActual(horasTrabajadas);
      },
      error: (err) => console.error('Error al cargar estadísticas:', err)
    });
  }

  // Nueva función para aclarar u oscurecer un color (para hover)
  private lightenDarkenColor(color: string, percent: number): string {
    const rgb = this.hexToRgb(color);
    const factor = percent / 100;
    const r = Math.min(255, Math.max(0, rgb.r + (255 - rgb.r) * factor));
    const g = Math.min(255, Math.max(0, rgb.g + (255 - rgb.g) * factor));
    const b = Math.min(255, Math.max(0, rgb.b + (255 - rgb.b) * factor));
    return this.rgbToHex(r, g, b);
  }

  loadSemanaActual(horasTrabajadas: any[]): void {
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
    const empresaColor = this.getEmpresaColor(this.colaborador?.empresaNombre);
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

  calcularHorasPorMes(turnos: any[]): number[] {
    const horasPorMes = new Array(12).fill(0);
    turnos.forEach(turno => {
      const fecha = parseISO(turno.fecha);
      const mes = fecha.getMonth();
      horasPorMes[mes] += turno.horasTrabajadas || 0;
    });
    return horasPorMes;
  }

  formatTime(time: string): string {
    return this.calendarioService.formatearHoras(parseFloat(time));
  }

  loadTiendasTrabajadas(turnos: any[]): void {
    const tiendasMap = new Map<string, number>();

    turnos.forEach(turno => {
      const tienda = turno.nombreTienda || 'Sin Tienda';
      tiendasMap.set(tienda, (tiendasMap.get(tienda) || 0) + (turno.horasTrabajadas || 0));
    });

    // Ordenar tiendas por horas trabajadas y tomar solo las 5 más altas
    this.tiendasTrabajadas = Array.from(tiendasMap, ([nombre, horas]) => ({ nombre, horas }))
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 6); // Limitar a las 5 más trabajadas

    const empresaColor = this.getEmpresaColor(this.colaborador?.empresaNombre);
    const backgroundColors = this.lightenDarkenColor(empresaColor, -100);

    this.horizontalBarChartData = {
      labels: this.tiendasTrabajadas.map(t => t.nombre),
      datasets: [{
        data: this.tiendasTrabajadas.map(t => t.horas),
        backgroundColor: backgroundColors,
        borderWidth: 0,
        barThickness: 18 // Mantener barras delgadas
      }]
    };
  }
  goBack(): void {
    this.router.navigate(['/colaboradores']);
  }

  getEmpresaColor(empresaNombre: string | undefined): string {
    if (!empresaNombre || empresaNombre === 'N/A') {
      return '#e5e7eb'; // Color gris claro por defecto
    }
    let hash = 0;
    for (let i = 0; i < empresaNombre.length; i++) {
      hash = empresaNombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % this.coloresEmpresas.length);
    return this.coloresEmpresas[index];
  }

  getWallpStyles(empresaNombre: string | undefined, patternBool: boolean): any {
    if (!empresaNombre || empresaNombre === 'N/A') {
      return { 'background-color': '#e5e7eb' };
    }
    let hash = 0;
    for (let i = 0; i < empresaNombre.length; i++) {
      hash = empresaNombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % this.coloresEmpresas.length);
    const backgroundColor = this.coloresEmpresas[index];
    const rgb = this.hexToRgb(backgroundColor);
    const darkerColor = this.darkenColor(rgb.r, rgb.g, rgb.b, 0.09);
    const darkerHex = this.rgbToHex(darkerColor.r, darkerColor.g, darkerColor.b);
    if( patternBool === true) {
      const pattern = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='20'><text x='5' y='12' font-size='14' fill='%23${darkerHex.slice(1)}' font-weight='bold' font-family='Quicksand, sans-serif'>${encodeURIComponent(empresaNombre)}</text></svg>")`;
      return {
        'background-color': backgroundColor,
        'background-image': pattern,
        'background-repeat': 'repeat',
        'background-size': '170px 20px'
      };
    }else {
      return {
        'background-color': backgroundColor,
        'color': this.lightenDarkenColor(darkerHex, -300),
        'font-weight:': 800,
      };
    }
  }

  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  private darkenColor(r: number, g: number, b: number, factor: number): { r: number, g: number, b: number } {
    return {
      r: Math.max(0, Math.floor(r * (1 - factor))),
      g: Math.max(0, Math.floor(g * (1 - factor))),
      b: Math.max(0, Math.floor(b * (1 - factor)))
    };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  }

  abrirCalendario(state: string): void {
    state === 'inicio' ? this.fechaInicioInput.nativeElement.showPicker() : this.fechaFinInput.nativeElement.showPicker();
  }
}
