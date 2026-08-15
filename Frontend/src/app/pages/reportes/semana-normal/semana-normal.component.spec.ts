import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { SemanaNormalComponent } from './semana-normal.component';

describe('SemanaNormalComponent', () => {
  let component: SemanaNormalComponent;
  let fixture: ComponentFixture<SemanaNormalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SemanaNormalComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
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
