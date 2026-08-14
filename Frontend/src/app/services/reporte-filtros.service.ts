import { Injectable, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Colaborador, ColaboradorService } from './colaborador.service';

// Sin `providedIn: 'root'` a propósito: cada página de reporte que lo usa lo
// declara en su propio `providers` (ver horas-trabajadas.component.ts /
// turnos-feriados.component.ts), así Angular crea una instancia nueva por
// componente en vez de una compartida global — si fuera singleton, los
// filtros de una pestaña de reporte se mezclarían con los de otra.
//
// Antes este estado (fechas, colaboradores, filtro de empresa/estado) y su
// lógica estaban duplicados casi línea por línea entre HorasTrabajadasComponent
// y TurnosFeriadosComponent.
@Injectable()
export class ReporteFiltrosService implements OnDestroy {
  fechaInicio = '';
  fechaFin = '';
  colaboradores: Colaborador[] = [];
  colaboradoresSeleccionados: number[] = [];
  empresas: { id: number; nombre: string }[] = [];
  empresaSeleccionada: number | 'all' = 'all';
  estadoSeleccionado: 'all' | true | false = 'all';
  errorMessage: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(private colaboradorService: ColaboradorService) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Fechas del mes actual + carga de colaboradores/empresas — lo que cada
  // página de reporte hacía en su propio ngOnInit.
  inicializar(): void {
    this.setFechasMesActual();
    this.cargarColaboradores();
  }

  private setFechasMesActual(): void {
    const hoy = new Date();
    const first = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const last = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    this.fechaInicio = this.formatDate(first);
    this.fechaFin = this.formatDate(last);
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private cargarColaboradores(): void {
    this.colaboradorService.getColaboradores().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.colaboradores = data;
        const mapa = new Map<number, string>();
        data.forEach((c) => { if (c.empresaId) mapa.set(c.empresaId, c.empresaNombre); });
        this.empresas = [
          { id: -1, nombre: 'Todas las empresas' },
          ...Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre: nombre || 'Sin Empresa' })),
        ];
      },
      error: () => {
        this.errorMessage = 'Error al obtener colaboradores.';
      },
    });
  }

  toggleSelection(colaboradorId: number): void {
    const index = this.colaboradoresSeleccionados.indexOf(colaboradorId);
    if (index === -1) {
      this.colaboradoresSeleccionados.push(colaboradorId);
    } else {
      this.colaboradoresSeleccionados.splice(index, 1);
    }
  }

  onEmpresaChange(): void {
    if (this.empresaSeleccionada === 'all' && this.estadoSeleccionado === 'all') {
      this.colaboradoresSeleccionados = [];
      return;
    }
    this.updateSelectionFromFilters();
  }

  onEstadoChange(): void {
    if (this.empresaSeleccionada === 'all' && this.estadoSeleccionado === 'all') {
      this.colaboradoresSeleccionados = [];
      return;
    }
    this.updateSelectionFromFilters();
  }

  private updateSelectionFromFilters(): void {
    this.colaboradoresSeleccionados = this.colaboradores
      .filter(
        (c) =>
          (this.empresaSeleccionada === 'all' || c.empresaId === this.empresaSeleccionada) &&
          (this.estadoSeleccionado === 'all' || c.habilitado === this.estadoSeleccionado)
      )
      .map((c) => c.id);
  }

  trackByEmpresaId(_index: number, empresa: { id: number }): number {
    return empresa.id;
  }
}
