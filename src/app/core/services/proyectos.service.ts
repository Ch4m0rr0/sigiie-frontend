import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Proyecto {
  id: number;
  nombre: string;
  estado: string;
  // Agregar otros campos según backend
}

@Injectable({ providedIn: 'root' })
export class ProyectosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/proyectos`;

  list(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(this.apiUrl);
  }

  get(id: number): Observable<Proyecto> {
    return this.http.get<Proyecto>(`${this.apiUrl}/${id}`);
  }

  create(proyecto: Omit<Proyecto, 'id'>): Observable<Proyecto> {
    return this.http.post<Proyecto>(this.apiUrl, proyecto);
  }

  update(id: number, proyecto: Partial<Proyecto>): Observable<Proyecto> {
    return this.http.put<Proyecto>(`${this.apiUrl}/${id}`, proyecto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
