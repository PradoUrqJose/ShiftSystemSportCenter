import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyViewComponent } from './monthly-view.component';

describe('MonthlyViewComponent', () => {
  let component: MonthlyViewComponent;
  let fixture: ComponentFixture<MonthlyViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthlyViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
