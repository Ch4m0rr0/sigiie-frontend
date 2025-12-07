import { Injectable } from '@angular/core';
import { 
  ROLES_DEFAULT, 
  RolDefault, 
  getRolDefault, 
  getNombresRolesDefault, 
  getAllRolesDefault,
  getPermisosRolDefault,
  existeRolDefault
} from '../constants/roles-default';

/**
 * Servicio para gestionar roles por defecto del sistema
 * 
 * Este servicio proporciona métodos para acceder y gestionar los roles
 * predefinidos del sistema con sus permisos asociados.
 */
@Injectable({ providedIn: 'root' })
export class RolesDefaultService {
  
  /**
   * Obtiene un rol por defecto por su nombre
   */
  getRol(nombre: string): RolDefault | undefined {
    return getRolDefault(nombre);
  }

  /**
   * Obtiene todos los roles por defecto
   */
  getAllRoles(): RolDefault[] {
    return getAllRolesDefault();
  }

  /**
   * Obtiene todos los nombres de roles por defecto
   */
  getNombresRoles(): string[] {
    return getNombresRolesDefault();
  }

  /**
   * Obtiene los permisos asociados a un rol por defecto
   */
  getPermisosRol(nombre: string): string[] {
    return getPermisosRolDefault(nombre);
  }

  /**
   * Verifica si un rol por defecto existe
   */
  existeRol(nombre: string): boolean {
    return existeRolDefault(nombre);
  }

  /**
   * Obtiene roles por nivel de acceso
   */
  getRolesPorNivel(nivel: 'alto' | 'medio' | 'bajo'): RolDefault[] {
    return getAllRolesDefault().filter(rol => rol.nivel === nivel);
  }

  /**
   * Obtiene roles con un permiso específico
   */
  getRolesConPermiso(permiso: string): RolDefault[] {
    return getAllRolesDefault().filter(rol => 
      rol.permisos.includes(permiso)
    );
  }

  /**
   * Obtiene roles con al menos uno de los permisos especificados
   */
  getRolesConAlgunPermiso(permisos: string[]): RolDefault[] {
    return getAllRolesDefault().filter(rol => 
      permisos.some(permiso => rol.permisos.includes(permiso))
    );
  }

  /**
   * Obtiene roles con todos los permisos especificados
   */
  getRolesConTodosLosPermisos(permisos: string[]): RolDefault[] {
    return getAllRolesDefault().filter(rol => 
      permisos.every(permiso => rol.permisos.includes(permiso))
    );
  }

  /**
   * Compara dos roles y devuelve los permisos que tiene el primero pero no el segundo
   */
  getPermisosDiferencia(rol1: string, rol2: string): string[] {
    const permisos1 = this.getPermisosRol(rol1);
    const permisos2 = this.getPermisosRol(rol2);
    return permisos1.filter(permiso => !permisos2.includes(permiso));
  }

  /**
   * Obtiene un resumen de permisos de un rol
   */
  getResumenRol(nombre: string): {
    nombre: string;
    descripcion: string;
    nivel: string;
    totalPermisos: number;
    permisosPorModulo: { [modulo: string]: number };
  } | undefined {
    const rol = this.getRol(nombre);
    if (!rol) return undefined;

    const permisosPorModulo: { [modulo: string]: number } = {};
    
    rol.permisos.forEach(permiso => {
      const modulo = permiso.split('.')[0];
      permisosPorModulo[modulo] = (permisosPorModulo[modulo] || 0) + 1;
    });

    return {
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      nivel: rol.nivel,
      totalPermisos: rol.permisos.length,
      permisosPorModulo
    };
  }
}

