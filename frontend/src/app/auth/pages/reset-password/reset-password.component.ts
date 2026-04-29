import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['../../components/login/login.component.css']
})
export class ResetPasswordComponent implements OnInit {
  email = '';
  token = '';
  newPassword = '';
  message = '';
  error = '';
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.email = this.route.snapshot.queryParams['email'] || '';
    this.token = this.route.snapshot.queryParams['token'] || '';
    if (!this.token || !this.email) {
      this.error = "Lien invalide ou expiré.";
    }
  }

  submit() {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.error = 'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }
    this.loading = true;
    this.message = '';
    this.error = '';

    this.authService.resetPassword(this.email, this.token, this.newPassword).subscribe({
      next: (res: any) => {
        this.message = res.message || 'Mot de passe réinitialisé avec succès.';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Erreur lors de la réinitialisation.';
        this.loading = false;
      }
    });
  }
}
