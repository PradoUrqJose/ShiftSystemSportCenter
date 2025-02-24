import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgregarPuestoModalComponent } from './agregar-puesto-modal.component';

describe('AgregarPuestoModalComponent', () => {
  let component: AgregarPuestoModalComponent;
  let fixture: ComponentFixture<AgregarPuestoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgregarPuestoModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgregarPuestoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
