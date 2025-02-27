import { CommonModule } from '@angular/common';
import { DiaSemana } from './../../../services/calendario.service';
import { Turno, TurnoService } from './../../../services/turno.service';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Feriado, FeriadoService } from '../../../services/feriado.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-monthly-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monthly-view.component.html',
  styleUrls: ['./monthly-view.component.css', '../turnos.component.css'],
})
export class MonthlyViewComponent {
  // Inputs para recibir datos del componente padre
  feriados: Feriado[] = []; // Lista de feriados
  @Input() semanasDelMes: DiaSemana[][] = []; // Semanas del mes
  @Input() colaboradorSeleccionado: number = 0; // Colaborador seleccionado
  @Input() turnosMensuales$!: Observable<Turno[]>; // Turnos mensuales (Observable)
  @Input() diasSemana: DiaSemana[] = []; // Días de la semana

  // Outputs para emitir eventos al componente padre
  @Output() abrirModal = new EventEmitter<{ colaboradorId: number; fecha: string }>();
  @Output() abrirModalEdicion = new EventEmitter<Turno>();

  constructor(
    private turnoService: TurnoService,
    private feriadoService: FeriadoService, // Inyectar el servicio de feriados
  ) { }

  ngOnInit(): void {
    this.cargarFeriados(); // Cargar los feriados al inicializar
  }

  // Método para obtener el turno de un colaborador en una fecha específica
  obtenerTurno(
    turnos: Turno[] | null,
    colaboradorId: number,
    fecha: string
  ): Turno | undefined {
    if (!turnos) return undefined; // Manejo de null
    return this.turnoService.obtenerTurno(turnos, colaboradorId, fecha) || undefined;
  }

  // Método para formatear las horas trabajadas
  formatearHorasDia(horasTrabajadas: number | undefined): string {
    if (!horasTrabajadas) return '00:00';

    const horas = Math.floor(horasTrabajadas);
    const minutos = Math.round((horasTrabajadas - horas) * 60);

    return `${horas.toString().padStart(2, '0')}:${minutos
      .toString()
      .padStart(2, '0')}`;
  }

  // Método para formatear la hora
  formatearHora(hora: string | undefined): string {
    if (!hora) return '00:00';
    const [horas, minutos] = hora.split(':');
    return `${horas}:${minutos}`;
  }

  // Método para verificar si un día es el día actual
  esDiaActual(fecha: string): boolean {
    const hoy = new Date();
    const [year, month, day] = fecha.split('-').map(Number); // Dividir y convertir a números
    const fechaComparar = new Date(year, month - 1, day); // Meses son 0-indexados en JavaScript
    // Normalizar ambas fechas a medianoche
    hoy.setHours(0, 0, 0, 0);
    fechaComparar.setHours(0, 0, 0, 0);

    return hoy.getTime() === fechaComparar.getTime();
  }

  //! Métodos de utilidad
  esFeriado(fecha: string): boolean {
    return this.turnoService.esFeriado(fecha, this.feriados);
  }

  cargarFeriados(): void {
    this.feriadoService.getFeriados().subscribe({
      next: (data) => {
        this.feriados = data; // Guardar los feriados
      },
      error: (error) => {
        console.error('Error al cargar los feriados:', error);
      },
    });
  }

}
