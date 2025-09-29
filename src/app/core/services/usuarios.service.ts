import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Usuario } from '../models/usuario';
import type { Rol } from '../models/rol';
import type { Permiso } from '../models/permiso';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/usuarios`;

  // Usuarios
  list(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  get(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  create(usuario: Omit<Usuario, 'id'>): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, usuario);
  }

  update(id: number, usuario: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, usuario);
  }

  updateEstado(id: number, estado: { activo: boolean }): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.apiUrl}/${id}/estado`, estado);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Roles
  listRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${environment.apiUrl}/roles`);
  }

  // Permisos
  listPermisos(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${environment.apiUrl}/permisos`);
  }
}
