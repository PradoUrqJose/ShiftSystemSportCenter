import { CommonModule } from '@angular/common';
import { CalendarioService, DiaSemana } from './../../../services/calendario.service';
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
    private calendarioService: CalendarioService // Inyectar el servicio de calendario
  ) { }

  ngOnInit(): void {
    this.cargarFeriados(); // Cargar los feriados al inicializar
    this.completarSemana(this.diasSemana); // Completar la semana con días vacíos si es necesario
  }

  // Variable interna para almacenar los feriados
  feriados: Feriado[] = []; // Lista de feriados

  // Inputs para recibir datos del componente padre
  @Input() diasSemana: DiaSemana[] = []; // Días de la semana
  @Input() colaboradores: Colaborador[] = []; // Lista de colaboradores
  @Input() turnos: Turno[] = []; // Lista de turnos
  @Input() hideTotal: boolean = false;
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
    return this.calendarioService.formatearHoras(horasTrabajadas ?? 0);
  }

  // Método para formatear la hora
  formatearHora(hora: string | undefined): string {
    const horasTotales = hora ? parseFloat(hora) : 0;
    return this.calendarioService.formatearHoras(horasTotales);
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

  getHorasTotalesSemanaFormateadas(colaboradorId: number): string {
    // 1️⃣ Filtrar turnos solo de la semana actual que se está mostrando en `diasSemana`
    const turnosSemana = this.turnos.filter(turno =>
      this.diasSemana.some(dia => dia.fecha === turno.fecha) && turno.colaboradorId === colaboradorId
    );

    // 2️⃣ Sumar las horas trabajadas en esa semana estricta
    const horasTotales = turnosSemana.reduce((total, turno) => total + (turno.horasTrabajadas ?? 0), 0);

    // 3️⃣ Formatear usando el servicio
    return this.calendarioService.formatearHoras(horasTotales);
  }


  // Método para verificar si un colaborador tiene turnos en feriados
  tieneTurnosFeriados(colaboradorId: number): boolean {
    if (!this.turnos || !this.feriados) return false;
    return this.turnos.some(
      (turno) =>
        turno.colaboradorId === colaboradorId &&
        this.esFeriado(turno.fecha)
    );
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
