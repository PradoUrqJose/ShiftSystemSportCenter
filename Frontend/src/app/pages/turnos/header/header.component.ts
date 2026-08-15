
import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from '@angular/core';
import { ButtonComponent } from '../../../components/ui/button/button.component';

@Component({
    selector: 'app-header',
    imports: [ButtonComponent],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  // Inputs para recibir datos del componente padre
  @Input() vistaMensual: boolean = false; // Estado de la vista (semana/mes)
  @Input() nombreMesActual: string = ''; // Nombre del mes actual
  @Input() opcionMes: boolean = true; // Opción para cambiar entre vista semanal/mensual

  // Outputs para emitir eventos al componente padre
  @Output() cambiarVista = new EventEmitter<string>(); // Cambiar entre vista semanal/mensual
  @Output() cambiarSemanaOMes = new EventEmitter<'anterior' | 'siguiente'>(); // Navegar entre semanas/meses

  // Método para cambiar la vista (semana/mes)
  toggleVistaMensual(vista: string): void {
    this.cambiarVista.emit(vista);
  }

  // Método para cambiar la semana o el mes (anterior/siguiente)
  cambiarSemanaOMesHandler(direccion: 'anterior' | 'siguiente'): void {
    this.cambiarSemanaOMes.emit(direccion);
  }
}
