import { CommonModule } from '@angular/common';
import { CalendarioService, DiaSemana } from './../../../services/calendario.service';
import { ResumenMensual, Turno, TurnoService } from './../../../services/turno.service';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Feriado, FeriadoService } from '../../../services/feriado.service';
import { Observable, Subscription } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

@Component({
  selector: 'app-monthly-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monthly-view.component.html',
  styleUrls: ['./monthly-view.component.css', '../turnos.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonthlyViewComponent implements OnInit, OnDestroy {
  @Input() semanasDelMes: DiaSemana[][] = [];
  @Input() colaboradorSeleccionado: number = 0;
  @Input() turnosMensuales$!: Observable<Turno[]>;
  @Input() diasSemana: DiaSemana[] = [];
  @Input() mes: number = 0;
  @Input() anio: number = 0;

  @Output() abrirModal = new EventEmitter<{ colaboradorId: number; fecha: string }>();
  @Output() abrirModalEdicion = new EventEmitter<Turno>();
  @Output() turnosModificados = new EventEmitter<void>();

  turnos: Turno[] = [];
  feriados: Feriado[] = [];
  resumenMensual: ResumenMensual | undefined;
  private turnosSubscription?: Subscription;

  constructor(
    private turnoService: TurnoService,
    private feriadoService: FeriadoService,
    private calendarioService: CalendarioService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarFeriados();
    this.subscribeToTurnos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['turnosMensuales$'] || changes['colaboradorSeleccionado'] || changes['mes'] || changes['anio']) {
      this.subscribeToTurnos();
    }
  }

  ngOnDestroy(): void {
    this.turnosSubscription?.unsubscribe();
  }

  private subscribeToTurnos(): void {
    this.turnosSubscription?.unsubscribe();
    this.turnosSubscription = this.turnosMensuales$.pipe(
      shareReplay(1)
    ).subscribe(turnos => {
      this.turnos = turnos || [];
      this.cargarResumenMensual(); // Recargar resumen cada vez que cambian los turnos
      this.cdr.detectChanges();
    });
  }

  private cargarFeriados(): void {
    this.feriadoService.getFeriados().subscribe(data => {
      this.feriados = data;
      this.cdr.detectChanges();
    });
  }

  private cargarResumenMensual(): void {
    if (this.colaboradorSeleccionado) {
      this.turnoService.getResumenMensual(this.mes, this.anio, [this.colaboradorSeleccionado])
        .subscribe(resumenes => {
          this.resumenMensual = resumenes[0];
          this.cdr.detectChanges();
        });
    } else {
      this.resumenMensual = undefined;
      this.cdr.detectChanges();
    }
  }

  obtenerTurno(turnos: Turno[], colaboradorId: number, fecha: string): Turno | undefined {
    return turnos.find(t => t.colaboradorId === colaboradorId && t.fecha === fecha);
  }

  formatearHorasDia(horasTrabajadas: number | undefined): string {
    if (!horasTrabajadas) return '00:00';
    const horas = Math.floor(horasTrabajadas);
    const minutos = Math.round((horasTrabajadas - horas) * 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  }

  formatearHora(hora: string | undefined, type?: boolean): string {
    return this.calendarioService.formatearHoras(parseFloat(hora ?? '0'), type);
  }

  esDiaActual(fecha: string): boolean {
    const hoy = new Date();
    const [year, month, day] = fecha.split('-').map(Number);
    const fechaComparar = new Date(year, month - 1, day);
    hoy.setHours(0, 0, 0, 0);
    fechaComparar.setHours(0, 0, 0, 0);
    return hoy.getTime() === fechaComparar.getTime();
  }

  esFeriado(fecha: string): boolean {
    return this.turnoService.esFeriado(fecha, this.feriados);
  }
}
