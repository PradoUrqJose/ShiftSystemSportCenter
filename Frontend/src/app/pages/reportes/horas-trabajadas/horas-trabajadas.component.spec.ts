import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorasTrabajadasComponent } from './horas-trabajadas.component';

describe('HorasTrabajadasComponent', () => {
  let component: HorasTrabajadasComponent;
  let fixture: ComponentFixture<HorasTrabajadasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorasTrabajadasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HorasTrabajadasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
