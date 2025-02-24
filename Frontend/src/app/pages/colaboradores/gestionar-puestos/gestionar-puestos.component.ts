import { Puesto, PuestoService } from './../../../services/puesto.service';
import { Component, OnInit } from '@angular/core';
import { ColaboradorService } from '../../../services/colaborador.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AgregarPuestoModalComponent } from '../agregar-puesto-modal/agregar-puesto-modal.component';

@Component({
  selector: 'app-gestionar-puestos',
  standalone: true,
  imports: [CommonModule, AgregarPuestoModalComponent], // Agrega más módulos si necesitas formularios u otros
  templateUrl: './gestionar-puestos.component.html',
  styleUrls: ['./gestionar-puestos.component.css']
})
export default class GestionarPuestosComponent implements OnInit {
  puestos: Puesto[] = [];
  mostrarModalAgregarPuesto: boolean = false;
  puestoActual: Puesto = { nombre: '', descripcion: '' };
  conteoColaboradoresPorPuesto: { [key: number]: number } = {};

  constructor(
    private puestoService: PuestoService,
    private colaboradorService: ColaboradorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarPuestos();
    this.cargarConteoColaboradores();
  }

  // Cargar lista de puestos
  cargarPuestos(): void {
    this.puestoService.getPuestos().subscribe({
      next: (puestos) => this.puestos = puestos,
      error: (err) => console.error('Error al cargar puestos:', err)
    });
  }

  // Cargar conteo de colaboradores por puesto
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
      error: (err) => console.error('Error al cargar colaboradores:', err)
    });
  }

  // Abrir el modal para agregar puesto
  abrirModalAgregarPuesto(): void {
    this.puestoActual = { nombre: '', descripcion: '' };
    this.mostrarModalAgregarPuesto = true;
  }

  cerrarModalAgregarPuesto(): void {
    this.mostrarModalAgregarPuesto = false;
  }

  onPuestoAgregado(puesto: Puesto): void {
    this.puestos.push(puesto);
    this.cargarConteoColaboradores(); // Actualiza el conteo tras agregar
  }

  eliminarPuesto(id: number | undefined): void {
    if (!id) return;

    this.puestoService.deletePuesto(id).subscribe({
      next: () => {
        this.puestos = this.puestos.filter(p => p.id !== id);
        this.cargarConteoColaboradores(); // Actualiza el conteo tras eliminar
      },
      error: (err) => console.error('Error al eliminar puesto:', err)
    });
  }

  editarPuesto(puesto: Puesto): void {
    this.puestoActual = { ...puesto };
    this.mostrarModalAgregarPuesto = true;
  }

  goBack(): void {
    this.router.navigate(['/colaboradores']);
  }
}
