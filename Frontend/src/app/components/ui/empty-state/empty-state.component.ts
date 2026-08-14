import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

// Reemplaza los "Cargando perfil...", "No hay datos..." de texto plano
// sueltos por la app (colaborador-profile, reportes) por un tratamiento
// consistente. El slot (ng-content) es para una acción opcional (ej. botón
// "Agregar" cuando la lista está vacía porque no hay registros, no porque
// esté cargando).
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  /** Emoji simple, ej. "📭" — evita meter otro set de íconos acá. */
  @Input() icon: string | null = null;
  @Input() title: string = '';
  @Input() description: string | null = null;
}
