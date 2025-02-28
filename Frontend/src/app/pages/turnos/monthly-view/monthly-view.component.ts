import { CommonModule } from '@angular/common';
import { CalendarioService, DiaSemana } from './../../../services/calendario.service';
import { ResumenMensual, Turno, TurnoService } from './../../../services/turno.service';
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
  @Input() mes: number = new Date().getMonth() + 1; // Nuevo Input para el mes (default: mes actual)
  @Input() anio: number = new Date().getFullYear(); // Nuevo Input para el año (default: año actual)

  // Outputs para emitir eventos al componente padre
  @Output() abrirModal = new EventEmitter<{ colaboradorId: number; fecha: string }>();
  @Output() abrirModalEdicion = new EventEmitter<Turno>();


  // Nueva propiedad para el resumen mensual
  resumenMensual: ResumenMensual | undefined;

  constructor(
    private turnoService: TurnoService,
    private feriadoService: FeriadoService, // Inyectar el servicio de feriados
    private calendarioService: CalendarioService
  ) { }

  ngOnInit(): void {
    this.cargarFeriados(); // Cargar los feriados al inicializar
    this.cargarResumenMensual(); // Cargar el resumen al iniciar
  }

  // Detectar cambios en el colaborador seleccionado o mes/año
  ngOnChanges(): void {
    if (this.colaboradorSeleccionado && this.mes && this.anio) {
      this.cargarResumenMensual();
    }
  }

  // Método para cargar el resumen mensual del colaborador seleccionado
  cargarResumenMensual(): void {
    if (this.colaboradorSeleccionado) {
      this.turnoService
        .getResumenMensual(this.mes, this.anio, [this.colaboradorSeleccionado])
        .subscribe({
          next: (resumenes) => {
            this.resumenMensual = resumenes[0]; // Tomamos el primer elemento ya que es un colaborador específico
            console.log('Resumen mensual cargado:', this.resumenMensual);
          },
          error: (error) => {
            console.error('Error al cargar el resumen mensual:', error);
            this.resumenMensual = undefined; // Resetear en caso de error
          },
        });
    }
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
  formatearHora(hora: string | undefined, type?: boolean): string {
    return this.calendarioService.formatearHoras(parseFloat(hora ?? '0'), type);
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
