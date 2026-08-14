import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Feriado, FeriadoService } from '../../../services/feriado.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-agregar-feriado-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agregar-feriado-modal.component.html',
  styleUrl: './agregar-feriado-modal.component.css'
})
export class AgregarFeriadoModalComponent implements OnDestroy {
  // Entradas desde el componente padre
  @Input() mostrarModal: boolean = false;
  @Input() isModalVisible: boolean = false;
  @Input() feriadoActual: Feriado = { fecha: '', descripcion: '' };

  // Salidas para comunicar eventos al componente padre
  @Output() cerrarModalEvent = new EventEmitter<void>();
  @Output() feriadoGuardado = new EventEmitter<Feriado>();

  isSubmitting: boolean = false;
  errorMessage: string | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(private feriadoService: FeriadoService) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cerrarModal(): void {
    this.errorMessage = null;
    this.cerrarModalEvent.emit();
  }

  guardarFeriado(): void {
    if (!this.feriadoActual.fecha) {
      this.errorMessage = 'La fecha es obligatoria.';
      return;
    }
    if (this.feriadoActual.descripcion && this.feriadoActual.descripcion.length > 255) {
      this.errorMessage = 'La descripción no puede exceder 255 caracteres.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const peticion = this.feriadoActual.id
      ? this.feriadoService.actualizarFeriado(this.feriadoActual.id, this.feriadoActual)
      : this.feriadoService.crearFeriado(this.feriadoActual);

    peticion.pipe(takeUntil(this.destroy$)).subscribe({
      next: (feriado) => {
        this.feriadoGuardado.emit(feriado);
        this.isSubmitting = false;
        this.cerrarModal();
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error al guardar el feriado.';
        this.isSubmitting = false;
      }
    });
  }
}
