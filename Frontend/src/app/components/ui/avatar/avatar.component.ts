import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

// Extraído de .option-avatar (filter-bar) y generalizado para cubrir
// también el caso con foto real (weekly-view hoy arma esto a mano con
// .hover-photo). Puramente presentacional: no sabe de hover, tooltip de
// "Ver perfil" ni navegación — eso lo arma el consumidor por encima,
// mismo criterio que TableShell.
@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  @Input() photoUrl: string | null = null;
  @Input() initials: string = '';
  @Input() size: number = 30;
}
