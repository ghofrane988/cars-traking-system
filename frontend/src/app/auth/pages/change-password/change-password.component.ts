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
                this.error = err.error?.message || 'Error updating password';
            }
        });
    }

    cancel(): void {
        this.router.navigate(['/']);
    }
}
