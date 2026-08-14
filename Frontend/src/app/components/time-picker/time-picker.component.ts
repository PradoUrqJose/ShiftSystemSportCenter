import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

// Reemplaza a <input type="time">: en Chrome ese input obliga a click en
// AM/PM para tocar la hora, lento para el operador (ver turno-modal.component.html
// antes de este cambio). Siempre 24h, dos campos de texto (HH y MM) que se
// tabulan solos — escribir los 2 dígitos de la hora salta directo a minutos.
// Sin flechitas de incremento: se probaron en el mock y nadie las usaba
// (feedback de Jose), el flujo real es tabular o escribir directo.
@Component({
  selector: 'app-time-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './time-picker.component.html',
  styleUrls: ['./time-picker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimePickerComponent {
  @Input() id: string = '';
  @Input()
  set value(v: string | undefined) {
    // Sin valor todavía (turno nuevo, turno partido recién habilitado): se
    // deja en blanco en vez de mostrar "00:00", que se vería como un
    // horario ya cargado cuando en realidad el modelo sigue vacío.
    if (!v) {
      this.horas = 0;
      this.minutos = 0;
      this.horasTexto = '';
      this.minutosTexto = '';
      return;
    }
    const [h, m] = v.split(':').map(Number);
    this.horas = Number.isFinite(h) ? this.clampHora(h) : 0;
    this.minutos = Number.isFinite(m) ? this.clampMinuto(m) : 0;
    this.horasTexto = String(this.horas).padStart(2, '0');
    this.minutosTexto = String(this.minutos).padStart(2, '0');
  }
  get value(): string {
    return `${String(this.horas).padStart(2, '0')}:${String(this.minutos).padStart(2, '0')}`;
  }
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('minutosInput') minutosInputRef?: ElementRef<HTMLInputElement>;

  horas = 0;
  minutos = 0;
  horasTexto = '00';
  minutosTexto = '00';

  onFocus(input: HTMLInputElement): void {
    input.select();
  }

  onInputHoras(raw: string): void {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    this.horasTexto = digits;
    if (digits.length === 2) {
      this.commitHoras(Number(digits));
      setTimeout(() => this.minutosInputRef?.nativeElement.select());
    }
  }

  onInputMinutos(raw: string): void {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    this.minutosTexto = digits;
    if (digits.length === 2) this.commitMinutos(Number(digits));
  }

  onBlurHoras(raw: string): void {
    // Vacío de verdad (nunca se tocó, o se borró a propósito): se deja en
    // blanco, no se fuerza un "00" fantasma.
    if (raw === '') { this.horasTexto = ''; return; }
    this.commitHoras(Number(raw));
  }

  onBlurMinutos(raw: string): void {
    if (raw === '') { this.minutosTexto = ''; return; }
    this.commitMinutos(Number(raw));
  }

  onKeydown(event: KeyboardEvent, unit: 'h' | 'm'): void {
    // Las flechas del teclado se dejan (no molestan a nadie); lo que se
    // sacó fueron los botones de flechita visibles, ver comentario arriba.
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      unit === 'h' ? this.commitHoras(this.horas + 1) : this.commitMinutos(this.minutos + 5);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      unit === 'h' ? this.commitHoras(this.horas - 1) : this.commitMinutos(this.minutos - 5);
    }
  }

  private commitHoras(v: number): void {
    this.horas = this.clampHora(v);
    this.horasTexto = String(this.horas).padStart(2, '0');
    this.emitValue();
  }

  private commitMinutos(v: number): void {
    this.minutos = this.clampMinuto(v);
    this.minutosTexto = String(this.minutos).padStart(2, '0');
    this.emitValue();
  }

  private clampHora(v: number): number {
    return ((v % 24) + 24) % 24;
  }

  private clampMinuto(v: number): number {
    return ((v % 60) + 60) % 60;
  }

  private emitValue(): void {
    this.valueChange.emit(this.value);
  }
}
