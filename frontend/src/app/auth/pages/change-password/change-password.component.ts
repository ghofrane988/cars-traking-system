import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-change-password',
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {
    newPassword = '';
    confirmPassword = '';
    loading = false;
    error = '';

    constructor(
        private authService: AuthService,
        private router: Router,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
    }

    savePassword(): void {
        if (!this.newPassword || this.newPassword.length < 6) {
            this.error = 'Password must be at least 6 characters';
            return;
        }

        if (this.newPassword !== this.confirmPassword) {
            this.error = 'Passwords do not match';
            return;
        }

        this.loading = true;
        this.authService.changePassword(this.newPassword).subscribe({
            next: () => {
                this.loading = false;
                this.toastService.success('Password updated successfully');
                this.router.navigate(['/']);
            },
            error: (err) => {
                this.loading = false;
                if (err.status === 401) {
                    this.error = 'L\'ancien mot de passe est incorrect.';
                } else if (err.status === 422) {
                    const errors = err.error?.errors || {};
                    if (errors.new_password) {
                        this.error = "Le nouveau mot de passe doit contenir au moins 6 caractères.";
                    } else if (errors.current_password) {
                        this.error = "L'ancien mot de passe est requis.";
                    } else {
                        this.error = "Veuillez vérifier les informations saisies.";
                    }
                } else if (err.status === 500) {
                    this.error = 'Erreur serveur interne.';
                } else if (err.status === 0) {
                    this.error = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
                } else {
                    this.error = err.error?.message || 'Erreur lors du changement de mot de passe.';
                }
                console.error(err);
            }
        });
    }

    cancel(): void {
        this.router.navigate(['/']);
    }
}
