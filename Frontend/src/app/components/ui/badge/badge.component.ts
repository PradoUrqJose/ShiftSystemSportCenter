import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type BadgeTone = 'holiday' | 'overtime' | 'warning' | 'neutral' | 'brand';

// Para sacar señales de estado (feriado, horas-extra, almuerzo no tomado)
// del ::after compartido de .container-green — hoy esas 3 señales compiten
// por el mismo acento lateral de la pill de turno (ver Fase 2 del plan de
// rediseño). Este componente no sabe nada de turnos, solo pinta un tag.
@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  @Input() tone: BadgeTone = 'neutral';
}
