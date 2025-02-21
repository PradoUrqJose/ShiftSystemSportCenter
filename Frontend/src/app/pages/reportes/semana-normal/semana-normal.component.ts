import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WeeklyViewComponent } from '../../turnos/weekly-view/weekly-view.component';
import { CalendarioService, DiaSemana } from '../../../services/calendario.service';
import { Colaborador, ColaboradorService } from '../../../services/colaborador.service';
import { Turno, TurnoService } from '../../../services/turno.service';
import { TurnoStateService } from '../../../services/turno-state.service';
import { SemanaService } from '../../../services/semana.service';
import { HeaderComponent } from '../../turnos/header/header.component';
import { CommonModule } from '@angular/common';
import { format, startOfWeek, addDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-semana-normal',
  standalone: true,
  imports: [WeeklyViewComponent, HeaderComponent, CommonModule, RouterModule],
  templateUrl: './semana-normal.component.html',
  styleUrls: ['./semana-normal.component.css']
})
export class SemanaNormalComponent implements OnInit {
  isLoading$!: Observable<boolean>;
  nombreMesActual: string = '';

  diasSemana$ = new BehaviorSubject<DiaSemana[]>([]); // Días de la semana como BehaviorSubject
  turnos$!: Observable<Turno[]>; // Turnos como Observable
  colaboradores: Colaborador[] = [];

  constructor(
    private calendarioService: CalendarioService,
    private colaboradorService: ColaboradorService,
    private turnoService: TurnoService,
    private turnoStateService: TurnoStateService,
    private semanaService: SemanaService
  ) {
    this.isLoading$ = this.turnoStateService.isLoading$;
    this.nombreMesActual = format(this.turnoStateService.getSemanaActual(), 'MMMM yyyy', { locale: es });
  }


  ngOnInit(): void {
    this.cargarDatos();
  }

  // Método para cargar datos iniciales
  cargarDatos(): void {
    this.turnoStateService.setLoading(true);

    const semanaActual = this.turnoStateService.getSemanaActual();
    this.cargarSemanaNormal(semanaActual);

    this.colaboradorService.getColaboradoresPorHabilitacion(true).subscribe({
      next: (colaboradores) => this.colaboradores = colaboradores,
      error: (error) => console.error('Error al cargar colaboradores:', error)
    });
  }

  // Método para cargar una semana normal (lunes a domingo)
  private cargarSemanaNormal(fecha: Date): void {
    // Calcular días de la semana localmente (lunes a domingo)
    const diasSemana = this.obtenerDiasSemanaNormal(fecha);
    this.diasSemana$.next(diasSemana);

    // Obtener turnos del backend usando getTurnosPorSemana
    this.turnos$ = this.turnoService.getTurnosPorSemana(fecha);
    this.turnos$.subscribe({
      next: (turnos) => {
        console.log('Turnos cargados:', turnos);
        setTimeout(() => this.inicializarTooltips(), 500);
        this.turnoStateService.setLoading(false);
      },
      error: (error) => {
        console.error('Error al cargar turnos:', error);
        this.turnoStateService.setLoading(false);
      }
    });

    this.actualizarNombreMes();
  }

  // Método auxiliar para calcular días de la semana localmente (lunes a domingo)
  private obtenerDiasSemanaNormal(fecha: Date): DiaSemana[] {
    const inicioSemana = startOfWeek(fecha, { weekStartsOn: 1 }); // Lunes como inicio
    return eachDayOfInterval({
      start: inicioSemana,
      end: addDays(inicioSemana, 6) // Hasta domingo
    }).map((dia) => ({
      fecha: format(dia, 'yyyy-MM-dd'),
      nombre: format(dia, 'EEE', { locale: es }),
      dayNumber: format(dia, 'd'),
      monthNombre: format(dia, 'MMMM', { locale: es }),
      yearName: format(dia, 'yyyy'),
    }));
  }

  // Método para manejar la navegación entre semanas
  cambiarSemana(direccion: 'anterior' | 'siguiente'): void {
    this.turnoStateService.setLoading(true);

    const semanaActual = this.turnoStateService.getSemanaActual();
    const nuevaFecha = new Date(semanaActual);
    nuevaFecha.setDate(nuevaFecha.getDate() + (direccion === 'siguiente' ? 7 : -7));

    // Actualizar el estado global
    this.turnoStateService.setSemanaActual(nuevaFecha);

    // Cargar la nueva semana
    this.cargarSemanaNormal(nuevaFecha);
  }
  // Métodos de UI
  actualizarNombreMes(): void {
    this.nombreMesActual = format(this.turnoStateService.getSemanaActual(), 'MMMM yyyy', { locale: es });
  }

  inicializarTooltips(): void {
    // Implementar lógica de tooltips si es necesario, copiada de TurnosComponent
    console.log('Tooltips inicializados');
  }

  // Métodos para modales (reutilizados de TurnosComponent si es necesario)
  abrirModal(event: { colaboradorId: number; fecha: string }): void {
    console.log('Abrir modal para:', event.colaboradorId, event.fecha);
    // Implementar lógica de modal similar a TurnosComponent
  }

  abrirModalEdicion(turno: Turno): void {
    console.log('Editar turno:', turno);
    // Implementar lógica de edición similar a TurnosComponent
  }
}
