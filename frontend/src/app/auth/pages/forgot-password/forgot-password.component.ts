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
        this.error = err.error?.message || 'Erreur lors de l\'envoi';
        this.loading = false;
      }
    });
  }
}
