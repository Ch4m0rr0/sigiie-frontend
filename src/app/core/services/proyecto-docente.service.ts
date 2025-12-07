import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ProyectoDocente {
  idProyecto: number;
  idDocente: number;
  rolEnProyecto?: string;
}

export interface ProyectoDocenteCreate {
  idProyecto: number;
  idDocente: number;
  rolEnProyecto?: string;
}

@Injectable({ providedIn: 'root' })
export class ProyectoDocenteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/proyecto-docente`;

  /**
   * Obtiene todas las relaciones proyecto-docente
   */
  getAll(): Observable<ProyectoDocente[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapProyectoDocente(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching proyecto-docente:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene docentes asociados a un proyecto
   * GET /api/proyecto-docente/proyecto/{idProyecto}
   */
  getDocentesByProyecto(idProyecto: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/proyecto/${idProyecto}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items : [];
      }),
      catchError(error => {
        console.error('Error fetching docentes by proyecto:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene proyectos asociados a un docente
   * GET /api/proyecto-docente/docente/{idDocente}
   */
  getProyectosByDocente(idDocente: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/docente/${idDocente}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items : [];
      }),
      catchError(error => {
        console.error('Error fetching proyectos by docente:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene una relación específica
   * GET /api/proyecto-docente/proyecto/{idProyecto}/docente/{idDocente}
   */
  getRelacion(idProyecto: number, idDocente: number): Observable<ProyectoDocente | null> {
    return this.http.get<any>(`${this.apiUrl}/proyecto/${idProyecto}/docente/${idDocente}`).pipe(
      map(response => {
        const item = response.data || response;
        return item ? this.mapProyectoDocente(item) : null;
      }),
      catchError(error => {
        console.error('Error fetching relacion:', error);
        return of(null);
      })
    );
  }

  /**
   * Crea una nueva relación proyecto-docente
   * POST /api/proyecto-docente
   */
  create(data: ProyectoDocenteCreate): Observable<ProyectoDocente> {
    const payload = {
      IdProyecto: data.idProyecto,
      IdDocente: data.idDocente,
      RolEnProyecto: data.rolEnProyecto || null
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapProyectoDocente(item);
      }),
      catchError(error => {
        console.error('Error creating proyecto-docente:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza una relación proyecto-docente
   * PUT /api/proyecto-docente/proyecto/{idProyecto}/docente/{idDocente}
   */
  update(idProyecto: number, idDocente: number, data: Partial<ProyectoDocenteCreate>): Observable<ProyectoDocente> {
    const payload: any = {};
    if (data.rolEnProyecto !== undefined) payload.RolEnProyecto = data.rolEnProyecto;

    return this.http.put<any>(`${this.apiUrl}/proyecto/${idProyecto}/docente/${idDocente}`, payload).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapProyectoDocente(item);
      }),
      catchError(error => {
        console.error('Error updating proyecto-docente:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina una relación proyecto-docente
   * DELETE /api/proyecto-docente/proyecto/{idProyecto}/docente/{idDocente}
   */
  delete(idProyecto: number, idDocente: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/proyecto/${idProyecto}/docente/${idDocente}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting proyecto-docente:', error);
        return of(false);
      })
    );
  }

  private mapProyectoDocente(item: any): ProyectoDocente {
    return {
      idProyecto: item.IdProyecto || item.idProyecto || 0,
      idDocente: item.IdDocente || item.idDocente || 0,
      rolEnProyecto: item.RolEnProyecto || item.rolEnProyecto
    };
  }
}

