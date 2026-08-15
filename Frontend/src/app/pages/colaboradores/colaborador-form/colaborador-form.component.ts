import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Colaborador, ColaboradorService } from '../../../services/colaborador.service';
import { Empresa } from '../../../services/empresa.service';
import { Puesto } from '../../../services/puesto.service';
import { Subject, takeUntil } from 'rxjs';

// Formulario de alta/edición de colaborador, extraído de
// colaboradores.component.ts (que antes mezclaba esto con la tabla/lista).
// Mismo patrón que ya usa turno-modal.component.ts para turnos: el modal
// (fondo + animación) vive dentro de este componente, el padre solo decide
// cuándo mostrarlo vía [mostrarModal]/[isModalVisible] (mismo ModalService
// de siempre) y le pasa qué colaborador editar (o null para dar de alta).
@Component({
    selector: 'app-colaborador-form',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './colaborador-form.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./colaborador-form.component.css']
})
export class ColaboradorFormComponent implements OnChanges, OnDestroy {
  @Input() mostrarModal: boolean = false;
  @Input() isModalVisible: boolean = false;
  @Input() empresas: Empresa[] = [];
  @Input() puestos: Puesto[] = [];
  @Input() colaboradorEditar: Colaborador | null = null;

  @Output() cerrarModalEvent = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();
  @Output() verPerfil = new EventEmitter<number>();

  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  colaboradorForm: FormGroup;
  isEditing: boolean = false;
  isPhotoLoading: boolean = false;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  fotoPreview: string | ArrayBuffer | null = 'assets/user-circle-svgrepo-com.svg';
  selectedColaboradorId: number | null = null;
  selectedEmpresaId: number | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private colaboradorService: ColaboradorService
  ) {
    this.colaboradorForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(15)]],
      apellido: ['', [Validators.required, Validators.maxLength(20)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      telefono: ['', [Validators.pattern(/^\d{9}$/), Validators.maxLength(15)]],
      email: ['', [Validators.email]],
      empresaId: ['', Validators.required],
      foto: [null],
      habilitado: [true],
      fechaNacimiento: [''],
      puestoId: [null],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['colaboradorEditar']) {
      this.resetearFormulario();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetearFormulario(): void {
    this.errorMessage = null;
    this.clearValidationErrors();

    if (this.colaboradorEditar) {
      this.isEditing = true;
      this.selectedColaboradorId = this.colaboradorEditar.id ?? null;
      this.colaboradorForm.patchValue({
        nombre: this.colaboradorEditar.nombre,
        apellido: this.colaboradorEditar.apellido,
        dni: this.colaboradorEditar.dni,
        telefono: this.colaboradorEditar.telefono,
        email: this.colaboradorEditar.email,
        empresaId: this.colaboradorEditar.empresaId,
        foto: null,
        habilitado: this.colaboradorEditar.habilitado,
        fechaNacimiento: this.colaboradorEditar.fechaNacimiento,
        puestoId: this.colaboradorEditar.puestoId,
      });
      this.fotoPreview = this.colaboradorEditar.fotoUrl || 'assets/user-circle-svgrepo-com.svg';
    } else {
      this.isEditing = false;
      this.selectedColaboradorId = null;
      this.colaboradorForm.reset({ empresaId: null }); // Asegura que el placeholder funcione
      this.colaboradorForm.reset({ habilitado: true }); // Valor por defecto
      this.fotoPreview = 'assets/user-circle-svgrepo-com.svg';
    }
  }

  onEmpresaSelected(event: any): void {
    this.selectedEmpresaId = event.target.value;
  }

  validateForm(): void {
    this.errorMessage = null;
    for (const controlName in this.colaboradorForm.controls) {
      const control = this.colaboradorForm.get(controlName);
      if (control && control.invalid) {
        if (controlName === 'nombre' && control.errors?.['required']) {
          this.errorMessage = 'El nombre es obligatorio.';
        } else if (controlName === 'nombre' && control.errors?.['maxlength']) {
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
        } else if (controlName === 'empresaId' && control.errors?.['required']) {
          this.errorMessage = 'La empresa es obligatoria.';
        }
        control?.markAsTouched();
        return;
      }
    }
  }

  clearValidationErrors(): void {
    this.errorMessage = null;
    for (const controlName in this.colaboradorForm.controls) {
      this.colaboradorForm.get(controlName)?.setErrors(null);
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
    this.fileInput.nativeElement.click();
  }

  guardar(): void {
    if (this.isEditing) {
      this.actualizarColaborador();
    } else {
      this.agregarColaborador();
    }
  }

  private agregarColaborador(): void {
    if (!this.colaboradorForm.valid) {
      this.validateForm();
      return;
    }
    this.clearValidationErrors();
    this.isLoading = true;

    const colaborador: Colaborador = {
      ...this.colaboradorForm.value,
      empresaId: this.selectedEmpresaId!,
    };
    const file = this.colaboradorForm.get('foto')?.value;

    this.colaboradorService.addColaborador(colaborador, file).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isLoading = false;
        this.guardado.emit();
      },
      error: (err) => {
        // errorInterceptor ya normaliza err.message a un texto mostrable
        this.errorMessage = err.message || 'Error al agregar colaborador.';
        this.isLoading = false;
      },
    });
  }

  private actualizarColaborador(): void {
    if (!this.colaboradorForm.valid || this.selectedColaboradorId === null) {
      this.validateForm();
      return;
    }
    this.clearValidationErrors();
    this.isLoading = true;

    const colaborador: Colaborador = {
      ...this.colaboradorForm.value,
      id: this.selectedColaboradorId,
    };
    const file = this.colaboradorForm.get('foto')?.value;

    this.colaboradorService.updateColaborador(this.selectedColaboradorId, colaborador, file).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isLoading = false;
        this.guardado.emit();
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error al actualizar colaborador.';
        this.isLoading = false;
      },
    });
  }

  onVerPerfil(): void {
    if (this.selectedColaboradorId) {
      this.verPerfil.emit(this.selectedColaboradorId);
    }
  }

  cerrarModal(): void {
    this.cerrarModalEvent.emit();
  }

  trackByPuestoId(_index: number, puesto: Puesto): number | undefined {
    return puesto.id;
  }

  trackByEmpresaId(_index: number, empresa: Empresa): number {
    return empresa.id;
  }
}
