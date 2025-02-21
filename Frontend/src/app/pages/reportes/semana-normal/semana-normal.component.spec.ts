import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SemanaNormalComponent } from './semana-normal.component';

describe('SemanaNormalComponent', () => {
  let component: SemanaNormalComponent;
  let fixture: ComponentFixture<SemanaNormalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SemanaNormalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SemanaNormalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
