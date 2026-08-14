import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService, Turno, TurnoPayload, TurnoPartidoPayload, crearTurnoVacio } from '../../../services/turno.service';
import { TiendaService, Tienda } from '../../../services/tienda.service';
import { Observable, Subject, map, takeUntil } from 'rxjs';
import Notiflix from 'notiflix';
import { AgregarTiendaModalComponent } from '../agregar-tienda-modal/agregar-tienda-modal.component';
import { GestionarTiendasModalComponent } from '../gestionar-tiendas-modal/gestionar-tiendas-modal.component';
import { MODAL_OPEN_DELAY_MS, MODAL_CLOSE_DELAY_MS } from '../../../utils/modal-timing';

@Component({
  selector: 'app-turno-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AgregarTiendaModalComponent, GestionarTiendasModalComponent],
  templateUrl: './turno-modal.component.html',
  styleUrls: ['./turno-modal.component.css']
})
export class TurnoModalComponent implements OnDestroy {
  @Input() mostrarModal: boolean = false;
  @Input() isModalVisible: boolean = false;
  @Input() turnoActual: Turno = crearTurnoVacio();
  @Input() turnoOriginal: Turno | null = null;
  @Input() tiendas$: Observable<Tienda[]> = new Observable<Tienda[]>();
  @Input() tiendasInput$: Observable<Tienda[]> = new Observable<Tienda[]>();

  @Output() cerrarModalEvent = new EventEmitter<void>();
  @Output() turnoGuardado = new EventEmitter<void>();
  @Output() turnoEliminado = new EventEmitter<void>();

  isSubmitting: boolean = false;
  errorHoraEntrada: string | null = null;
  errorHoraSalida: string | null = null;

  // Variables para turnos partidos
  esTurnoPartido: boolean = false;
  turnoManana = { horaEntrada: '', horaSalida: '' };
  turnoTarde = { horaEntrada: '', horaSalida: '' };
  errorHoraEntradaManana: string | null = null;
  errorHoraSalidaManana: string | null = null;
  errorHoraEntradaTarde: string | null = null;
  errorHoraSalidaTarde: string | null = null;

  // Control para deshabilitar turno partido en edición
  get isTurnoPartidoDisabled(): boolean {
    return !!this.turnoActual.id; // Deshabilitado si estamos editando
  }

