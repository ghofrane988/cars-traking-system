import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-first-login',
  templateUrl: './first-login.component.html',
  styleUrls: ['../../components/login/login.component.css']
})
export class FirstLoginComponent {
  newPassword = '';
  error = '';

  constructor(private authService: AuthService, private router: Router) { }

  savePassword() {
    if (this.newPassword.length < 6) {
      this.error = 'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }

    this.authService.setFirstLoginPassword(false, this.newPassword).subscribe({
      next: () => this.navigateDashboard(),
      error: (err: any) => this.error = 'Erreur lors du changement.'
    });
  }

  skip() {
    this.authService.setFirstLoginPassword(true).subscribe({
      next: () => this.navigateDashboard(),
      error: () => this.navigateDashboard() // fallback to continue anyway
    });
  }

  private navigateDashboard() {
    if (this.authService.isAdmin() || this.authService.isResponsable()) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/employee/dashboard']);
    }
  }
}
