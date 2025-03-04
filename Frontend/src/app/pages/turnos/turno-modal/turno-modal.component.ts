import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService, Turno, TurnoPayload } from '../../../services/turno.service';
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
    }, 300);
  }

  guardarTurno(): void {
    if (this.isSubmitting) return;
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
      console.log("DESDEVALIDACION TIENDA: ", this.turnoActual);
    }

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
      tienda: { id: Number(this.turnoActual.tiendaId) }, // Convertir a número
    };

    const operacion = this.turnoActual.id
      ?  this.turnoService.updateTurno(this.turnoActual.id, turnoParaGuardar)
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

    console.log('Turno para guardar:', turnoParaGuardar);
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

  seRealizaronCambios(): boolean {
    if (!this.turnoOriginal) return true;

    return (
      this.turnoActual.horaEntrada !== this.turnoOriginal.horaEntrada ||
      this.turnoActual.horaSalida !== this.turnoOriginal.horaSalida ||
      this.turnoActual.fecha !== this.turnoOriginal.fecha ||
      this.turnoActual.tiendaId !== this.turnoOriginal.tiendaId
    );
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
