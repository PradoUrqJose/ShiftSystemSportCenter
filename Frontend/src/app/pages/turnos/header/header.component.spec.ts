import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HeaderComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit cambiarVista event when toggleVistaMensual is called', () => {
    const vista = 'week';
    spyOn(component.cambiarVista, 'emit');
    component.toggleVistaMensual(vista);
    expect(component.cambiarVista.emit).toHaveBeenCalledWith(vista);
  });

  it('should emit cambiarSemanaOMes event when cambiarSemanaOMesHandler is called', () => {
    const direccion = 'anterior';
    spyOn(component.cambiarSemanaOMes, 'emit');
    component.cambiarSemanaOMesHandler(direccion);
    expect(component.cambiarSemanaOMes.emit).toHaveBeenCalledWith(direccion);
  });
});
