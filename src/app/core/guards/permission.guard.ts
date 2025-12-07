import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermisosService } from '../services/permisos.service';

/**
 * Guard que verifica si el usuario tiene un permiso específico
 * Uso: canActivate: [permissionGuard('proyectos.crear')]
 */
export const permissionGuard = (permiso: string): CanActivateFn => {
  return () => {
    const permisosService = inject(PermisosService);
    const router = inject(Router);

    if (permisosService.tienePermiso(permiso)) {
      return true;
    }

    // Si no tiene el permiso, redirigir al dashboard
    router.navigate(['/dashboard']);
    return false;
  };
};

/**
 * Guard que verifica si el usuario tiene al menos uno de los permisos especificados
 * Uso: canActivate: [anyPermissionGuard(['proyectos.crear', 'proyectos.editar'])]
 */
export const anyPermissionGuard = (permisos: string[]): CanActivateFn => {
  return () => {
    const permisosService = inject(PermisosService);
    const router = inject(Router);

    if (permisosService.tieneAlgunPermiso(permisos)) {
      return true;
    }

    router.navigate(['/dashboard']);
    return false;
  };
};

/**
 * Guard que verifica si el usuario tiene todos los permisos especificados
 * Uso: canActivate: [allPermissionsGuard(['proyectos.crear', 'proyectos.editar'])]
 */
export const allPermissionsGuard = (permisos: string[]): CanActivateFn => {
  return () => {
    const permisosService = inject(PermisosService);
    const router = inject(Router);

    if (permisosService.tieneTodosLosPermisos(permisos)) {
      return true;
    }

    router.navigate(['/dashboard']);
    return false;
  };
};

