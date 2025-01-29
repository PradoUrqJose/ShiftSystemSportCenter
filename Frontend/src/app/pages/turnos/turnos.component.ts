import { TurnoPayload } from './../../services/turno.service';
import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
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
import { TiendaService, Tienda } from '../../services/tienda.service';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // Importa el CSS de Tippy
import 'tippy.js/animations/shift-away-extreme.css'; // Importa la animación de Tippy
import 'tippy.js/themes/light.css'; // Importa el tema de Tippy

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
export default class TurnosComponent implements OnInit, AfterViewInit {
  colaboradores$: Observable<Colaborador[]>; // Observable de colaboradores
  turnos$: Observable<Turno[]> = of([]); // Observable de turnos
  tiendas$: Observable<Tienda[]> = of([]);
  diasSemana$: BehaviorSubject<DiaSemana[]> = new BehaviorSubject<DiaSemana[]>(
    []
  );
  semanaActual: Date = new Date();
  isSubmitting: boolean = false; // Bandera para deshabilitar el botón
  //? Manejo de MODAL
  mostrarModal: boolean = false; // Controla la visibilidad del modal
  isModalVisible: boolean = false; // Controla la animación del modal

  // Variables para el modal de Agregar Tienda
  mostrarModalAgregarTienda: boolean = false;
  isModalAgregarTiendaVisible: boolean = false;

  // Variables para el modal de Gestionar Tiendas
  mostrarModalGestionarTiendas: boolean = false;
  isModalGestionarTiendasVisible: boolean = false;

  //* Validaciones de form
  errorHoraEntrada: string | null = null; // Para mostrar errores de hora de entrada
  errorHoraSalida: string | null = null; // Para mostrar errores de hora de salida
  turnoOriginal: Turno | null = null; // Almacena los datos originales del turno para comparar si se ha editado o no
  tiendaActual: Tienda = this.resetTienda();
  turnoActual: Turno = this.resetTurno();

  constructor(
    private turnoService: TurnoService,
    private colaboradorService: ColaboradorService,
    private tiendaService: TiendaService,
    private cdr: ChangeDetectorRef
  ) {
    this.colaboradores$ =
      this.colaboradorService.getColaboradoresPorHabilitacion(true); // Obtener colaboradores
  }

  ngOnInit(): void {
    this.cargarSemana();
    this.cargarTiendas();
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
    setTimeout(() => {
      this.inicializarTooltips();
    }, 0);
  }

  inicializarTooltips(): void {
    const elementosTurnos = document.querySelectorAll('.container-green');
    console.log(elementosTurnos);
    elementosTurnos.forEach((elemento) => {
      const horasTrabajadas = elemento.getAttribute('data-horas-trabajadas');
      const tiendaNombre = elemento.getAttribute('data-tienda');
      tippy(elemento, {
        content: `
          <div class="p-2  flex justify-center flex-col text-center">
            <div class="font-bold mb-2 text-gray-800">Información del Turno</div>
            <div class="mb-1 text-gray-700 text-sm"><strong>Total horas:</strong> ${horasTrabajadas}</div>
            <div class="text-gray-700 font-bold">${tiendaNombre}</div>
          </div>
        `,
        placement: 'top',
        arrow: true,
        theme: 'custom', // Aplica el tema personalizado
        animation: 'shift-away-extreme',
        delay: [50, 200], // 50ms de retraso al mostrar, 200ms al ocultar
        allowHTML: true, // Permitir HTML en el contenido del tooltip
      });
    });
  }

  esDiaActual(fecha: string): boolean {
    const hoy = new Date();
    const [year, month, day] = fecha.split('-').map(Number); // Dividir y convertir a números
    const fechaComparar = new Date(year, month - 1, day); // Meses son 0-indexados en JavaScript

    console.log(fecha + ' - ' + fechaComparar);

    // Normalizar ambas fechas a medianoche
    hoy.setHours(0, 0, 0, 0);
    fechaComparar.setHours(0, 0, 0, 0);

    return hoy.getTime() === fechaComparar.getTime();
  }

