import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      
      // Bloquer l'accès tant que le mot de passe n'a pas été modifié
      if (user?.is_first_login && state.url !== '/first-login') {
        this.router.navigate(['/first-login']);
        return false;
      }
      
      // Si l'utilisateur n'est plus en "first_login", on l'empêche de retourner sur la page de premier login
      if (!user?.is_first_login && state.url === '/first-login') {
        this.router.navigate(['/']); // ou dashboard
        return false;
      }

      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}
