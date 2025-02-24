import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionarPuestosComponent } from './gestionar-puestos.component';

describe('GestionarPuestosComponent', () => {
  let component: GestionarPuestosComponent;
  let fixture: ComponentFixture<GestionarPuestosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionarPuestosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionarPuestosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
