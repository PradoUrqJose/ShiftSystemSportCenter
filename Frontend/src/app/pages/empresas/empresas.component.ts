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
import { BrowserModule } from '@angular/platform-browser';
import Notiflix from 'notiflix';

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

  // MODAL CONTROL
  // Controla si el modal está abierto o cerrado
  isModalOpen: boolean = false;
  isModalVisible: boolean = false; // Controla la visibilidad con animación
  errorMessage: string | null = null; // Almacena mensajes de error

  constructor(
    private fb: FormBuilder,
    private empresaService: EmpresaService
  ) {}

  ngOnInit(): void {
    // Inicialización segura del FormGroup
    this.empresaForm = this.fb.group({
      nombre: ['', [Validators.required]],
      ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    });

    this.getEmpresas();
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
    });
  }

  // Agregar empresa
  addEmpresa(): void {
    if (this.empresaForm.valid) {
      const empresaData = this.empresaForm.value;

      this.empresaService.addEmpresa(empresaData).subscribe({
        next: () => {
          this.getEmpresas();
          this.closeModal(); // Cierra el modal si se agrega exitosamente
        },
        error: (err) => {
          this.errorMessage =
            err.error?.message || 'Ocurrió un error al agregar la empresa.';
        },
      });
    } else {
      this.errorMessage = 'Por favor, complete todos los campos correctamente.';
    }
  }

  // Editar empresa
  editEmpresa(empresa: Empresa): void {
    this.isEditing = true;
    this.selectedEmpresaId = empresa.id;

    this.openModal();
    this.empresaForm.patchValue({
      nombre: empresa.nombre,
      ruc: empresa.ruc,
    });
  }

  // Actualizar empresa
  updateEmpresa(): void {
    if (this.empresaForm.valid && this.selectedEmpresaId) {
      const empresaData = this.empresaForm.value;

      this.empresaService
        .updateEmpresa(this.selectedEmpresaId, empresaData)
        .subscribe({
          next: () => {
            this.getEmpresas(); // Actualiza la lista de empresas
            this.closeModal(); // Cierra el modal tras la actualización
            Notiflix.Notify.success('Empresa actualizada con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            }); // Mostrar notificación de éxito en la esquina inferior derecha con animación de derecha a izquierda
          },
          error: (err) => {
            this.errorMessage =
              err.error?.message ||
              'Ocurrió un error al actualizar la empresa.';
          },
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
      this.empresaForm.reset();
    }

    this.isModalOpen = true;
    this.isModalVisible = false; // Inicia oculto para la animación

    // Agrega un pequeño retraso para la animación de entrada
    setTimeout(() => {
      this.isModalVisible = true;
    }, 10);
  }

  // Cerrar el modal con animación
  closeModal(): void {
    this.isModalVisible = false; // Inicia la animación de salida
    setTimeout(() => {
      this.isModalOpen = false; // Oculta completamente el modal

      // Si se cancela la edición, limpia después de la animación
      if (this.isEditing) {
        this.cancelEditCleanup();
      }
    }, 300); // Coincide con la duración de la transición
  }

  // Método para limpiar edición después del cierre del modal
  private cancelEditCleanup(): void {
    this.isEditing = false; // Desactiva el modo edición
    this.selectedEmpresaId = null; // Restablece el ID seleccionado
    this.empresaForm.reset(); // Limpia el formulario
  }
}
