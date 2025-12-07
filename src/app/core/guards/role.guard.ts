import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermisosService } from '../services/permisos.service';

/**
 * Guard que verifica si el usuario tiene un rol específico
 * Uso: canActivate: [roleGuard(['Administrador del Sistema', 'Encargado'])]
 */
export const roleGuard = (roles: string[]): CanActivateFn => {
  return () => {
    const permisosService = inject(PermisosService);
    const router = inject(Router);

    if (permisosService.tieneAlgunRol(roles)) {
      return true;
    }

    // Si no tiene el rol, redirigir al dashboard
    router.navigate(['/dashboard']);
    return false;
  };
};

