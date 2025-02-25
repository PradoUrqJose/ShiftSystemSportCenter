import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TiendaService, Tienda } from '../../../services/tienda.service';
import Notiflix from 'notiflix';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-gestionar-tiendas-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestionar-tiendas-modal.component.html',
  styleUrls: ['./gestionar-tiendas-modal.component.css']
})
export class GestionarTiendasModalComponent {
  @Input() mostrarModal: boolean = false;
  @Input() isModalVisible: boolean = false;
  @Input() tiendas$: Observable<Tienda[]> = new Observable<Tienda[]>();

  @Output() cerrarModalEvent = new EventEmitter<void>();
  @Output() abrirAgregarTiendaEvent = new EventEmitter<void>();
  @Output() tiendaEditada = new EventEmitter<Tienda>();
  @Output() tiendaEliminada = new EventEmitter<void>();

  constructor(private tiendaService: TiendaService) {}

  cerrarModal(): void {
    this.isModalVisible = false;
    setTimeout(() => this.cerrarModalEvent.emit(), 300);
  }

  abrirModalAgregarTienda(): void {
    this.abrirAgregarTiendaEvent.emit();
  }

  editarTienda(tienda: Tienda): void {
    this.tiendaEditada.emit(tienda);
  }

  eliminarTienda(id: number): void {
    Notiflix.Confirm.show(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas eliminar esta tienda?',
      'Eliminar',
      'Cancelar',
      () => {
        this.tiendaService.deleteTienda(id).subscribe({
          next: () => {
            this.tiendaEliminada.emit();
            Notiflix.Notify.success('Tienda eliminada con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
          error: (error) => {
            Notiflix.Notify.failure('Error al eliminar la tienda', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          }
        });
      },
      () => console.log('Eliminación cancelada')
    );
  }
}
