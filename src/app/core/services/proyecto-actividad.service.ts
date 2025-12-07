import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Actividad } from '../models/actividad';

export interface ProyectoActividad {
  idProyecto: number;
  idActividad: number;
  esSubactividad: boolean;
  idSubactividad?: number;
  tipoRelacion?: string;
  comentario?: string;
}

export interface ProyectoActividadCreate {
  idProyecto: number;
  idActividad: number;
  esSubactividad?: boolean;
  idSubactividad?: number;
  tipoRelacion?: string;
  comentario?: string;
}

@Injectable({ providedIn: 'root' })
export class ProyectoActividadService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/proyecto-actividad`;

  /**
   * Obtiene todas las relaciones proyecto-actividad
   */
  getAll(): Observable<ProyectoActividad[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapProyectoActividad(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching proyecto-actividad:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene actividades asociadas a un proyecto
   * GET /api/proyecto-actividad/proyecto/{idProyecto}
   */
  getActividadesByProyecto(idProyecto: number): Observable<Actividad[]> {
    return this.http.get<any>(`${this.apiUrl}/proyecto/${idProyecto}`).pipe(
      map(response => {
        const items = response.data || response;
        if (!Array.isArray(items)) return [];
        
        // Si los items tienen la estructura de Actividad, mapearlos
        return items.map((item: any) => {
          // Si ya viene como Actividad, retornarlo directamente
          if (item.idActividad || item.id) {
            return {
              id: item.idActividad || item.id || item.IdActividad || item.Id,
              idActividad: item.idActividad || item.id || item.IdActividad || item.Id,
              nombre: item.nombreActividad || item.nombre || item.NombreActividad || item.Nombre || '',
              nombreActividad: item.nombreActividad || item.nombre || item.NombreActividad || item.Nombre || '',
              descripcion: item.descripcion || item.Descripcion,
              fechaInicio: item.fechaInicio || item.FechaInicio,
              fechaFin: item.fechaFin || item.FechaFin,
              idEstadoActividad: item.idEstadoActividad || item.IdEstadoActividad,
              nombreEstadoActividad: item.nombreEstadoActividad || item.NombreEstadoActividad,
              departamentoId: item.departamentoId || item.DepartamentoId,
              nombreDepartamento: item.nombreDepartamento || item.NombreDepartamento,
              nivelActividad: item.nivelActividad || item.NivelActividad || 1,
              totalSubactividades: item.totalSubactividades || item.TotalSubactividades || 0,
              totalEvidencias: item.totalEvidencias || item.TotalEvidencias || 0,
              totalResponsables: item.totalResponsables || item.TotalResponsables || 0,
              totalEdiciones: item.totalEdiciones || item.TotalEdiciones || 0,
              creadoPor: item.creadoPor || item.CreadoPor || 0,
              fechaCreacion: item.fechaCreacion || item.FechaCreacion || '',
              fechaModificacion: item.fechaModificacion || item.FechaModificacion
            } as Actividad;
          }
          return item;
        });
      }),
      catchError(error => {
        console.error('Error fetching actividades by proyecto:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene proyectos asociados a una actividad
   * GET /api/proyecto-actividad/actividad/{idActividad}
   */
  getProyectosByActividad(idActividad: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/actividad/${idActividad}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items : [];
      }),
      catchError(error => {
        console.error('Error fetching proyectos by actividad:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene una relación específica
   * GET /api/proyecto-actividad/proyecto/{idProyecto}/actividad/{idActividad}
   */
  getRelacion(idProyecto: number, idActividad: number): Observable<ProyectoActividad | null> {
    return this.http.get<any>(`${this.apiUrl}/proyecto/${idProyecto}/actividad/${idActividad}`).pipe(
      map(response => {
        const item = response.data || response;
        return item ? this.mapProyectoActividad(item) : null;
      }),
      catchError(error => {
        console.error('Error fetching relacion:', error);
        return of(null);
      })
    );
  }

  /**
   * Crea una nueva relación proyecto-actividad
   * POST /api/proyecto-actividad
   */
  create(data: ProyectoActividadCreate): Observable<ProyectoActividad> {
    const payload = {
      IdProyecto: data.idProyecto,
      IdActividad: data.idActividad,
      EsSubactividad: data.esSubactividad || false,
      IdSubactividad: data.idSubactividad || null,
      TipoRelacion: data.tipoRelacion || null,
      Comentario: data.comentario || null
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapProyectoActividad(item);
      }),
      catchError(error => {
        console.error('Error creating proyecto-actividad:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza una relación proyecto-actividad
   * PUT /api/proyecto-actividad/proyecto/{idProyecto}/actividad/{idActividad}
   */
  update(idProyecto: number, idActividad: number, data: Partial<ProyectoActividadCreate>): Observable<ProyectoActividad> {
    const payload: any = {};
    if (data.tipoRelacion !== undefined) payload.TipoRelacion = data.tipoRelacion;
    if (data.comentario !== undefined) payload.Comentario = data.comentario;
    if (data.esSubactividad !== undefined) payload.EsSubactividad = data.esSubactividad;
    if (data.idSubactividad !== undefined) payload.IdSubactividad = data.idSubactividad;

    return this.http.put<any>(`${this.apiUrl}/proyecto/${idProyecto}/actividad/${idActividad}`, payload).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapProyectoActividad(item);
      }),
      catchError(error => {
        console.error('Error updating proyecto-actividad:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina una relación proyecto-actividad
   * DELETE /api/proyecto-actividad/proyecto/{idProyecto}/actividad/{idActividad}
   */
  delete(idProyecto: number, idActividad: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/proyecto/${idProyecto}/actividad/${idActividad}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting proyecto-actividad:', error);
        return of(false);
      })
    );
  }

  /**
   * Filtra relaciones proyecto-actividad
   * GET /api/proyecto-actividad/filtrar
   */
  filtrar(filtros: any): Observable<ProyectoActividad[]> {
    return this.http.get<any>(`${this.apiUrl}/filtrar`, { params: filtros }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapProyectoActividad(item)) : [];
      }),
      catchError(error => {
        console.error('Error filtering proyecto-actividad:', error);
        return of([]);
      })
    );
  }

  private mapProyectoActividad(item: any): ProyectoActividad {
    return {
      idProyecto: item.IdProyecto || item.idProyecto || 0,
      idActividad: item.IdActividad || item.idActividad || 0,
      esSubactividad: item.EsSubactividad || item.esSubactividad || false,
      idSubactividad: item.IdSubactividad || item.idSubactividad,
      tipoRelacion: item.TipoRelacion || item.tipoRelacion,
      comentario: item.Comentario || item.comentario
    };
  }
}

