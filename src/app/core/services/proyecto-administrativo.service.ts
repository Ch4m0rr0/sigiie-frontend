import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ProyectoAdministrativo {
  idProyecto: number;
  idAdmin: number;
  rolEnProyecto?: string;
}

export interface ProyectoAdministrativoCreate {
  idProyecto: number;
  idAdmin: number;
  rolEnProyecto?: string;
}

@Injectable({ providedIn: 'root' })
export class ProyectoAdministrativoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/proyecto-administrativo`;

  /**
   * Obtiene todas las relaciones proyecto-administrativo
   */
  getAll(): Observable<ProyectoAdministrativo[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapProyectoAdministrativo(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching proyecto-administrativo:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene administrativos asociados a un proyecto
   * GET /api/proyecto-administrativo/proyecto/{idProyecto}
   */
  getAdministrativosByProyecto(idProyecto: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/proyecto/${idProyecto}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items : [];
      }),
      catchError(error => {
        console.error('Error fetching administrativos by proyecto:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene proyectos asociados a un administrativo
   * GET /api/proyecto-administrativo/administrativo/{idAdmin}
   */
  getProyectosByAdministrativo(idAdmin: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/administrativo/${idAdmin}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items : [];
      }),
      catchError(error => {
        console.error('Error fetching proyectos by administrativo:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene una relación específica
   * GET /api/proyecto-administrativo/proyecto/{idProyecto}/administrativo/{idAdmin}
   */
  getRelacion(idProyecto: number, idAdmin: number): Observable<ProyectoAdministrativo | null> {
    return this.http.get<any>(`${this.apiUrl}/proyecto/${idProyecto}/administrativo/${idAdmin}`).pipe(
      map(response => {
        const item = response.data || response;
        return item ? this.mapProyectoAdministrativo(item) : null;
      }),
      catchError(error => {
        console.error('Error fetching relacion:', error);
        return of(null);
      })
    );
  }

  /**
   * Crea una nueva relación proyecto-administrativo
   * POST /api/proyecto-administrativo
   */
  create(data: ProyectoAdministrativoCreate): Observable<ProyectoAdministrativo> {
    const payload = {
      IdProyecto: data.idProyecto,
      IdAdmin: data.idAdmin,
      RolEnProyecto: data.rolEnProyecto || null
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapProyectoAdministrativo(item);
      }),
      catchError(error => {
        console.error('Error creating proyecto-administrativo:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza una relación proyecto-administrativo
   * PUT /api/proyecto-administrativo/proyecto/{idProyecto}/administrativo/{idAdmin}
   */
  update(idProyecto: number, idAdmin: number, data: Partial<ProyectoAdministrativoCreate>): Observable<ProyectoAdministrativo> {
    const payload: any = {};
    if (data.rolEnProyecto !== undefined) payload.RolEnProyecto = data.rolEnProyecto;

    return this.http.put<any>(`${this.apiUrl}/proyecto/${idProyecto}/administrativo/${idAdmin}`, payload).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapProyectoAdministrativo(item);
      }),
      catchError(error => {
        console.error('Error updating proyecto-administrativo:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina una relación proyecto-administrativo
   * DELETE /api/proyecto-administrativo/proyecto/{idProyecto}/administrativo/{idAdmin}
   */
  delete(idProyecto: number, idAdmin: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/proyecto/${idProyecto}/administrativo/${idAdmin}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting proyecto-administrativo:', error);
        return of(false);
      })
    );
  }

  private mapProyectoAdministrativo(item: any): ProyectoAdministrativo {
    return {
      idProyecto: item.IdProyecto || item.idProyecto || 0,
      idAdmin: item.IdAdmin || item.idAdmin || 0,
      rolEnProyecto: item.RolEnProyecto || item.rolEnProyecto
    };
  }
}