  resetTurno(): Turno {
    return {
      id: 0,
      nombreColaborador: '',
      dniColaborador: '',
      nombreEmpresa: '',
      fecha: '',
      horaEntrada: '',
      horaSalida: '',
      horasTrabajadas: 0,
      tiendaId: null,
    };
  }

  resetTienda(): Tienda {
    return { id: 0, nombre: '', direccion: '' };
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

    this.turnos$.subscribe(() => {
      setTimeout(() => this.inicializarTooltips(), 500); // Inicializa tooltips después de que los datos se carguen
    });

    this.turnos$.subscribe((turnos) => {
      console.log('Turnos obtenidos:', turnos);
    });
  }

  cargarTiendas(): void {
    this.tiendas$ = this.tiendaService
      .getTiendas()
      .pipe(map((tiendas) => tiendas.sort((a, b) => this.customSort(a, b))));
  }

  //? Sorting Tiendas <----------------

  private customSort(a: Tienda, b: Tienda): number {
    const numA = this.extractNumber(a.nombre);
    const numB = this.extractNumber(b.nombre);

    // Caso 1: Ambos son Tienda numerada
    if (numA !== null && numB !== null) {
      return numA - numB;
    }
    // Caso 2: Solo A es Tienda numerada
    else if (numA !== null) {
      return -1;
    }
    // Caso 3: Solo B es Tienda numerada
    else if (numB !== null) {
      return 1;
    }
    // Caso 4: Ninguno es Tienda numerada - orden alfabético
    else {
      return a.nombre.localeCompare(b.nombre);
    }
  }

