import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Actividad } from '../models/actividad';
import type { Edicion } from '../models/edicion';
import type { Participacion } from '../models/participacion';

@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/actividades`;

  // Actividades
  list(): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(this.apiUrl);
  }

  get(id: number): Observable<Actividad> {
    return this.http.get<Actividad>(`${this.apiUrl}/${id}`);
  }

  create(actividad: Omit<Actividad, 'id'>): Observable<Actividad> {
    return this.http.post<Actividad>(this.apiUrl, actividad);
  }

  update(id: number, actividad: Partial<Actividad>): Observable<Actividad> {
    return this.http.put<Actividad>(`${this.apiUrl}/${id}`, actividad);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Ediciones
  createEdicion(id: number, edicion: Omit<Edicion, 'id'>): Observable<Edicion> {
    return this.http.post<Edicion>(`${this.apiUrl}/${id}/ediciones`, edicion);
  }

  // Participaciones
  createParticipacion(edicionId: number, participacion: Omit<Participacion, 'id'>): Observable<Participacion> {
    return this.http.post<Participacion>(`${environment.apiUrl}/ediciones/${edicionId}/participaciones`, participacion);
  }

  deleteParticipacion(edicionId: number, participacionId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/ediciones/${edicionId}/participaciones/${participacionId}`);
  }

  // Vista Participantes
  getParticipantesPorEdicion(edicionId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/ediciones/${edicionId}/participantes`);
  }
}
