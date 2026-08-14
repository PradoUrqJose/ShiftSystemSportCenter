import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

interface CeldaDia {
  fecha: Date;
  fueraDeMes: boolean;
}

// Reemplaza a dos <input type="date"> sueltos para elegir un período: un
// solo calendario (semana arranca en lunes, igual que el resto de la app,
// ver CalendarioService), click en el día de inicio y click en el de fin.
// Mismo problema de fondo que resolvió TimePickerComponent: el formato de
// fecha del input nativo lo decide el sistema operativo/navegador, no
// siempre es obvio para el operador.
@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangePickerComponent {
  @Input() inicio: string | null = null; // yyyy-MM-dd
  @Input() fin: string | null = null; // yyyy-MM-dd
  @Output() rangoChange = new EventEmitter<{ inicio: string; fin: string }>();

  open: boolean = false;
  mesVisible: Date = new Date();
  readonly diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  get etiqueta(): string {
    if (!this.inicio || !this.fin) return 'Elige un período';
    return `${this.formatearCorto(this.inicio)} – ${this.formatearCorto(this.fin)}`;
  }

  get nombreMes(): string {
    return format(this.mesVisible, 'MMMM yyyy', { locale: es });
  }

  get celdas(): CeldaDia[] {
    const inicioMes = startOfMonth(this.mesVisible);
    const finMes = endOfMonth(this.mesVisible);
    const inicioGrilla = startOfWeek(inicioMes, { weekStartsOn: 1 });
    const finGrilla = endOfWeek(finMes, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inicioGrilla, end: finGrilla }).map((fecha) => ({
      fecha,
      fueraDeMes: fecha.getMonth() !== this.mesVisible.getMonth(),
    }));
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) {
      const referencia = this.inicio ? new Date(`${this.inicio}T00:00:00`) : new Date();
      this.mesVisible = referencia;
    }
  }

  mesAnterior(): void {
    this.mesVisible = subMonths(this.mesVisible, 1);
  }

  mesSiguiente(): void {
    this.mesVisible = addMonths(this.mesVisible, 1);
  }

  seleccionarDia(fecha: Date): void {
    const inicioActual = this.inicio ? new Date(`${this.inicio}T00:00:00`) : null;
    const finActual = this.fin ? new Date(`${this.fin}T00:00:00`) : null;

    if (!inicioActual || (inicioActual && finActual)) {
      this.emitir(fecha, null);
      return;
    }
    if (fecha < inicioActual) {
      this.emitir(fecha, inicioActual);
    } else {
      this.emitir(inicioActual, fecha);
    }
    this.open = false;
  }

  aplicarPreset(preset: 'semana' | 'proximaSemana' | 'mes'): void {
    const hoy = new Date();
    let inicio: Date;
    let fin: Date;
    if (preset === 'mes') {
      inicio = startOfMonth(hoy);
      fin = endOfMonth(hoy);
    } else {
      inicio = startOfWeek(hoy, { weekStartsOn: 1 });
      if (preset === 'proximaSemana') inicio = addDays(inicio, 7);
      fin = addDays(inicio, 6);
    }
    this.mesVisible = inicio;
    this.emitir(inicio, fin);
    this.open = false;
  }

  esInicio(fecha: Date): boolean {
    return !!this.inicio && isSameDay(fecha, new Date(`${this.inicio}T00:00:00`));
  }

  esFin(fecha: Date): boolean {
    return !!this.fin && isSameDay(fecha, new Date(`${this.fin}T00:00:00`));
  }

  enRango(fecha: Date): boolean {
    if (!this.inicio || !this.fin) return false;
    const inicioActual = new Date(`${this.inicio}T00:00:00`);
    const finActual = new Date(`${this.fin}T00:00:00`);
    if (finActual < inicioActual) return false;
    return isWithinInterval(fecha, { start: inicioActual, end: finActual }) && !this.esInicio(fecha) && !this.esFin(fecha);
  }

  trackByFecha(_index: number, celda: CeldaDia): string {
    return format(celda.fecha, 'yyyy-MM-dd');
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.open = false;
  }

  private emitir(inicio: Date | null, fin: Date | null): void {
    this.inicio = inicio ? format(inicio, 'yyyy-MM-dd') : null;
    this.fin = fin ? format(fin, 'yyyy-MM-dd') : null;
    if (this.inicio && this.fin) {
      this.rangoChange.emit({ inicio: this.inicio, fin: this.fin });
    }
  }

  private formatearCorto(fechaIso: string): string {
    return format(new Date(`${fechaIso}T00:00:00`), 'd MMM', { locale: es });
  }
}
