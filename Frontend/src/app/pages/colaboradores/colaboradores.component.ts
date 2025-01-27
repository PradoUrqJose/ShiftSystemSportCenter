import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  ColaboradorService,
  Colaborador,
} from '../../services/colaborador.service';
import { EmpresaService, Empresa } from '../../services/empresa.service';
import { CommonModule } from '@angular/common';
import Notiflix from 'notiflix';
import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-colaboradores',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './colaboradores.component.html',
  styleUrls: ['./colaboradores.component.css'],
})
export default class ColaboradoresComponent implements OnInit {
  colaboradores: Colaborador[] = [];
  empresas: Empresa[] = [];
  colaboradorForm: FormGroup;
  isEditing: boolean = false;
  isPhotoLoading: boolean = false; // Bandera para simular la carga de la foto

  selectedColaboradorId: number | null = null;
  selectedEmpresaId: number | null = null; // Propiedad agregada

  // Control de Modal
  isModalOpen: boolean = false;
  isModalVisible: boolean = false;
  errorMessage: string | null = null;

  // Nueva funcionalidad
  fotoPreview: string | ArrayBuffer | null =
    'assets/user-circle-svgrepo-com.svg'; // Inicializar con una imagen por defecto
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef; // Referencia al input de archivos

  constructor(
    private fb: FormBuilder,
    private colaboradorService: ColaboradorService,
    private empresaService: EmpresaService,
    private http: HttpClient // Inyecta HttpClient aquí
  ) {
    this.colaboradorForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
      email: ['', [Validators.required, Validators.email]],
      empresaId: ['', Validators.required],
      foto: [null], // Para manejar la imagen
    });
  }

  // Agregar el setter para empresaId en el formulario
  onEmpresaSelected(event: any): void {
    this.selectedEmpresaId = event.target.value;
  }

  ngOnInit(): void {
    this.getEmpresasAndColaboradores();
  }

  validateForm(): void {
    this.errorMessage = null; // Reinicia mensaje de error
    for (const controlName in this.colaboradorForm.controls) {
      const control = this.colaboradorForm.get(controlName);
      if (control && control.invalid) {
        if (controlName === 'nombre' && control.errors?.['required']) {
          this.errorMessage = 'El nombre es obligatorio.';
        } else if (controlName === 'apellido' && control.errors?.['required']) {
          this.errorMessage = 'El apellido es obligatorio.';
        } else if (controlName === 'dni' && control.errors?.['required']) {
          this.errorMessage = 'El DNI es obligatorio.';
        } else if (controlName === 'dni' && control.errors?.['pattern']) {
          this.errorMessage = 'El DNI debe tener 8 dígitos.';
        } else if (controlName === 'telefono' && control.errors?.['required']) {
          this.errorMessage = 'El teléfono es obligatorio.';
        } else if (controlName === 'telefono' && control.errors?.['pattern']) {
          this.errorMessage = 'El teléfono debe tener 9 dígitos.';
        } else if (controlName === 'email' && control.errors?.['required']) {
          this.errorMessage = 'El email es obligatorio.';
        } else if (controlName === 'email' && control.errors?.['email']) {
          this.errorMessage = 'El email debe ser válido.';
        } else if (controlName === 'empresaId' && control.errors?.['required']) {
          this.errorMessage = 'La empresa es obligatoria.';
        }
        control?.markAsTouched(); // Marca el campo como tocado
        return; // Salir tras encontrar el primer error
      }
    }
  }

  clearValidationErrors(): void {
    this.errorMessage = null;
    for (const controlName in this.colaboradorForm.controls) {
      this.colaboradorForm.get(controlName)?.setErrors(null); // Limpia errores
    }
  }

  highlightError(controlName: string): void {
    const element = document.querySelector(`[formControlName="${controlName}"]`);
    if (element) {
      (element as HTMLElement).classList.add('border-red-500');
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.isPhotoLoading = true; // Activar la bandera de carga
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        setTimeout(() => {
          this.fotoPreview = reader.result; // Establecer la foto después del retraso
          this.isPhotoLoading = false; // Desactivar la bandera de carga
        }, 700); // Simular un retraso de 2 segundos
      };

      reader.readAsDataURL(file); // Leer el archivo seleccionado
      this.colaboradorForm.patchValue({ foto: file }); // Asignar el archivo al formulario
      this.colaboradorForm.get('foto')?.markAsDirty(); // Marcar el control de la imagen como dirty
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('foto') as HTMLInputElement;
    fileInput.click(); // Simular clic en el input de archivo
  }

  getEmpresasAndColaboradores(): void {
    this.empresaService.getEmpresasPorHabilitacion(true).subscribe({
      next: (empresas) => {
        console.log(empresas);
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
    this.colaboradorService.getColaboradores().subscribe({
      next: (data) => {
        this.colaboradores = data.map((colaborador) => {
          if (colaborador.fotoUrl) {
            colaborador.fotoUrl += '?t=' + new Date().getTime(); // Agrega un parámetro de tiempo para evitar la caché
          }
          return colaborador;
        });
      },
      error: () => {
        this.errorMessage = 'Error al obtener colaboradores.';
      },
    });
  }

  getColaboradoresByEmpresa(empresaId: number): void {
    this.colaboradorService.getColaboradoresByEmpresa(empresaId).subscribe({
      next: (data) => (this.colaboradores = data),
      error: () =>
        (this.errorMessage = 'Error al obtener colaboradores por empresa.'),
    });
  }

  getEmpresas(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (data) => (this.empresas = data),
      error: () => (this.errorMessage = 'Error al obtener las empresas.'),
    });
  }

  addColaborador(): void {
    if (this.colaboradorForm.valid) {
      this.clearValidationErrors(); // Limpia mensajes previos
      const colaborador: Colaborador = {
        ...this.colaboradorForm.value,
        empresaId: this.selectedEmpresaId!,
      };

      const file = this.colaboradorForm.get('foto')?.value;

      this.colaboradorService.addColaborador(colaborador, file).subscribe({
        next: () => {
          // Forzar la actualización de la tabla
          this.getColaboradores();

          // Limpia el formulario y las variables asociadas
          this.colaboradorForm.reset();
          this.fotoPreview = 'assets/user-circle-svgrepo-com.svg';
          this.selectedColaboradorId = null;

          // Cierra el modal
          this.closeModal();
        },
        error: (err) => {
          this.errorMessage =
            err.error?.message || 'Error al agregar colaborador.';
        },
      });
    } else {
      this.validateForm();
    }
  }

  editColaborador(colaborador: Colaborador): void {
    this.isEditing = true;
    this.selectedColaboradorId = colaborador.id || null;
    this.openModal();

    // Asignar valores al formulario
    this.colaboradorForm.patchValue({
      nombre: colaborador.nombre,
      apellido: colaborador.apellido,
      dni: colaborador.dni,
      telefono: colaborador.telefono,
      email: colaborador.email,
      empresaId: colaborador.empresaId,
      foto: null, // Para forzar una nueva subida si es necesario
    });

    // Asignar la foto actual del colaborador a la vista previa
    this.fotoPreview =
      colaborador.fotoUrl || 'assets/user-circle-svgrepo-com.svg';
  }

  updateColaborador(): void {
    if (this.colaboradorForm.valid && this.selectedColaboradorId !== null) {
      this.clearValidationErrors(); // Limpia mensajes previos
      const colaborador: Colaborador = {
        ...this.colaboradorForm.value,
        id: this.selectedColaboradorId,
      };

      const file = this.colaboradorForm.get('foto')?.value;

      this.colaboradorService
        .updateColaborador(this.selectedColaboradorId, colaborador, file)
        .subscribe({
          next: () => {
            // Forzar la actualización de la tabla
            this.getColaboradores();

            // Limpia el formulario y las variables asociadas
            this.colaboradorForm.reset();
            this.fotoPreview = 'assets/user-circle-svgrepo-com.svg';
            this.selectedColaboradorId = null;

            // Cierra el modal
            this.closeModal();

            // Limpiar la caché de la imagen para forzar la recarga
            this.clearImageCache();
          },
          error: (err) => {
            this.errorMessage =
              err.error?.message || 'Error al actualizar colaborador.';
          },
        });
    } else {
      this.validateForm(); // Valida y muestra los errores
    }
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

  deleteColaborador(id: number): void {
    this.colaboradorService.deleteColaborador(id).subscribe({
      next: () => this.getColaboradores(),
      error: () => (this.errorMessage = 'Error al eliminar colaborador.'),
    });
  }

  openModal(): void {
    this.isModalOpen = true;
    this.isModalVisible = false;
    this.errorMessage = null;

    // Restablecer el formulario y la vista previa de la foto
    this.colaboradorForm.reset({
      empresaId: '', // Asegúrate de que el placeholder funcione
    });
    this.fotoPreview = 'assets/user-circle-svgrepo-com.svg'; // Restablecer a la imagen predeterminada

    setTimeout(() => (this.isModalVisible = true), 10);
  }

  closeModal(): void {
    this.isModalVisible = false; // Inicia la animación de salida
    setTimeout(() => {
      this.isModalOpen = false; // Oculta completamente el modal

      // Si se estaba editando, restablece el estado después del cierre del modal
      if (this.isEditing) {
        this.cancelEditCleanup();
      }

      this.fotoPreview = 'assets/user-circle-svgrepo-com.svg'; // Restablecer la foto predeterminada

      // Refrescar la tabla tras cerrar el modal
      this.getColaboradores();
    }, 300); // Coincide con la duración de la animación
  }

  private cancelEditCleanup(): void {
    this.isEditing = false; // Desactiva el modo edición
    this.selectedColaboradorId = null; // Restablece el ID seleccionado
    this.colaboradorForm.reset(); // Limpia el formulario
  }
}
