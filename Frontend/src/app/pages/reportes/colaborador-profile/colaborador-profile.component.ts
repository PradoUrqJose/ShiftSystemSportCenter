import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, ChartOptions, registerables } from 'chart.js'; // Importa registerables
import { BaseChartDirective } from 'ng2-charts';
import { CountUpModule } from 'ngx-countup';
import { ColaboradorService, Colaborador } from '../../../services/colaborador.service';
import { ReporteService } from '../../../services/reporte.service';
import { CalendarioService } from '../../../services/calendario.service';

Chart.register(...registerables);
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
  totalHoras: number = 0;
  totalHorasExtras: number = 0;
  totalTurnosFeriados: number = 0;
  turnosRecientes: any[] = [];
  horasPorMes: number[] = [];
  horasFeriados: number = 0;
  horasNormales: number = 0;
  turnosFeriados: any[] = [];
  tiendasTrabajadas: { nombre: string, horas: number }[] = [];

  // Datos para el gráfico de barras (horas por mes)
  barChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  barChartLabels: string[] = [];
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    scales: { y: { beginAtZero: true, title: { display: true, text: 'Horas' } } },
    plugins: { legend: { display: false } }
  };

  // Datos para el gráfico de dona (horas normales vs. extras)
  doughnutChartData: number[] = [];
  doughnutChartLabels: string[] = ['Horas Normales', 'Horas Extras'];
  doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: { legend: { position: 'top' } }
  };

  pieChartData: number[] = [];
  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: { legend: { position: 'right' }, tooltip: { enabled: true } },
    animation: { animateScale: true, animateRotate: true }
  };

  horizontalBarChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  horizontalBarChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    indexAxis: 'y',
    scales: { x: { beginAtZero: true, title: { display: true, text: 'Horas' } } },
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    animation: { duration: 1500, easing: 'easeOutBounce' }
  };

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
    date.setMonth(date.getMonth() - 6);
    return date.toISOString().split('T')[0];
  }

  getDefaultFechaFin(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Métodos para cargar datos se implementarán en los pasos siguientes
  loadProfile(colaboradorId: number): void {
    this.colaboradorService.getColaboradorById(colaboradorId).subscribe({
      next: (data: Colaborador) => this.colaborador = data, // Tipado explícito
      error: () => console.error('Error al cargar perfil del colaborador')
    });
  }

  loadStatistics(colaboradorId: number): void {
    const colaboradores = [colaboradorId];

    this.colaboradorService.getTurnosByColaboradorId(colaboradorId).subscribe({
      next: (turnos) => {
        this.totalTurnos = turnos.length;
        this.turnosRecientes = turnos.slice(0, 5);
      }
    });

    this.reporteService.getHorasTrabajadas(this.fechaInicio, this.fechaFin, colaboradores).subscribe({
      next: (data) => {
        this.totalHoras = data.reduce((sum, turno) => sum + (turno.horasTrabajadas || 0), 0);
        this.horasPorMes = this.calcularHorasPorMes(data);
        this.barChartData = {
          labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
          datasets: [{ data: this.horasPorMes, backgroundColor: '#4f46e5', hoverBackgroundColor: '#6366f1' }]
        };
        this.horasNormales = this.totalHoras - this.totalHorasExtras;
        this.loadTiendasTrabajadas(data);
      }
    });

    this.reporteService.getHorasExtras(this.fechaInicio, this.fechaFin, colaboradores).subscribe({
      next: (data) => {
        this.totalHorasExtras = data.reduce((sum, turno) => sum + (turno.horasTotalesSemana || 0), 0);
        this.doughnutChartData = [this.totalHoras - this.totalHorasExtras, this.totalHorasExtras];
      }
    });

    this.reporteService.getTurnosFeriados(this.fechaInicio, this.fechaFin, colaboradores).subscribe({
      next: (data) => {
        this.totalTurnosFeriados = data.length;
        this.horasFeriados = data.reduce((sum, turno) => sum + (turno.horasTotalesSemana || 0), 0);
        this.pieChartData = [this.totalHoras - this.horasFeriados, this.horasFeriados];
        this.turnosFeriados = data;
      }
    });
  }

  calcularHorasPorMes(turnos: any[]): number[] {
    const horasPorMes = new Array(12).fill(0);
    turnos.forEach(turno => {
      const fecha = new Date(turno.fecha);
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
    this.tiendasTrabajadas = Array.from(tiendasMap, ([nombre, horas]) => ({ nombre, horas }));
    this.horizontalBarChartData = {
      labels: this.tiendasTrabajadas.map(t => t.nombre),
      datasets: [{
        data: this.tiendasTrabajadas.map(t => t.horas),
        backgroundColor: '#10b981',
        hoverBackgroundColor: '#34d399'
      }]
    };
  }

  goBack(): void {
    this.router.navigate(['/colaboradores']);
  }
}
