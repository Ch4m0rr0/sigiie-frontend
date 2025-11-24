import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Subactividad, SubactividadCreate } from '../models/subactividad';

@Injectable({ providedIn: 'root' })
export class SubactividadService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/subactividades`;

  getAll(): Observable<Subactividad[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividad(item)) : [];
      }),
      catchError(error => {
        // Silenciar errores 404 si el endpoint no existe aún
        if (error.status !== 404) {
          console.error('Error fetching subactividades:', error);
        }
        return of([]);
      })
    );
  }

  getById(id: number): Observable<Subactividad> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapSubactividad(item))
    );
  }

  create(data: SubactividadCreate): Observable<Subactividad> {
    return this.http.post<any>(this.apiUrl, data).pipe(
      map(item => this.mapSubactividad(item))
    );
  }

  update(id: number, data: Partial<SubactividadCreate>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getByActividad(actividadId: number): Observable<Subactividad[]> {
    return this.http.get<any>(`${this.apiUrl}/por-actividad/${actividadId}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividad(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching subactividades por actividad:', error);
        return of([]);
      })
    );
  }

  getByTipo(tipoId: number): Observable<Subactividad[]> {
    const params = new HttpParams().set('tipoId', tipoId.toString());
    return this.http.get<any>(`${this.apiUrl}/por-tipo`, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividad(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching subactividades por tipo:', error);
        return of([]);
      })
    );
  }

  getResumen(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/resumen`);
  }

  duplicar(id: number): Observable<Subactividad> {
    return this.http.post<any>(`${this.apiUrl}/duplicar/${id}`, {}).pipe(
      map(item => this.mapSubactividad(item))
    );
  }

  private mapSubactividad(item: any): Subactividad {
    return {
      idSubactividad: item.idSubactividad || item.IdSubactividad || item.id,
      idActividad: item.idActividad || item.IdActividad,
      nombreActividad: item.nombreActividad || item.NombreActividad,
      nombre: item.nombre || item.Nombre,
      descripcion: item.descripcion || item.Descripcion,
      idTipoSubactividad: item.idTipoSubactividad || item.IdTipoSubactividad,
      nombreTipoSubactividad: item.nombreTipoSubactividad || item.NombreTipoSubactividad,
      fechaInicio: item.fechaInicio || item.FechaInicio,
      fechaFin: item.fechaFin || item.FechaFin,
      departamentoResponsableId: item.departamentoResponsableId || item.DepartamentoResponsableId,
      nombreDepartamentoResponsable: item.nombreDepartamentoResponsable || item.NombreDepartamentoResponsable,
      ubicacion: item.ubicacion || item.Ubicacion,
      modalidad: item.modalidad || item.Modalidad,
      organizador: item.organizador || item.Organizador,
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      fechaCreacion: item.fechaCreacion || item.FechaCreacion || new Date().toISOString(),
      fechaModificacion: item.fechaModificacion || item.FechaModificacion
    };
  }
}

