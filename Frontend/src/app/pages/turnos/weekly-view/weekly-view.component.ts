import { CommonModule } from '@angular/common';
import { CalendarioService, DiaSemana } from './../../../services/calendario.service';
import { Colaborador } from './../../../services/colaborador.service';
import { Turno, TurnoService } from './../../../services/turno.service';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, QueryList, SimpleChanges, ViewChildren } from '@angular/core';
import { Feriado, FeriadoService } from '../../../services/feriado.service';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TurnosDelDiaPipe } from '../../../pipes/turnos-del-dia.pipe';
import { TooltipService } from '../../../services/tooltip.service';
import { BadgeComponent } from '../../../components/ui/badge/badge.component';

@Component({
  selector: 'app-weekly-view',
  standalone: true,
  imports: [CommonModule, TurnosDelDiaPipe, BadgeComponent],
  templateUrl: './weekly-view.component.html',
  styleUrls: ['./weekly-view.component.css', '../turnos.component.css'],
  providers: [TooltipService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyViewComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  // Celdas de turno renderizadas (ver #turnoCell en el html) — de acá salen
  // los tooltips, ver ngAfterViewInit.
  @ViewChildren('turnoCell') turnoCells!: QueryList<ElementRef<HTMLElement>>;

  private readonly destroy$ = new Subject<void>();

  // Días de la semana ya completados (7 días) y con esFeriado/esDiaActual
  // precalculados una sola vez. Antes el template llamaba
  // completarSemana(diasSemana), esDiaActual(dia.fecha) y esFeriado(dia.fecha)
  // en cada *ngFor anidado (una vez por cada colaborador × 7 días, en cada
  // ciclo de detección de cambios) — esDiaActual además instanciaba
  // `new Date()` en cada llamada. Calcularlo una vez acá evita ese trabajo
  // repetido.
  diasSemanaCompleta: (DiaSemana & { esDiaActual: boolean })[] = [];

  constructor(
    private turnoService: TurnoService,
    private feriadoService: FeriadoService,
    private calendarioService: CalendarioService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private tooltipService: TooltipService
  ) { }

  ngOnInit(): void {
    this.cargarFeriados();
    this.recalcularDiasSemana();
    if (this.turnos && this.colaboradores) {
      this.calcularHorasTotales();
    }
    this.filteredColaboradores = [...this.colaboradores];
    this.applySortAndFilter();
  }

  ngAfterViewInit(): void {
    this.actualizarTooltips();
    // turnoCells.changes emite cada vez que cambia el set de celdas
    // renderizadas (turnos nuevos, cambio de semana, filtro de colaborador)
    // — reemplaza al polling manual que hacía el padre en ngAfterViewChecked.
    this.turnoCells.changes.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.actualizarTooltips();
    });
  }

  private actualizarTooltips(): void {
    this.tooltipService.inicializar(this.turnoCells.toArray());
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['diasSemana']) {
      this.recalcularDiasSemana();
    }
    if (changes['colaboradores'] && changes['colaboradores'].currentValue) {
      this.filteredColaboradores = [...this.colaboradores];
      if (this.turnos) {
        this.calcularHorasTotales(); // Recalcular cuando colaboradores llegue
      }
      this.applySortAndFilter();
    }
    if (changes['turnos'] && changes['turnos'].currentValue) {
      if (this.colaboradores.length > 0) {
        this.calcularHorasTotales(); // Recalcular cuando turnos llegue
      }
      this.cdr.detectChanges();
    }
  }

  private recalcularDiasSemana(): void {
    this.diasSemanaCompleta = this.completarSemana(this.diasSemana).map((dia) => ({
      ...dia,
      esFeriado: this.esFeriado(dia.fecha),
      esDiaActual: this.esDiaActual(dia.fecha),
    }));
  }

  trackByFecha(_index: number, dia: DiaSemana): string {
    return dia.fecha;
  }

  trackByColaboradorId(_index: number, colaborador: Colaborador): number {
    return colaborador.id;
  }

  trackByTurnoId(_index: number, turno: Turno): number {
    return turno.id;
  }

  calcularHorasTotales() {
    this.horasTotalesSemana = {};
    this.colaboradores.forEach(colaborador => {
      const horas = this.getHorasTotalesSemana(colaborador.id);
      this.horasTotalesSemana[colaborador.id] = horas;
    });
  }

  horasTotalesSemana: { [colaboradorId: number]: number } = {};
  // Variable interna para almacenar los feriados
  feriados: Feriado[] = []; // Lista de feriados

  // Inputs para recibir datos del componente padre
  @Input() diasSemana: DiaSemana[] = []; // Días de la semana
  @Input() colaboradores: Colaborador[] = []; // Lista de colaboradores
  @Input() turnos: Turno[] = []; // Lista de turnos
  @Input() hideTotal: boolean = false;
  @Input() set externalCompanyFilter(value: string | null) {
    if (value !== undefined && value !== null) {
      this.selectedCompany = value;
      this.applySortAndFilter();
    }
  }
  @Input() set externalCollaboratorFilter(value: number | number[] | null) {
    if (Array.isArray(value)) {
      this.selectedCollaboratorIds = value;
      this.selectedCollaboratorId = null;
    } else {
      this.selectedCollaboratorId = value;
      this.selectedCollaboratorIds = value ? [value] : [];
    }
    this.applySortAndFilter();
  }
  // Outputs para emitir eventos al componente padre
  @Output() abrirModal = new EventEmitter<{ colaboradorId: number; fecha: string }>();
  @Output() abrirModalEdicion = new EventEmitter<Turno>();

  showFilterDropdown: boolean = false; // Controlar visibilidad del flotante
  // Estado para ordenar y filtrar
  sortByCompany: boolean = false; // Ordenar por empresa
  selectedCompany: string = 'all'; // Empresa seleccionada para filtrar ('all' para mostrar todas)
  filteredColaboradores: Colaborador[] = []; // Lista filtrada y ordenada
  selectedCollaboratorId: number | null = null; // Filtro por colaborador
  selectedCollaboratorIds: number[] = []; // Multi-select

  // Método para formatear las horas trabajadas
  formatearHorasDia(horasTrabajadas: number | undefined): string {
    return this.calendarioService.formatearHoras(horasTrabajadas ?? 0);
  }

  // Método para formatear la hora
  formatearHora(hora: string | undefined): string {
    if (!hora) return "00:00"; // Si no hay hora, devolver 00:00

    // Verificar si el formato es HH:mm
    if (hora.includes(":")) {
      const [horas, minutos] = hora.split(":").map(Number);
      return this.calendarioService.formatearHoras(horas + minutos / 60);
    }

    // Si solo es un número en string, convertirlo a float
    const horasTotales = parseFloat(hora);
    return this.calendarioService.formatearHoras(horasTotales);
  }


  esDiaActual(fecha: string): boolean {
    return this.calendarioService.esDiaActual(fecha);
  }

  //! Métodos de utilidad
  esFeriado(fecha: string): boolean {
    return this.turnoService.esFeriado(fecha, this.feriados);
  }

  getHorasTotalesSemana(colaboradorId: number): number {
    // Filtrar turnos solo de los días visibles en la semana actual
    const turnosSemana = this.turnos.filter(turno =>
      this.diasSemana.some(dia => dia.fecha === turno.fecha) && turno.colaboradorId === colaboradorId
    );

    // Sumar las horas trabajadas
    const horasTotales = turnosSemana.reduce((total, turno) => total + (turno.horasTrabajadas ?? 0), 0);
    return horasTotales;
  }

  getHorasTotalesSemanaFormateadas(colaboradorId: number): string {
    const horasTotales = this.getHorasTotalesSemana(colaboradorId);
    return this.calendarioService.formatearHoras(horasTotales);
  }

  // Método para verificar si un colaborador tiene turnos en feriados
  tieneTurnosFeriados(colaboradorId: number): boolean {
    if (!this.turnos || !this.feriados) return false;
    return this.turnos.some(
      (turno) =>
        turno.colaboradorId === colaboradorId &&
        this.esFeriado(turno.fecha)
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarFeriados(): void {
    this.feriadoService.getFeriados().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.feriados = data; // Guardar los feriados
        this.recalcularDiasSemana(); // esFeriado por día depende de this.feriados
        // Esta respuesta llega async, fuera de cualquier click o cambio de
        // @Input — con OnPush, Angular no la detecta sola sin este aviso.
        this.cdr.markForCheck();
      },
    });
  }

  // Asegura que cada semana tenga 7 días, agregando días vacíos si es necesario
  completarSemana(semana: DiaSemana[] | null): DiaSemana[] {
    if (!semana) return [];

    let semanaCompleta = [...semana];
    const diasFaltantes = 7 - semanaCompleta.length;

    // Reemplazar días sobrantes con 'empty'
    semanaCompleta = semanaCompleta.map(dia => {
      if (dia.esSobrante) {
        return {
          fecha: 'empty',
          nombre: '',
          dayNumber: '',
          monthNombre: '',
          yearName: '',
          esFeriado: false,
          esSobrante: true,
        };
      }
      return dia;
    });

    // Completar con días vacíos si faltan
    for (let i = 0; i < diasFaltantes; i++) {
      semanaCompleta.push({
        fecha: 'empty',
        nombre: '',
        dayNumber: '',
        monthNombre: '',
        yearName: '',
        esFeriado: false,
        esSobrante: false,
      });
    }

    return semanaCompleta;
  }

  // Obtener lista única de empresas para el filtro
  get empresas(): string[] {
    const empresas = Array.from(new Set(this.colaboradores.map(col => col.empresaNombre || 'Sin Empresa')));
    return ['all', ...empresas.sort()];
  }

  applySortAndFilter(): void {
    let result = [...this.colaboradores];
    if (this.selectedCompany !== 'all') {
      result = result.filter(col => col.empresaNombre === this.selectedCompany);
    }
    if (this.selectedCollaboratorIds && this.selectedCollaboratorIds.length > 0) {
      const set = new Set(this.selectedCollaboratorIds);
      result = result.filter(col => set.has(col.id));
    }
    if (this.sortByCompany) {
      result.sort((a, b) => {
        const empresaA = a.empresaNombre || 'Sin Empresa';
        const empresaB = b.empresaNombre || 'Sin Empresa';
        return empresaA.localeCompare(empresaB);
      });
    }
    this.filteredColaboradores = [...result];
    this.cdr.detectChanges();
  }

  toggleSortByCompany(): void {
    this.sortByCompany = !this.sortByCompany;
    this.applySortAndFilter();
  }

  filterByCompany(empresa: string): void {
    this.selectedCompany = empresa;
    this.applySortAndFilter();
    this.showFilterDropdown = false; // Cerrar el flotante tras seleccionar
  }
  filterDropdownPosition = { x: 0, y: 0 };

  toggleFilterDropdown(event?: MouseEvent) {
    this.showFilterDropdown = !this.showFilterDropdown;
    if (event) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      this.filterDropdownPosition = {
        x: rect.left,
        y: rect.bottom + window.scrollY
      };
    }
  }

  filterByCollaborator(colaboradorId: number | null): void {
    this.selectedCollaboratorId = colaboradorId;
    this.applySortAndFilter();
  }

  viewProfile(colaboradorId: number | null): void {
    if (colaboradorId) {
      this.router.navigate(['/reportes/colaborador-profile', colaboradorId]);
    }
  }

}
