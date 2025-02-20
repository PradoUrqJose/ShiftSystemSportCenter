import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorasExtrasComponent } from './horas-extras.component';

describe('HorasExtrasComponent', () => {
  let component: HorasExtrasComponent;
  let fixture: ComponentFixture<HorasExtrasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorasExtrasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HorasExtrasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
