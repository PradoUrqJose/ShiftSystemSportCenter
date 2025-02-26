import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ReporteService } from '../../../services/reporte.service';
import { CalendarioService } from '../../../services/calendario.service';
import { ColaboradorService, Colaborador } from '../../../services/colaborador.service';

@Component({
  selector: 'app-turnos-feriados',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './turnos-feriados.component.html',
  styleUrls: ['./turnos-feriados.component.css']
})
export class TurnosFeriadosComponent implements OnInit {
  reportes: any[] = [];
  fechaInicio: string = '2025-01-01'; // Fecha inicial por defecto
  fechaFin: string = '2025-02-28';   // Fecha final por defecto
  colaboradores: Colaborador[] = [];
  colaboradoresSeleccionados: number[] = []; // Almacena IDs de colaboradores seleccionados
  errorMessage: string | null = null;

  constructor(
    private reporteService: ReporteService,
    private calendarioService: CalendarioService,
    private colaboradorService: ColaboradorService
  ) { }

  ngOnInit(): void {
    this.getColaboradores();
  }

  getColaboradores(): void {
    this.colaboradorService.getColaboradores().subscribe({
      next: (data) => {
        this.colaboradores = data;
      },
      error: () => {
        this.errorMessage = 'Error al obtener colaboradores.';
      }
    });
  }

  toggleSelection(colaboradorId: number) {
    const index = this.colaboradoresSeleccionados.indexOf(colaboradorId);
    if (index === -1) {
      this.colaboradoresSeleccionados.push(colaboradorId);
    } else {
      this.colaboradoresSeleccionados.splice(index, 1);
    }
  }

  obtenerTurnosFeriados() {
    if (!this.fechaInicio || !this.fechaFin) {
      this.errorMessage = 'Por favor, seleccione un rango de fechas.';
      return;
    }

    const colaboradoresIds = this.colaboradoresSeleccionados;

    this.reporteService.getTurnosFeriados(this.fechaInicio, this.fechaFin, colaboradoresIds)
      .subscribe({
        next: (data) => {
          // Fusionar datos con apellidos de colaboradores
          this.reportes = data.map(reporte => {
            const colaborador = this.colaboradores.find(c => c.id === reporte.colaboradorId);
            return {
              ...reporte,
              apellido: colaborador ? colaborador.apellido : "Desconocido"
            };
          });
          this.errorMessage = null;
        },
        error: (error) => {
          console.error("❌ Error al obtener reportes de turnos en feriados:", error);
          this.errorMessage = 'Error al obtener el reporte de turnos en feriados.';
          this.reportes = [];
        }
      });
  }

  formatearHora(hora: string | undefined): string {
    const horasTotales = hora ? parseFloat(hora) : 0;
    return this.calendarioService.formatearHoras(horasTotales);
  }

  formatearHorasFeriado(reporte: any): string {
    // Las horas en feriados están en horasTotalesSemana (calculadas en el backend)
    const horasFeriado = reporte.horasTotalesSemana || 0;
    return this.calendarioService.formatearHoras(horasFeriado);
  }

  calcularTotalHorasFeriados(): string {
    const totalHorasFeriados = this.reportes.reduce((total, reporte) => total + (reporte.horasTotalesSemana || 0), 0);
    return this.calendarioService.formatearHoras(totalHorasFeriados);
  }

  obtenerNumerosDeTienda(nombreTienda: string): string {
    return nombreTienda.replace(/[^0-9]/g, '');
  }
}
