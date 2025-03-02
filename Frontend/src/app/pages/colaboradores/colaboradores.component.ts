import { ModalService } from './../../services/modal.service';
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
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { Puesto, PuestoService } from '../../services/puesto.service';
import { AgregarPuestoModalComponent } from './agregar-puesto-modal/agregar-puesto-modal.component';

@Component({
  selector: 'app-colaboradores',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, RouterModule],
  templateUrl: './colaboradores.component.html',
  styleUrls: ['./colaboradores.component.css'],
})
export default class ColaboradoresComponent implements OnInit {
  isTableLoading: boolean = true;  // Controla el estado de carga de la tabla

  colaboradores: Colaborador[] = [];
  empresas: Empresa[] = [];
  colaboradorForm: FormGroup;
  isEditing: boolean = false;
  isPhotoLoading: boolean = false; // Bandera para simular la carga de la foto

  selectedColaboradorId: number | null = null;
  selectedEmpresaId: number | null = null; // Propiedad agregada

  colaboradoresHabilitados: Colaborador[] = [];
  colaboradoresDeshabilitados: Colaborador[] = [];
  mostrarDeshabilitados: boolean = false; // Controla si se muestran las deshabilitadas

  // Control de Modal
  mostrarModal$!: Observable<boolean>; // ✅ Declaramos correctamente
  isModalVisible$!: Observable<boolean>; // ✅ Declaramos correctamente
  errorMessage: string | null = null;
  isLoading: boolean = false; // Nueva variable para controlar el spinner

  // Nueva funcionalidad
  fotoPreview: string | ArrayBuffer | null =
    'assets/user-circle-svgrepo-com.svg'; // Inicializar con una imagen por defecto
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef; // Referencia al input de archivos

  puestos: Puesto[] = [];
  mostrarModalAgregarPuesto: boolean = false;
  mostrarModalGestionarPuestos: boolean = false;
  puestoActual: Puesto = { nombre: '', descripcion: '' };

