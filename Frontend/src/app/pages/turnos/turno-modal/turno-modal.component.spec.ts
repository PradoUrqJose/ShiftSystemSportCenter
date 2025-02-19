import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnoModalComponent } from './turno-modal.component';

describe('TurnoModalComponent', () => {
  let component: TurnoModalComponent;
  let fixture: ComponentFixture<TurnoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnoModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TurnoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
