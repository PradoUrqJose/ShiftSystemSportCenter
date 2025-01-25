import { TurnoPayload } from './../../services/turno.service';
import { Component, OnInit } from '@angular/core';
import { TurnoService, Turno } from '../../services/turno.service';
import {
  ColaboradorService,
  Colaborador,
} from '../../services/colaborador.service';
import { addDays, subDays, startOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  of,
  switchMap,
} from 'rxjs';
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
  turnos$: Observable<Turno[]> = of([]); // Observable de turnos
  diasSemana$: BehaviorSubject<DiaSemana[]> = new BehaviorSubject<DiaSemana[]>(
    []
  );
  semanaActual: Date = new Date();
  isSubmitting: boolean = false; // Bandera para deshabilitar el botón
  //? Manejo de MODAL
  mostrarModal: boolean = false; // Controla la visibilidad del modal
  isModalVisible: boolean = false; // Controla la animación del modal
  //* Validaciones de form
  errorHoraEntrada: string | null = null; // Para mostrar errores de hora de entrada
  errorHoraSalida: string | null = null; // Para mostrar errores de hora de salida
  turnoOriginal: Turno | null = null; // Almacena los datos originales del turno para comparar si se ha editado o no

  turnoActual: Turno = {
    id: 0, // Si no hay ID al inicio, puedes omitirlo o ponerlo como opcional
    nombreColaborador: '', // Nombre del colaborador
    dniColaborador: '', // DNI del colaborador
    nombreEmpresa: '', // Nombre de la empresa
    fecha: '', // Fecha del turno
    horaEntrada: '', // Hora de entrada
    horaSalida: '', // Hora de salida
    horasTrabajadas: 0, // Opcional, se calcula automáticamente
  };

  constructor(
    private turnoService: TurnoService,
    private colaboradorService: ColaboradorService
  ) {
    this.colaboradores$ = this.colaboradorService.getColaboradores(); // Obtener colaboradores
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

    this.diasSemana$.next(dias);

    // Usar switchMap para evitar múltiples suscripciones
    this.turnos$ = this.diasSemana$.pipe(
      switchMap(() => this.turnoService.getTurnosPorSemana(this.semanaActual))
    );

    this.turnos$.subscribe((turnos) => {
      console.log('Turnos obtenidos:', turnos);
    });
  }

  cambiarSemana(direccion: 'anterior' | 'siguiente'): void {
    this.semanaActual =
      direccion === 'anterior'
        ? subDays(this.semanaActual, 7)
        : addDays(this.semanaActual, 7);

    this.cargarSemana(); // Esto ya actualizará los turnos$
  }

  //? MODAL <-----------------------------

  resetearEstadoModal(): void {
    this.errorHoraEntrada = null; // Limpiar error de hora de entrada
    this.errorHoraSalida = null; // Limpiar error de hora de salida
    this.turnoOriginal = null; // Resetear turno original
    this.turnoActual = {
      id: 0, // ID del turno, inicializado en 0
      nombreColaborador: '', // Nombre del colaborador
      dniColaborador: '', // DNI del colaborador
      nombreEmpresa: '', // Nombre de la empresa
      fecha: '', // Fecha del turno
      horaEntrada: '', // Hora de entrada
      horaSalida: '', // Hora de salida
      horasTrabajadas: 0, // Horas trabajadas calculadas (opcional)
    }; // Resetear turno actual
  }

  abrirModal(colaboradorId: number, fecha: string): void {
    this.resetearEstadoModal(); // Limpiar estado anterior
    const colaborador = this.colaboradores$.pipe(
      map((colaboradores) => colaboradores.find((c) => c.id === colaboradorId))
    );

    colaborador.subscribe((col) => {
      if (col) {
        this.turnoActual = {
          id: 0, // Para agregar un nuevo turno, no hay ID todavía
          nombreColaborador: col.nombre, // Nombre del colaborador
          dniColaborador: col.dni, // DNI del colaborador
          nombreEmpresa: col.empresaNombre, // Nombre de la empresa
          empresaId: col.empresaId, // ID de la empresa asociada
          colaboradorId: col.id, // ID del colaborador
          fecha: fecha, // Fecha seleccionada
          horaEntrada: '', // Inicialmente vacío
          horaSalida: '', // Inicialmente vacío
          horasTrabajadas: 0, // Inicialmente 0
        };
      }
    });

    this.mostrarModal = true;
    setTimeout(() => {
      this.isModalVisible = true;
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
    this.isSubmitting = true; // Deshabilitar el botón durante la animación
    this.isModalVisible = false; // Desactivar la animación

    setTimeout(() => {
      this.mostrarModal = false; // Ocultar el modal completamente
      this.isSubmitting = false; // Rehabilitar el botón después de que termine la animación
    }, 300); // Debe coincidir con la duración de la animación (300ms)
  }

  guardarTurno(): void {
    if (this.isSubmitting) return; // Evitar múltiples envíos
    this.isSubmitting = true;

    this.validarHorarioEntrada();
    this.validarHorarioSalida();

    if (this.errorHoraEntrada || this.errorHoraSalida) {
      this.isSubmitting = false; // Rehabilitar el botón en caso de error
      return; // Si hay errores, no continúa
    }
    // Validación adicional de que la hora de salida es posterior a la hora de entrada
    const horaEntrada = this.formatearHora(this.turnoActual.horaEntrada);
    const horaSalida = this.formatearHora(this.turnoActual.horaSalida);
    if (horaEntrada >= horaSalida) {
      this.errorHoraSalida =
        'La hora de salida debe ser posterior a la hora de entrada.';
      this.isSubmitting = false; // Rehabilitar el botón en caso de error
      return; // Si la validación falla, no continúa
    }

    // Preparar datos para enviar al backend
    const turnoParaGuardar: TurnoPayload = {
      colaborador: { id: this.turnoActual.colaboradorId }, // Usar el ID del colaborador
      fecha: this.turnoActual.fecha,
      horaEntrada: this.turnoActual.horaEntrada,
      horaSalida: this.turnoActual.horaSalida,
      empresa: { id: this.turnoActual.empresaId! }, // Usar el ID de la empresa
    };

    console.log('Datos enviados al backend:', turnoParaGuardar);

    if (this.turnoActual.id) {
      // Actualizar turno existente
      this.turnoService
        .updateTurno(this.turnoActual.id, turnoParaGuardar)
        .subscribe({
          next: () => {
            this.turnos$ = this.turnoService.getTurnosPorSemana(
              this.semanaActual
            );
            this.cerrarModal();
            this.isSubmitting = false; // Rehabilitar el botón después de la operación
            Notiflix.Notify.success('Turno actualizado con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
          error: (error: any) => {
            this.isSubmitting = false; // Rehabilitar el botón en caso de error
            Notiflix.Notify.failure(
              error.error?.message || 'Error desconocido',
              {
                position: 'right-bottom',
                cssAnimationStyle: 'from-right',
              }
            );
          },
        });
    } else {
      // Si no hay ID, estamos creando un nuevo turno
      this.turnoService.addTurno(turnoParaGuardar).subscribe({
        next: () => {
          this.turnos$ = this.turnoService.getTurnosPorSemana(
            this.semanaActual
          );
          this.cerrarModal();
          this.isSubmitting = false; // Rehabilitar el botón después de la operación
          Notiflix.Notify.success('Turno creado con éxito', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        },
        error: (error: any) => {
          this.isSubmitting = false; // Rehabilitar el botón en caso de error
          console.log('Detalles del error:', error);
          Notiflix.Notify.failure(error.error?.message || 'Error desconocido', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        },
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
            this.turnos$ = this.turnoService.getTurnosPorSemana(
              this.semanaActual
            ); // Actualizar lista
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

  obtenerTurno(
    turnos: Turno[] | null,
    colaboradorId: number,
    fecha: string
  ): Turno | undefined {
    if (!turnos) return undefined; // Manejo de null
    return turnos.find(
      (turno) => turno.colaboradorId === colaboradorId && turno.fecha === fecha
    ); // Cambiar las llaves {} por paréntesis ()
  }

  sumarHoras(turnos: Turno[] | null, colaboradorId: number): string {
    if (!turnos) return '00:00';

    // Filtrar los turnos del colaborador
    const turnosColaborador = turnos.filter(
      (turno) => turno.colaboradorId === colaboradorId
    );

    // Sumar las horas trabajadas
    const totalHoras = turnosColaborador.reduce(
      (total, turno) => total + (turno.horasTrabajadas ?? 0),
      0
    );

    const horas = Math.floor(totalHoras);
    const minutos = Math.round((totalHoras - horas) * 60);

    return `${horas.toString().padStart(2, '0')}:${minutos
      .toString()
      .padStart(2, '0')}`;
  }

  formatearHora(hora: string): string {
    if (!hora) return '00:00';
    const [horas, minutos] = hora.split(':');
    return `${horas}:${minutos}`;
  }
}
