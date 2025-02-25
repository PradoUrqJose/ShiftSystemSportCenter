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
  styleUrl: './weekly-view.component.css'
})
export class WeeklyViewComponent implements OnInit {

  constructor(
    private turnoService: TurnoService,
    private feriadoService: FeriadoService,
    private calendarioService: CalendarioService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    console.log('ngOnInit ejecutado');
    this.cargarFeriados();
    this.completarSemana(this.diasSemana);

    // Inicializar filteredColaboradores con todos los colaboradores
    this.filteredColaboradores = [...this.colaboradores];
    this.applySortAndFilter(); // Aplicar ordenamiento/filtro inicial si aplica
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['colaboradores'] && changes['colaboradores'].currentValue) {
      console.log('colaboradores cambió:', this.colaboradores);
      this.filteredColaboradores = [...this.colaboradores]; // Inicializar con todos
      this.applySortAndFilter(); // Aplicar filtro y ordenamiento
    }
  }

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
    const horasTotales = hora ? parseFloat(hora) : 0;
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

  getHorasTotalesSemanaFormateadas(colaboradorId: number): string {
    // 1️⃣ Filtrar turnos solo de la semana actual que se está mostrando en `diasSemana`
    const turnosSemana = this.turnos.filter(turno =>
      this.diasSemana.some(dia => dia.fecha === turno.fecha) && turno.colaboradorId === colaboradorId
    );

    // 2️⃣ Sumar las horas trabajadas en esa semana estricta
    const horasTotales = turnosSemana.reduce((total, turno) => total + (turno.horasTrabajadas ?? 0), 0);

    // 3️⃣ Formatear usando el servicio
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

    let semanaCompleta = [...semana]; // Copiar la semana
    const diasFaltantes = 7 - semanaCompleta.length; // Días que faltan para completar la semana

    // Si hay días faltantes, agregarlos al inicio en lugar de al final
    for (let i = 0; i < diasFaltantes; i++) {
      semanaCompleta.unshift({
        fecha: 'empty', // Indicador de celda vacía
        nombre: '',
        dayNumber: '',
        monthNombre: '',
        yearName: '',
        esFeriado: false,
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
    console.log('applySortAndFilter llamado');
    console.log('colaboradores:', this.colaboradores);
    let result = [...this.colaboradores];
    if (this.selectedCompany !== 'all') {
      result = result.filter(col => col.empresaNombre === this.selectedCompany);
      console.log('selectedCompany:', this.selectedCompany, 'filtered result:', result);
    }
    if (this.sortByCompany) {
      result.sort((a, b) => {
        const empresaA = a.empresaNombre || 'Sin Empresa';
        const empresaB = b.empresaNombre || 'Sin Empresa';
        return empresaA.localeCompare(empresaB);
      });
      console.log('sortByCompany:', this.sortByCompany, 'sorted result:', result);
    }
    this.filteredColaboradores = [...result];
    console.log('filteredColaboradores actualizado:', this.filteredColaboradores);
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
