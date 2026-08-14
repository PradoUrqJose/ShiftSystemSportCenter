import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Notiflix from 'notiflix';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export default class LoginComponent implements OnDestroy {
  username = '';
  password = '';
  isSubmitting = false;
  private readonly destroy$ = new Subject<void>();

  constructor(private authService: AuthService, private router: Router) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  login(): void {
    if (!this.username || !this.password || this.isSubmitting) return;

    this.isSubmitting = true;
    this.authService.login(this.username, this.password).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/turnos']);
      },
      error: (err) => {
        this.isSubmitting = false;
        const mensaje = err.status === 401 ? 'Usuario o contraseña incorrectos' : 'No se pudo conectar con el servidor';
        Notiflix.Notify.failure(mensaje);
      },
    });
  }
}
