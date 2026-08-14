import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TiendaService, Tienda } from '../../../services/tienda.service';
import Notiflix from 'notiflix';
import { Observable, Subject, takeUntil } from 'rxjs';
import { MODAL_CLOSE_DELAY_MS } from '../../../utils/modal-timing';

@Component({
  selector: 'app-gestionar-tiendas-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestionar-tiendas-modal.component.html',
  styleUrls: ['./gestionar-tiendas-modal.component.css']
})
export class GestionarTiendasModalComponent implements OnDestroy {
  @Input() mostrarModal: boolean = false;
  @Input() isModalVisible: boolean = false;
  @Input() tiendas$: Observable<Tienda[]> = new Observable<Tienda[]>();
  @Output() cerrarModalEvent = new EventEmitter<void>();
  @Output() abrirAgregarTiendaEvent = new EventEmitter<void>();
  @Output() tiendaEditada = new EventEmitter<Tienda>();
  @Output() tiendaEliminada = new EventEmitter<void>();

  isLoading: boolean = false; // Indicador de carga
  errorMessage: string | null = null; // Mensaje de error

  private readonly destroy$ = new Subject<void>();

  constructor(private tiendaService: TiendaService) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cerrarModal(): void {
    this.isModalVisible = false;
    setTimeout(() => this.cerrarModalEvent.emit(), MODAL_CLOSE_DELAY_MS);
  }

  abrirModalAgregarTienda(): void {
    this.abrirAgregarTiendaEvent.emit();
  }

  editarTienda(tienda: Tienda): void {
    this.tiendaEditada.emit(tienda);
  }

  trackByTiendaId(_index: number, tienda: Tienda): number | undefined {
    return tienda.id;
  }

  eliminarTienda(id: number): void {
    this.isLoading = true;
    Notiflix.Confirm.show(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas eliminar esta tienda?',
      'Eliminar',
      'Cancelar',
      () => {
        this.tiendaService.deleteTienda(id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.tiendaEliminada.emit();
            this.isLoading = false;
            Notiflix.Notify.success('Tienda eliminada con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
          error: (err) => {
            this.errorMessage = err.message || 'Error al eliminar la tienda.';
            this.isLoading = false;
            Notiflix.Notify.failure(this.errorMessage || 'Error desconocido', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          }
        });
      },
      () => {
        this.isLoading = false;
      }
    );
  }
}
