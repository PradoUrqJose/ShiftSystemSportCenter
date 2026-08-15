import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

// Primitivo shimmer configurable — base de los skeletons con forma real
// (tabla de filas en Fase 3, grilla semanal/mensual en Fase 2) que
// reemplazan al spinner .sk-circle global. Un solo bloque rectangular o
// circular por instancia; los skeletons compuestos (fila, grilla) se arman
// combinando varios <app-skeleton> en el componente que los necesite, no
// acá — este no sabe de tablas ni de calendarios.
//
// El tamaño se aplica directo al host (@HostBinding), no a un <span>
// interno: un ancho en % dentro de un elemento envoltorio sin ancho propio
// (inline-block auto) no tiene contra qué resolverse y colapsa a 0 — pasó
// en la primera versión de este componente, dentro de un contenedor no-flex.
@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: '',
  styleUrls: ['./skeleton.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-skeleton', 'aria-hidden': 'true' },
})
export class SkeletonComponent {
  @Input() @HostBinding('style.width') width: string = '100%';
  @Input() @HostBinding('style.height') height: string = '14px';
  @Input() shape: 'block' | 'circle' = 'block';
  /** Radio en px/rem; ignorado si shape='circle' (siempre 50%). */
  @Input() radius: string | null = null;

  @HostBinding('style.border-radius')
  get computedRadius(): string {
    return this.shape === 'circle' ? '50%' : this.radius || 'var(--radius-sm)';
  }
}
