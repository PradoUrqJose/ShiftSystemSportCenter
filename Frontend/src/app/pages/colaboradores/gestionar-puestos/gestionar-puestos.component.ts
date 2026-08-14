import { Puesto, PuestoService } from './../../../services/puesto.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ColaboradorService } from '../../../services/colaborador.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AgregarPuestoModalComponent } from '../agregar-puesto-modal/agregar-puesto-modal.component';
import { Subject, takeUntil } from 'rxjs';
import Notiflix from 'notiflix';
import { MODAL_OPEN_DELAY_MS, MODAL_CLOSE_DELAY_MS } from '../../../utils/modal-timing';
import { TableShellComponent } from '../../../components/ui/table-shell/table-shell.component';
import { SkeletonComponent } from '../../../components/ui/skeleton/skeleton.component';

@Component({
  selector: 'app-gestionar-puestos',
  standalone: true,
  imports: [CommonModule, AgregarPuestoModalComponent, TableShellComponent, SkeletonComponent],
  templateUrl: './gestionar-puestos.component.html',
  styleUrls: ['./gestionar-puestos.component.css']
})
export default class GestionarPuestosComponent implements OnInit, OnDestroy {
  puestos: Puesto[] = [];
  mostrarModalAgregarPuesto: boolean = false;
  // Separado de mostrarModalAgregarPuesto (con un tick de retraso al abrir)
  // para que la transición CSS del modal hijo tenga margen de animar — antes
  // las dos banderas cambiaban juntas y el fade-in/out nunca se veía.
  isModalAgregarPuestoVisible: boolean = false;
  puestoActual: Puesto = { nombre: '', descripcion: '' };
  conteoColaboradoresPorPuesto: { [key: number]: number } = {};
  errorMessage: string | null = null; // Añadir para mostrar errores
  // Ya se seteaba en cargarPuestos() pero el template nunca lo leía — la
  // tabla se renderizaba vacía un instante en cada carga sin ningún feedback.
  isLoading: boolean = false;
  readonly skeletonRows = Array.from({ length: 5 });
  private readonly destroy$ = new Subject<void>();

  constructor(
    private puestoService: PuestoService,
    private colaboradorService: ColaboradorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarPuestos();
    this.cargarConteoColaboradores();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarPuestos(): void {
    this.isLoading = true;
    this.puestoService.getPuestos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (puestos) => {
        this.puestos = puestos;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar los puestos.';
        this.isLoading = false;
      }
    });
  }

  cargarConteoColaboradores(): void {
    this.colaboradorService.getColaboradores().pipe(takeUntil(this.destroy$)).subscribe({
      next: (colaboradores) => {
        this.conteoColaboradoresPorPuesto = colaboradores.reduce((acc, colab) => {
          if (colab.puestoId) {
            acc[colab.puestoId] = (acc[colab.puestoId] || 0) + 1;
          }
          return acc;
        }, {} as { [key: number]: number });
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar el conteo de colaboradores.';
      }
    });
  }

  abrirModalAgregarPuesto(): void {
    this.puestoActual = { nombre: '', descripcion: '' };
    this.mostrarModalAgregarPuesto = true;
    this.errorMessage = null;
    setTimeout(() => (this.isModalAgregarPuestoVisible = true), MODAL_OPEN_DELAY_MS);
  }

  cerrarModalAgregarPuesto(): void {
    this.isModalAgregarPuestoVisible = false;
    this.errorMessage = null;
    setTimeout(() => (this.mostrarModalAgregarPuesto = false), MODAL_CLOSE_DELAY_MS);
  }

  onPuestoAgregado(puesto: Puesto): void {
    const index = this.puestos.findIndex(p => p.id === puesto.id);
    if (index !== -1) {
      this.puestos[index] = puesto; // Actualiza si ya existe
    } else {
      this.puestos.push(puesto); // Agrega si es nuevo
    }
    this.cargarConteoColaboradores();
    this.cerrarModalAgregarPuesto();
  }

  eliminarPuesto(id: number | undefined): void {
    if (!id) return;
    // Antes borraba directo sin confirmar, inconsistente con eliminarTienda/
    // eliminarTurno que sí piden confirmación.
    Notiflix.Confirm.show(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas eliminar este puesto?',
      'Eliminar',
      'Cancelar',
      () => {
        this.puestoService.deletePuesto(id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.puestos = this.puestos.filter(p => p.id !== id);
            this.cargarConteoColaboradores();
          },
          error: (err) => {
            this.errorMessage = err.message || 'Error al eliminar el puesto.';
          }
        });
      }
    );
  }

  editarPuesto(puesto: Puesto): void {
    this.puestoActual = { ...puesto };
    this.mostrarModalAgregarPuesto = true;
    this.errorMessage = null;
    setTimeout(() => (this.isModalAgregarPuestoVisible = true), MODAL_OPEN_DELAY_MS);
  }

  goBack(): void {
    this.router.navigate(['/colaboradores']);
  }

  trackByPuestoId(_index: number, puesto: Puesto): number | undefined {
    return puesto.id;
  }
}
