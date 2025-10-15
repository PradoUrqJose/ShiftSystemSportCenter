import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Colaborador } from '../../services/colaborador.service';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.css']
})
export class FilterBarComponent {
  @Input() companies: string[] = [];
  @Input() collaborators: Colaborador[] = [];

  @Input() selectedCompany: string | null = 'all';
  @Input() selectedCollaboratorIds: number[] = [];

  @Input() showSortControl: boolean = false;
  @Input() sortActive: boolean = false;

  @Output() companyChange = new EventEmitter<string>();
  @Output() collaboratorChange = new EventEmitter<number[]>();
  @Output() sortToggle = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  showCompanyDropdown: boolean = false;
  showCollaboratorDropdown: boolean = false;

  // Positions are handled via CSS (relative container). No viewport positioning needed.

  collaboratorSearch: string = '';

  get filteredCollaborators(): Colaborador[] {
    const query = (this.collaboratorSearch || '').toLowerCase().trim();
    const base = (this.selectedCompany && this.selectedCompany !== 'all')
      ? this.collaborators.filter(c => (c.empresaNombre || 'Sin Empresa') === this.selectedCompany)
      : this.collaborators;
    if (!query) return base;
    return base.filter(c =>
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(query) ||
      (c.empresaNombre || '').toLowerCase().includes(query)
    );
  }

  get hasActiveFilters(): boolean {
    return (this.selectedCompany && this.selectedCompany !== 'all') || (this.selectedCollaboratorIds && this.selectedCollaboratorIds.length > 0);
  }

  getSelectedEmpresaName(): string {
    if (!this.selectedCompany || this.selectedCompany === 'all') return 'Todas las empresas';
    return this.selectedCompany;
  }

  getSelectedColaboradorName(): string {
    if (!this.selectedCollaboratorIds || this.selectedCollaboratorIds.length === 0) return 'Todos los colaboradores';
    if (this.selectedCollaboratorIds.length === 1) {
      const c = this.collaborators.find(x => x.id === this.selectedCollaboratorIds[0]);
      return c ? `${c.nombre} ${c.apellido}` : '1 seleccionado';
    }
    return `${this.selectedCollaboratorIds.length} seleccionados`;
  }

  onToggleSort(): void {
    this.sortToggle.emit();
  }

  openCompanyDropdown(event?: MouseEvent): void {
    event?.stopPropagation();
    this.showCompanyDropdown = !this.showCompanyDropdown;
    if (this.showCompanyDropdown) this.showCollaboratorDropdown = false;
  }

  openCollaboratorDropdown(event?: MouseEvent): void {
    event?.stopPropagation();
    this.showCollaboratorDropdown = !this.showCollaboratorDropdown;
    if (this.showCollaboratorDropdown) this.showCompanyDropdown = false;
  }

  selectCompany(company: string): void {
    this.selectedCompany = company;
    this.companyChange.emit(company);
    this.showCompanyDropdown = false;
  }

  selectAllCollaborators(): void {
    this.selectedCollaboratorIds = [];
    this.collaboratorChange.emit([]);
    this.showCollaboratorDropdown = false;
  }

  toggleCollaborator(colaboradorId: number): void {
    const set = new Set(this.selectedCollaboratorIds || []);
    if (set.has(colaboradorId)) set.delete(colaboradorId); else set.add(colaboradorId);
    this.selectedCollaboratorIds = Array.from(set);
    this.collaboratorChange.emit(this.selectedCollaboratorIds);
  }

  clearAll(): void {
    this.selectedCompany = 'all';
    this.selectedCollaboratorIds = [];
    this.companyChange.emit('all');
    this.collaboratorChange.emit([]);
    this.clear.emit();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showCompanyDropdown = false;
    this.showCollaboratorDropdown = false;
  }
}


