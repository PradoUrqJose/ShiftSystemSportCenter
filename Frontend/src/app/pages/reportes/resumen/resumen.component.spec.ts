import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { ResumenComponent } from './resumen.component';
import { CalendarioService } from '../../../services/calendario.service';
import { EmpresaService } from '../../../services/empresa.service';
import { ReporteService } from '../../../services/reporte.service';

describe('ResumenComponent', () => {
  let component: ResumenComponent;
  let fixture: ComponentFixture<ResumenComponent>;
  let getResumenSpy: jasmine.Spy;

  beforeEach(async () => {
    getResumenSpy = jasmine.createSpy('getResumen').and.returnValue(of({
      desde: '2026-08-01', hasta: '2026-08-31', empresaId: null,
      umbralHorasDiarias: 8, umbralJornadaExtrema: 12, horizonteDias: 90,
      totalHorasProgramadas: 0, horasEnFeriado: 0, colaboradoresProgramados: 0,
      colaboradoresConCargaExcepcional: 0, erroresDatos: 0, hallazgosPorConciliar: 0,
      semanas: [], tiendas: [], requiereAtencion: [],
    }));
    await TestBed.configureTestingModule({
      imports: [ResumenComponent, RouterTestingModule],
      providers: [
        { provide: EmpresaService, useValue: { getEmpresas: () => of([]) } },
        { provide: ReporteService, useValue: { getResumen: getResumenSpy } },
        { provide: CalendarioService, useValue: { formatearHoras: (horas: number) => String(horas) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenComponent);
    component = fixture.componentInstance;
  });

  it('crea el rango mensual completo antes de consultar', () => {
    component.mes = '2026-02';
    component.buscar();

    expect(component.anioSeleccionado).toBe(2026);
    expect(component.numeroMesSeleccionado).toBe(2);
    expect(getResumenSpy).toHaveBeenCalledWith('2026-02-01', '2026-02-28', undefined);
  });

  it('rechaza un mes inválido', () => {
    component.mes = '2026-13';
    component.buscar();

    expect(component.errorMessage).toContain('válido');
    expect(getResumenSpy).not.toHaveBeenCalled();
  });
});
