import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TurnoService, Turno } from '../../services/turno.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-turno-modal',
  standalone: true,
  templateUrl: './turno-modal.component.html',
  styleUrls: ['./turno-modal.component.css'],
  imports: [CommonModule, ReactiveFormsModule]
})
export default class TurnoModalComponent implements OnInit {
  turnoForm: FormGroup;
  isEditing: boolean = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TurnoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { turno: Turno | null; colaboradorId: number; fecha: string },
    private turnoService: TurnoService
  ) {
    this.turnoForm = this.fb.group({
      horaEntrada: ['', Validators.required],
      horaSalida: ['', Validators.required]
    });

    // Si hay datos de turno, habilitar modo edición
    if (this.data.turno) {
      this.isEditing = true;
      this.turnoForm.patchValue({
        horaEntrada: this.data.turno.horaEntrada,
        horaSalida: this.data.turno.horaSalida
      });
    }
  }

  ngOnInit(): void {}

  guardando = false;

  guardarTurno(): void {
    if (this.turnoForm.valid) {
      this.guardando = true;
      const turnoData: Turno = {
        colaborador: { id: this.data.colaboradorId, nombre: '' },
        fecha: this.data.fecha,
        horaEntrada: this.turnoForm.value.horaEntrada,
        horaSalida: this.turnoForm.value.horaSalida,
        horasTrabajadas: 0
      };

      const request$ = this.isEditing && this.data.turno
        ? this.turnoService.updateTurno(this.data.turno.id!, turnoData)
        : this.turnoService.addTurno(turnoData);

      request$.subscribe(
        () => {
          this.guardando = false;
          this.dialogRef.close(true); // Emite true al cerrar
        },
        () => {
          this.guardando = false;
        }
      );
    }
  }


  cancelar(): void {
    this.dialogRef.close();
  }

  confirmarEliminar(): void {
    const confirmacion = window.confirm('¿Está seguro de que desea eliminar este turno?');
    if (confirmacion && this.data.turno?.id) {
      this.eliminarTurno();
    }
  }

  eliminarTurno(): void {
    if (this.data.turno?.id) {
      this.turnoService.deleteTurno(this.data.turno.id).subscribe(() => {
        this.dialogRef.close(true); // Emitir true al cerrar después de eliminar
      });
    }
  }
}
