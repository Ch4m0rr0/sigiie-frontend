import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { RolesDefaultService } from './roles-default.service';
import type { RolDefault } from '../constants/roles-default';

export interface Permiso {
  id: number;
  nombre: string;
  descripcion?: string;
  modulo?: string;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
}

@Injectable({ providedIn: 'root' })
export class PermisosService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private rolesDefaultService = inject(RolesDefaultService);
  private baseUrl = environment.apiUrl;

  // Signals para permisos y roles del usuario actual
  private permisosSubject = new BehaviorSubject<string[]>([]);
  permisos$ = this.permisosSubject.asObservable();
  
  private rolesSubject = new BehaviorSubject<string[]>([]);
  roles$ = this.rolesSubject.asObservable();

  permisos = signal<string[]>([]);
  roles = signal<string[]>([]);
  loading = signal(false);

  /**
   * Mapeo de permisos del backend al formato del frontend
   * Backend usa: "CrearUsuario", "EditarProyecto", etc.
   * Frontend espera: "usuarios.crear", "proyectos.editar", etc.
   */
  private mapeoPermisos: { [key: string]: string } = {
    // Usuarios
    'CrearUsuario': 'usuarios.crear',
    'EditarUsuario': 'usuarios.editar',
    'EliminarUsuario': 'usuarios.eliminar',
    'VerUsuario': 'usuarios.ver',
    
    // Roles
    'CrearRol': 'roles.crear',
    'EditarRol': 'roles.editar',
    'EliminarRol': 'roles.eliminar',
    'VerRol': 'roles.ver',
    
    // Permisos
    'CrearPermiso': 'permisos.crear',
    'EditarPermiso': 'permisos.editar',
    'EliminarPermiso': 'permisos.eliminar',
    'VerPermiso': 'permisos.ver',
    
    // Proyectos
    'CrearProyecto': 'proyectos.crear',
    'EditarProyecto': 'proyectos.editar',
    'EliminarProyecto': 'proyectos.eliminar',
    'VerProyecto': 'proyectos.ver',
    
    // Docentes
    'CrearDocente': 'personas.crear', // Los docentes son personas
    'EditarDocente': 'personas.editar',
    'EliminarDocente': 'personas.eliminar',
    'VerDocente': 'personas.ver',
    
    // Estudiantes
    'CrearEstudiante': 'personas.crear',
    'EditarEstudiante': 'personas.editar',
    'EliminarEstudiante': 'personas.eliminar',
    'VerEstudiante': 'personas.ver',
    
    // Departamentos
    'CrearDepartamento': 'catalogos.gestionar',
    'EditarDepartamento': 'catalogos.gestionar',
    'EliminarDepartamento': 'catalogos.gestionar',
    'VerDepartamento': 'catalogos.ver',
    
    // Participaciones
    'CrearParticipacione': 'participaciones.crear',
    'EditarParticipacione': 'participaciones.editar',
    'EliminarParticipacione': 'participaciones.eliminar',
    'VerParticipacione': 'participaciones.ver',
    
    // Actividades (si vienen del backend)
    'CrearActividad': 'actividades.crear',
    'EditarActividad': 'actividades.editar',
    'EliminarActividad': 'actividades.eliminar',
    'VerActividad': 'actividades.ver',
    
    // Subactividades
    'CrearSubactividad': 'subactividades.crear',
    'EditarSubactividad': 'subactividades.editar',
    'EliminarSubactividad': 'subactividades.eliminar',
    'VerSubactividad': 'subactividades.ver',
    
    // Evidencias
    'CrearEvidencia': 'evidencias.crear',
    'EditarEvidencia': 'evidencias.editar',
    'EliminarEvidencia': 'evidencias.eliminar',
    'VerEvidencia': 'evidencias.ver',
    
    // Reportes
    'VerReporte': 'reportes.ver',
    'GenerarReporte': 'reportes.generar',
    'ExportarReporte': 'reportes.exportar',
  };

  /**
   * Convierte permisos del formato del backend al formato del frontend
   */
  private convertirPermisos(permisosBackend: string[]): string[] {
    const permisosConvertidos = permisosBackend
      .map(permiso => this.mapeoPermisos[permiso] || permiso.toLowerCase().replace(/([A-Z])/g, '.$1').replace(/^\./, ''))
      .filter(Boolean);
    
    // Si el usuario tiene todos los permisos de un módulo, agregar permisos adicionales comunes
    if (permisosConvertidos.includes('usuarios.ver') || permisosConvertidos.includes('usuarios.crear')) {
      // Agregar permisos relacionados si no están ya presentes
      if (!permisosConvertidos.includes('usuarios.ver_todos')) {
        permisosConvertidos.push('usuarios.ver_todos');
      }
    }
    
    if (permisosConvertidos.includes('proyectos.ver') || permisosConvertidos.includes('proyectos.crear')) {
      if (!permisosConvertidos.includes('proyectos.ver_todos')) {
        permisosConvertidos.push('proyectos.ver_todos');
      }
    }
    
    if (permisosConvertidos.includes('actividades.ver') || permisosConvertidos.includes('actividades.crear')) {
      if (!permisosConvertidos.includes('actividades.ver_todas')) {
        permisosConvertidos.push('actividades.ver_todas');
      }
    }
    
    // Si tiene muchos permisos (probablemente administrador), agregar todos los permisos de visualización
    const tieneTodosPermisos = permisosBackend.length > 20; // Heurística: si tiene muchos permisos
    if (tieneTodosPermisos) {
      // Agregar permisos de visualización para todas las secciones
      const permisosVisualizacion = [
        'dashboard.ver',
        'dashboard.ver_todos',
        'proyectos.ver',
        'proyectos.ver_todos',
        'actividades.ver',
        'actividades.ver_todas',
        'subactividades.ver',
        'subactividades.ver_todas',
        'participaciones.ver',
        'participaciones.ver_todas',
        'evidencias.ver',
        'evidencias.ver_todas',
        'reportes.ver',
        'personas.ver',
        'usuarios.ver',
        'usuarios.ver_todos',
        'catalogos.ver',
      ];
      
      permisosVisualizacion.forEach(permiso => {
        if (!permisosConvertidos.includes(permiso)) {
          permisosConvertidos.push(permiso);
        }
      });
    }
    
    return [...new Set(permisosConvertidos)]; // Eliminar duplicados
  }

  /**
   * Convierte roles del formato del backend al formato del frontend
   * Usa los roles por defecto definidos en roles-default.ts
   */
  private convertirRoles(rolBackend: string): string[] {
    const mapeoRoles: { [key: string]: string } = {
      'Admin': 'Administrador del Sistema',
      'Administrador': 'Administrador del Sistema',
      'Encargado': 'Encargado / Coordinador',
      'Sub_Encargado': 'Sub-Encargado / Asistente',
      'Responsable': 'Responsable de Actividad',
      'Participante': 'Participante / Colaborador',
      'Consultor': 'Consultor / Visualizador',
      // Mapeos adicionales para roles comunes
      'Director': 'Director General',
      'Director General': 'Director General',
      'Coordinador': 'Encargado / Coordinador',
      'Asistente': 'Sub-Encargado / Asistente',
      'Colaborador': 'Participante / Colaborador',
      'Visualizador': 'Consultor / Visualizador',
    };
    
    const rolConvertido = mapeoRoles[rolBackend] || rolBackend;
    return [rolConvertido];
  }

  constructor() {
    // Cargar permisos del usuario actual si está autenticado
    const user = this.authService.user();
    if (user) {
      this.loadPermisosUsuarioActual();
    }

    // Reaccionar a cambios en el usuario usando effect
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.loadPermisosUsuarioActual();
      } else {
        this.permisos.set([]);
        this.roles.set([]);
        this.permisosSubject.next([]);
        this.rolesSubject.next([]);
      }
    });
  }

  /**
   * Carga los permisos del usuario autenticado actual desde el backend
   */
  loadPermisosUsuarioActual(): void {
    const user = this.authService.user();
    if (!user) {
      this.permisos.set([]);
      this.roles.set([]);
      return;
    }

    // Convertir roles del formato del backend al formato del frontend
    let rolesConvertidos: string[] = [];
    if (user.role) {
      rolesConvertidos = this.convertirRoles(user.role);
    } else if (user.roles && user.roles.length > 0) {
      rolesConvertidos = user.roles.map(rol => {
        const mapeoRoles: { [key: string]: string } = {
          'Admin': 'Administrador del Sistema',
          'Administrador': 'Administrador del Sistema',
        };
        return mapeoRoles[rol] || rol;
      });
    }
    
    // Verificar si el usuario es administrador (por rol o por correo especial)
    const esAdmin = rolesConvertidos.includes('Administrador del Sistema') ||
                    user.role?.toLowerCase().includes('admin') ||
                    user.correo?.toLowerCase() === 'admin@sigii.com';
    
    if (esAdmin) {
      // Si es administrador, asignar automáticamente todos los permisos del rol por defecto
      const rolAdminDefault = this.getRolDefault('Administrador del Sistema');
      if (rolAdminDefault) {
        const permisosAdmin = rolAdminDefault.permisos;
        this.permisos.set(permisosAdmin);
        this.permisosSubject.next(permisosAdmin);
        console.log('✅ Usuario administrador detectado. Permisos completos asignados:', permisosAdmin);
        
        // Asegurar que el rol esté correctamente asignado
        if (!rolesConvertidos.includes('Administrador del Sistema')) {
          rolesConvertidos = ['Administrador del Sistema'];
        }
      }
    } else {
      // Convertir permisos del formato del backend al formato del frontend
      let permisosConvertidos: string[] = [];
      if (user.permisos && user.permisos.length > 0) {
        permisosConvertidos = this.convertirPermisos(user.permisos);
        this.permisos.set(permisosConvertidos);
        this.permisosSubject.next(permisosConvertidos);
        console.log('✅ Permisos convertidos:', permisosConvertidos);
      }
    }
    
    if (rolesConvertidos.length > 0) {
      this.roles.set(rolesConvertidos);
      this.rolesSubject.next(rolesConvertidos);
      console.log('✅ Roles convertidos:', rolesConvertidos);
    }

    // Si ya tenemos permisos (ya sea del admin o convertidos), no necesitamos hacer otra llamada
    const permisosActuales = this.permisos();
    if (permisosActuales.length > 0) {
      this.loading.set(false);
      return;
    }
    
    this.loading.set(true);
    this.http.get<{ permisos: string[], roles: string[] }>(`${this.baseUrl}/api/auth/permissions`).pipe(
      map(response => {
        // Convertir roles
        let rolesConvertidos: string[] = [];
        if (response.roles && response.roles.length > 0) {
          rolesConvertidos = response.roles;
        } else if (user.role) {
          rolesConvertidos = this.convertirRoles(user.role);
        }
        
        // Verificar si el usuario es administrador
        const esAdmin = rolesConvertidos.includes('Administrador del Sistema') ||
                        user.role?.toLowerCase().includes('admin') ||
                        user.correo?.toLowerCase() === 'admin@sigii.com';
        
        let permisosConvertidos: string[] = [];
        
        if (esAdmin) {
          // Si es administrador, asignar todos los permisos del rol por defecto
          const rolAdminDefault = this.getRolDefault('Administrador del Sistema');
          if (rolAdminDefault) {
            permisosConvertidos = rolAdminDefault.permisos;
            if (!rolesConvertidos.includes('Administrador del Sistema')) {
              rolesConvertidos = ['Administrador del Sistema'];
            }
          }
        } else {
          // Convertir permisos del backend al formato del frontend
          const permisosBackend = response.permisos || user.permisos || [];
          permisosConvertidos = this.convertirPermisos(permisosBackend);
        }
        
        return {
          permisos: permisosConvertidos,
          roles: rolesConvertidos
        };
      }),
      tap(data => {
        this.permisos.set(data.permisos);
        this.roles.set(data.roles);
        this.permisosSubject.next(data.permisos);
        this.rolesSubject.next(data.roles);
        
        // Actualizar el usuario con los permisos convertidos
        const currentUser = this.authService.user();
        if (currentUser) {
          this.authService.user.set({
            ...currentUser,
            permisos: data.permisos,
            roles: data.roles
          });
        }
      }),
      catchError(error => {
        console.warn('⚠️ Error cargando permisos desde /api/auth/permissions, usando permisos actuales:', error);
        // Si falla, usar los permisos y roles que ya se cargaron anteriormente
        const permisosActuales = this.permisos();
        const rolesActuales = this.roles();
        this.loading.set(false);
        return of({ permisos: permisosActuales, roles: rolesActuales });
      })
    ).subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false)
    });
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   * Los administradores siempre tienen todos los permisos
   */
  tienePermiso(permiso: string): boolean {
    // Si es administrador, siempre tiene todos los permisos
    if (this.esAdministrador()) {
      return true;
    }
    
    const permisos = this.permisos();
    return permisos.includes(permiso);
  }

  /**
   * Verifica si el usuario tiene al menos uno de los permisos especificados
   */
  tieneAlgunPermiso(permisos: string[]): boolean {
    return permisos.some(permiso => this.tienePermiso(permiso));
  }

  /**
   * Verifica si el usuario tiene todos los permisos especificados
   */
  tieneTodosLosPermisos(permisos: string[]): boolean {
    return permisos.every(permiso => this.tienePermiso(permiso));
  }

  /**
   * Verifica si el usuario tiene un rol específico
   */
  tieneRol(rol: string): boolean {
    const roles = this.roles();
    return roles.includes(rol);
  }

  /**
   * Verifica si el usuario tiene al menos uno de los roles especificados
   */
  tieneAlgunRol(roles: string[]): boolean {
    return roles.some(rol => this.tieneRol(rol));
  }

  /**
   * Verifica si el usuario tiene todos los roles especificados
   */
  tieneTodosLosRoles(roles: string[]): boolean {
    return roles.every(rol => this.tieneRol(rol));
  }

  /**
   * Obtiene todos los permisos del usuario actual
   */
  getPermisos(): string[] {
    return this.permisos();
  }

  /**
   * Obtiene todos los roles del usuario actual
   */
  getRoles(): string[] {
    return this.roles();
  }

  /**
   * Verifica si el usuario es administrador
   */
  esAdministrador(): boolean {
    const user = this.authService.user();
    if (!user) {
      return false;
    }
    
    const roles = this.roles();
    
    // Verificar por correo especial
    if (user.correo?.toLowerCase() === 'admin@sigii.com') {
      return true;
    }
    
    // Verificar por roles
    if (roles.includes('Administrador del Sistema') || 
        roles.includes('Administrador') || 
        roles.includes('Admin')) {
      return true;
    }
    
    // Verificar por rol del usuario directamente
    if (user.role?.toLowerCase().includes('admin')) {
      return true;
    }
    
    // Verificar por permisos directamente (sin usar tienePermiso para evitar recursión)
    const permisos = this.permisos();
    const permisosAdmin = ['usuarios.crear', 'usuarios.editar', 'proyectos.crear', 'proyectos.editar'];
    const tienePermisosAdmin = permisosAdmin.every(permiso => permisos.includes(permiso));
    
    return tienePermisosAdmin;
  }

  /**
   * Obtiene todos los roles disponibles (solo para administradores)
   */
  getAllRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.baseUrl}/api/roles`).pipe(
      catchError(error => {
        console.error('❌ Error obteniendo roles:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene todos los permisos disponibles (solo para administradores)
   */
  getAllPermisos(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${this.baseUrl}/api/permisos`).pipe(
      catchError(error => {
        console.error('❌ Error obteniendo permisos:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene permisos por módulo
   */
  getPermisosPorModulo(modulo: string): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${this.baseUrl}/api/permisos/modulo/${modulo}`).pipe(
      catchError(error => {
        console.error(`❌ Error obteniendo permisos del módulo ${modulo}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene roles por defecto del sistema
   */
  getRolesDefault(): RolDefault[] {
    return this.rolesDefaultService.getAllRoles();
  }

  /**
   * Obtiene un rol por defecto por su nombre
   */
  getRolDefault(nombre: string): RolDefault | undefined {
    return this.rolesDefaultService.getRol(nombre);
  }

  /**
   * Obtiene los permisos de un rol por defecto
   */
  getPermisosRolDefault(nombre: string): string[] {
    return this.rolesDefaultService.getPermisosRol(nombre);
  }

  /**
   * Verifica si un rol por defecto existe
   */
  existeRolDefault(nombre: string): boolean {
    return this.rolesDefaultService.existeRol(nombre);
  }

  /**
   * Obtiene roles por defecto por nivel de acceso
   */
  getRolesDefaultPorNivel(nivel: 'alto' | 'medio' | 'bajo'): RolDefault[] {
    return this.rolesDefaultService.getRolesPorNivel(nivel);
  }
}

