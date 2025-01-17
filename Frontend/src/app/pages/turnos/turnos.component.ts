import { Component, OnInit } from '@angular/core';
import { TurnoService, Turno } from '../../services/turno.service';
import { ColaboradorService, Colaborador } from '../../services/colaborador.service';
import { addDays, subDays, startOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DiaSemana {
  fecha: string;
  nombre: string;
  dayNumber: string;
  monthNombre: string;
  yearName: string;
}

@Component({
  selector: 'app-turnos',
  templateUrl: './turnos.component.html',
  standalone: true,
  styleUrls: ['./turnos.component.css'],
  imports: [CommonModule, FormsModule],
})
export default class TurnosComponent implements OnInit {
  colaboradores$: Observable<Colaborador[]>; // Observable de colaboradores
  turnos$: Observable<Turno[]>; // Observable de turnos
  diasSemana$: BehaviorSubject<DiaSemana[]> = new BehaviorSubject<DiaSemana[]>([]); // Semana observable
  semanaActual: Date = new Date();
  mostrarModal: boolean = false; // Controla la visibilidad del modal
  turnoActual: Turno = {
    colaborador: { id: 0, nombre: ''},
    fecha: '',
    horaEntrada: '',
    horaSalida: ''
  }; // Datos del turno actual


  constructor(
    private turnoService: TurnoService,
    private colaboradorService: ColaboradorService,
  ) {
    this.colaboradores$ = this.colaboradorService.getColaboradores(); // Obtener colaboradores
    this.turnos$ = this.turnoService.getTurnosPorSemana(this.semanaActual); // Obtener turnos iniciales
  }

  ngOnInit(): void {
    this.cargarSemana();
  }

  cargarSemana(): void {
    const inicioSemana = startOfWeek(this.semanaActual, { weekStartsOn: 1 });
    const dias = Array.from({ length: 7 }, (_, i) => {
      const fecha = addDays(inicioSemana, i);
      return {
        fecha: format(fecha, 'yyyy-MM-dd'),
        nombre: format(fecha, 'EEE', { locale: es }),
        dayNumber: format(fecha, 'dd'),
        monthNombre: format(fecha, 'MMMM', { locale: es }),
        yearName: format(fecha, 'yyyy')
      };
    });
    this.diasSemana$.next(dias); // Actualizamos los días de la semana
  }

  cambiarSemana(direccion: 'anterior' | 'siguiente'): void {
    this.semanaActual = direccion === 'anterior'
      ? subDays(this.semanaActual, 7)
      : addDays(this.semanaActual, 7);
    this.cargarSemana();
    this.turnos$ = this.turnoService.getTurnosPorSemana(this.semanaActual); // Actualizamos los turnos
  }

  abrirModal(colaboradorId: number, fecha: string): void {
    this.turnoActual = {
      colaborador: { id: colaboradorId, nombre: ''},
      fecha: fecha,
      horaEntrada: '',
      horaSalida: ''
    };
    this.mostrarModal = true; // Abre el modal
  }

  abrirModalEdicion(turno: Turno): void {
    this.turnoActual = { ...turno }; // Copia los datos del turno existente
    this.mostrarModal = true; // Abre el modal
  }

  cerrarModal(): void {
    this.mostrarModal = false; // Cierra el modal
  }

  guardarTurno(): void {
    if (this.turnoActual.id) {
      // Actualizar turno existente
      this.turnoService.updateTurno(this.turnoActual.id, this.turnoActual).subscribe(() => {
        this.turnos$ = this.turnoService.getTurnosPorSemana(this.semanaActual); // Actualizar lista
        this.cerrarModal();
      });
    } else {
      // Crear nuevo turno
      this.turnoService.addTurno(this.turnoActual).subscribe(() => {
        this.turnos$ = this.turnoService.getTurnosPorSemana(this.semanaActual); // Actualizar lista
        this.cerrarModal();
      });
    }
  }

  obtenerTurno(turnos: Turno[] | null, colaboradorId: number, fecha: string): Turno | undefined {
    if (!turnos) return undefined; // Manejo de null
    return turnos.find(turno => turno.colaborador.id === colaboradorId && turno.fecha === fecha);
  }

  sumarHoras(turnos: Turno[] | null, colaboradorId: number): string {
    if (!turnos) return '00:00'; // Manejo de null
    const turnosColaborador = turnos.filter(t => t.colaborador.id === colaboradorId);
    const totalHoras = turnosColaborador.reduce((total, turno) => total + (turno.horasTrabajadas ?? 0), 0);
    const horas = Math.floor(totalHoras);
    const minutos = Math.round((totalHoras - horas) * 60);

    // Formatear horas y minutos a dos dígitos
    const horasFormateadas = horas.toString().padStart(2, '0');
    const minutosFormateados = minutos.toString().padStart(2, '0');

    return `${horasFormateadas}:${minutosFormateados}`;
  }

  formatearHora(hora: string): string {
    if (!hora) return '00:00';
    const [horas, minutos] = hora.split(':');
    return `${horas}:${minutos}`;
  }
}
