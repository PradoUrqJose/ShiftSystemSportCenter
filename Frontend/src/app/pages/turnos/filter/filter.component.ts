import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Colaborador } from '../../../services/colaborador.service';

export interface FilterState {
  empresaId: number | null;
  colaboradorIds: number[];
  searchTerm: string;
}

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.css']
})
export class FilterComponent implements OnInit {
  @Input() colaboradores: Colaborador[] = [];
  @Input() empresas: { id: number; nombre: string }[] = [];
  @Input() currentFilter: FilterState = {
    empresaId: null,
    colaboradorIds: [],
    searchTerm: ''
  };

  @Output() filterChange = new EventEmitter<FilterState>();
  @Output() clearFilter = new EventEmitter<void>();

  filteredColaboradores: Colaborador[] = [];
  showColaboradoresDropdown = false;
  showEmpresasDropdown = false;

  ngOnInit() {
    this.updateFilteredColaboradores();
  }

  ngOnChanges() {
    this.updateFilteredColaboradores();
  }

  updateFilteredColaboradores() {
    this.filteredColaboradores = this.colaboradores.filter(colaborador => {
      const matchesSearch = this.currentFilter.searchTerm === '' ||
        `${colaborador.nombre} ${colaborador.apellido}`.toLowerCase().includes(this.currentFilter.searchTerm.toLowerCase()) ||
        colaborador.empresaNombre?.toLowerCase().includes(this.currentFilter.searchTerm.toLowerCase());

      const matchesEmpresa = !this.currentFilter.empresaId || colaborador.empresaId === this.currentFilter.empresaId;

      return matchesSearch && matchesEmpresa && colaborador.habilitado;
    });
  }

  onSearchChange() {
    this.updateFilteredColaboradores();
  }

  onEmpresaChange(empresaId: number | null) {
    this.currentFilter.empresaId = empresaId;
    this.updateFilteredColaboradores();
    this.emitFilterChange();
  }

  onColaboradorToggle(colaboradorId: number) {
    const index = this.currentFilter.colaboradorIds.indexOf(colaboradorId);
    if (index > -1) {
      this.currentFilter.colaboradorIds.splice(index, 1);
    } else {
      this.currentFilter.colaboradorIds.push(colaboradorId);
    }
    this.emitFilterChange();
  }

  isColaboradorSelected(colaboradorId: number): boolean {
    return this.currentFilter.colaboradorIds.includes(colaboradorId);
  }

  clearAllFilters() {
    this.currentFilter = {
      empresaId: null,
      colaboradorIds: [],
      searchTerm: ''
    };
    this.updateFilteredColaboradores();
    this.clearFilter.emit();
  }

  emitFilterChange() {
    this.filterChange.emit({ ...this.currentFilter });
  }

  getSelectedColaboradoresNames(): string {
    if (this.currentFilter.colaboradorIds.length === 0) return 'Todos los colaboradores';
    if (this.currentFilter.colaboradorIds.length === 1) {
      const colaborador = this.colaboradores.find(c => c.id === this.currentFilter.colaboradorIds[0]);
      return colaborador ? `${colaborador.nombre} ${colaborador.apellido}` : 'Colaborador seleccionado';
    }
    return `${this.currentFilter.colaboradorIds.length} colaboradores seleccionados`;
  }

  getSelectedEmpresaName(): string {
    if (!this.currentFilter.empresaId) return 'Todas las empresas';
    const empresa = this.empresas.find(e => e.id === this.currentFilter.empresaId);
    return empresa ? empresa.nombre : 'Empresa seleccionada';
  }
}
