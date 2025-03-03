import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Puesto, PuestoService } from '../../../services/puesto.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-agregar-puesto-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agregar-puesto-modal.component.html',
  styleUrl: './agregar-puesto-modal.component.css'
})
export class AgregarPuestoModalComponent {
  // Entradas desde el componente padre
  @Input() mostrarModal: boolean = false;
  @Input() isModalVisible: boolean = false;
  @Input() puestoActual: Puesto = { id: 0, nombre: '', descripcion: '' };

  // Salidas para comunicar eventos al componente padre
  @Output() cerrarModalEvent = new EventEmitter<void>();
  @Output() puestoAgregado = new EventEmitter<Puesto>();

  isSubmitting: boolean = false; // Estado para deshabilitar el botón mientras se procesa
  errorMessage: string | null = null; // Añadir para mostrar errores

  constructor(private puestoService: PuestoService) {}

  // Método para cerrar el modal
  cerrarModal(): void {
    this.errorMessage = null;
    this.cerrarModalEvent.emit();
  }

  // Método para guardar o actualizar el puesto
  guardarPuesto(): void {
    // Validación básica en el frontend antes de enviar al backend
    if (!this.puestoActual.nombre.trim()) {
      this.errorMessage = 'El nombre es obligatorio.';
      return;
    }
    if (this.puestoActual.nombre.length > 50) {
      this.errorMessage = 'El nombre no puede exceder 50 caracteres.';
      return;
    }
    if (this.puestoActual.descripcion && this.puestoActual.descripcion.length > 255) {
      this.errorMessage = 'La descripción no puede exceder 255 caracteres.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    if (this.puestoActual.id) {
      this.puestoService.updatePuesto(this.puestoActual.id, this.puestoActual).subscribe({
        next: (puesto) => {
          this.puestoAgregado.emit(puesto);
          this.isSubmitting = false;
          this.cerrarModal();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Error al actualizar el puesto.';
          this.isSubmitting = false;
        }
      });
    } else {
      this.puestoService.addPuesto(this.puestoActual).subscribe({
        next: (puesto) => {
          this.puestoAgregado.emit(puesto);
          this.isSubmitting = false;
          this.cerrarModal();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Error al agregar el puesto.';
          this.isSubmitting = false;
        }
      });
    }
  }
}
