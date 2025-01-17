import { Component, OnInit } from '@angular/core';
import { TurnoService, Turno } from '../../services/turno.service';
import {
  ColaboradorService,
  Colaborador,
} from '../../services/colaborador.service';
import { addDays, subDays, startOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Notiflix from 'notiflix';

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
  diasSemana$: BehaviorSubject<DiaSemana[]> = new BehaviorSubject<DiaSemana[]>(
    []
  ); // Semana observable
  semanaActual: Date = new Date();

  //? Manejo de MODAL
  mostrarModal: boolean = false; // Controla la visibilidad del modal
  isModalVisible: boolean = false; // Controla la animación del modal
  //* Validaciones de form
  errorHoraEntrada: string | null = null; // Para mostrar errores de hora de entrada
  errorHoraSalida: string | null = null; // Para mostrar errores de hora de salida
  turnoOriginal: Turno | null = null; // Almacena los datos originales del turno para comparar si se ha editado o no

  turnoActual: Turno = {
    colaborador: { id: 0, nombre: '' },
    fecha: '',
    horaEntrada: '',
    horaSalida: '',
  }; // Datos del turno actual

  constructor(
    private turnoService: TurnoService,
    private colaboradorService: ColaboradorService
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
        yearName: format(fecha, 'yyyy'),
      };
    });
    this.diasSemana$.next(dias); // Actualizamos los días de la semana
  }

  cambiarSemana(direccion: 'anterior' | 'siguiente'): void {
    this.semanaActual =
      direccion === 'anterior'
        ? subDays(this.semanaActual, 7)
        : addDays(this.semanaActual, 7);
    this.cargarSemana();
    this.turnos$ = this.turnoService.getTurnosPorSemana(this.semanaActual); // Actualizamos los turnos
  }

  //? MODAL <-----------------------------

  resetearEstadoModal(): void {
    this.errorHoraEntrada = null; // Limpiar error de hora de entrada
    this.errorHoraSalida = null; // Limpiar error de hora de salida
    this.turnoOriginal = null; // Resetear turno original
    this.turnoActual = {
      colaborador: { id: 0, nombre: '' },
      fecha: '',
      horaEntrada: '',
      horaSalida: '',
    }; // Resetear turno actual
  }

  abrirModal(colaboradorId: number, fecha: string): void {
    this.resetearEstadoModal(); // Resetear estado del modal
    this.turnoActual = {
      colaborador: { id: colaboradorId, nombre: '' },
      fecha: fecha,
      horaEntrada: '',
      horaSalida: '',
    };
    this.mostrarModal = true;
    setTimeout(() => {
      this.isModalVisible = true; // Activar la animación
    }, 50);
  }

  abrirModalEdicion(turno: Turno): void {
    this.resetearEstadoModal(); // Resetear estado del modal
    this.turnoOriginal = { ...turno }; // Guardar el turno original para comparación
    this.turnoActual = { ...turno }; // Copiar datos existentes para edición
    this.mostrarModal = true;
    setTimeout(() => {
      this.isModalVisible = true; // Activar la animación
    }, 50);
  }

  cerrarModal(): void {
    this.isModalVisible = false; // Desactivar la animación
    setTimeout(() => {
      this.mostrarModal = false; // Ocultar el modal completamente
    }, 300); // Debe coincidir con la duración de la animación (300ms)
  }

  guardarTurno(): void {
    this.validarHorarioEntrada();
    this.validarHorarioSalida();

    if (this.errorHoraEntrada || this.errorHoraSalida) {
      return; // Si hay errores, no continúa
    }

    // Formatear hora de entrada y salida para incluir solo HH:mm
    this.turnoActual.horaEntrada = this.formatearHora(
      this.turnoActual.horaEntrada
    );
    this.turnoActual.horaSalida = this.formatearHora(
      this.turnoActual.horaSalida
    );

    if (this.turnoActual.id) {
      // Actualizar turno existente
      this.turnoService
        .updateTurno(this.turnoActual.id, this.turnoActual)
        .subscribe(() => {
          this.turnos$ = this.turnoService.getTurnosPorSemana(
            this.semanaActual
          );
          this.cerrarModal();
        });
    } else {
      // Crear nuevo turno
      this.turnoService.addTurno(this.turnoActual).subscribe(() => {
        this.turnos$ = this.turnoService.getTurnosPorSemana(this.semanaActual);
        this.cerrarModal();
      });
    }
  }

  eliminarTurno(): void {
    if (this.turnoActual.id) {
      Notiflix.Confirm.show(
        'Confirmar Eliminación', // Título del modal
        '¿Estás seguro de que deseas eliminar este turno?', // Mensaje
        'Eliminar', // Texto del botón "Eliminar"
        'Cancelar', // Texto del botón "Cancelar"
        () => {
          // Acción al confirmar
          this.turnoService.deleteTurno(this.turnoActual.id!).subscribe(() => {
            this.turnos$ = this.turnoService.getTurnosPorSemana(this.semanaActual); // Actualizar lista
            this.cerrarModal(); // Cerrar el modal
          });
        },
        () => {
          // Acción al cancelar
          console.log('Eliminación cancelada');
        }
      );
    }
  }

  //* VALIDACIONES <-----------

  validarHorarioEntrada(): void {
    let hora = this.turnoActual.horaEntrada;
    if (!hora) {
      this.errorHoraEntrada = 'La hora de entrada es obligatoria.';
      return;
    }

    hora = this.formatearHora(hora); // Limpiar segundos
    const [horas, minutos] = hora.split(':').map(Number);

    if (horas < 5 || horas > 22 || (horas === 22 && minutos > 0)) {
      this.errorHoraEntrada =
        'La hora de entrada debe ser entre las 5:00 AM y las 10:00 PM.';
    } else {
      this.errorHoraEntrada = null; // Sin errores
    }
  }

  validarHorarioSalida(): void {
    let hora = this.turnoActual.horaSalida;
    if (!hora) {
      this.errorHoraSalida = 'La hora de salida es obligatoria.';
      return;
    }

    hora = this.formatearHora(hora); // Limpiar segundos
    const [horas, minutos] = hora.split(':').map(Number);

    if (horas < 10 || (horas === 0 && minutos > 0) || horas > 24) {
      this.errorHoraSalida =
        'La hora de salida debe ser entre las 10:00 AM y las 12:00 AM.';
    } else {
      this.errorHoraSalida = null; // Sin errores
    }
  }

  seRealizaronCambios(): boolean {
    if (!this.turnoOriginal) {
      return true; // Si no hay un turno original (modo agregar), se permite guardar
    }

    return (
      this.turnoActual.horaEntrada !== this.turnoOriginal.horaEntrada ||
      this.turnoActual.horaSalida !== this.turnoOriginal.horaSalida ||
      this.turnoActual.fecha !== this.turnoOriginal.fecha
    );
  }
  //* ------------------------->

  //? --- --- --- --- --- ---
  obtenerTurno(
    turnos: Turno[] | null,
    colaboradorId: number,
    fecha: string
  ): Turno | undefined {
    if (!turnos) return undefined; // Manejo de null
    return turnos.find(
      (turno) => turno.colaborador.id === colaboradorId && turno.fecha === fecha
    );
  }

  sumarHoras(turnos: Turno[] | null, colaboradorId: number): string {
    if (!turnos) return '00:00'; // Manejo de null
    const turnosColaborador = turnos.filter(
      (t) => t.colaborador.id === colaboradorId
    );
    const totalHoras = turnosColaborador.reduce(
      (total, turno) => total + (turno.horasTrabajadas ?? 0),
      0
    );
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
