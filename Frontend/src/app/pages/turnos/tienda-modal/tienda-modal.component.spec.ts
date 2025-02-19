import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TiendaModalComponent } from './tienda-modal.component';

describe('TiendaModalComponent', () => {
  let component: TiendaModalComponent;
  let fixture: ComponentFixture<TiendaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TiendaModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TiendaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
