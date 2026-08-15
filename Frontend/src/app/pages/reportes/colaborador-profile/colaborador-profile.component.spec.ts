import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';

import { ColaboradorProfileComponent } from './colaborador-profile.component';
import { ColaboradorService } from '../../../services/colaborador.service';
import { ReporteService } from '../../../services/reporte.service';
import { CalendarioService } from '../../../services/calendario.service';

describe('ColaboradorProfileComponent', () => {
  let component: ColaboradorProfileComponent;
  let fixture: ComponentFixture<ColaboradorProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColaboradorProfileComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: ColaboradorService, useValue: {} },
        { provide: ReporteService, useValue: {} },
        { provide: CalendarioService, useValue: { formatearHoras: (horas: number) => String(horas) } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColaboradorProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
