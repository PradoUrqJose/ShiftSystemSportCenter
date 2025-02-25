import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgregarTiendaModalComponent } from './agregar-tienda-modal.component';

describe('AgregarTiendaModalComponent', () => {
  let component: AgregarTiendaModalComponent;
  let fixture: ComponentFixture<AgregarTiendaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgregarTiendaModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgregarTiendaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
