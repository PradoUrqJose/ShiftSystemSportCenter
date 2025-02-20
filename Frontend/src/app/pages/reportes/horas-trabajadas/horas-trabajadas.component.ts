import { Component, OnInit } from '@angular/core';
import { ReporteService } from '../../../services/reporte.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarioService } from '../../../services/calendario.service';
import { Colaborador, ColaboradorService } from '../../../services/colaborador.service';
import { NgLabelTemplateDirective, NgOptionTemplateDirective, NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-horas-trabajadas',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './horas-trabajadas.component.html',
  styleUrl: './horas-trabajadas.component.css'
})
export class HorasTrabajadasComponent implements OnInit {
  reportes: any[] = [];
  fechaInicio: string = '2025-01-01';
  fechaFin: string = '2025-02-28';
  colaboradores: Colaborador[] = [];
  colaboradoresSeleccionados: number[] = []; // Ahora solo almacena IDs
  errorMessage: string | null = null;

  constructor(
    private reporteService: ReporteService,
    private calendarioService: CalendarioService,
    private colaboradorService: ColaboradorService,
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
      },
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

  obtenerHorasTrabajadas() {
    if (!this.fechaInicio || !this.fechaFin) return;

    const colaboradoresIds = this.colaboradoresSeleccionados;

    this.reporteService.getHorasTrabajadas(this.fechaInicio, this.fechaFin, colaboradoresIds)
      .subscribe({
        next: (data) => {
          // 🔥 Fusionar datos del reporte con los colaboradores para agregar apellidos
          this.reportes = data.map(reporte => {
            const colaborador = this.colaboradores.find(c => c.id === reporte.colaboradorId);
            return {
              ...reporte,
              apellido: colaborador ? colaborador.apellido : "Desconocido" // 🛠 Agrega el apellido si existe
            };
          });

          console.log("📊 Reportes obtenidos con apellidos:", this.reportes);
        },
        error: (error) => console.error("❌ Error al obtener reportes:", error)
      });
  }

  formatearHora(hora: string | undefined): string {
    const horasTotales = hora ? parseFloat(hora) : 0;
    return this.calendarioService.formatearHoras(horasTotales);
  }

  calcularTotalHoras(): string {
    const totalHoras = this.reportes.reduce((total, reporte) => total + (parseFloat(reporte.horasTrabajadas) || 0), 0);
    return this.calendarioService.formatearHoras(totalHoras);
  }

  obtenerNumerosDeTienda(nombreTienda: string): string {
    return nombreTienda.replace(/[^0-9]/g, '');
  }

}
