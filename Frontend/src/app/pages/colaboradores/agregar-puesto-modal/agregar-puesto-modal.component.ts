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

  constructor(private puestoService: PuestoService) {}

  // Método para cerrar el modal
  cerrarModal(): void {
    this.cerrarModalEvent.emit();
  }

  // Método para guardar o actualizar el puesto
  guardarPuesto(): void {
    this.isSubmitting = true;

    if (this.puestoActual.id) {
      // Si el puesto tiene ID, lo actualizamos
      this.puestoService.updatePuesto(this.puestoActual.id, this.puestoActual).subscribe({
        next: (puesto) => {
          this.puestoAgregado.emit(puesto);
          this.isSubmitting = false;
          this.cerrarModal();
        },
        error: () => {
          this.isSubmitting = false;
        }
      });
    } else {
      // Si no tiene ID, creamos un nuevo puesto
      this.puestoService.addPuesto(this.puestoActual).subscribe({
        next: (puesto) => {
          this.puestoAgregado.emit(puesto);
          this.isSubmitting = false;
          this.cerrarModal();
        },
        error: () => {
          this.isSubmitting = false;
        }
      });
    }
  }
}
