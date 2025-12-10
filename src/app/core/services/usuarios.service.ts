import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Usuario, UsuarioCreate, UsuarioUpdate } from '../models/usuario';
import type { Rol } from '../models/rol';
import type { Permiso } from '../models/permiso';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/usuarios`;

  // Usuarios
  getAll(): Observable<Usuario[]> {
    console.log(`📡 Llamando a GET ${this.apiUrl}...`);
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        console.log('📥 Respuesta del servidor (raw):', response);
        const items = response.data || response;
        console.log('📦 Items extraídos:', items);
        
        if (!Array.isArray(items)) {
          console.warn('⚠️ La respuesta no es un array:', typeof items, items);
          return [];
        }
        
        const usuariosMapeados = items.map(item => this.mapUsuario(item));
        console.log(`✅ ${usuariosMapeados.length} usuarios mapeados correctamente`);
        return usuariosMapeados;
      }),
      catchError(error => {
        if (error.status === 403) {
          console.warn('⚠️ Sin permisos para ver usuarios (403). El usuario necesita el permiso "VerUsuario" para asignar responsables.');
          // Devolver array vacío para que el formulario no falle, pero el usuario verá que no hay usuarios disponibles
          return of([]);
        } else if (error.status === 500) {
          // El backend está devolviendo 500 en lugar de 403 cuando no hay permisos
          // El error específico es: "No authentication handler is registered for the scheme 'No tiene permiso para ver usuarios.'"
          // Necesitamos detectar este patrón específico
          const errorMessage = error.error?.message || error.error?.title || error.message || '';
          const errorDetails = error.error?.details || error.error?.stack || '';
          const errorString = JSON.stringify(error.error || {}).toLowerCase();
          const fullErrorText = (errorMessage + ' ' + errorDetails + ' ' + errorString).toLowerCase();
          
          // Detectar varios patrones de error de permisos
          const isPermissionError = fullErrorText.includes('permiso') || 
                                   fullErrorText.includes('no tiene permiso') ||
                                   fullErrorText.includes('authentication handler') ||
                                   fullErrorText.includes('forbid') ||
                                   fullErrorText.includes('scheme') && fullErrorText.includes('ver usuarios');
          
          if (isPermissionError) {
            // Error de permisos mal manejado por el backend (500 en lugar de 403)
            // No loguear, solo devolver array vacío silenciosamente
            // El formulario continuará funcionando sin usuarios disponibles
            return of([]);
          }
          // Para otros errores 500, loguear pero devolver array vacío
          console.error('❌ Error 500 del servidor al obtener usuarios:', error);
          return of([]);
        } else if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/usuarios no encontrado (404)');
          return of([]);
        } else {
          console.error('❌ Error fetching usuarios:', error);
          return of([]);
        }
      })
    );
  }

  // Método legacy para compatibilidad
  list(): Observable<Usuario[]> {
    return this.getAll();
  }

  getById(id: number): Observable<Usuario | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapUsuario(item)),
      catchError(error => {
        if (error.status === 404) {
          return of(null);
        }
        console.error('Error fetching usuario:', error);
        throw error;
      })
    );
  }

  // Método legacy para compatibilidad
  get(id: number): Observable<Usuario> {
    return this.getById(id).pipe(
      map(usuario => {
        if (!usuario) throw new Error('Usuario no encontrado');
        return usuario;
      })
    );
  }

  create(usuario: UsuarioCreate): Observable<Usuario> {
    // El backend espera PascalCase
    const dto: any = {
      NombreCompleto: usuario.nombreCompleto,
      Correo: usuario.correo,
      Contraseña: usuario.contraseña,
      IdRol: usuario.idRol
    };
    
    if (usuario.departamentoId !== undefined) {
      dto.DepartamentoId = usuario.departamentoId;
    }

    // Agregar permisos si están presentes
    // El backend espera un array de objetos Permiso completos
    if (usuario.permisos && usuario.permisos.length > 0) {
      dto.Permisos = usuario.permisos.map((permiso: any) => {
        // Si ya es un objeto, usarlo directamente
        if (typeof permiso === 'object' && permiso !== null) {
          return {
            idPermiso: permiso.idPermiso || permiso.id || permiso.IdPermiso || permiso.Id,
            nombre: permiso.nombre || permiso.Nombre || null,
            descripcion: permiso.descripcion || permiso.Descripcion || null,
            modulo: permiso.modulo || permiso.Modulo || null,
            activo: permiso.activo !== undefined ? permiso.activo : (permiso.Activo !== undefined ? permiso.Activo : true)
          };
        }
        // Si es un número (ID), crear un objeto mínimo
        return {
          idPermiso: Number(permiso),
          nombre: null,
          descripcion: null,
          modulo: null,
          activo: true
        };
      });
    }

    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(item => this.mapUsuario(item))
    );
  }

  update(id: number, usuario: UsuarioUpdate): Observable<boolean> {
    // El backend espera PascalCase
    const dto: any = {
      NombreCompleto: usuario.nombreCompleto,
      Correo: usuario.correo,
      IdRol: usuario.idRol,
      Activo: usuario.activo
    };
    
    if (usuario.departamentoId !== undefined) {
      dto.DepartamentoId = usuario.departamentoId;
    }

    // Agregar permisos si están presentes
    // El backend espera objetos completos de Permiso (igual que para roles)
    if (usuario.permisos !== undefined && usuario.permisos.length > 0) {
      dto.Permisos = usuario.permisos.map((permiso: any) => {
        // Si ya es un objeto, usarlo directamente pero asegurar el formato correcto
        if (typeof permiso === 'object' && permiso !== null) {
          return {
            idPermiso: permiso.idPermiso || permiso.id || permiso.IdPermiso || permiso.Id,
            nombre: permiso.nombre || permiso.Nombre || null,
            descripcion: permiso.descripcion || permiso.Descripcion || null,
            modulo: permiso.modulo || permiso.Modulo || null,
            activo: permiso.activo !== undefined ? permiso.activo : (permiso.Activo !== undefined ? permiso.Activo : true)
          };
        }
        // Si es un número (ID), crear un objeto mínimo
        // El backend debería poder buscar el permiso por idPermiso
        return {
          idPermiso: Number(permiso),
          nombre: null,
          descripcion: null,
          modulo: null,
          activo: true
        };
      });
      
      console.log(`🔐 Agregando ${dto.Permisos.length} permisos al DTO (formato objetos):`, dto.Permisos);
    } else {
      console.warn('⚠️ No se están enviando permisos (permisos es undefined o vacío)');
      dto.Permisos = []; // Enviar array vacío explícitamente
    }

    console.log(`📤 Enviando PUT a ${this.apiUrl}/${id} con DTO:`, JSON.stringify(dto, null, 2));

    return this.http.put<any>(`${this.apiUrl}/${id}`, dto).pipe(
      tap((response) => {
        console.log('🔔 Tap ejecutado - Respuesta del servidor:', response);
      }),
      map((response) => {
        console.log('✅ Map ejecutado - Respuesta del servidor al actualizar usuario:', response);
        // Si la respuesta es null o undefined, aún consideramos éxito si no hay error HTTP
        // Muchos backends devuelven null en PUT exitosos
        return true;
      }),
      catchError(error => {
        console.error('❌ Error updating usuario:', error);
        console.error('Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          url: `${this.apiUrl}/${id}`,
          body: dto
        });
        // Lanzar el error para que el componente pueda manejarlo
        throw error;
      })
    );
  }

  delete(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting usuario:', error);
        return of(false);
      })
    );
  }

  // Roles
  listRoles(): Observable<Rol[]> {
    return this.http.get<any>(`${environment.apiUrl}/roles`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({
          id: item.idRol || item.IdRol || item.id || item.Id || 0,
          nombre: item.nombre || item.Nombre || '',
          descripcion: item.descripcion || item.Descripcion
        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching roles:', error);
        return of([]);
      })
    );
  }

  // Permisos
  listPermisos(): Observable<Permiso[]> {
    return this.http.get<any>(`${environment.apiUrl}/permisos`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({
          id: item.idPermiso || item.IdPermiso || item.id || item.Id || 0,
          nombre: item.nombre || item.Nombre || '',
          descripcion: item.descripcion || item.Descripcion
        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching permisos:', error);
        return of([]);
      })
    );
  }

  private mapUsuario(item: any): Usuario {
    const idUsuario: number = Number(item.IdUsuario ?? item.idUsuario ?? item.id ?? item.Id ?? 0);
    const id: number = idUsuario > 0 ? idUsuario : 0;
    
    // Obtener permisos del rol (array de strings)
    const permisosRol: string[] = Array.isArray(item.Permisos ?? item.permisos) 
      ? (item.Permisos ?? item.permisos) 
      : [];
    
    // Obtener permisos personalizados (array de objetos)
    const permisosPersonalizados = Array.isArray(item.PermisosPersonalizados ?? item.permisosPersonalizados)
      ? (item.PermisosPersonalizados ?? item.permisosPersonalizados).map((p: any) => ({
          idPermiso: p.IdPermiso ?? p.idPermiso ?? p.Id ?? p.id ?? 0,
          nombre: p.Nombre ?? p.nombre ?? '',
          descripcion: p.Descripcion ?? p.descripcion ?? null,
          modulo: p.Modulo ?? p.modulo ?? null,
          activo: p.Activo !== undefined ? p.Activo : (p.activo !== undefined ? p.activo : true)
        }))
      : [];
    
    // Combinar permisos del rol con nombres de permisos personalizados para mostrar en la lista
    const nombresPermisosPersonalizados = permisosPersonalizados.map((p: Permiso) => p.nombre);
    const todosLosPermisos = [...permisosRol, ...nombresPermisosPersonalizados];
    
    return {
      idUsuario: id,
      id: id, // Alias
      nombreCompleto: item.NombreCompleto ?? item.nombreCompleto ?? '',
      correo: item.Correo ?? item.correo ?? '',
      rolNombre: item.RolNombre ?? item.rolNombre ?? 'Sin rol',
      permisos: todosLosPermisos, // Combinar permisos del rol y personalizados
      permisosPersonalizados: permisosPersonalizados.length > 0 ? permisosPersonalizados : undefined,
      activo: item.Activo !== undefined ? item.Activo : (item.activo !== undefined ? item.activo : true),
      departamentoId: item.DepartamentoId ?? item.departamentoId
    };
  }
}
