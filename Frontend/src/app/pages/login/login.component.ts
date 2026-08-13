import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Notiflix from 'notiflix';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export default class LoginComponent {
  username = '';
  password = '';
  isSubmitting = false;

  constructor(private authService: AuthService, private router: Router) {}

  login(): void {
    if (!this.username || !this.password || this.isSubmitting) return;

    this.isSubmitting = true;
    this.authService.login(this.username, this.password).subscribe({
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