  mostrarModalAgregarTienda: boolean = false;
  isModalAgregarTiendaVisible: boolean = false;
  mostrarModalGestionarTiendas: boolean = false;
  isModalGestionarTiendasVisible: boolean = false;
  tiendaActual: Tienda = { id: undefined, nombre: '', direccion: '' };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private turnoService: TurnoService,
    private tiendaService: TiendaService
  ) {
    // Aplicar el ordenamiento a tiendas$ internamente
    this.tiendas$ = this.tiendasInput$.pipe(
      map((tiendas) => tiendas.sort((a, b) => this.customSort(a, b)))
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cerrarModal(): void {
    this.isSubmitting = true;
    this.cerrarModalEvent.emit();
    setTimeout(() => {
      this.isSubmitting = false;
      this.errorHoraEntrada = null;
      this.errorHoraSalida = null;
      this.resetTurnoPartido();
    }, MODAL_CLOSE_DELAY_MS);
  }

  resetTurnoPartido(): void {
    this.esTurnoPartido = false;
    this.turnoManana = { horaEntrada: '', horaSalida: '' };
    this.turnoTarde = { horaEntrada: '', horaSalida: '' };
    this.errorHoraEntradaManana = null;
    this.errorHoraSalidaManana = null;
    this.errorHoraEntradaTarde = null;
    this.errorHoraSalidaTarde = null;
  }

  guardarTurno(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    // Limpiar errores
    this.errorHoraEntrada = null;
    this.errorHoraSalida = null;
    this.errorHoraEntradaManana = null;
    this.errorHoraSalidaManana = null;
    this.errorHoraEntradaTarde = null;
    this.errorHoraSalidaTarde = null;

    if (!this.turnoActual.tiendaId) {
      this.isSubmitting = false;
      Notiflix.Notify.failure('Debes seleccionar una tienda', {
        position: 'right-bottom',
        cssAnimationStyle: 'from-right',
      });
      return;
    }

    // Solo permitir turno partido al agregar (no al editar)
    if (this.esTurnoPartido && !this.turnoActual.id) {
      this.guardarTurnoPartido();
    } else {
      this.guardarTurnoSimple();
    }
  }

  private guardarTurnoSimple(): void {
    this.validarHorarioEntrada();
    this.validarHorarioSalida();

    if (this.errorHoraEntrada || this.errorHoraSalida) {
      this.isSubmitting = false;
      return;
    }

    const horaEntrada = this.formatearHora(this.turnoActual.horaEntrada);
    const horaSalida = this.formatearHora(this.turnoActual.horaSalida);
    if (horaEntrada >= horaSalida) {
      this.errorHoraSalida = 'La hora de salida debe ser posterior a la hora de entrada.';
      this.isSubmitting = false;
      return;
    }

    const turnoParaGuardar: TurnoPayload = {
      colaborador: { id: this.turnoActual.colaboradorId },
      fecha: this.turnoActual.fecha,
      horaEntrada: this.turnoActual.horaEntrada,
      horaSalida: this.turnoActual.horaSalida,
      empresa: { id: this.turnoActual.empresaId! },
      tienda: { id: Number(this.turnoActual.tiendaId) },
    };

    const operacion = this.turnoActual.id
      ? this.turnoService.updateTurno(this.turnoActual.id, turnoParaGuardar)
      : this.turnoService.addTurno(turnoParaGuardar);

    operacion.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.turnoGuardado.emit();
        this.cerrarModal();
        Notiflix.Notify.success(
          this.turnoActual.id ? 'Turno actualizado con éxito' : 'Turno creado con éxito',
          { position: 'right-bottom', cssAnimationStyle: 'from-right' }
        );
      },
      error: (err) => {
        this.isSubmitting = false;
        Notiflix.Notify.failure(err.message || 'Error al guardar el turno', {
          position: 'right-bottom',
          cssAnimationStyle: 'from-right',
        });
      }
    });
  }

  private guardarTurnoPartido(): void {
    this.validarTurnoPartido();

    if (this.errorHoraEntradaManana || this.errorHoraSalidaManana ||
        this.errorHoraEntradaTarde || this.errorHoraSalidaTarde) {
      this.isSubmitting = false;
      return;
    }

    const turnoPartido: TurnoPartidoPayload = {
      colaborador: { id: this.turnoActual.colaboradorId },
      fecha: this.turnoActual.fecha,
      empresa: { id: this.turnoActual.empresaId! },
      tienda: { id: Number(this.turnoActual.tiendaId) },
      turnoManana: {
        horaEntrada: this.turnoManana.horaEntrada,
        horaSalida: this.turnoManana.horaSalida
      },
      turnoTarde: {
        horaEntrada: this.turnoTarde.horaEntrada,
        horaSalida: this.turnoTarde.horaSalida
      }
    };

    this.turnoService.addTurnoPartido(turnoPartido).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.turnoGuardado.emit();
        this.cerrarModal();
        Notiflix.Notify.success('Turno partido creado con éxito', {
          position: 'right-bottom',
          cssAnimationStyle: 'from-right'
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        Notiflix.Notify.failure(err.message || 'Error al guardar el turno partido', {
          position: 'right-bottom',
          cssAnimationStyle: 'from-right',
        });
      }
    });
  }

  eliminarTurno(): void {
    if (!this.turnoActual.id) return;

    Notiflix.Confirm.show(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas eliminar este turno?',
      'Eliminar',
      'Cancelar',
      () => {
        this.turnoService.deleteTurno(this.turnoActual.id!).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.turnoEliminado.emit();
            this.cerrarModal();
            Notiflix.Notify.success('Turno eliminado con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
          error: () => {
            Notiflix.Notify.failure('Error al eliminar el turno', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          }
        });
      },
      () => {}
    );
  }

  // Antes cada validarHorarioX repetía el mismo cuerpo (obligatoriedad +
  // rango horas/minutos), solo cambiando los límites y el mensaje — este
  // helper compacta las 5 que comparten exactamente la misma forma
  // (`horas < min || horas > max || (horas === max && minutos > 0)`).
  // validarHorarioSalida (turno simple) queda aparte porque su regla es
  // distinta (permite cruzar medianoche) y no encaja en este patrón.
  private validarRangoHora(
    hora: string | undefined,
    minHora: number,
    maxHora: number,
    mensajeObligatoria: string,
    mensajeRango: string
  ): string | null {
    if (!hora) return mensajeObligatoria;

    const horaFormateada = this.formatearHora(hora);
    const [horas, minutos] = horaFormateada.split(':').map(Number);

    if (horas < minHora || horas > maxHora || (horas === maxHora && minutos > 0)) {
      return mensajeRango;
    }
    return null;
  }

  validarHorarioEntrada(): void {
    this.errorHoraEntrada = this.validarRangoHora(
      this.turnoActual.horaEntrada, 5, 22,
      'La hora de entrada es obligatoria.',
      'La hora de entrada debe ser entre las 5:00 AM y las 10:00 PM.'
    );
  }

  validarHorarioSalida(): void {
    let hora = this.turnoActual.horaSalida;
    if (!hora) {
      this.errorHoraSalida = 'La hora de salida es obligatoria.';
      return;
    }

    hora = this.formatearHora(hora);
    const [horas, minutos] = hora.split(':').map(Number);

    if (horas < 10 || (horas === 0 && minutos > 0) || horas > 24) {
      this.errorHoraSalida = 'La hora de salida debe ser entre las 10:00 AM y las 12:00 AM.';
    } else {
      this.errorHoraSalida = null;
    }
  }

  validarTurnoPartido(): void {
    // Validar turno de mañana
    this.validarHorarioEntradaManana();
    this.validarHorarioSalidaManana();

    // Validar turno de tarde
    this.validarHorarioEntradaTarde();
    this.validarHorarioSalidaTarde();

    // Validar que no se solapen los horarios
    if (!this.errorHoraEntradaManana && !this.errorHoraSalidaManana &&
        !this.errorHoraEntradaTarde && !this.errorHoraSalidaTarde) {
      this.validarSolapamientoHorarios();
    }
  }

  validarHorarioEntradaManana(): void {
    this.errorHoraEntradaManana = this.validarRangoHora(
      this.turnoManana.horaEntrada, 5, 12,
      'La hora de entrada de mañana es obligatoria.',
      'La hora de entrada de mañana debe ser entre las 5:00 AM y las 12:00 PM.'
    );
  }

  validarHorarioSalidaManana(): void {
    this.errorHoraSalidaManana = this.validarRangoHora(
      this.turnoManana.horaSalida, 8, 14,
      'La hora de salida de mañana es obligatoria.',
      'La hora de salida de mañana debe ser entre las 8:00 AM y las 2:00 PM.'
    );
  }

  validarHorarioEntradaTarde(): void {
    this.errorHoraEntradaTarde = this.validarRangoHora(
      this.turnoTarde.horaEntrada, 13, 18,
      'La hora de entrada de tarde es obligatoria.',
      'La hora de entrada de tarde debe ser entre las 1:00 PM y las 6:00 PM.'
    );
  }

  validarHorarioSalidaTarde(): void {
    this.errorHoraSalidaTarde = this.validarRangoHora(
      this.turnoTarde.horaSalida, 16, 22,
      'La hora de salida de tarde es obligatoria.',
      'La hora de salida de tarde debe ser entre las 4:00 PM y las 10:00 PM.'
    );
  }

  validarSolapamientoHorarios(): void {
    const salidaManana = this.formatearHora(this.turnoManana.horaSalida);
    const entradaTarde = this.formatearHora(this.turnoTarde.horaEntrada);

    if (salidaManana >= entradaTarde) {
      this.errorHoraSalidaManana = 'La salida de mañana debe ser anterior a la entrada de tarde.';
      this.errorHoraEntradaTarde = 'La entrada de tarde debe ser posterior a la salida de mañana.';
    }
  }

  seRealizaronCambios(): boolean {
    if (!this.turnoOriginal) return true;

    if (this.esTurnoPartido) {
      // Para turnos partidos, verificar que al menos uno de los campos esté lleno
      return (
        this.turnoManana.horaEntrada !== '' ||
        this.turnoManana.horaSalida !== '' ||
        this.turnoTarde.horaEntrada !== '' ||
        this.turnoTarde.horaSalida !== '' ||
        this.turnoActual.tiendaId !== this.turnoOriginal.tiendaId
      );
    } else {
      return (
        this.turnoActual.horaEntrada !== this.turnoOriginal.horaEntrada ||
        this.turnoActual.horaSalida !== this.turnoOriginal.horaSalida ||
        this.turnoActual.fecha !== this.turnoOriginal.fecha ||
        this.turnoActual.tiendaId !== this.turnoOriginal.tiendaId
      );
    }
  }

  formatearHora(hora: string | undefined): string {
    if (!hora) return '00:00';
    const [horas, minutos] = hora.split(':');
    return `${horas}:${minutos}`;
  }

  // Agregar Tienda
  abrirModalAgregarTienda(): void {
    this.mostrarModalAgregarTienda = true;
    setTimeout(() => this.isModalAgregarTiendaVisible = true, MODAL_OPEN_DELAY_MS);
  }

  cerrarModalAgregarTienda(): void {
    this.isModalAgregarTiendaVisible = false;
    // Antes desmontaba a los 50ms, cortando de golpe la transición CSS de
    // salida (dura 300ms, ver agregar-tienda-modal.component.html).
    setTimeout(() => this.mostrarModalAgregarTienda = false, MODAL_CLOSE_DELAY_MS);
  }

  abrirModalGestionarTiendas(): void {
    this.mostrarModalGestionarTiendas = true;
    setTimeout(() => this.isModalGestionarTiendasVisible = true, MODAL_OPEN_DELAY_MS);
  }

  cerrarModalGestionarTiendas(): void {
    this.isModalGestionarTiendasVisible = false;
    setTimeout(() => this.mostrarModalGestionarTiendas = false, MODAL_CLOSE_DELAY_MS);
  }

  manejarTiendaGuardada(): void {
    this.tiendas$ = this.tiendaService.getTiendas().pipe(
      map((tiendas) => tiendas.sort((a, b) => this.customSort(a, b)))
    );
  }

  manejarTiendaEliminada(): void {
    this.manejarTiendaGuardada();
  }

  manejarEditarTienda(tienda: Tienda): void {
    this.tiendaActual = { ...tienda };
    this.abrirModalAgregarTienda();
  }

  trackByTiendaId(_index: number, tienda: Tienda): number | undefined {
    return tienda.id;
  }

  private customSort(a: Tienda, b: Tienda): number {
    const numA = this.extractNumber(a.nombre);
    const numB = this.extractNumber(b.nombre);
    if (numA !== null && numB !== null) return numA - numB;
    else if (numA !== null) return -1;
    else if (numB !== null) return 1;
    else return a.nombre.localeCompare(b.nombre);
  }

  private extractNumber(nombre: string): number | null {
    const match = nombre.match(/Tienda (\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }


}
