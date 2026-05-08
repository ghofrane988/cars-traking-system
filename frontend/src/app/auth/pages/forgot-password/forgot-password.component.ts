import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../../components/login/login.component.css']
})
export class ForgotPasswordComponent {
  email = '';
  message = '';
  error = '';
  loading = false;

  constructor(private authService: AuthService) { }

  submit() {
    if (!this.email) return;
    this.loading = true;
    this.message = '';
    this.error = '';
    this.authService.forgotPassword(this.email).subscribe({
      next: (res: any) => {
        this.message = res.message || 'Lien envoyé';
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        if (err.status === 404) {
          this.error = "Cette adresse email n'existe pas dans notre système.";
        } else if (err.status === 422) {
          this.error = "Le format de l'adresse email est incorrect.";
        } else if (err.status === 500) {
          this.error = 'Erreur serveur lors de l\'envoi de l\'email.';
        } else if (err.status === 0) {
          this.error = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
        } else {
          this.error = err.error?.message || 'Une erreur est survenue lors de l\'envoi.';
        }
        console.error(err);
      }
    });
  }
}
