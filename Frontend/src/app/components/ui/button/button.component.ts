
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
    imports: [],
    templateUrl: './button.component.html',
    styleUrls: ['./button.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    // El host (<app-button>) es inline por defecto (custom element sin
    // estilo propio) — un ancho 100% en el <button> interno no tiene contra
    // qué crecer ahí adentro. [fullWidth] blockifica también el host, así el
    // botón realmente llena a su contenedor (ej. submit de un form angosto).
    host: {
        '[class.app-button--full]': "fullWidth && variant !== 'icon'",
    }
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  /** Aplica en variant='icon' o 'secondary' — familia de color del acento. */
  @Input() hue: ButtonHue = 'neutral';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled: boolean = false;
  /** Solo variant='primary'|'secondary': ocupa todo el ancho del contenedor (ej. submit de un form angosto). */
  @Input() fullWidth: boolean = false;
  @Input() isLoading: boolean = false;
  /** Solo variant='icon': texto del tooltip CSS-puro (ver .icon-action original). */
  @Input() tooltip: string | null = null;
  @Input() ariaLabel: string | null = null;
}
