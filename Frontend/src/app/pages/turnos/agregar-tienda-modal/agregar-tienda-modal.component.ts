import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TiendaService, Tienda } from '../../../services/tienda.service';
import Notiflix from 'notiflix';

  @Component({
    selector: 'app-agregar-tienda-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './agregar-tienda-modal.component.html',
    styleUrls: ['./agregar-tienda-modal.component.css']
  })
  export class AgregarTiendaModalComponent {
    @Input() mostrarModal: boolean = false;
    @Input() isModalVisible: boolean = false;
    @Input() tiendaActual: Tienda = this.resetTienda();

    @Output() cerrarModalEvent = new EventEmitter<void>();
    @Output() tiendaGuardada = new EventEmitter<void>();

    isSubmitting: boolean = false;
    errorMessage: string | null = null; // Añadir para mostrar errores localmente

    constructor(private tiendaService: TiendaService) {}

    resetTienda(): Tienda {
      return { id: undefined, nombre: '', direccion: '' }; // Ajusté id a opcional
    }

    cerrarModal(): void {
      this.isModalVisible = false;
      setTimeout(() => {
        this.cerrarModalEvent.emit();
        this.tiendaActual = this.resetTienda();
        this.isSubmitting = false;
        this.errorMessage = null;
      }, 300);
    }

    guardarTienda(): void {
      if (!this.tiendaActual.nombre) {
        this.errorMessage = 'El nombre es obligatorio.';
        return;
      }
      if (this.isSubmitting) return;
      this.isSubmitting = true;
      this.errorMessage = null;

      if (this.tiendaActual.id) {
        this.tiendaService.updateTienda(this.tiendaActual.id, this.tiendaActual).subscribe({
          next: () => {
            this.tiendaGuardada.emit();
            this.cerrarModal();
            Notiflix.Notify.success('Tienda actualizada con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
          error: (err) => {
            this.isSubmitting = false;
            this.errorMessage = err.message || 'Error al actualizar la tienda.';
            Notiflix.Notify.failure(this.errorMessage || 'Error desconocido', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          }
        });
      } else {
        this.tiendaService.addTienda(this.tiendaActual).subscribe({
          next: () => {
            this.tiendaGuardada.emit();
            this.cerrarModal();
            Notiflix.Notify.success('Tienda creada con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
          error: (err) => {
            this.isSubmitting = false;
          this.errorMessage = err.message || 'Error al agregar la tienda.';
          Notiflix.Notify.failure(this.errorMessage || 'Error desconocido', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        }
      });
    }
  }
}
