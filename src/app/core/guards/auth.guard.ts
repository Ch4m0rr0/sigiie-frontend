import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  // Temporalmente deshabilitado para pruebas de estilos
  return true;
  
  // const auth = inject(AuthService);
  // const router = inject(Router);
  // const user = auth.user();
  // if (!user) { router.navigate(['']); return false; }
  // return true;
};
