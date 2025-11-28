import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { ActividadAnual, ActividadAnualCreate, ActividadAnualUpdate, ActividadAnualFilterDto } from '../models/actividad-anual';

@Injectable({ providedIn: 'root' })
export class ActividadAnualService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/actividades-anuales`;

  getAll(filters?: ActividadAnualFilterDto): Observable<ActividadAnual[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.idIndicador !== undefined) {
        params = params.set('IdIndicador', filters.idIndicador.toString());
      }
      if (filters.anio !== undefined) {
        params = params.set('Anio', filters.anio.toString());
      }
      if (filters.activo !== undefined) {
        params = params.set('Activo', filters.activo.toString());
      }
    }

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapActividadAnual(item)) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/actividades-anuales no encontrado (404)');
          return of([]);
        } else {
          console.error('❌ Error fetching actividades anuales:', error);
          return of([]);
        }
      })
    );
  }

  getById(id: number): Observable<ActividadAnual | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        const item = response.data || response;
        if (!item) return null;
        return this.mapActividadAnual(item);
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ ActividadAnual no encontrada (404)');
          return of(null);
        }
        console.error('❌ Error fetching actividad anual:', error);
        throw error;
      })
    );
  }

  create(data: ActividadAnualCreate): Observable<ActividadAnual> {
    // Validar y asegurar que anio siempre tenga un valor válido
    const currentYear = new Date().getFullYear();
    let anioValue: number;
    if (data.anio === null || data.anio === undefined || data.anio === 0) {
      anioValue = currentYear;
    } else {
      anioValue = Number(data.anio);
      // Si la conversión falla o es NaN, usar el año actual
      if (isNaN(anioValue) || anioValue < 2000 || anioValue > 2100) {
        anioValue = currentYear;
      }
    }

    // Convertir a PascalCase para el backend
    const payload: any = {
      IdIndicador: Number(data.idIndicador), // Asegurar que sea número
      Anio: anioValue, // Asegurar que siempre sea un número válido
      Activo: data.activo !== undefined ? data.activo : true
    };
    
    // Agregar campos opcionales solo si están presentes
    if (data.nombre !== undefined && data.nombre !== null && data.nombre.trim() !== '') {
      payload.Nombre = data.nombre.trim();
    }
    if (data.descripcion !== undefined && data.descripcion !== null && data.descripcion.trim() !== '') {
      payload.Descripcion = data.descripcion.trim();
    }
    if (data.metaAnual !== undefined && data.metaAnual !== null) payload.MetaAnual = data.metaAnual;
    if (data.metaAlcanzada !== undefined && data.metaAlcanzada !== null) payload.MetaAlcanzada = data.metaAlcanzada;
    if (data.porcentajeCumplimiento !== undefined && data.porcentajeCumplimiento !== null) payload.PorcentajeCumplimiento = data.porcentajeCumplimiento;
    if (data.valoracionCualitativa !== undefined && data.valoracionCualitativa !== null && data.valoracionCualitativa.trim() !== '') {
      payload.ValoracionCualitativa = data.valoracionCualitativa.trim();
    }
    if (data.brechas !== undefined && data.brechas !== null && data.brechas.trim() !== '') {
      payload.Brechas = data.brechas.trim();
    }
    if (data.evidenciaResumen !== undefined && data.evidenciaResumen !== null && data.evidenciaResumen.trim() !== '') {
      payload.EvidenciaResumen = data.evidenciaResumen.trim();
    }

    console.log('🔄 CREATE ActividadAnual - Payload enviado:', JSON.stringify(payload, null, 2));
    console.log('🔄 CREATE ActividadAnual - URL:', this.apiUrl);

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(response => {
        const item = response.data || response;
        if (!item) {
          throw new Error('No se recibió respuesta del servidor');
        }
        console.log('✅ CREATE ActividadAnual - Respuesta recibida:', item);
        return this.mapActividadAnual(item);
      }),
      catchError(error => {
        console.error('❌ Error creating actividad anual:', error);
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

  update(id: number, data: ActividadAnualUpdate): Observable<ActividadAnual> {
    // Convertir a PascalCase para el backend
    const payload: any = {};
    if (data.idIndicador !== undefined) payload.IdIndicador = data.idIndicador;
    if (data.anio !== undefined) payload.Anio = data.anio;
    if (data.nombre !== undefined) payload.Nombre = data.nombre;
    if (data.descripcion !== undefined) payload.Descripcion = data.descripcion;
    if (data.metaAnual !== undefined) payload.MetaAnual = data.metaAnual;
    if (data.metaAlcanzada !== undefined) payload.MetaAlcanzada = data.metaAlcanzada;
    if (data.porcentajeCumplimiento !== undefined) payload.PorcentajeCumplimiento = data.porcentajeCumplimiento;
    if (data.valoracionCualitativa !== undefined) payload.ValoracionCualitativa = data.valoracionCualitativa;
    if (data.brechas !== undefined) payload.Brechas = data.brechas;
    if (data.evidenciaResumen !== undefined) payload.EvidenciaResumen = data.evidenciaResumen;
    if (data.activo !== undefined) payload.Activo = data.activo;

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(response => {
        const item = response.data || response;
        if (!item) {
          // Si la respuesta es null, devolver un objeto con los datos originales
          return {
            idActividadAnual: id,
            idIndicador: data.idIndicador || 0,
            anio: data.anio || 0,
            metaAnual: data.metaAnual,
            metaAlcanzada: data.metaAlcanzada,
            porcentajeCumplimiento: data.porcentajeCumplimiento,
            valoracionCualitativa: data.valoracionCualitativa,
            brechas: data.brechas,
            evidenciaResumen: data.evidenciaResumen,
            activo: data.activo !== undefined ? data.activo : true
          } as ActividadAnual;
        }
        return this.mapActividadAnual(item);
      }),
      catchError(error => {
        console.error('❌ Error updating actividad anual:', error);
        throw error;
      })
    );
  }

  delete(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('❌ Error deleting actividad anual:', error);
        throw error;
      })
    );
  }

  getByIndicador(idIndicador: number): Observable<ActividadAnual[]> {
    return this.getAll({ idIndicador });
  }

  getByAnio(anio: number): Observable<ActividadAnual[]> {
    return this.getAll({ anio });
  }

  private mapActividadAnual(item: any): ActividadAnual {
    return {
      idActividadAnual: item.idActividadAnual || item.IdActividadAnual || item.Id || item.id || 0,
      idIndicador: item.idIndicador || item.IdIndicador || 0,
      nombreIndicador: item.nombreIndicador || item.NombreIndicador,
      codigoIndicador: item.codigoIndicador || item.CodigoIndicador,
      nombre: item.nombre || item.Nombre, // Campo de la tabla SQL
      descripcion: item.descripcion || item.Descripcion, // Campo de la tabla SQL
      anio: item.anio || item.Anio || 0,
      metaAnual: item.metaAnual !== undefined ? item.metaAnual : (item.MetaAnual !== undefined ? item.MetaAnual : undefined),
      metaAlcanzada: item.metaAlcanzada !== undefined ? item.metaAlcanzada : (item.MetaAlcanzada !== undefined ? item.MetaAlcanzada : undefined),
      porcentajeCumplimiento: item.porcentajeCumplimiento !== undefined ? item.porcentajeCumplimiento : (item.PorcentajeCumplimiento !== undefined ? item.PorcentajeCumplimiento : undefined),
      valoracionCualitativa: item.valoracionCualitativa || item.ValoracionCualitativa,
      brechas: item.brechas || item.Brechas,
      evidenciaResumen: item.evidenciaResumen || item.EvidenciaResumen,
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      creadoPor: item.creadoPor || item.CreadoPor, // Campo de la tabla SQL
      fechaCreacion: item.fechaCreacion || item.FechaCreacion,
      fechaModificacion: item.fechaModificacion || item.FechaModificacion
    };
  }
}

