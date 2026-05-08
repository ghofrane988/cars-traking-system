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
      next: () => {
        this.authService.updateFirstLoginStatus(false);
        this.navigateDashboard();
      },
      error: (err: any) => {
        if (err.status === 422) {
          const errors = err.error?.errors || {};
          if (errors.password) {
            this.error = "Le mot de passe doit contenir au moins 6 caractères.";
          } else {
            this.error = "Veuillez vérifier les informations saisies.";
          }
        } else if (err.status === 500) {
          this.error = 'Erreur serveur interne.';
        } else if (err.status === 0) {
          this.error = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
        } else {
          this.error = err.error?.message || 'Erreur lors de la sauvegarde du mot de passe.';
        }
        console.error(err);
      }
    });
  }

  skip() {
    this.authService.setFirstLoginPassword(true).subscribe({
      next: () => {
        this.authService.updateFirstLoginStatus(false);
        this.navigateDashboard();
      },
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
