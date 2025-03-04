import { CommonModule } from '@angular/common';
import { CalendarioService, DiaSemana } from './../../../services/calendario.service';
import { Colaborador } from './../../../services/colaborador.service';
import { Turno, TurnoService } from './../../../services/turno.service';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Feriado, FeriadoService } from '../../../services/feriado.service';

@Component({
  selector: 'app-weekly-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weekly-view.component.html',
  styleUrls: ['./weekly-view.component.css', '../turnos.component.css']
})
export class WeeklyViewComponent implements OnInit {

  constructor(
    private turnoService: TurnoService,
    private feriadoService: FeriadoService,
    private calendarioService: CalendarioService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.cargarFeriados();
    this.diasSemana = this.completarSemana(this.diasSemana);
    if (this.turnos && this.colaboradores) {
      this.calcularHorasTotales();
    }
    this.filteredColaboradores = [...this.colaboradores];
    this.applySortAndFilter();
  }


  ngOnChanges(changes: SimpleChanges): void {
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
  // Outputs para emitir eventos al componente padre
  @Output() abrirModal = new EventEmitter<{ colaboradorId: number; fecha: string }>();
  @Output() abrirModalEdicion = new EventEmitter<Turno>();

  showFilterDropdown: boolean = false; // Controlar visibilidad del flotante
  // Estado para ordenar y filtrar
  sortByCompany: boolean = false; // Ordenar por empresa
  selectedCompany: string = 'all'; // Empresa seleccionada para filtrar ('all' para mostrar todas)
  filteredColaboradores: Colaborador[] = []; // Lista filtrada y ordenada

  // Método para obtener el turno de un colaborador en una fecha específica
  obtenerTurno(
    turnos: Turno[] | null,
    colaboradorId: number,
    fecha: string
  ): Turno | undefined {
    if (!turnos) return undefined; // Manejo de null
    return this.turnoService.obtenerTurno(turnos, colaboradorId, fecha) || undefined;
  }

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
    const hoy = new Date();
    const [year, month, day] = fecha.split('-').map(Number); // Dividir y convertir a números
    const fechaComparar = new Date(year, month - 1, day); // Meses son 0-indexados en JavaScript
    // Normalizar ambas fechas a medianoche
    hoy.setHours(0, 0, 0, 0);
    fechaComparar.setHours(0, 0, 0, 0);

    return hoy.getTime() === fechaComparar.getTime();
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

  cargarFeriados(): void {
    this.feriadoService.getFeriados().subscribe({
      next: (data) => {
        this.feriados = data; // Guardar los feriados
      },
      error: (error) => {
        console.error('Error al cargar los feriados:', error);
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
}
