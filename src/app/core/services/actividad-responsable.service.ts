import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { ActividadResponsable } from '../models/actividad-responsable';

export interface ActividadResponsableCreate {
  idActividad: number;
  idUsuario?: number;
  idTipoResponsable: number;
  departamentoId?: number;
  fechaAsignacion?: string; // DateOnly: YYYY-MM-DD
  rolResponsable?: string;
  rolResponsableDetalle?: string;
}

export interface ActividadResponsableUpdate {
  idActividad?: number;
  idUsuario?: number;
  idTipoResponsable?: number;
  departamentoId?: number;
  fechaAsignacion?: string; // DateOnly: YYYY-MM-DD
  rolResponsable?: string;
  rolResponsableDetalle?: string;
}

@Injectable({ providedIn: 'root' })
export class ActividadResponsableService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/actividad-responsable`;

  /**
   * Obtiene todos los responsables
   */
  getAll(): Observable<ActividadResponsable[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapActividadResponsable(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching responsables:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene un responsable por ID
   */
  getById(id: number): Observable<ActividadResponsable | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        const item = response.data || response;
        return item ? this.mapActividadResponsable(item) : null;
      }),
      catchError(error => {
        console.error(`Error fetching responsable ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Obtiene responsables por actividad
   */
  getByActividad(idActividad: number): Observable<ActividadResponsable[]> {
    return this.http.get<any>(`${this.apiUrl}/actividad/${idActividad}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapActividadResponsable(item)) : [];
      }),
      catchError(error => {
        console.error(`Error fetching responsables for actividad ${idActividad}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Crea un nuevo responsable
   */
  create(data: ActividadResponsableCreate): Observable<ActividadResponsable> {
    const payload: any = {
      IdActividad: Number(data.idActividad),
      IdTipoResponsable: Number(data.idTipoResponsable)
    };

    if (data.idUsuario !== undefined && data.idUsuario !== null) {
      payload.IdUsuario = Number(data.idUsuario);
    }
    if (data.departamentoId !== undefined && data.departamentoId !== null) {
      payload.DepartamentoId = Number(data.departamentoId);
    }
    if (data.fechaAsignacion && data.fechaAsignacion.trim()) {
      payload.FechaAsignacion = data.fechaAsignacion.trim();
    }
    if (data.rolResponsable && data.rolResponsable.trim()) {
      payload.RolResponsable = data.rolResponsable.trim();
    }
    if (data.rolResponsableDetalle && data.rolResponsableDetalle.trim()) {
      payload.RolResponsableDetalle = data.rolResponsableDetalle.trim();
    }

    console.log('🔄 CREATE ActividadResponsable - Payload enviado:', JSON.stringify(payload, null, 2));
    console.log('🔄 CREATE ActividadResponsable - URL:', this.apiUrl);

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(response => {
        const item = response.data || response;
        if (!item) {
          throw new Error('No se recibió respuesta del servidor');
        }
        console.log('✅ CREATE ActividadResponsable - Respuesta recibida:', item);
        return this.mapActividadResponsable(item);
      }),
      catchError(error => {
        console.error('❌ Error creating responsable:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        if (error.error) {
          console.error('❌ Error body:', error.error);
          if (error.error.errors) {
            console.error('❌ Validation errors:', error.error.errors);
          }
        }
        throw error;
      })
    );
  }

  /**
   * Actualiza un responsable existente
   */
  update(id: number, data: ActividadResponsableUpdate): Observable<ActividadResponsable> {
    const payload: any = {};

    if (data.idActividad !== undefined) {
      payload.IdActividad = Number(data.idActividad);
    }
    if (data.idUsuario !== undefined) {
      payload.IdUsuario = data.idUsuario !== null ? Number(data.idUsuario) : null;
    }
    if (data.idTipoResponsable !== undefined) {
      payload.IdTipoResponsable = data.idTipoResponsable !== null ? Number(data.idTipoResponsable) : null;
    }
    if (data.departamentoId !== undefined) {
      payload.DepartamentoId = data.departamentoId !== null ? Number(data.departamentoId) : null;
    }
    if (data.fechaAsignacion !== undefined) {
      payload.FechaAsignacion = data.fechaAsignacion && data.fechaAsignacion.trim() ? data.fechaAsignacion.trim() : null;
    }
    if (data.rolResponsable !== undefined) {
      payload.RolResponsable = data.rolResponsable && data.rolResponsable.trim() ? data.rolResponsable.trim() : null;
    }
    if (data.rolResponsableDetalle !== undefined) {
      payload.RolResponsableDetalle = data.rolResponsableDetalle && data.rolResponsableDetalle.trim() ? data.rolResponsableDetalle.trim() : null;
    }

    console.log('🔄 UPDATE ActividadResponsable - Payload enviado:', JSON.stringify(payload, null, 2));
    console.log('🔄 UPDATE ActividadResponsable - URL:', `${this.apiUrl}/${id}`);

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(response => {
        const item = response.data || response;
        if (!item) {
          throw new Error('No se recibió respuesta del servidor');
        }
        console.log('✅ UPDATE ActividadResponsable - Respuesta recibida:', item);
        return this.mapActividadResponsable(item);
      }),
      catchError(error => {
        console.error('❌ Error updating responsable:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        if (error.error) {
          console.error('❌ Error body:', error.error);
          if (error.error.errors) {
            console.error('❌ Validation errors:', error.error.errors);
          }
        }
        throw error;
      })
    );
  }

  /**
   * Elimina un responsable
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
      map(response => {
        // 204 No Content o 200 OK
        return response.status === 204 || response.status === 200;
      }),
      catchError(error => {
        console.error(`❌ Error deleting responsable ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Mapea una respuesta del backend a la interfaz ActividadResponsable
   */
  private mapActividadResponsable(item: any): ActividadResponsable {
    const formatDate = (date: any): string | undefined => {
      if (!date) return undefined;
      if (typeof date === 'string') {
        return date.split('T')[0]; // Asegurar formato YYYY-MM-DD
      }
      return new Date(date).toISOString().split('T')[0];
    };

    return {
      idActividadResponsable: item.IdActividadResponsable || item.idActividadResponsable || item.id || 0,
      idActividad: item.IdActividad || item.idActividad || 0,
      idUsuario: item.IdUsuario !== undefined ? item.IdUsuario : (item.idUsuario !== undefined ? item.idUsuario : undefined),
      idDocente: item.IdDocente !== undefined ? item.IdDocente : (item.idDocente !== undefined ? item.idDocente : undefined),
      idAdmin: item.IdAdmin !== undefined ? item.IdAdmin : (item.idAdmin !== undefined ? item.idAdmin : undefined),
      nombrePersona: item.NombreUsuario || item.nombreUsuario || item.NombreDocente || item.nombreDocente || item.NombreAdmin || item.nombreAdmin,
      idTipoResponsable: item.IdTipoResponsable || item.idTipoResponsable || 0,
      nombreTipoResponsable: item.NombreTipoResponsable || item.nombreTipoResponsable,
      departamentoId: item.DepartamentoId !== undefined ? item.DepartamentoId : (item.departamentoId !== undefined ? item.departamentoId : undefined),
      fechaAsignacion: formatDate(item.FechaAsignacion || item.fechaAsignacion),
      rolResponsable: item.RolResponsable || item.rolResponsable,
      rolResponsableDetalle: item.RolResponsableDetalle || item.rolResponsableDetalle
    };
  }
}

