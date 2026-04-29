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
        this.error = 'Email ou mot de passe incorrect';
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