  constructor(
    private fb: FormBuilder,
    private colaboradorService: ColaboradorService,
    private empresaService: EmpresaService,
    private puestoService: PuestoService,
    private modalService: ModalService,
    private router: Router,
    private http: HttpClient
  ) {
    this.colaboradorForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(15)]],
      apellido: ['', [Validators.required, Validators.maxLength(20)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      telefono: ['', [Validators.pattern(/^\d{9}$/), Validators.maxLength(15)]],
      email: ['', [Validators.email]],
      empresaId: ['', Validators.required],
      foto: [null], // Para manejar la imagen
      habilitado: [true], // Valor por defecto true
      fechaNacimiento: [''], // Nuevo campo
      puestoId: [null]       // Nuevo campo
    });
  }

  // Agregar el setter para empresaId en el formulario
  onEmpresaSelected(event: any): void {
    this.selectedEmpresaId = event.target.value;
  }

  ngOnInit(): void {
    this.mostrarModal$ = this.modalService.mostrarModal$;
    this.isModalVisible$ = this.modalService.isModalVisible$;
    this.getEmpresasAndColaboradores();
    this.puestoService.getPuestos().subscribe(puestos => this.puestos = puestos); // Cargar puestos al inicio
  }

  validateForm(): void {
    this.errorMessage = null; // Reinicia mensaje de error
    for (const controlName in this.colaboradorForm.controls) {
      const control = this.colaboradorForm.get(controlName);
      if (control && control.invalid) {
        if (controlName === 'nombre' && control.errors?.['required']) {
          this.errorMessage = 'El nombre es obligatorio.';
        } else if  (controlName === 'nombre' && control.errors?.['maxlength']) {
          this.errorMessage = 'El nombre no puede tener más de 15 caracteres.';
        } else if (controlName === 'apellido' && control.errors?.['required']) {
          this.errorMessage = 'El apellido es obligatorio.';
        } else if (controlName === 'apellido' && control.errors?.['maxlength']) {
          this.errorMessage = 'El apellido no puede tener más de 20 caracteres.';
        } else if (controlName === 'dni' && control.errors?.['required']) {
          this.errorMessage = 'El DNI es obligatorio.';
        } else if (controlName === 'dni' && control.errors?.['pattern']) {
          this.errorMessage = 'El DNI debe tener 8 dígitos.';
        } else if (controlName === 'telefono' && control.errors?.['pattern']) {
          this.errorMessage = 'El teléfono debe tener 9 dígitos.';
        } else if (controlName === 'telefono' && control.errors?.['maxlength']) {
          this.errorMessage = 'El teléfono no puede tener más de 15 caracteres.';
        } else if (controlName === 'email' && control.errors?.['email']) {
          this.errorMessage = 'El email debe ser válido.';
        } else if (
          controlName === 'empresaId' &&
          control.errors?.['required']
        ) {
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
    const element = document.querySelector(
      `[formControlName="${controlName}"]`
    );
    if (element) {
      (element as HTMLElement).classList.add('border-red-500');
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 1048576) { // 1 MB
        this.errorMessage = 'La foto debe ser menor a 1 MB';
        return;
      }
      this.isPhotoLoading = true;
      const reader = new FileReader();
      reader.onload = () => {
        setTimeout(() => {
          this.fotoPreview = reader.result;
          this.isPhotoLoading = false;
        }, 700);
      };
      reader.readAsDataURL(file);
      this.colaboradorForm.patchValue({ foto: file });
      this.colaboradorForm.get('foto')?.markAsDirty();
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('foto') as HTMLInputElement;
    fileInput.click(); // Simular clic en el input de archivo
  }

  getEmpresasAndColaboradores(): void {
    this.empresaService.getEmpresasPorHabilitacion(true).subscribe({
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
    this.colaboradorService.getColaboradores().subscribe({
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
    this.isLoading = true; // Activar el spinner de carga

    const colaborador: Colaborador = {
      ...this.colaboradorForm.value,
      empresaId: this.selectedEmpresaId!,
    };

    const file = this.colaboradorForm.get('foto')?.value;

    this.colaboradorService.addColaborador(colaborador, file).subscribe({
      next: () => {
        this.getColaboradores();
        this.colaboradorForm.reset();
        this.fotoPreview = 'assets/user-circle-svgrepo-com.svg';
        this.selectedColaboradorId = null;
        this.isLoading = false;
        this.closeModal();
      },
      error: (err) => {
        // Extrae el mensaje del cuerpo de la respuesta (err.error)
        const errorMessage = typeof err.error === 'string' ? err.error : 'Error al agregar colaborador.';
        this.errorMessage = errorMessage;
        this.isLoading = false;
        console.error('Error recibido:', err); // Para depuración
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

    this.colaboradorForm.patchValue({
      nombre: colaborador.nombre,
      apellido: colaborador.apellido,
      dni: colaborador.dni,
      telefono: colaborador.telefono,
      email: colaborador.email,
      empresaId: colaborador.empresaId,
      foto: null,
      habilitado: colaborador.habilitado,
      fechaNacimiento: colaborador.fechaNacimiento,
      puestoId: colaborador.puestoId
    });

    this.fotoPreview = colaborador.fotoUrl || 'assets/user-circle-svgrepo-com.svg';
  }

  updateColaborador(): void {
    if (this.colaboradorForm.valid && this.selectedColaboradorId !== null) {
      this.clearValidationErrors();
      this.isLoading = true;

      const colaborador: Colaborador = {
        ...this.colaboradorForm.value,
        id: this.selectedColaboradorId
      };

      const file = this.colaboradorForm.get('foto')?.value;

      this.colaboradorService.updateColaborador(this.selectedColaboradorId, colaborador, file).subscribe({
        next: () => {
          this.getColaboradores();
          this.colaboradorForm.reset();
          this.fotoPreview = 'assets/user-circle-svgrepo-com.svg';
          this.selectedColaboradorId = null;
          this.isLoading = false;
          this.closeModal();
          this.clearImageCache();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Error al actualizar colaborador.';
          this.isLoading = false;
        }
      });
    } else {
      this.validateForm();
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
    this.errorMessage = null;

    // Restablecer el formulario y la vista previa de la foto
    this.colaboradorForm.reset({
      empresaId: null, // Asegúrate de que el placeholder funcione
    });
    this.colaboradorForm.reset({ habilitado: true }); // Valor por defecto

    this.fotoPreview = 'assets/user-circle-svgrepo-com.svg'; // Restablecer a la imagen predeterminada

    this.modalService.abrirModal(50);
  }

  closeModal(): void {
    // Si se estaba editando, restablece el estado después del cierre del modal
    if (this.isEditing) {
      this.cancelEditCleanup();
    }

    this.fotoPreview = 'assets/user-circle-svgrepo-com.svg'; // Restablecer la foto predeterminada

    // Refrescar la tabla tras cerrar el modal
    this.getColaboradores();
    this.modalService.cerrarModal(50);
  }

  private cancelEditCleanup(): void {
    this.isEditing = false; // Desactiva el modo edición
    this.selectedColaboradorId = null; // Restablece el ID seleccionado
    this.colaboradorForm.reset(); // Limpia el formulario
  }

  viewProfile(colaboradorId: number | null): void {
    if (colaboradorId) {
      this.router.navigate(['/reportes/colaborador-profile', colaboradorId]);
      this.closeModal(); // Cierra el modal después de redirigir
    }
  }
}
