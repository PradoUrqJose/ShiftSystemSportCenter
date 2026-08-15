import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { ExcepcionesComponent } from './excepciones.component';

describe('ExcepcionesComponent', () => {
  let component: ExcepcionesComponent;
  let fixture: ComponentFixture<ExcepcionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExcepcionesComponent, HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ExcepcionesComponent);
    component = fixture.componentInstance;
  });

  it('rechaza un rango invertido sin consultar', () => {
    component.desde = '2026-08-10';
    component.hasta = '2026-08-01';

    component.buscar();

    expect(component.errorMessage).toContain('inicial');
    expect(component.reporte).toBeNull();
  });

  it('filtra los hallazgos por severidad y regla', () => {
    component.reporte = {
      desde: '2026-08-01',
      hasta: '2026-08-31',
      umbralHorasDiarias: 8,
      umbralJornadaExtrema: 12,
      horizonteDias: 90,
      errores: 1,
      riesgos: 1,
      advertencias: 0,
      informativos: 0,
      excepciones: [
        {
          codigo: 'TURNOS_SOLAPADOS', severidad: 'ERROR', titulo: 'Solapados', detalle: '',
          colaboradorId: 1, nombreColaborador: 'Ana', dni: '12345678', empresaId: 1,
          nombreEmpresa: 'Empresa', fechaInicio: '2026-08-01', fechaFin: '2026-08-01',
          horasProgramadas: null, umbralHoras: null, cantidadTurnos: 2, turnoIds: [1, 2],
        },
        {
          codigo: 'SEMANA_SOBRE_48_HORAS', severidad: 'RIESGO', titulo: 'Semana', detalle: '',
          colaboradorId: 2, nombreColaborador: 'Luis', dni: '87654321', empresaId: 1,
          nombreEmpresa: 'Empresa', fechaInicio: '2026-08-03', fechaFin: '2026-08-09',
          horasProgramadas: 52, umbralHoras: 48, cantidadTurnos: 6, turnoIds: [3],
        },
      ],
    };

    component.severidad = 'RIESGO';
    component.regla = 'SEMANA_SOBRE_48_HORAS';

    expect(component.excepcionesFiltradas.length).toBe(1);
    expect(component.excepcionesFiltradas[0].nombreColaborador).toBe('Luis');
  });
});
