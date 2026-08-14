import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Notiflix from 'notiflix';
import { Subject, takeUntil } from 'rxjs';
import { TurnoPredeterminado, TurnoPredeterminadoService } from '../../../services/turno-predeterminado.service';
import { MODAL_CLOSE_DELAY_MS } from '../../../utils/modal-timing';

// Lista + alta + baja en un solo panel (a diferencia de Tienda, que separa
// "gestionar" de "agregar" en dos modales): una plantilla son solo 2 campos
// de hora, no justifica un formulario aparte. Sin edición por ahora — para
// cambiar un horario se borra y se agrega de nuevo, ver decisión en el mock
// validado con Jose.
@Component({
  selector: 'app-gestionar-turnos-predeterminados-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestionar-turnos-predeterminados-modal.component.html',
  styleUrls: ['./gestionar-turnos-predeterminados-modal.component.css'],
})
export class GestionarTurnosPredeterminadosModalComponent implements OnDestroy {
  @Input() mostrarModal: boolean = false;
  @Input() isModalVisible: boolean = false;
  @Input() plantillas: TurnoPredeterminado[] = [];

  @Output() cerrarModalEvent = new EventEmitter<void>();
  @Output() plantillaGuardada = new EventEmitter<void>();
  @Output() plantillaEliminada = new EventEmitter<void>();

  nuevaHoraEntrada: string = '';
  nuevaHoraSalida: string = '';
  isSubmitting: boolean = false;
  errorMessage: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(private turnoPredeterminadoService: TurnoPredeterminadoService) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cerrarModal(): void {
    this.isModalVisible = false;
    setTimeout(() => {
      this.cerrarModalEvent.emit();
      this.nuevaHoraEntrada = '';
      this.nuevaHoraSalida = '';
      this.errorMessage = null;
    }, MODAL_CLOSE_DELAY_MS);
  }

  trackByPlantillaId(_index: number, plantilla: TurnoPredeterminado): number | undefined {
    return plantilla.id;
  }

  agregarPlantilla(): void {
    this.errorMessage = null;
    if (!this.nuevaHoraEntrada || !this.nuevaHoraSalida) {
      this.errorMessage = 'Completa la hora de entrada y de salida.';
      return;
    }
    if (this.nuevaHoraEntrada >= this.nuevaHoraSalida) {
      this.errorMessage = 'La hora de entrada debe ser anterior a la de salida.';
      return;
    }
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    this.turnoPredeterminadoService
      .addTurnoPredeterminado({ horaEntrada: this.nuevaHoraEntrada, horaSalida: this.nuevaHoraSalida })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.nuevaHoraEntrada = '';
          this.nuevaHoraSalida = '';
          this.plantillaGuardada.emit();
          Notiflix.Notify.success('Plantilla agregada con éxito', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err.message || 'Error al agregar la plantilla.';
          Notiflix.Notify.failure(this.errorMessage || 'Error desconocido', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        },
      });
  }

  eliminarPlantilla(id: number | undefined): void {
    if (!id) return;
    Notiflix.Confirm.show(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas eliminar esta plantilla?',
      'Eliminar',
      'Cancelar',
      () => {
        this.turnoPredeterminadoService.deleteTurnoPredeterminado(id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.plantillaEliminada.emit();
            Notiflix.Notify.success('Plantilla eliminada con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
          error: (err) => {
            Notiflix.Notify.failure(err.message || 'Error al eliminar la plantilla', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
        });
      },
      () => {}
    );
  }

  formatearHora(hora: string | undefined): string {
    if (!hora) return '00:00';
    const [horas, minutos] = hora.split(':');
    return `${horas}:${minutos}`;
  }
}
