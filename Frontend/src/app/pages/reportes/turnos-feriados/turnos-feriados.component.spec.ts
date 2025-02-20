import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnosFeriadosComponent } from './turnos-feriados.component';

describe('TurnosFeriadosComponent', () => {
  let component: TurnosFeriadosComponent;
  let fixture: ComponentFixture<TurnosFeriadosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnosFeriadosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TurnosFeriadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
