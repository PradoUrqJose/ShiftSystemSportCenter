import { CommonModule } from '@angular/common';
import { CalendarioService, DiaSemana } from './../../../services/calendario.service';
import { ResumenMensual, Turno, TurnoService } from './../../../services/turno.service';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, QueryList, SimpleChanges, ViewChildren } from '@angular/core';
import { Feriado, FeriadoService } from '../../../services/feriado.service';
import { Observable, Subject, Subscription, takeUntil } from 'rxjs';
import { TurnosDelDiaPipe } from '../../../pipes/turnos-del-dia.pipe';
import { TooltipService } from '../../../services/tooltip.service';

@Component({
  selector: 'app-monthly-view',
  standalone: true,
  imports: [CommonModule, TurnosDelDiaPipe],
  templateUrl: './monthly-view.component.html',
  styleUrls: ['./monthly-view.component.css', '../turnos.component.css'],
  providers: [TooltipService],
})
export class MonthlyViewComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  // Celdas de turno renderizadas (ver #turnoCell en el html) — de acá salen
  // los tooltips, ver ngAfterViewInit.
  @ViewChildren('turnoCell') turnoCells!: QueryList<ElementRef<HTMLElement>>;

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
  private readonly destroy$ = new Subject<void>();

  constructor(
    private turnoService: TurnoService,
    private feriadoService: FeriadoService,
    private calendarioService: CalendarioService,
    private cdr: ChangeDetectorRef,
    private tooltipService: TooltipService
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

  ngAfterViewInit(): void {
    this.actualizarTooltips();
    // turnoCells.changes emite cada vez que cambia el set de celdas
    // renderizadas — reemplaza al polling manual que hacía el padre en
    // ngAfterViewChecked con document.querySelectorAll.
    this.turnoCells.changes.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.actualizarTooltips();
    });
  }

  private actualizarTooltips(): void {
    this.tooltipService.inicializar(this.turnoCells.toArray());
  }

  ngOnDestroy(): void {
    this.turnosSubscription?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToTurnos(): void {
    this.turnosSubscription?.unsubscribe();
    this.turnosSubscription = this.turnosMensuales$.subscribe(turnos => {
      this.turnos = turnos || [];
      this.cargarResumenMensual(); // Recargar resumen cada vez que cambian los turnos
    });
  }

  private cargarFeriados(): void {
    this.feriadoService.getFeriados().pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.feriados = data;
    });
  }

  private cargarResumenMensual(): void {
    if (this.colaboradorSeleccionado) {
      this.turnoService.getResumenMensual(this.mes, this.anio, [this.colaboradorSeleccionado])
        .pipe(takeUntil(this.destroy$))
        .subscribe(resumenes => {
          this.resumenMensual = resumenes[0];
          this.cdr.detectChanges();
        });
    } else {
      this.resumenMensual = undefined;
      this.cdr.detectChanges();
    }
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
    return this.calendarioService.esDiaActual(fecha);
  }

  esFeriado(fecha: string): boolean {
    return this.turnoService.esFeriado(fecha, this.feriados);
  }

  trackByFecha(_index: number, dia: DiaSemana): string {
    return dia.fecha;
  }

  trackBySemanaIndex(index: number): number {
    return index;
  }

  trackByTurnoId(_index: number, turno: Turno): number {
    return turno.id;
  }
}
