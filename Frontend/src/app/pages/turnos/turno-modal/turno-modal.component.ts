import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService, Turno, TurnoPayload, TurnoPartidoPayload } from '../../../services/turno.service';
import { TiendaService, Tienda } from '../../../services/tienda.service';
import { ModalService } from '../../../services/modal.service';
import { Observable, map } from 'rxjs';
import Notiflix from 'notiflix';
import { AgregarTiendaModalComponent } from '../agregar-tienda-modal/agregar-tienda-modal.component';
import { GestionarTiendasModalComponent } from '../gestionar-tiendas-modal/gestionar-tiendas-modal.component';

@Component({
  selector: 'app-turno-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AgregarTiendaModalComponent, GestionarTiendasModalComponent],
  templateUrl: './turno-modal.component.html',
  styleUrls: ['./turno-modal.component.css']
})
export class TurnoModalComponent {
  @Input() mostrarModal: boolean = false;
  @Input() isModalVisible: boolean = false;
  @Input() turnoActual: Turno = this.resetTurno();
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


  constructor(
    private turnoService: TurnoService,
    private modalService: ModalService,
    private tiendaService: TiendaService
  ) {
    // Aplicar el ordenamiento a tiendas$ internamente
    this.tiendas$ = this.tiendasInput$.pipe(
      map((tiendas) => tiendas.sort((a, b) => this.customSort(a, b)))
    );
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

  cerrarModal(): void {
    this.isSubmitting = true;
    this.cerrarModalEvent.emit();
    setTimeout(() => {
      this.isSubmitting = false;
      this.errorHoraEntrada = null;
      this.errorHoraSalida = null;
      this.resetTurnoPartido();
    }, 300);
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

    operacion.subscribe({
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

    this.turnoService.addTurnoPartido(turnoPartido).subscribe({
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
        this.turnoService.deleteTurno(this.turnoActual.id!).subscribe({
          next: () => {
            this.turnoEliminado.emit();
            this.cerrarModal();
            Notiflix.Notify.success('Turno eliminado con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
          error: (error) => {
            Notiflix.Notify.failure('Error al eliminar el turno', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          }
        });
      },
      () => console.log('Eliminación cancelada')
    );
  }

  validarHorarioEntrada(): void {
    let hora = this.turnoActual.horaEntrada;
    if (!hora) {
      this.errorHoraEntrada = 'La hora de entrada es obligatoria.';
      return;
    }

    hora = this.formatearHora(hora);
    const [horas, minutos] = hora.split(':').map(Number);

    if (horas < 5 || horas > 22 || (horas === 22 && minutos > 0)) {
      this.errorHoraEntrada = 'La hora de entrada debe ser entre las 5:00 AM y las 10:00 PM.';
    } else {
      this.errorHoraEntrada = null;
    }
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
    let hora = this.turnoManana.horaEntrada;
    if (!hora) {
      this.errorHoraEntradaManana = 'La hora de entrada de mañana es obligatoria.';
      return;
    }

    hora = this.formatearHora(hora);
    const [horas, minutos] = hora.split(':').map(Number);

    if (horas < 5 || horas > 12 || (horas === 12 && minutos > 0)) {
      this.errorHoraEntradaManana = 'La hora de entrada de mañana debe ser entre las 5:00 AM y las 12:00 PM.';
    } else {
      this.errorHoraEntradaManana = null;
    }
  }

  validarHorarioSalidaManana(): void {
    let hora = this.turnoManana.horaSalida;
    if (!hora) {
      this.errorHoraSalidaManana = 'La hora de salida de mañana es obligatoria.';
      return;
    }

    hora = this.formatearHora(hora);
    const [horas, minutos] = hora.split(':').map(Number);

    if (horas < 8 || horas > 14 || (horas === 14 && minutos > 0)) {
      this.errorHoraSalidaManana = 'La hora de salida de mañana debe ser entre las 8:00 AM y las 2:00 PM.';
    } else {
      this.errorHoraSalidaManana = null;
    }
  }

  validarHorarioEntradaTarde(): void {
    let hora = this.turnoTarde.horaEntrada;
    if (!hora) {
      this.errorHoraEntradaTarde = 'La hora de entrada de tarde es obligatoria.';
      return;
    }

    hora = this.formatearHora(hora);
    const [horas, minutos] = hora.split(':').map(Number);

    if (horas < 13 || horas > 18 || (horas === 18 && minutos > 0)) {
      this.errorHoraEntradaTarde = 'La hora de entrada de tarde debe ser entre las 1:00 PM y las 6:00 PM.';
    } else {
      this.errorHoraEntradaTarde = null;
    }
  }

  validarHorarioSalidaTarde(): void {
    let hora = this.turnoTarde.horaSalida;
    if (!hora) {
      this.errorHoraSalidaTarde = 'La hora de salida de tarde es obligatoria.';
      return;
    }

    hora = this.formatearHora(hora);
    const [horas, minutos] = hora.split(':').map(Number);

    if (horas < 16 || horas > 22 || (horas === 22 && minutos > 0)) {
      this.errorHoraSalidaTarde = 'La hora de salida de tarde debe ser entre las 4:00 PM y las 10:00 PM.';
    } else {
      this.errorHoraSalidaTarde = null;
    }
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
    setTimeout(() => this.isModalAgregarTiendaVisible = true, 50);
  }

  cerrarModalAgregarTienda(): void {
    this.isModalAgregarTiendaVisible = false;
    setTimeout(() => this.mostrarModalAgregarTienda = false, 50);
  }

  abrirModalGestionarTiendas(): void {
    this.mostrarModalGestionarTiendas = true;
    setTimeout(() => this.isModalGestionarTiendasVisible = true, 50);
  }

  cerrarModalGestionarTiendas(): void {
    this.isModalGestionarTiendasVisible = false;
    setTimeout(() => this.mostrarModalGestionarTiendas = false, 50);
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
