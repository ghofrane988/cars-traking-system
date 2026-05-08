import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  error: string = '';
  loading: boolean = false;
  showPassword: boolean = false;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.redirectByRole();
    }
  }

  onSubmit(): void {
    this.loading = true;
    this.error = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        // AuthService already stored token and user; clear sensitive fields and proceed
        this.loading = false;
        this.password = '';
        this.redirectByRole();
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
          this.error = 'Email ou mot de passe incorrect.';
        } else if (err.status === 422) {
          const errors = err.error?.errors || {};
          if (errors.email) {
            this.error = "Le format de l'email est incorrect.";
          } else if (errors.password) {
            this.error = "Le mot de passe est requis.";
          } else {
            this.error = "Veuillez vérifier les informations saisies.";
          }
        } else if (err.status === 500) {
          this.error = 'Erreur serveur interne. Veuillez réessayer plus tard.';
        } else if (err.status === 0) {
          this.error = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
        } else {
          this.error = err.error?.message || 'Une erreur inattendue est survenue.';
        }
        console.error(err);
      }
    });
  }

  private redirectByRole(): void {
    const user = this.authService.getCurrentUser() as any;

    if (user?.is_first_login) {
      this.router.navigate(['/first-login']);
      return;
    }

    if (user?.role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else if (user?.role === 'responsable') {
      // 'responsable' currently uses the admin dashboard; change if a separate route exists
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/employee/dashboard']);
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
