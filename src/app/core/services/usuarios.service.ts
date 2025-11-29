import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapUsuario(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching usuarios:', error);
        return of([]);
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
    if (usuario.permisos && usuario.permisos.length > 0) {
      dto.Permisos = usuario.permisos;
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
    if (usuario.permisos !== undefined) {
      dto.Permisos = usuario.permisos;
    }

    return this.http.put<any>(`${this.apiUrl}/${id}`, dto).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating usuario:', error);
        return of(false);
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
    return {
      idUsuario: id,
      id: id, // Alias
      nombreCompleto: item.NombreCompleto ?? item.nombreCompleto ?? '',
      correo: item.Correo ?? item.correo ?? '',
      rolNombre: item.RolNombre ?? item.rolNombre ?? 'Sin rol',
      permisos: Array.isArray(item.Permisos ?? item.permisos) ? (item.Permisos ?? item.permisos) : [],
      activo: item.Activo !== undefined ? item.Activo : (item.activo !== undefined ? item.activo : true),
      departamentoId: item.DepartamentoId ?? item.departamentoId
    };
  }
}
