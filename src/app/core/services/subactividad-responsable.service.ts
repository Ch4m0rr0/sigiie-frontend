import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SubactividadResponsable {
  idSubactividadResponsable: number;
  idSubactividad: number;
  idDocente?: number;
  idAdministrativo?: number;
  nombreDocente?: string;
  nombreAdministrativo?: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion?: string;
}

export interface SubactividadResponsableCreate {
  idSubactividad: number;
  idDocente?: number;
  idAdministrativo?: number;
  activo?: boolean;
}

export interface SubactividadResponsableUpdate extends Partial<SubactividadResponsableCreate> {}

@Injectable({ providedIn: 'root' })
export class SubactividadResponsableService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/SubactividadResponsable`;

  // GET /api/SubactividadResponsable
  getAll(): Observable<SubactividadResponsable[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividadResponsable(item)) : [];
      }),
      catchError(error => {
        if (error.status !== 404) {
          console.error('Error fetching subactividad responsables:', error);
        }
        return of([]);
      })
    );
  }

  // GET /api/SubactividadResponsable/{id}
  getById(id: number): Observable<SubactividadResponsable> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapSubactividadResponsable(item)),
      catchError(error => {
        console.error('Error fetching subactividad responsable:', error);
        throw error;
      })
    );
  }

  // GET /api/SubactividadResponsable/subactividad/{idSubactividad}
  getBySubactividad(idSubactividad: number): Observable<SubactividadResponsable[]> {
    return this.http.get<any>(`${this.apiUrl}/subactividad/${idSubactividad}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividadResponsable(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching responsables por subactividad:', error);
        return of([]);
      })
    );
  }

  // GET /api/SubactividadResponsable/filtrar
  filtrar(filters: any): Observable<SubactividadResponsable[]> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });

    return this.http.get<any>(`${this.apiUrl}/filtrar`, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividadResponsable(item)) : [];
      }),
      catchError(error => {
        console.error('Error filtrando responsables:', error);
        return of([]);
      })
    );
  }

  // POST /api/SubactividadResponsable
  create(data: SubactividadResponsableCreate): Observable<SubactividadResponsable> {
    const dto: any = {
      IdSubactividad: data.idSubactividad,
      IdDocente: data.idDocente || null,
      IdAdministrativo: data.idAdministrativo || null,
      Activo: data.activo !== undefined ? data.activo : true
    };

    // Remover campos null
    Object.keys(dto).forEach(key => {
      if (dto[key] === null && key !== 'Activo') {
        delete dto[key];
      }
    });

    console.log('🔄 POST SubactividadResponsable - DTO:', dto);

    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(item => this.mapSubactividadResponsable(item)),
      catchError(error => {
        console.error('❌ Error creating subactividad responsable:', error);
        throw error;
      })
    );
  }

  // PUT /api/SubactividadResponsable/{id}
  update(id: number, data: SubactividadResponsableUpdate): Observable<SubactividadResponsable> {
    const dto: any = {};
    
    if (data.idSubactividad !== undefined) dto.IdSubactividad = data.idSubactividad;
    if (data.idDocente !== undefined) dto.IdDocente = data.idDocente;
    if (data.idAdministrativo !== undefined) dto.IdAdministrativo = data.idAdministrativo;
    if (data.activo !== undefined) dto.Activo = data.activo;

    // Remover campos null
    Object.keys(dto).forEach(key => {
      if (dto[key] === null && key !== 'Activo') {
        delete dto[key];
      }
    });

    console.log('🔄 PUT SubactividadResponsable - ID:', id, 'DTO:', dto);

    return this.http.put<any>(`${this.apiUrl}/${id}`, dto).pipe(
      map(item => this.mapSubactividadResponsable(item)),
      catchError(error => {
        console.error('❌ Error updating subactividad responsable:', error);
        throw error;
      })
    );
  }

  // DELETE /api/SubactividadResponsable/{id}
  delete(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('❌ Error deleting subactividad responsable:', error);
        throw error;
      })
    );
  }

  private mapSubactividadResponsable(item: any): SubactividadResponsable {
    return {
      idSubactividadResponsable: item.idSubactividadResponsable || item.IdSubactividadResponsable || item.id || 0,
      idSubactividad: item.idSubactividad || item.IdSubactividad || 0,
      idDocente: item.idDocente || item.IdDocente,
      idAdministrativo: item.idAdministrativo || item.IdAdministrativo,
      nombreDocente: item.nombreDocente || item.NombreDocente,
      nombreAdministrativo: item.nombreAdministrativo || item.NombreAdministrativo,
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      fechaCreacion: item.fechaCreacion || item.FechaCreacion || new Date().toISOString(),
      fechaModificacion: item.fechaModificacion || item.FechaModificacion
    };
  }
}

