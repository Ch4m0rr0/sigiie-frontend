import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { RolesDefaultService } from './roles-default.service';
import { CatalogosService } from './catalogos.service';
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
  private catalogosService = inject(CatalogosService);
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
    
    // Responsables de Actividades
    'CrearActividadResponsable': 'actividades.responsables.crear',
    'EditarActividadResponsable': 'actividades.responsables.editar',
    'EliminarActividadResponsable': 'actividades.responsables.eliminar',
    'VerActividadResponsable': 'actividades.responsables.ver',
    
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
    'CrearReporte': 'reportes.crear',
    'EditarReporte': 'reportes.editar',
    'EliminarReporte': 'reportes.eliminar',
    'GenerarReporte': 'reportes.generar',
    'ExportarReporte': 'reportes.exportar',
    'CrearReportePersonalizado': 'reportes.crear',
    'EditarReportePersonalizado': 'reportes.editar',
    'EliminarReportePersonalizado': 'reportes.eliminar',
    'VerReportePersonalizado': 'reportes.ver',
    
    // Actividades relacionadas
    'VerActividadAnual': 'actividades.ver',
    'VerActividadMensualInstitucional': 'actividades.ver',
    'VerActividadMensualInst': 'actividades.ver',
    'VerEdicionActividad': 'actividades.ver',
    
    // ============================================
    // PARTICIPACIONES - OPERACIONES CRUD BÁSICAS
    // ============================================
    // Estos permisos controlan las operaciones básicas de creación, edición, eliminación y visualización
    'CrearParticipacion': 'participaciones.crear',
    'EditarParticipacion': 'participaciones.editar',
    'EliminarParticipacion': 'participaciones.eliminar',
    'VerParticipacion': 'participaciones.ver',
    
    // ============================================
    // PARTICIPACIONES - IMPORTACIÓN DESDE EXCEL
    // ============================================
    // NOTA: Estos permisos son DIFERENTES de los permisos CRUD.
    // El backend acepta tanto 'ImportarParticipacion' como 'CrearParticipacion' para estas operaciones.
    // Los métodos helper (puedeImportarParticipantes*) verifican ambos permisos automáticamente.
    'ImportarParticipacion': 'participaciones.importar',                    // Permiso general de importación
    'ImportarParticipantes': 'participaciones.importar_participantes',         // Importar participantes (genérico)
    'ImportarParticipantesActividad': 'participaciones.importar_actividad',   // Importar participantes de una actividad
    'ImportarParticipantesSubactividad': 'participaciones.importar_subactividad', // Importar participantes de una subactividad
    
    // Participaciones Individuales (si el backend usa un permiso específico)
    'CrearParticipacionIndividual': 'participaciones.crear',
    'EditarParticipacionIndividual': 'participaciones.editar',
    'EliminarParticipacionIndividual': 'participaciones.eliminar',
    'VerParticipacionIndividual': 'participaciones.ver',
    
    // Administrativos
    'CrearAdministrativo': 'personas.crear',
    'EditarAdministrativo': 'personas.editar',
    'EliminarAdministrativo': 'personas.eliminar',
    'VerAdministrativo': 'personas.ver',
    
    // Responsables Externos
    'CrearResponsableExterno': 'personas.crear',
    'EditarResponsableExterno': 'personas.editar',
    'EliminarResponsableExterno': 'personas.eliminar',
    'VerResponsableExterno': 'personas.ver',
    
    // Catálogos - Todos los permisos de "Ver" de catálogos mapean a catalogos.ver
    'VerIndicador': 'catalogos.ver',
    'VerTipoActividad': 'catalogos.ver',
    'VerCategoriaActividad': 'catalogos.ver',
    'VerNivelActividad': 'catalogos.ver',
    'VerTipoEvidencia': 'catalogos.ver',
    'VerEstadoActividad': 'catalogos.ver',
    'VerTipoProtagonista': 'catalogos.ver',
    'VerCategoriaParticipacion': 'catalogos.ver',
    'VerRolResponsable': 'catalogos.ver',
    'VerTipoIniciativa': 'catalogos.ver',
    'VerTipoInvestigacion': 'catalogos.ver',
    'VerEstadoProyecto': 'catalogos.ver',
    'VerTipoDocumento': 'catalogos.ver',
    'VerTipoDocumentoDivulgado': 'catalogos.ver',
    'VerAreaConocimiento': 'catalogos.ver',
    'VerNivelAcademico': 'catalogos.ver',
    'VerTipoUnidad': 'catalogos.ver',
    'VerCapacidadInstalada': 'catalogos.ver',
    'VerCarrera': 'catalogos.ver',
  };

  /**
   * Convierte permisos del formato del backend al formato del frontend
   */
  private convertirPermisos(permisosBackend: string[]): string[] {
    console.log('🔄 [PERMISOS] Convirtiendo permisos del backend:', permisosBackend);
    
    const permisosConvertidos = permisosBackend
      .map(permiso => {
        // Primero intentar el mapeo directo
        if (this.mapeoPermisos[permiso]) {
          console.log(`  ✅ Permiso "${permiso}" -> "${this.mapeoPermisos[permiso]}" (mapeo directo)`);
          return this.mapeoPermisos[permiso];
        }
        // Si no está en el mapeo, intentar conversión automática
        const convertido = permiso.toLowerCase().replace(/([A-Z])/g, '.$1').replace(/^\./, '');
        console.log(`  📝 Permiso "${permiso}" -> "${convertido}" (conversión automática)`);
        return convertido;
      })
      .filter(Boolean);
    
    console.log('✅ [PERMISOS] Permisos convertidos:', permisosConvertidos);
    
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
    
    if (permisosConvertidos.includes('subactividades.ver') || permisosConvertidos.includes('subactividades.crear')) {
      if (!permisosConvertidos.includes('subactividades.ver_todas')) {
        permisosConvertidos.push('subactividades.ver_todas');
      }
    }
    
    if (permisosConvertidos.includes('participaciones.ver') || permisosConvertidos.includes('participaciones.crear')) {
      if (!permisosConvertidos.includes('participaciones.ver_todas')) {
        permisosConvertidos.push('participaciones.ver_todas');
      }
    }
    
    if (permisosConvertidos.includes('evidencias.ver') || permisosConvertidos.includes('evidencias.crear')) {
      if (!permisosConvertidos.includes('evidencias.ver_todas')) {
        permisosConvertidos.push('evidencias.ver_todas');
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
    
    const permisosFinales = [...new Set(permisosConvertidos)]; // Eliminar duplicados
    console.log('✅ [PERMISOS] Permisos finales después de agregar extras:', permisosFinales);
    return permisosFinales;
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
        // Los permisos pueden venir como strings o como objetos con 'nombre'
        const permisosNombres = user.permisos.map((p: any) => {
          if (typeof p === 'string') {
            return p;
          } else if (p && typeof p === 'object' && p.nombre) {
            return p.nombre;
          }
          return String(p);
        }).filter(Boolean);
        
        console.log('📋 [PERMISOS] Permisos del usuario (nombres extraídos):', permisosNombres);
        permisosConvertidos = this.convertirPermisos(permisosNombres);
        this.permisos.set(permisosConvertidos);
        this.permisosSubject.next(permisosConvertidos);
        console.log('✅ [PERMISOS] Permisos convertidos y asignados:', permisosConvertidos);
      } else {
        console.warn('⚠️ [PERMISOS] El usuario no tiene permisos en user.permisos:', user);
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
      console.log('✅ [PERMISOS] Ya tenemos permisos cargados, no se hace llamada adicional');
      this.loading.set(false);
      return;
    }
    
    // Si no tenemos permisos pero el usuario tiene un rol, intentar obtener los permisos del rol
    if (user.role && permisosActuales.length === 0) {
      console.log('🔄 [PERMISOS] No hay permisos pero el usuario tiene rol, intentando obtener permisos del rol...');
      // Intentar obtener los permisos del rol desde el backend
      this.obtenerPermisosDelRol(user.role);
      return;
    }
    
    this.loading.set(true);
    console.log('🔄 [PERMISOS] Llamando a /auth/permissions para obtener permisos...');
    // baseUrl ya incluye '/api', así que solo agregamos '/auth/permissions'
    this.http.get<{ permisos: string[], roles: string[] }>(`${this.baseUrl}/auth/permissions`).pipe(
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
   * Verifica si el usuario tiene todos los permisos (es admin o tiene muchos permisos)
   * Útil para determinar si debe tener restricciones de departamento
   */
  tieneTodosLosPermisosDeAdmin(): boolean {
    // Si es administrador explícito, tiene todos los permisos
    if (this.esAdministrador()) {
      return true;
    }
    
    // Si tiene más de 50 permisos, probablemente tiene todos los permisos
    const permisos = this.permisos();
    if (permisos.length > 50) {
      return true;
    }
    
    // Verificar si tiene permisos clave de administración
    const permisosClave = [
      'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar',
      'catalogos.gestionar', 'catalogos.crear', 'catalogos.editar', 'catalogos.eliminar',
      'proyectos.crear', 'proyectos.editar', 'proyectos.eliminar',
      'actividades.crear', 'actividades.editar', 'actividades.eliminar'
    ];
    
    const tienePermisosClave = permisosClave.every(permiso => permisos.includes(permiso));
    return tienePermisosClave;
  }

  /**
   * Obtiene todos los roles disponibles (solo para administradores)
   */
  getAllRoles(): Observable<Rol[]> {
    // baseUrl ya incluye '/api', así que solo agregamos '/roles'
    return this.http.get<Rol[]>(`${this.baseUrl}/roles`).pipe(
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
    // Usar catalogosService.getPermisos() que ya maneja el mapeo correctamente
    return this.catalogosService.getPermisos().pipe(
      map((permisos: any[]) => {
        // Mapear al formato Permiso esperado
        return permisos.map(p => ({
          id: p.id || 0,
          nombre: p.nombre || '',
          descripcion: p.descripcion || '',
          modulo: p.modulo || 'Otros'
        } as Permiso));
      }),
      catchError(error => {
        console.error('❌ Error obteniendo permisos:', error);
        return of([]);
      })
    );
  }

  /**
   * Verifica si el usuario puede importar participantes
   * El backend acepta tanto 'ImportarParticipacion' como 'CrearParticipacion'
   * @returns true si el usuario tiene alguno de estos permisos
   */
  puedeImportarParticipantes(): boolean {
    // El backend acepta ImportarParticipacion O CrearParticipacion
    return this.tieneAlgunPermiso([
      'participaciones.importar',
      'participaciones.importar_participantes',
      'participaciones.crear'
    ]);
  }

  /**
   * Verifica si el usuario puede importar participantes para una actividad
   * El backend acepta tanto 'ImportarParticipacion' como 'CrearParticipacion'
   * @returns true si el usuario tiene alguno de estos permisos
   */
  puedeImportarParticipantesActividad(): boolean {
    // El backend acepta ImportarParticipacion O CrearParticipacion
    return this.tieneAlgunPermiso([
      'participaciones.importar',
      'participaciones.importar_actividad',
      'participaciones.crear'
    ]);
  }

  /**
   * Verifica si el usuario puede importar participantes para una subactividad
   * El backend acepta tanto 'ImportarParticipacion' como 'CrearParticipacion'
   * @returns true si el usuario tiene alguno de estos permisos
   */
  puedeImportarParticipantesSubactividad(): boolean {
    // El backend acepta ImportarParticipacion O CrearParticipacion
    return this.tieneAlgunPermiso([
      'participaciones.importar',
      'participaciones.importar_subactividad',
      'participaciones.crear'
    ]);
  }

  /**
   * Obtiene permisos por módulo
   */
  getPermisosPorModulo(modulo: string): Observable<Permiso[]> {
    // baseUrl ya incluye '/api', así que solo agregamos '/permisos/modulo/...'
    return this.http.get<Permiso[]>(`${this.baseUrl}/permisos/modulo/${modulo}`).pipe(
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

  /**
   * Obtiene los permisos de un rol específico desde el backend
   */
  private obtenerPermisosDelRol(nombreRol: string): void {
    console.log(`🔄 [PERMISOS] Obteniendo permisos del rol: ${nombreRol}`);
    this.loading.set(true);
    
    // Primero intentar obtener todos los roles y buscar por nombre
    // baseUrl ya incluye '/api', así que solo agregamos '/roles'
    this.http.get<any>(`${this.baseUrl}/roles`).pipe(
      map((response: any) => {
        // Manejar diferentes formatos de respuesta del backend
        let items: any[] = [];
        if (Array.isArray(response)) {
          items = response;
        } else if (response && Array.isArray(response.data)) {
          items = response.data;
        } else if (response && response.data) {
          items = Array.isArray(response.data) ? response.data : [];
        }
        
        console.log(`📋 [PERMISOS] Total de roles encontrados: ${items.length}`);
        
        // Buscar el rol por nombre (case-insensitive)
        const rol = items.find((r: any) => {
          const nombreRolBackend = (r.nombre || r.Nombre || '').toLowerCase();
          const nombreRolBuscado = nombreRol.toLowerCase();
          return nombreRolBackend === nombreRolBuscado || nombreRolBackend.includes(nombreRolBuscado);
        });
        
        if (rol) {
          console.log('✅ [PERMISOS] Rol encontrado:', rol);
          const idRol = rol.idRol || rol.IdRol || rol.id || rol.Id;
          
          // Si tenemos un ID de rol, intentar obtener el rol completo con permisos
          if (idRol) {
            console.log(`🔄 [PERMISOS] Obteniendo rol completo por ID: ${idRol}`);
            return { idRol, nombreRol: rol.nombre || rol.Nombre };
          }
          
          // Si no hay ID, intentar extraer permisos directamente del objeto
          const permisosRol = rol.permisos || rol.Permisos || rol.permisosIds || rol.PermisosIds || [];
          
          // Si los permisos vienen como objetos, extraer los nombres
          const permisosNombres = permisosRol.map((p: any) => {
            if (typeof p === 'string') {
              return p;
            } else if (p && typeof p === 'object') {
              return p.nombre || p.Nombre || p.idPermiso || p.IdPermiso || String(p);
            }
            return String(p);
          }).filter(Boolean);
          
          console.log('✅ [PERMISOS] Permisos del rol extraídos directamente:', permisosNombres);
          return { permisosNombres };
        }
        
        console.warn(`⚠️ [PERMISOS] Rol "${nombreRol}" no encontrado en el backend`);
        return null;
      }),
      switchMap((result: any) => {
        // Si encontramos un ID de rol, obtener el rol completo
        if (result && result.idRol) {
          console.log(`🔄 [PERMISOS] Obteniendo rol completo desde catalogosService, ID: ${result.idRol}`);
          return this.catalogosService.getRoleById(result.idRol).pipe(
            map((rolCompleto: any) => {
              console.log('✅ [PERMISOS] Rol completo obtenido:', rolCompleto);
              
              // Extraer permisos del rol completo
              let permisosNombres: string[] = [];
              
              // PRIORIDAD 1: Si viene como array de objetos permisos, usar esos directamente
              if (rolCompleto.permisos && Array.isArray(rolCompleto.permisos) && rolCompleto.permisos.length > 0) {
                permisosNombres = rolCompleto.permisos.map((p: any) => {
                  if (typeof p === 'string') {
                    return p;
                  } else if (p && typeof p === 'object') {
                    return p.nombre || p.Nombre || p.idPermiso || p.IdPermiso || String(p);
                  }
                  return String(p);
                }).filter(Boolean);
                console.log('✅ [PERMISOS] Permisos extraídos del rol completo (array permisos):', permisosNombres);
                return { permisosNombres };
              }
              
              // PRIORIDAD 2: Si viene permisosIds, necesitamos obtener los nombres de los permisos
              if (rolCompleto.permisosIds && Array.isArray(rolCompleto.permisosIds) && rolCompleto.permisosIds.length > 0) {
                console.log('📋 [PERMISOS] El rol tiene permisosIds, necesitamos obtener los nombres de los permisos');
                // Retornar los IDs y luego los convertiremos
                return { permisosIds: rolCompleto.permisosIds };
              }
              
              return { permisosNombres: [] };
            }),
            catchError((error) => {
              console.error('❌ [PERMISOS] Error obteniendo rol completo:', error);
              return of({ permisosNombres: [] });
            })
          );
        }
        
        // Si ya tenemos los permisos directamente, retornarlos
        if (result && result.permisosNombres) {
          return of(result);
        }
        
        return of({ permisosNombres: [] });
      }),
      switchMap((result: any) => {
        // Si tenemos permisosIds, necesitamos obtener los nombres de los permisos
        if (result && result.permisosIds && Array.isArray(result.permisosIds) && result.permisosIds.length > 0) {
          console.log('🔄 [PERMISOS] Obteniendo nombres de permisos desde IDs:', result.permisosIds);
          return this.getAllPermisos().pipe(
            map((todosPermisos: Permiso[]) => {
              console.log(`📋 [PERMISOS] Total de permisos obtenidos desde /api/permisos: ${todosPermisos.length}`);
              if (todosPermisos.length === 0) {
                console.warn('⚠️ [PERMISOS] No se obtuvieron permisos desde /api/permisos. Verificando si el rol tiene permisos directamente...');
              }
              const permisosNombres = result.permisosIds
                .map((id: number) => {
                  const permiso = todosPermisos.find(p => p.id === id);
                  if (!permiso) {
                    console.warn(`⚠️ [PERMISOS] No se encontró permiso con ID ${id}`);
                  }
                  return permiso ? permiso.nombre : null;
                })
                .filter(Boolean) as string[];
              console.log(`✅ [PERMISOS] Nombres de permisos obtenidos desde IDs: ${permisosNombres.length} de ${result.permisosIds.length}`, permisosNombres);
              return { permisosNombres };
            }),
            catchError((error) => {
              console.error('❌ [PERMISOS] Error obteniendo nombres de permisos:', error);
              return of({ permisosNombres: [] });
            })
          );
        }
        
        return of(result || { permisosNombres: [] });
      }),
      catchError(error => {
        console.error('❌ [PERMISOS] Error obteniendo permisos del rol:', error);
        return of({ permisosNombres: [] });
      })
    ).subscribe({
      next: (result: any) => {
        const permisosNombres = result?.permisosNombres || [];
        if (permisosNombres.length > 0) {
          const permisosConvertidos = this.convertirPermisos(permisosNombres);
          this.permisos.set(permisosConvertidos);
          this.permisosSubject.next(permisosConvertidos);
          console.log('✅ [PERMISOS] Permisos del rol convertidos y asignados:', permisosConvertidos);
        } else {
          console.warn('⚠️ [PERMISOS] No se encontraron permisos para el rol');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ [PERMISOS] Error en obtenerPermisosDelRol:', err);
        this.loading.set(false);
      }
    });
  }
}

