import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColaboradorProfileComponent } from './colaborador-profile.component';

describe('ColaboradorProfileComponent', () => {
  let component: ColaboradorProfileComponent;
  let fixture: ComponentFixture<ColaboradorProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColaboradorProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColaboradorProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
