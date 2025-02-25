import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionarTiendasModalComponent } from './gestionar-tiendas-modal.component';

describe('GestionarTiendasModalComponent', () => {
  let component: GestionarTiendasModalComponent;
  let fixture: ComponentFixture<GestionarTiendasModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionarTiendasModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionarTiendasModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