  private extractNumber(nombre: string): number | null {
    const match = nombre.match(/Tienda (\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  //? <------------------------
  cambiarSemana(direccion: 'anterior' | 'siguiente'): void {
    this.semanaActual =
      direccion === 'anterior'
        ? subDays(this.semanaActual, 7)
        : addDays(this.semanaActual, 7);

    this.cargarSemana(); // Esto ya actualizará los turnos$
  }

  //? MODAL <-----------------------------

  abrirModal(colaboradorId: number, fecha: string): void {
    this.resetearEstadoModal();
    this.colaboradores$
      .pipe(
        map((colaboradores) =>
          colaboradores.find((c) => c.id === colaboradorId)
        )
      )
      .subscribe((col) => {
        if (col) {
          this.turnoActual = {
            id: 0,
            nombreColaborador: col.nombre,
            dniColaborador: col.dni,
            nombreEmpresa: col.empresaNombre,
            empresaId: col.empresaId,
            colaboradorId: col.id,
            fecha: fecha,
            horaEntrada: '',
            horaSalida: '',
            horasTrabajadas: 0,
            tiendaId: null,
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
    this.turnoOriginal = {
      ...turno,
      tiendaId: turno.tiendaId, // Asegurar que se copie el tiendaId
    };
    this.turnoActual = {
      ...turno,
      tiendaId: turno.tiendaId,
    };
    this.mostrarModal = true;
    setTimeout(() => {
      this.isModalVisible = true; // Activar la animación
    }, 50);
  }

  abrirModalAgregarTienda(): void {
    // Cerrar primero el modal de gestión si está abierto
    if (this.mostrarModalGestionarTiendas) {
      this.cerrarModalGestionarTiendas();
    }

    this.mostrarModalAgregarTienda = true;
    setTimeout(() => {
      this.isModalAgregarTiendaVisible = true;
    }, 50);
  }

  cerrarModalAgregarTienda(): void {
    this.isModalAgregarTiendaVisible = false;
    setTimeout(() => {
      this.mostrarModalAgregarTienda = false;
      this.tiendaActual = this.resetTienda(); // Resetear formulario
    }, 300);
  }

  abrirModalGestionarTiendas(): void {
    // Cerrar primero el modal de agregar si está abierto
    if (this.mostrarModalAgregarTienda) {
      this.cerrarModalAgregarTienda();
    }

    this.mostrarModalGestionarTiendas = true;
    setTimeout(() => {
      this.isModalGestionarTiendasVisible = true;
    }, 50);
  }

  cerrarModalGestionarTiendas(): void {
    this.isModalGestionarTiendasVisible = false;
    setTimeout(() => {
      this.mostrarModalGestionarTiendas = false;
    }, 300);
  }

  cerrarModal(): void {
    this.isSubmitting = true; // Deshabilitar el botón durante la animación
    this.isModalVisible = false; // Desactivar la animación

    setTimeout(() => {
      this.mostrarModal = false; // Ocultar el modal completamente
      this.isSubmitting = false; // Rehabilitar el botón después de que termine la animación
    }, 300); // Debe coincidir con la duración de la animación (300ms)
  }

  resetearEstadoModal(): void {
    this.errorHoraEntrada = null; // Limpiar error de hora de entrada
    this.errorHoraSalida = null; // Limpiar error de hora de salida
    this.turnoOriginal = null; // Resetear turno original
    this.turnoActual = this.resetTurno();
  }

  guardarTurno(): void {
    if (this.isSubmitting) return; // Evitar múltiples envíos
    this.isSubmitting = true;

    this.errorHoraEntrada = null;
    this.errorHoraSalida = null;

    this.validarHorarioEntrada();
    this.validarHorarioSalida();

    if (!this.turnoActual.tiendaId) {
      this.isSubmitting = false;
      Notiflix.Notify.failure('Debes seleccionar una tienda', {
        position: 'right-bottom',
        cssAnimationStyle: 'from-right',
      });
      return;
    }

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
      tienda: { id: this.turnoActual.tiendaId! },
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
            setTimeout(() => this.inicializarTooltips(), 500); // Inicializa tooltips después de que los datos se carguen
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
          setTimeout(() => this.inicializarTooltips(), 500); // Inicializa tooltips después de que los datos se carguen
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
            setTimeout(() => this.inicializarTooltips(), 50); // Inicializa tooltips después de que los datos se carguen
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
      this.turnoActual.fecha !== this.turnoOriginal.fecha ||
      this.turnoActual.tiendaId !== this.turnoOriginal.tiendaId
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

  sumarHorasDia(number: number | undefined): string {
    if (!number) return '00:00';

    const horas = Math.floor(number);
    const minutos = Math.round((number - horas) * 60);

    return `${horas.toString().padStart(2, '0')}:${minutos
      .toString()
      .padStart(2, '0')}`;
  }

  guardarTienda(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    if (this.tiendaActual.id) {
      this.tiendaService
        .updateTienda(this.tiendaActual.id, this.tiendaActual)
        .subscribe({
          next: () => {
            this.cargarTiendas();
            this.cerrarModalAgregarTienda();
            this.isSubmitting = false;
            Notiflix.Notify.success('Tienda actualizada con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
          error: (error) => {
            this.isSubmitting = false;
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
      this.tiendaService.addTienda(this.tiendaActual).subscribe({
        next: () => {
          this.cargarTiendas();
          this.cerrarModalAgregarTienda();
          this.isSubmitting = false;
          Notiflix.Notify.success('Tienda creada con éxito', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        },
        error: (error) => {
          this.isSubmitting = false;
          Notiflix.Notify.failure(error.error?.message || 'Error desconocido', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        },
      });
    }
  }

  editarTienda(tienda: Tienda): void {
    this.tiendaActual = { ...tienda };
    this.abrirModalAgregarTienda();
  }

  eliminarTienda(id: number): void {
    Notiflix.Confirm.show(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas eliminar esta tienda?',
      'Eliminar',
      'Cancelar',
      () => {
        this.tiendaService.deleteTienda(id).subscribe(() => {
          this.cargarTiendas();
          Notiflix.Notify.success('Tienda eliminada con éxito', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        });
      },
      () => {
        console.log('Eliminación cancelada');
      }
    );
  }
}
