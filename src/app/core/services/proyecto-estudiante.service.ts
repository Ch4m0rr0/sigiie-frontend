import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ProyectoEstudiante {
  idProyecto: number;
  idEstudiante: number;
  rolEnProyecto?: string;
}

export interface ProyectoEstudianteCreate {
  idProyecto: number;
  idEstudiante: number;
  rolEnProyecto?: string;
}

@Injectable({ providedIn: 'root' })
export class ProyectoEstudianteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/proyecto-estudiante`;

  /**
   * Obtiene todas las relaciones proyecto-estudiante
   */
  getAll(): Observable<ProyectoEstudiante[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapProyectoEstudiante(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching proyecto-estudiante:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene estudiantes asociados a un proyecto
   * GET /api/proyecto-estudiante/proyecto/{idProyecto}
   */
  getEstudiantesByProyecto(idProyecto: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/proyecto/${idProyecto}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items : [];
      }),
      catchError(error => {
        console.error('Error fetching estudiantes by proyecto:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene proyectos asociados a un estudiante
   * GET /api/proyecto-estudiante/estudiante/{idEstudiante}
   */
  getProyectosByEstudiante(idEstudiante: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/estudiante/${idEstudiante}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items : [];
      }),
      catchError(error => {
        console.error('Error fetching proyectos by estudiante:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene una relación específica
   * GET /api/proyecto-estudiante/proyecto/{idProyecto}/estudiante/{idEstudiante}
   */
  getRelacion(idProyecto: number, idEstudiante: number): Observable<ProyectoEstudiante | null> {
    return this.http.get<any>(`${this.apiUrl}/proyecto/${idProyecto}/estudiante/${idEstudiante}`).pipe(
      map(response => {
        const item = response.data || response;
        return item ? this.mapProyectoEstudiante(item) : null;
      }),
      catchError(error => {
        console.error('Error fetching relacion:', error);
        return of(null);
      })
    );
  }

  /**
   * Crea una nueva relación proyecto-estudiante
   * POST /api/proyecto-estudiante
   */
  create(data: ProyectoEstudianteCreate): Observable<ProyectoEstudiante> {
    const payload = {
      IdProyecto: data.idProyecto,
      IdEstudiante: data.idEstudiante,
      RolEnProyecto: data.rolEnProyecto || null
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapProyectoEstudiante(item);
      }),
      catchError(error => {
        console.error('Error creating proyecto-estudiante:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza una relación proyecto-estudiante
   * PUT /api/proyecto-estudiante/proyecto/{idProyecto}/estudiante/{idEstudiante}
   */
  update(idProyecto: number, idEstudiante: number, data: Partial<ProyectoEstudianteCreate>): Observable<ProyectoEstudiante> {
    const payload: any = {};
    if (data.rolEnProyecto !== undefined) payload.RolEnProyecto = data.rolEnProyecto;

    return this.http.put<any>(`${this.apiUrl}/proyecto/${idProyecto}/estudiante/${idEstudiante}`, payload).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapProyectoEstudiante(item);
      }),
      catchError(error => {
        console.error('Error updating proyecto-estudiante:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina una relación proyecto-estudiante
   * DELETE /api/proyecto-estudiante/proyecto/{idProyecto}/estudiante/{idEstudiante}
   */
  delete(idProyecto: number, idEstudiante: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/proyecto/${idProyecto}/estudiante/${idEstudiante}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting proyecto-estudiante:', error);
        return of(false);
      })
    );
  }

  private mapProyectoEstudiante(item: any): ProyectoEstudiante {
    return {
      idProyecto: item.IdProyecto || item.idProyecto || 0,
      idEstudiante: item.IdEstudiante || item.idEstudiante || 0,
      rolEnProyecto: item.RolEnProyecto || item.rolEnProyecto
    };
  }
}

