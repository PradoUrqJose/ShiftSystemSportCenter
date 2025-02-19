import { CommonModule } from '@angular/common';
import { DiaSemana } from './../../../services/calendario.service';
import { Colaborador } from './../../../services/colaborador.service';
import { Turno, TurnoService } from './../../../services/turno.service';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Feriado, FeriadoService } from '../../../services/feriado.service';

@Component({
  selector: 'app-weekly-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weekly-view.component.html',
  styleUrl: './weekly-view.component.css'
})
export class WeeklyViewComponent implements OnInit {

  constructor(
    private turnoService: TurnoService,
    private feriadoService: FeriadoService, // Inyectar el servicio de feriados
  ) { }

  ngOnInit(): void {
    this.cargarFeriados(); // Cargar los feriados al inicializar
  }

  // Inputs para recibir datos del componente padre
  @Input() feriados: Feriado[] = []; // Lista de feriados
  @Input() diasSemana: DiaSemana[] = []; // Días de la semana
  @Input() colaboradores: Colaborador[] = []; // Lista de colaboradores
  @Input() turnos: Turno[] = []; // Lista de turnos

  // Outputs para emitir eventos al componente padre
  @Output() abrirModal = new EventEmitter<{ colaboradorId: number; fecha: string }>();
  @Output() abrirModalEdicion = new EventEmitter<Turno>();

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

  getHorasTotalesSemanaFormateadas(colaboradorId: number, turnos: Turno[] | null): string {
    if (!turnos) return '00:00'; // Si no hay turnos, devolver 00:00

    const turnoColaborador = turnos.find(
      (t) => t.colaboradorId === colaboradorId
    );
    const horasTotales = turnoColaborador
      ? turnoColaborador.horasTotalesSemana ?? 0
      : 0;

    const horas = Math.floor(horasTotales); // Parte entera (horas)
    const minutos = Math.round((horasTotales - horas) * 60); // Convertir parte decimal a minutos

    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(
      2,
      '0'
    )}`; // Formato HH:mm
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

  // Asegura que cada semana tenga 7 días, agregando días vacíos si es necesario
  completarSemana(semana: DiaSemana[] | null): DiaSemana[] {
    if (!semana) return [];

    let semanaCompleta = [...semana]; // Copiar la semana
    const diasFaltantes = 7 - semanaCompleta.length; // Días que faltan para completar la semana

    // Si hay días faltantes, agregarlos al inicio en lugar de al final
    for (let i = 0; i < diasFaltantes; i++) {
      semanaCompleta.unshift({
        fecha: 'empty', // Indicador de celda vacía
        nombre: '',
        dayNumber: '',
        monthNombre: '',
        yearName: '',
        esFeriado: false,
      });
    }

    return semanaCompleta;
  }
}
