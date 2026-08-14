import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Notiflix from 'notiflix';
import { Subject, takeUntil } from 'rxjs';
import { Feriado, FeriadoService } from '../../../services/feriado.service';
import { AgregarFeriadoModalComponent } from '../agregar-feriado-modal/agregar-feriado-modal.component';
import { MODAL_OPEN_DELAY_MS, MODAL_CLOSE_DELAY_MS } from '../../../utils/modal-timing';

@Component({
  selector: 'app-gestionar-feriados',
  standalone: true,
  imports: [CommonModule, AgregarFeriadoModalComponent],
  templateUrl: './gestionar-feriados.component.html',
  styleUrls: ['./gestionar-feriados.component.css']
})
export default class GestionarFeriadosComponent implements OnInit, OnDestroy {
  feriados: Feriado[] = [];
  mostrarModalAgregarFeriado: boolean = false;
  // Estado separado de mostrarModalAgregarFeriado (y con un tick de retraso al
  // abrir/cerrar) para que la transición CSS del modal hijo tenga margen de
  // animar — si las dos banderas cambiaran juntas, el fade-in/out no se ve
  // (mismo bug que se encontró y quedó documentado en gestionar-puestos).
  isModalAgregarFeriadoVisible: boolean = false;
  feriadoActual: Feriado = { fecha: '', descripcion: '' };
  errorMessage: string | null = null;
  isLoading: boolean = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private feriadoService: FeriadoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarFeriados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarFeriados(): void {
    this.isLoading = true;
    this.feriadoService.getFeriados().pipe(takeUntil(this.destroy$)).subscribe({
      next: (feriados) => {
        // Orden cronológico: la lista tal como viene del backend no
        // garantiza ningún orden en particular.
        this.feriados = [...feriados].sort((a, b) => a.fecha.localeCompare(b.fecha));
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error al cargar los feriados.';
        this.isLoading = false;
      }
    });
  }

  abrirModalAgregarFeriado(): void {
    this.feriadoActual = { fecha: '', descripcion: '' };
    this.mostrarModalAgregarFeriado = true;
    this.errorMessage = null;
    setTimeout(() => (this.isModalAgregarFeriadoVisible = true), MODAL_OPEN_DELAY_MS);
  }

  cerrarModalAgregarFeriado(): void {
    this.isModalAgregarFeriadoVisible = false;
    this.errorMessage = null;
    setTimeout(() => (this.mostrarModalAgregarFeriado = false), MODAL_CLOSE_DELAY_MS);
  }

  editarFeriado(feriado: Feriado): void {
    this.feriadoActual = { ...feriado };
    this.mostrarModalAgregarFeriado = true;
    this.errorMessage = null;
    setTimeout(() => (this.isModalAgregarFeriadoVisible = true), MODAL_OPEN_DELAY_MS);
  }

  onFeriadoGuardado(feriado: Feriado): void {
    const index = this.feriados.findIndex(f => f.id === feriado.id);
    if (index !== -1) {
      this.feriados[index] = feriado;
    } else {
      this.feriados.push(feriado);
    }
    this.feriados.sort((a, b) => a.fecha.localeCompare(b.fecha));
    this.cerrarModalAgregarFeriado();
  }

  eliminarFeriado(id: number | undefined): void {
    if (!id) return;
    Notiflix.Confirm.show(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas eliminar este feriado?',
      'Eliminar',
      'Cancelar',
      () => {
        this.feriadoService.eliminarFeriado(id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.feriados = this.feriados.filter(f => f.id !== id);
            Notiflix.Notify.success('Feriado eliminado con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
          error: (err) => {
            this.errorMessage = err.message || 'Error al eliminar el feriado.';
            Notiflix.Notify.failure(this.errorMessage || 'Error desconocido', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          }
        });
      }
    );
  }

  goBack(): void {
    this.router.navigate(['/turnos']);
  }

  trackByFeriadoId(_index: number, feriado: Feriado): number | undefined {
    return feriado.id;
  }
}
