import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ExportacionContableComponent } from './exportacion-contable.component';
import { ColaboradorService } from '../../../services/colaborador.service';
import { EmpresaService } from '../../../services/empresa.service';
import { ReporteService } from '../../../services/reporte.service';

describe('ExportacionContableComponent', () => {
  let component: ExportacionContableComponent;
  let fixture: ComponentFixture<ExportacionContableComponent>;
  let getProgramacionSpy: jasmine.Spy;

  beforeEach(async () => {
    getProgramacionSpy = jasmine.createSpy('getProgramacionContable').and.returnValue(of({
      desde: '2026-07-01', hasta: '2026-07-31', empresaId: null, umbralHorasDiarias: 8,
      colaboradoresIncluidos: 1, turnosIncluidos: 1, totalHorasProgramadas: 7.75, totalHorasEnFeriado: 7.75,
      resumen: [{ colaboradorId: 1, dni: '12345678', nombre: 'Ana', apellido: 'Prueba', empresaId: 1,
        nombreEmpresa: 'Empresa', rucEmpresa: '20123456789', diasProgramados: 1, cantidadTurnos: 1,
        horasRegulares: 0, horasEnFeriado: 7.75, totalHorasProgramadas: 7.75,
        horasSobreUmbralDiario: 0, diasConTurnoPartido: 0 }],
      turnos: [{ turnoId: 10, colaboradorId: 1, dni: '12345678', nombre: 'Ana', apellido: 'Prueba',
        empresaId: 1, nombreEmpresa: 'Empresa', rucEmpresa: '20123456789', tiendaId: 2,
        nombreTienda: 'Centro', fecha: '2026-07-28', horaEntrada: '08:00:00', horaSalida: '16:30:00',
        horasProgramadas: 7.75, descuentoAlmuerzo: true, feriado: true, turnoPartido: false }],
    }));
    await TestBed.configureTestingModule({
      imports: [ExportacionContableComponent],
      providers: [
        { provide: ReporteService, useValue: { getProgramacionContable: getProgramacionSpy } },
        { provide: EmpresaService, useValue: { getEmpresas: () => of([]) } },
        { provide: ColaboradorService, useValue: { getColaboradores: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportacionContableComponent);
    component = fixture.componentInstance;
  });

  it('consulta un período libre con todos los trabajadores cuando la selección está vacía', () => {
    component.desde = '2026-07-01';
    component.hasta = '2026-07-31';
    component.generar();

    expect(getProgramacionSpy).toHaveBeenCalledWith('2026-07-01', '2026-07-31', undefined, []);
  });

  it('exporta feriado y horas como número decimal en una sola hoja de detalle', () => {
    component.generar();
    const detalle = component.hojasExport[1];

    expect(detalle.data[0]['feriado']).toBe('Sí');
    expect(detalle.data[0]['horas']).toBe(7.75);
    expect(detalle.columns.find(columna => columna.key === 'horas')?.numFmt).toBe('0.00');
  });

  it('rechaza rangos invertidos sin consultar', () => {
    component.desde = '2026-07-31';
    component.hasta = '2026-07-01';
    component.generar();

    expect(component.errorMessage).toContain('inicial');
    expect(getProgramacionSpy).not.toHaveBeenCalled();
  });
});
