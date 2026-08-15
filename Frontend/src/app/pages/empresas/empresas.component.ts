import { ModalService } from './../../services/modal.service';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { EmpresaService, Empresa } from '../../services/empresa.service';
import { CommonModule } from '@angular/common';
import Notiflix from 'notiflix';
import { Observable, Subject, takeUntil } from 'rxjs';
import { MODAL_OPEN_DELAY_MS, MODAL_CLOSE_DELAY_MS } from '../../utils/modal-timing';
import { TableShellComponent } from '../../components/ui/table-shell/table-shell.component';
import { SkeletonComponent } from '../../components/ui/skeleton/skeleton.component';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { SortHeaderComponent } from '../../components/ui/sort-header/sort-header.component';
import { SortState, nextSortState, sortRows } from '../../utils/table-sort.util';

type EmpresaSortField = 'id' | 'nombre' | 'ruc';

const EMPRESA_SORT_SELECTORS: Record<EmpresaSortField, (e: Empresa) => unknown> = {
  id: (e) => e.id,
  nombre: (e) => e.nombre,
  ruc: (e) => e.ruc,
};

@Component({
    selector: 'app-empresas',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, TableShellComponent, SkeletonComponent, ButtonComponent, SortHeaderComponent],
    templateUrl: './empresas.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./empresas.component.css']
})
export default class EmpresasComponent implements OnInit, OnDestroy {
  empresas: Empresa[] = [];
  empresaForm!: FormGroup;
  isEditing: boolean = false;
  selectedEmpresaId: number | null = null;
  empresasHabilitadas: Empresa[] = [];
  empresasDeshabilitadas: Empresa[] = [];
  mostrarDeshabilitadas: boolean = false; // Controla si se muestran las deshabilitadas
  // Esta tabla no tenía ningún estado de carga (a diferencia de Colaboradores,
  // que sí traía el spinner .sk-circle viejo) — se agrega junto al skeleton.
  isLoading: boolean = true;
  readonly skeletonRows = Array.from({ length: 5 });

  // MODAL CONTROL
  mostrarModal$!: Observable<boolean>;  // Controla si el modal está abierto o cerrado
  isModalVisible$!: Observable<boolean>; // Controla la visibilidad con animación
  errorMessage: string | null = null; // Almacena mensajes de error


  // Propiedades para controlar el ordenamiento (ver table-sort.util.ts)
  sort: SortState<EmpresaSortField> = { field: 'id', direction: 'asc' };
  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private modalService: ModalService,
    private empresaService: EmpresaService
  ) { }


  ngOnInit(): void {
    this.empresaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      habilitada: [true]
    });

    this.mostrarModal$ = this.modalService.mostrarModal$;
    this.isModalVisible$ = this.modalService.isModalVisible$;

    this.getEmpresas(); // Esto cargará y ordenará las empresas
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Método para ordenar las empresas
  ordenarEmpresas() {
    const selector = EMPRESA_SORT_SELECTORS[this.sort.field];
    this.empresasHabilitadas = sortRows(this.empresasHabilitadas, selector, this.sort.direction);
    this.empresasDeshabilitadas = sortRows(this.empresasDeshabilitadas, selector, this.sort.direction);
  }

  // Cambiar la columna por la que se ordena y la dirección
  sortTable(column: EmpresaSortField) {
    this.sort = nextSortState(this.sort, column);
    this.ordenarEmpresas();
  }

  // Getters para controles del formulario
  get nombreControl() {
    return this.empresaForm.get('nombre');
  }

  get rucControl() {
    return this.empresaForm.get('ruc');
  }

  // Obtener empresas
  getEmpresas(): void {
    this.isLoading = true;
    this.empresaService.getEmpresas().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.empresas = data;
        this.empresasHabilitadas = this.empresas.filter((e) => e.habilitada);
        this.empresasDeshabilitadas = this.empresas.filter((e) => !e.habilitada);
        this.ordenarEmpresas(); // Reaplica el ordenamiento después de cargar los datos
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Error al obtener las empresas.';
        this.isLoading = false;
      },
    });
  }

  toggleDeshabilitadas(): void {
    this.mostrarDeshabilitadas = !this.mostrarDeshabilitadas;
  }

  // Agregar empresa
  addEmpresa(): void {
    if (this.empresaForm.valid) {
      const empresaData = this.empresaForm.value;
      this.empresaService.addEmpresa(empresaData).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.getEmpresas();
          this.closeModal();
        },
        error: (err) => {
          this.errorMessage = err.message || 'Error al agregar la empresa.';
        }
      });
    } else {
      this.validateFormErrors();
    }
  }

  // Editar empresa
  editEmpresa(empresa: Empresa): void {
    this.isEditing = true;
    this.selectedEmpresaId = empresa.id;

    this.empresaForm.patchValue({
      nombre: empresa.nombre,
      ruc: empresa.ruc,
      habilitada: empresa.habilitada // Cargar estado actual
    });

    this.openModal();
  }

  // Actualizar empresa
  updateEmpresa(): void {
    if (this.empresaForm.valid && this.selectedEmpresaId) {
      const empresaData = this.empresaForm.value;
      this.empresaService.updateEmpresa(this.selectedEmpresaId, empresaData).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.getEmpresas();
          this.closeModal();
          Notiflix.Notify.success('Empresa actualizada con éxito', { position: 'right-bottom', cssAnimationStyle: 'from-right' });
        },
        error: (err) => {
          this.errorMessage = err.message || 'Error al actualizar la empresa.';
        }
      });
    } else {
      this.validateFormErrors();
    }
  }

  private validateFormErrors(): void {
    this.errorMessage = null;
    if (this.empresaForm.get('nombre')?.errors?.['required']) {
      this.errorMessage = 'El nombre es obligatorio.';
    } else if (this.empresaForm.get('nombre')?.errors?.['maxlength']) {
      this.errorMessage = 'El nombre no puede exceder 100 caracteres.';
    } else if (this.empresaForm.get('ruc')?.errors?.['required']) {
      this.errorMessage = 'El RUC es obligatorio.';
    } else if (this.empresaForm.get('ruc')?.errors?.['pattern']) {
      this.errorMessage = 'El RUC debe tener 11 dígitos.';
    }
  }

  // Abrir modal
  openModal(): void {
    this.errorMessage = null; // Limpiar mensaje de error

    if (!this.isEditing) {
      // Si no está en modo edición, restablece el formulario
      this.selectedEmpresaId = null;
      this.empresaForm.reset({ habilitada: true }); // Establece habilitada en true
    }

    this.modalService.abrirModal(MODAL_OPEN_DELAY_MS);
  }

  // Cerrar el modal con animación
  closeModal(): void {
    // Si se cancela la edición, limpia después de la animación
    if (this.isEditing) {
      this.cancelEditCleanup();
    }
    // Antes cerraba a los 100ms, cortando de golpe la transición CSS de
    // salida (dura 300ms, ver empresas.component.html).
    this.modalService.cerrarModal(MODAL_CLOSE_DELAY_MS);
  }

  // Método para limpiar edición después del cierre del modal
  private cancelEditCleanup(): void {
    this.isEditing = false; // Desactiva el modo edición
    this.selectedEmpresaId = null; // Restablece el ID seleccionado
    this.empresaForm.reset(); // Limpia el formulario
  }

  trackByEmpresaId(_index: number, empresa: Empresa): number {
    return empresa.id;
  }
}
