import { Component, OnInit } from '@angular/core';
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
  selectedColaboradorId: number | null = null;

  // Control de Modal
  isModalOpen: boolean = false;
  isModalVisible: boolean = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private colaboradorService: ColaboradorService,
    private empresaService: EmpresaService
  ) {
    this.colaboradorForm = this.fb.group({
      nombre: ['', Validators.required],
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      empresaId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.getColaboradores();
    this.getEmpresas();
  }

  getColaboradores(): void {
    this.colaboradorService.getColaboradores().subscribe({
      next: (data) => (this.colaboradores = data),
      error: () => (this.errorMessage = 'Error al obtener los colaboradores.'),
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
      this.colaboradorService
        .addColaborador(this.colaboradorForm.value)
        .subscribe({
          next: () => {
            this.getColaboradores();
            this.closeModal();
          },
          error: (err) => {
            this.errorMessage =
              err.error?.message || 'Error al agregar colaborador.';
          },
        });
    } else {
      this.errorMessage = 'Por favor, complete todos los campos correctamente.';
    }
  }

  editColaborador(colaborador: Colaborador): void {
    this.isEditing = true;
    this.selectedColaboradorId = colaborador.id || null;
    this.openModal();
    this.colaboradorForm.patchValue({
      nombre: colaborador.nombre,
      dni: colaborador.dni,
      empresaId: colaborador.empresa?.id,
    });
  }

  updateColaborador(): void {
    if (this.colaboradorForm.valid && this.selectedColaboradorId) {
      this.colaboradorService
        .updateColaborador(
          this.selectedColaboradorId,
          this.colaboradorForm.value
        )
        .subscribe({
          next: () => {
            this.getColaboradores();
            this.closeModal();
          },
          error: (err) => {
            this.errorMessage =
              err.error?.message || 'Error al actualizar colaborador.';
          },
        });
    } else {
      this.errorMessage = 'Por favor, complete todos los campos correctamente.';
    }
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
    setTimeout(() => (this.isModalVisible = true), 10);
  }

  closeModal(): void {
    this.isModalVisible = false;
    setTimeout(() => (this.isModalOpen = false), 300);
  }
}
