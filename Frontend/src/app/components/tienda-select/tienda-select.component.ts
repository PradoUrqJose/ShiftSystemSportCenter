import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tienda } from '../../services/tienda.service';

// Reemplaza al <select> nativo de tienda: mismo estilo en todos lados (el
// select nativo lo dibuja cada navegador distinto) y buscador integrado,
// útil ya con una docena de tiendas cargadas. Mismo patrón de dropdown
// (document:click + stopPropagation en el panel) que ya usa FilterBarComponent.
@Component({
  selector: 'app-tienda-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tienda-select.component.html',
  styleUrls: ['./tienda-select.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiendaSelectComponent {
  @Input() tiendas: Tienda[] = [];
  @Input() value: number | null = null;
  @Input() placeholder: string = 'Selecciona una tienda';

  @Output() valueChange = new EventEmitter<number>();
  @Output() agregarTienda = new EventEmitter<void>();

  open: boolean = false;
  search: string = '';

  get seleccionada(): Tienda | undefined {
    return this.tiendas.find((t) => t.id === this.value);
  }

  get filtradas(): Tienda[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.tiendas;
    return this.tiendas.filter((t) => t.nombre.toLowerCase().includes(q));
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
    if (!this.open) this.search = '';
  }

  seleccionar(tienda: Tienda): void {
    if (tienda.id === undefined) return;
    this.value = tienda.id;
    this.valueChange.emit(tienda.id);
    this.open = false;
    this.search = '';
  }

  onAgregarTienda(): void {
    this.open = false;
    this.agregarTienda.emit();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.open = false;
  }

  trackByTiendaId(_index: number, tienda: Tienda): number | undefined {
    return tienda.id;
  }
}
