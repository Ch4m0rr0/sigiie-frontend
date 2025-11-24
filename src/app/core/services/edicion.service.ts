import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Edicion } from '../models/edicion';

export interface EdicionCreate {
  idActividad: number;
  anio: number;
  fechaInicio: string; // DateOnly: YYYY-MM-DD
  fechaFin: string; // DateOnly: YYYY-MM-DD
  cupos?: number;
  categoriaActividadId?: number;
  lugar?: string;
}

export interface EdicionUpdate {
  idActividad?: number;
  anio?: number;
  fechaInicio?: string; // DateOnly: YYYY-MM-DD
  fechaFin?: string; // DateOnly: YYYY-MM-DD
  cupos?: number;
  categoriaActividadId?: number;
  lugar?: string;
}

@Injectable({ providedIn: 'root' })
export class EdicionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/EdicionesActividad`;

  /**
   * Obtiene todas las ediciones
   */
  getAll(): Observable<Edicion[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapEdicion(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching ediciones:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene una edición por ID
   */
  getById(id: number): Observable<Edicion | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        const item = response.data || response;
        return item ? this.mapEdicion(item) : null;
      }),
      catchError(error => {
        console.error(`Error fetching edicion ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Crea una nueva edición
   */
  create(data: EdicionCreate): Observable<Edicion> {
    const payload: any = {
      IdActividad: Number(data.idActividad),
      Anio: Number(data.anio),
      FechaInicio: data.fechaInicio,
      FechaFin: data.fechaFin
    };

    if (data.cupos !== undefined && data.cupos !== null) {
      payload.Cupos = Number(data.cupos);
    }
    if (data.categoriaActividadId !== undefined && data.categoriaActividadId !== null) {
      payload.CategoriaActividadId = Number(data.categoriaActividadId);
    }
    if (data.lugar && data.lugar.trim()) {
      payload.Lugar = data.lugar.trim();
    }

    console.log('🔄 CREATE Edicion - Payload enviado:', JSON.stringify(payload, null, 2));
    console.log('🔄 CREATE Edicion - URL:', this.apiUrl);

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(response => {
        const item = response.data || response;
        if (!item) {
          throw new Error('No se recibió respuesta del servidor');
        }
        console.log('✅ CREATE Edicion - Respuesta recibida:', item);
        return this.mapEdicion(item);
      }),
      catchError(error => {
        console.error('❌ Error creating edicion:', error);
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
   * Actualiza una edición existente
   */
  update(id: number, data: EdicionUpdate): Observable<Edicion> {
    const payload: any = {};

    if (data.idActividad !== undefined) {
      payload.IdActividad = Number(data.idActividad);
    }
    if (data.anio !== undefined) {
      payload.Anio = Number(data.anio);
    }
    if (data.fechaInicio !== undefined) {
      payload.FechaInicio = data.fechaInicio;
    }
    if (data.fechaFin !== undefined) {
      payload.FechaFin = data.fechaFin;
    }
    if (data.cupos !== undefined) {
      payload.Cupos = data.cupos !== null ? Number(data.cupos) : null;
    }
    if (data.categoriaActividadId !== undefined) {
      payload.CategoriaActividadId = data.categoriaActividadId !== null ? Number(data.categoriaActividadId) : null;
    }
    if (data.lugar !== undefined) {
      payload.Lugar = data.lugar && data.lugar.trim() ? data.lugar.trim() : null;
    }

    console.log('🔄 UPDATE Edicion - Payload enviado:', JSON.stringify(payload, null, 2));
    console.log('🔄 UPDATE Edicion - URL:', `${this.apiUrl}/${id}`);

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(response => {
        const item = response.data || response;
        if (!item) {
          throw new Error('No se recibió respuesta del servidor');
        }
        console.log('✅ UPDATE Edicion - Respuesta recibida:', item);
        return this.mapEdicion(item);
      }),
      catchError(error => {
        console.error('❌ Error updating edicion:', error);
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
   * Elimina una edición
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
      map(response => {
        // 204 No Content o 200 OK
        return response.status === 204 || response.status === 200;
      }),
      catchError(error => {
        console.error(`❌ Error deleting edicion ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Mapea una respuesta del backend a la interfaz Edicion
   */
  private mapEdicion(item: any): Edicion {
    const formatDate = (date: any): string => {
      if (!date) return '';
      if (typeof date === 'string') {
        // Si ya es string, retornarlo (puede ser YYYY-MM-DD)
        return date.split('T')[0]; // Asegurar formato YYYY-MM-DD
      }
      // Si es Date, convertir a YYYY-MM-DD
      return new Date(date).toISOString().split('T')[0];
    };

    return {
      id: item.IdEdicion || item.idEdicion || item.id || 0,
      idEdicion: item.IdEdicion || item.idEdicion || item.id || 0,
      idActividad: item.IdActividad || item.idActividad || 0,
      actividadId: item.IdActividad || item.idActividad || 0,
      nombreActividad: item.NombreActividad || item.nombreActividad,
      anio: item.Anio || item.anio || 0,
      año: item.Anio || item.anio || 0,
      fechaInicio: formatDate(item.FechaInicio || item.fechaInicio),
      fechaFin: formatDate(item.FechaFin || item.fechaFin),
      cupos: item.Cupos !== undefined ? item.Cupos : (item.cupos !== undefined ? item.cupos : undefined),
      idCategoriaActividad: item.IdCategoriaActividad || item.idCategoriaActividad || item.CategoriaActividadId || item.categoriaActividadId,
      categoria: item.Categoria || item.categoria,
      lugar: item.Lugar || item.lugar,
      creadoPor: item.CreadoPor || item.creadoPor,
      fechaCreacion: item.FechaCreacion || item.fechaCreacion,
      fechaModificacion: item.FechaModificacion || item.fechaModificacion
    };
  }
}

