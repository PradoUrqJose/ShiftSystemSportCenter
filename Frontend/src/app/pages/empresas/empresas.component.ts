import { ModalService } from './../../services/modal.service';
import { Component, NgModule, OnInit } from '@angular/core';
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
import { Observable } from 'rxjs';

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './empresas.component.html',
  styleUrls: ['./empresas.component.css'],
})
export default class EmpresasComponent implements OnInit {
  empresas: Empresa[] = [];
  empresaForm!: FormGroup;
  isEditing: boolean = false;
  selectedEmpresaId: number | null = null;
  empresasHabilitadas: Empresa[] = [];
  empresasDeshabilitadas: Empresa[] = [];
  mostrarDeshabilitadas: boolean = false; // Controla si se muestran las deshabilitadas

  // MODAL CONTROL
  mostrarModal$!: Observable<boolean>;  // Controla si el modal está abierto o cerrado
  isModalVisible$!: Observable<boolean>; // Controla la visibilidad con animación
  errorMessage: string | null = null; // Almacena mensajes de error


  // Propiedades para controlar el ordenamiento
  sortColumn: string = 'id';  // Columna por la que se ordenará
  sortDirection: 'asc' | 'desc' = 'asc';  // Dirección de orden (ascendente o descendente)

  constructor(
    private fb: FormBuilder,
    private modalService: ModalService,
    private empresaService: EmpresaService
  ) { }


  ngOnInit(): void {
    this.empresaForm = this.fb.group({
      nombre: ['', [Validators.required]],
      ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      habilitada: [true]
    });

    this.mostrarModal$ = this.modalService.mostrarModal$;
    this.isModalVisible$ = this.modalService.isModalVisible$;

    this.getEmpresas(); // Esto cargará y ordenará las empresas
  }

  // Método para ordenar las empresas
  ordenarEmpresas() {
    const compare = (a: Empresa, b: Empresa) => {
      let valueA = a[this.sortColumn as keyof Empresa];
      let valueB = b[this.sortColumn as keyof Empresa];

      // Convertir a número si es 'id' o 'numeroEmpleados'
      if (this.sortColumn === 'id' || this.sortColumn === 'numeroEmpleados') {
        valueA = Number(valueA);
        valueB = Number(valueB);
      }

      if (this.sortDirection === 'asc') {
        return valueA > valueB ? 1 : (valueA < valueB ? -1 : 0);
      } else {
        return valueA < valueB ? 1 : (valueA > valueB ? -1 : 0);
      }
    };

    this.empresasHabilitadas.sort(compare);
    this.empresasDeshabilitadas.sort(compare);
  }

  // Cambiar la columna por la que se ordena y la dirección
  sortTable(column: string) {
    if (this.sortColumn === column) {
      // Si ya está ordenado por esa columna, cambia la dirección
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Si se hace clic en una columna diferente, ordena ascendente por esa columna
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
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
    this.empresaService.getEmpresas().subscribe((data) => {
      this.empresas = data;
      this.empresasHabilitadas = this.empresas.filter((e) => e.habilitada);
      this.empresasDeshabilitadas = this.empresas.filter((e) => !e.habilitada);
      this.ordenarEmpresas(); // Reaplica el ordenamiento después de cargar los datos
    });
  }

  toggleDeshabilitadas(): void {
    this.mostrarDeshabilitadas = !this.mostrarDeshabilitadas;
  }

  // Agregar empresa
  addEmpresa(): void {
    if (this.empresaForm.valid) {
      const empresaData = this.empresaForm.value;
      this.empresaService.addEmpresa(empresaData).subscribe({
        next: () => {
          this.getEmpresas(); // Esto recarga y ordena
          this.closeModal();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Ocurrió un error al agregar la empresa.';
        }
      });
    } else {
      this.errorMessage = 'Por favor, complete todos los campos correctamente.';
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
      this.empresaService.updateEmpresa(this.selectedEmpresaId, empresaData).subscribe({
        next: () => {
          this.getEmpresas(); // Esto recarga y ordena
          this.closeModal();
          Notiflix.Notify.success('Empresa actualizada con éxito', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right'
          });
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Ocurrió un error al actualizar la empresa.';
        }
      });
    } else {
      this.errorMessage = 'Por favor, complete todos los campos correctamente.';
    }
  }

  // Eliminar empresa
  deleteEmpresa(id: number): void {
    this.empresaService.deleteEmpresa(id).subscribe(() => {
      this.getEmpresas();
    });
  }

  // Abrir modal
  openModal(): void {
    this.errorMessage = null; // Limpiar mensaje de error

    if (!this.isEditing) {
      // Si no está en modo edición, restablece el formulario
      this.selectedEmpresaId = null;
      this.empresaForm.reset({ habilitada: true }); // Establece habilitada en true
    }

    this.modalService.abrirModal(50);
  }

  // Cerrar el modal con animación
  closeModal(): void {
    // Si se cancela la edición, limpia después de la animación
    if (this.isEditing) {
      this.cancelEditCleanup();
    }
    this.modalService.cerrarModal(100);
  }

  // Método para limpiar edición después del cierre del modal
  private cancelEditCleanup(): void {
    this.isEditing = false; // Desactiva el modo edición
    this.selectedEmpresaId = null; // Restablece el ID seleccionado
    this.empresaForm.reset(); // Limpia el formulario
  }
}
