import { ModalService } from './../../services/modal.service';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ColaboradorService,
  Colaborador,
} from '../../services/colaborador.service';
import { EmpresaService, Empresa } from '../../services/empresa.service';
import { Observable, Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { Puesto, PuestoService } from '../../services/puesto.service';
import { ColaboradorFormComponent } from './colaborador-form/colaborador-form.component';
import { MODAL_OPEN_DELAY_MS, MODAL_CLOSE_DELAY_MS } from '../../utils/modal-timing';
import { TableShellComponent } from '../../components/ui/table-shell/table-shell.component';
import { SkeletonComponent } from '../../components/ui/skeleton/skeleton.component';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { SortHeaderComponent } from '../../components/ui/sort-header/sort-header.component';
import { SortState, nextSortState, sortRows } from '../../utils/table-sort.util';

type ColaboradorSortField = 'nombre' | 'apellido' | 'email' | 'telefono' | 'empresaNombre';

const COLABORADOR_SORT_SELECTORS: Record<ColaboradorSortField, (c: Colaborador) => unknown> = {
  nombre: (c) => c.nombre,
  apellido: (c) => c.apellido,
  email: (c) => c.email,
  telefono: (c) => c.telefono,
  empresaNombre: (c) => c.empresaNombre,
};

@Component({
    selector: 'app-colaboradores',
    imports: [CommonModule, ColaboradorFormComponent, TableShellComponent, SkeletonComponent, ButtonComponent, SortHeaderComponent],
    templateUrl: './colaboradores.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./colaboradores.component.css']
})
export default class ColaboradoresComponent implements OnInit, OnDestroy {
  isTableLoading: boolean = true;  // Controla el estado de carga de la tabla
  readonly skeletonRows = Array.from({ length: 5 });

  sort: SortState<ColaboradorSortField> = { field: 'nombre', direction: 'asc' };

  colaboradores: Colaborador[] = [];
  empresas: Empresa[] = [];
  puestos: Puesto[] = [];

  colaboradoresHabilitados: Colaborador[] = [];
  colaboradoresDeshabilitados: Colaborador[] = [];
  mostrarDeshabilitados: boolean = false; // Controla si se muestran las deshabilitadas

  // Colaborador que se está editando en app-colaborador-form (null = alta)
  colaboradorEnEdicion: Colaborador | null = null;

  // Control de Modal
  mostrarModal$!: Observable<boolean>;
  isModalVisible$!: Observable<boolean>;
  errorMessage: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private colaboradorService: ColaboradorService,
    private empresaService: EmpresaService,
    private puestoService: PuestoService,
    private modalService: ModalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.mostrarModal$ = this.modalService.mostrarModal$;
    this.isModalVisible$ = this.modalService.isModalVisible$;
    this.getEmpresasAndColaboradores();
    this.puestoService.getPuestos().pipe(takeUntil(this.destroy$)).subscribe(puestos => this.puestos = puestos);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getEmpresasAndColaboradores(): void {
    this.empresaService.getEmpresasPorHabilitacion(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        // Cargar colaboradores después de cargar las empresas
        this.getColaboradores();
      },
      error: () => {
        this.errorMessage = 'Error al obtener las empresas.';
      },
    });
  }

  getColaboradores(): void {
    this.isTableLoading = true;  // Activar loading
    this.colaboradorService.getColaboradores().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.colaboradores = data.map((colaborador) => {
          if (colaborador.fotoUrl) {
            colaborador.fotoUrl += '?t=' + new Date().getTime(); // Agrega un parámetro de tiempo para evitar la caché
            // Crear una promesa para verificar cuando la imagen carga
            const img = new Image();
            img.src = colaborador.fotoUrl;
          }
          return colaborador;
        });
        this.colaboradoresHabilitados = this.colaboradores.filter(
          (c) => c.habilitado
        );
        this.colaboradoresDeshabilitados = this.colaboradores.filter(
          (c) => !c.habilitado
        );
        this.aplicarOrden();
        this.isTableLoading = false;  // Desactivar loading
      },
      error: () => {
        this.errorMessage = 'Error al obtener colaboradores.';
        this.isTableLoading = false;
      },
    });
  }

  toggleDeshabilitados(): void {
    this.mostrarDeshabilitados = !this.mostrarDeshabilitados;
  }

  onSort(field: ColaboradorSortField): void {
    this.sort = nextSortState(this.sort, field);
    this.aplicarOrden();
  }

  private aplicarOrden(): void {
    const selector = COLABORADOR_SORT_SELECTORS[this.sort.field];
    this.colaboradoresHabilitados = sortRows(this.colaboradoresHabilitados, selector, this.sort.direction);
    this.colaboradoresDeshabilitados = sortRows(this.colaboradoresDeshabilitados, selector, this.sort.direction);
  }

  // Método para limpiar la caché de la imagen
  clearImageCache(): void {
    this.colaboradores.forEach((colaborador) => {
      if (colaborador.fotoUrl) {
        const img = new Image();
        img.src = colaborador.fotoUrl + '?t=' + new Date().getTime(); // Agrega un parámetro de tiempo para evitar la caché
      }
    });
  }

  abrirModalAgregar(): void {
    this.colaboradorEnEdicion = null;
    this.errorMessage = null;
    this.modalService.abrirModal(MODAL_OPEN_DELAY_MS);
  }

  editColaborador(colaborador: Colaborador): void {
    this.colaboradorEnEdicion = { ...colaborador };
    this.errorMessage = null;
    this.modalService.abrirModal(MODAL_OPEN_DELAY_MS);
  }

  closeModal(): void {
    this.modalService.cerrarModal(MODAL_CLOSE_DELAY_MS);
  }

  onColaboradorGuardado(): void {
    this.getColaboradores();
    this.clearImageCache();
    this.closeModal();
  }

  onVerPerfil(colaboradorId: number): void {
    this.router.navigate(['/reportes/colaborador-profile', colaboradorId]);
    this.closeModal();
  }

  irAPuestos(): void {
    this.router.navigate(['/puestos']);
  }

  trackByColaboradorId(_index: number, colaborador: Colaborador): number | undefined {
    return colaborador.id;
  }
}
