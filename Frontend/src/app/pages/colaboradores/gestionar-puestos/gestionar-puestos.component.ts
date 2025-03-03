import { Puesto, PuestoService } from './../../../services/puesto.service';
import { Component, OnInit } from '@angular/core';
import { ColaboradorService } from '../../../services/colaborador.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AgregarPuestoModalComponent } from '../agregar-puesto-modal/agregar-puesto-modal.component';

@Component({
  selector: 'app-gestionar-puestos',
  standalone: true,
  imports: [CommonModule, AgregarPuestoModalComponent],
  templateUrl: './gestionar-puestos.component.html',
  styleUrls: ['./gestionar-puestos.component.css']
})
export default class GestionarPuestosComponent implements OnInit {
  puestos: Puesto[] = [];
  mostrarModalAgregarPuesto: boolean = false;
  puestoActual: Puesto = { nombre: '', descripcion: '' };
  conteoColaboradoresPorPuesto: { [key: number]: number } = {};
  errorMessage: string | null = null; // Añadir para mostrar errores
  isLoading: boolean = false; // Añadir para indicar carga

  constructor(
    private puestoService: PuestoService,
    private colaboradorService: ColaboradorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarPuestos();
    this.cargarConteoColaboradores();
  }

  cargarPuestos(): void {
    this.isLoading = true;
    this.puestoService.getPuestos().subscribe({
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
    this.colaboradorService.getColaboradores().subscribe({
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
  }

  cerrarModalAgregarPuesto(): void {
    this.mostrarModalAgregarPuesto = false;
    this.errorMessage = null;
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
    this.puestoService.deletePuesto(id).subscribe({
      next: () => {
        this.puestos = this.puestos.filter(p => p.id !== id);
        this.cargarConteoColaboradores();
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error al eliminar el puesto.';
      }
    });
  }

  editarPuesto(puesto: Puesto): void {
    this.puestoActual = { ...puesto };
    this.mostrarModalAgregarPuesto = true;
    this.errorMessage = null;
  }

  goBack(): void {
    this.router.navigate(['/colaboradores']);
  }
}
