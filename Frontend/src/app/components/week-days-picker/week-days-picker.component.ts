import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { es } from 'date-fns/locale';

interface CeldaSemana {
  fecha: Date;
  iso: string;
}

interface CeldaMes {
  fecha: Date;
  iso: string;
  fueraDeMes: boolean;
}

// Reemplaza "Período" (date-range-picker) + "Días a incluir" (checkboxes de
// día de semana) del modal de turnos masivos: eran dos controles separados
// para expresar lo mismo — qué fechas concretas entran en el lote — y
// obligaba a pensarlo en dos pasos. Acá se eligen las fechas directamente,
// como fechas concretas (yyyy-MM-dd), no como "día de semana + rango".
//
// Vista semana (por defecto): tira Lun-Dom navegable, click en un día lo
// tilda/destilda. Navegar de semana descarta la selección de la semana que
// se deja atrás — turnos masivos es mayormente de una semana (ver memoria
// de mejoras de velocidad del operador), y así el operador nunca termina
// con días sueltos tildados en una semana que ya no está mirando.
//
// Vista mes (botón "Ver mes"): escapatoria para los casos que sí cruzan
// semanas. Clicks sueltos van sumando días individuales; el modo "rango"
// (click inicio, click fin) suma el tramo completo. A diferencia de la
// tira semanal, acá NO se limpia nada al cambiar de mes — es justamente la
// herramienta para lotes largos. Una vez que se usó, la tira semanal deja
// de auto-limpiar al navegar (se asume que el operador ya está armando algo
// multi-semana a propósito).
@Component({
    selector: 'app-week-days-picker',
    imports: [CommonModule],
    templateUrl: './week-days-picker.component.html',
    styleUrls: ['./week-days-picker.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeekDaysPickerComponent {
  @Input() fechasSeleccionadas: Set<string> = new Set();
  @Output() fechasSeleccionadasChange = new EventEmitter<Set<string>>();

  readonly diasSemanaLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  semanaVisible: Date = startOfWeek(new Date(), { weekStartsOn: 1 });
  vistaMes: boolean = false;
  mesVisible: Date = new Date();
  rangoActivo: boolean = false;
  anclaRango: Date | null = null;

  private usoVistaMes: boolean = false;

  get celdasSemana(): CeldaSemana[] {
    return eachDayOfInterval({ start: this.semanaVisible, end: endOfWeek(this.semanaVisible, { weekStartsOn: 1 }) }).map(
      (fecha) => ({ fecha, iso: format(fecha, 'yyyy-MM-dd') })
    );
  }

  get celdasMes(): CeldaMes[] {
    const inicioMes = startOfMonth(this.mesVisible);
    const finMes = endOfMonth(this.mesVisible);
    const inicioGrilla = startOfWeek(inicioMes, { weekStartsOn: 1 });
    const finGrilla = endOfWeek(finMes, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inicioGrilla, end: finGrilla }).map((fecha) => ({
      fecha,
      iso: format(fecha, 'yyyy-MM-dd'),
      fueraDeMes: !isSameMonth(fecha, this.mesVisible),
    }));
  }

  get nombreMesSemana(): string {
    return format(this.semanaVisible, 'MMMM yyyy', { locale: es });
  }

  get nombreMesPopover(): string {
    return format(this.mesVisible, 'MMMM yyyy', { locale: es });
  }

  get resumenSeleccion(): string {
    const n = this.fechasSeleccionadas.size;
    if (n === 0) return 'Ningún día seleccionado';
    return `${n} día${n === 1 ? '' : 's'} seleccionado${n === 1 ? '' : 's'}`;
  }

  esHoy(fecha: Date): boolean {
    return isToday(fecha);
  }

  esAnclaRango(fecha: Date): boolean {
    return !!this.anclaRango && isSameDay(fecha, this.anclaRango);
  }

  estaSeleccionado(iso: string): boolean {
    return this.fechasSeleccionadas.has(iso);
  }

  semanaAnterior(): void {
    this.semanaVisible = subWeeks(this.semanaVisible, 1);
    if (!this.usoVistaMes) this.limpiarFueraDeSemana();
  }

  semanaSiguiente(): void {
    this.semanaVisible = addWeeks(this.semanaVisible, 1);
    if (!this.usoVistaMes) this.limpiarFueraDeSemana();
  }

  toggleDiaSemana(iso: string): void {
    this.toggleFecha(iso);
  }

  aplicarPresetSemana(preset: 'habiles' | 'todos'): void {
    const nuevas = new Set(this.fechasSeleccionadas);
    // Limpia primero la semana visible para que "Todos" no se sume sobre un
    // "Lun-Vie" ya tildado antes.
    this.celdasSemana.forEach((c) => nuevas.delete(c.iso));
    const cantidad = preset === 'habiles' ? 5 : 7;
    this.celdasSemana.slice(0, cantidad).forEach((c) => nuevas.add(c.iso));
    this.emitir(nuevas);
  }

  abrirVistaMes(): void {
    this.usoVistaMes = true;
    this.vistaMes = true;
    this.mesVisible = this.semanaVisible;
    this.rangoActivo = false;
    this.anclaRango = null;
  }

  cerrarVistaMes(event?: MouseEvent): void {
    event?.stopPropagation();
    this.vistaMes = false;
  }

  mesAnterior(): void {
    this.mesVisible = subMonths(this.mesVisible, 1);
  }

  mesSiguiente(): void {
    this.mesVisible = addMonths(this.mesVisible, 1);
  }

  toggleModoRango(): void {
    this.rangoActivo = !this.rangoActivo;
    this.anclaRango = null;
  }

  clickDiaMes(celda: CeldaMes): void {
    if (!this.rangoActivo) {
      this.toggleFecha(celda.iso);
      return;
    }
    if (!this.anclaRango) {
      this.anclaRango = celda.fecha;
      return;
    }
    const nuevas = new Set(this.fechasSeleccionadas);
    const [desde, hasta] = this.anclaRango <= celda.fecha ? [this.anclaRango, celda.fecha] : [celda.fecha, this.anclaRango];
    eachDayOfInterval({ start: desde, end: hasta }).forEach((f) => nuevas.add(format(f, 'yyyy-MM-dd')));
    this.anclaRango = null;
    this.emitir(nuevas);
  }

  trackByIso(_index: number, celda: CeldaSemana | CeldaMes): string {
    return celda.iso;
  }

  private toggleFecha(iso: string): void {
    const nuevas = new Set(this.fechasSeleccionadas);
    if (nuevas.has(iso)) nuevas.delete(iso);
    else nuevas.add(iso);
    this.emitir(nuevas);
  }

  private limpiarFueraDeSemana(): void {
    const enSemana = new Set(this.celdasSemana.map((c) => c.iso));
    const nuevas = new Set([...this.fechasSeleccionadas].filter((iso) => enSemana.has(iso)));
    this.emitir(nuevas);
  }

  private emitir(nuevas: Set<string>): void {
    this.fechasSeleccionadas = nuevas;
    this.fechasSeleccionadasChange.emit(nuevas);
  }
}
