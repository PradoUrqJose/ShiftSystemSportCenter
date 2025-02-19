import { Turno } from './../../../services/turno.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WeeklyViewComponent } from './weekly-view.component';

describe('WeeklyViewComponent', () => {
  let component: WeeklyViewComponent;
  let fixture: ComponentFixture<WeeklyViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WeeklyViewComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WeeklyViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit abrirModal event when agregarBoton is clicked', () => {
    const colaboradorId = 1;
    const fecha = '2023-10-01';
    spyOn(component.abrirModal, 'emit');
    component.abrirModal.emit({ colaboradorId, fecha });
    expect(component.abrirModal.emit).toHaveBeenCalledWith({ colaboradorId, fecha });
  });

  it('should emit abrirModalEdicion event when container-green is clicked', () => {
    const turno = { id: 1, colaboradorId: 1, fecha: '2023-10-01' } as Turno;
    spyOn(component.abrirModalEdicion, 'emit');
    component.abrirModalEdicion.emit(turno);
    expect(component.abrirModalEdicion.emit).toHaveBeenCalledWith(turno);
  });
});
