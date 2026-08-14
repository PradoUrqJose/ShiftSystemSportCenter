import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'icon';
export type ButtonHue = 'brand' | 'teal' | 'violet' | 'neutral';

// Reemplaza .blue-button / .gray-button / .buttonStyle (styles.css) y
// generaliza .icon-action (turnos.component.css) en un solo componente.
// El click nativo del <button> interno burbujea a través del host, así que
// los consumidores escuchan (click) directo en <app-button> sin necesidad
// de un @Output propio — mismo patrón que usa cualquier elemento nativo.
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  /** Solo aplica cuando variant='icon' — familia de color del acento. */
  @Input() hue: ButtonHue = 'neutral';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled: boolean = false;
  @Input() isLoading: boolean = false;
  /** Solo variant='icon': texto del tooltip CSS-puro (ver .icon-action original). */
  @Input() tooltip: string | null = null;
  @Input() ariaLabel: string | null = null;
}
