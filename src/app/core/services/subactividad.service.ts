import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Subactividad, SubactividadCreate, SubactividadUpdate, SubactividadFilterDto } from '../models/subactividad';

@Injectable({ providedIn: 'root' })
export class SubactividadService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/subactividades`;

  // GET /api/subactividades
  getAll(): Observable<Subactividad[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividad(item)) : [];
      }),
      catchError(error => {
        if (error.status !== 404) {
          console.error('Error fetching subactividades:', error);
        }
        return of([]);
      })
    );
  }

  // GET /api/subactividades/{id}
  getById(id: number): Observable<Subactividad> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapSubactividad(item)),
      catchError(error => {
        console.error('Error fetching subactividad:', error);
        throw error;
      })
    );
  }

  // POST /api/subactividades
  create(data: SubactividadCreate): Observable<Subactividad> {
    // Convertir a PascalCase para el backend
    const dto: any = {
      IdActividad: data.idActividad,
      Nombre: data.nombre,
      Descripcion: data.descripcion || null,
      IdTipoSubactividad: data.idTipoSubactividad || null,
      FechaInicio: data.fechaInicio || null,
      FechaFin: data.fechaFin || null,
      DepartamentoResponsableId: data.departamentoResponsableId || null,
      Ubicacion: data.ubicacion || null,
      Modalidad: data.modalidad || null,
      Organizador: data.organizador || null,
      Activo: data.activo !== undefined ? data.activo : true,
      IdCapacidadInstalada: data.idCapacidadInstalada || null,
      IdDocenteOrganizador: data.idDocenteOrganizador || null
    };

    // Remover campos null
    Object.keys(dto).forEach(key => {
      if (dto[key] === null && key !== 'Activo') {
        delete dto[key];
      }
    });

    console.log('🔄 POST Subactividad - DTO:', dto);

    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(item => this.mapSubactividad(item)),
      catchError(error => {
        console.error('❌ Error creating subactividad:', error);
        throw error;
      })
    );
  }

  // PUT /api/subactividades/{id}
  // El backend puede devolver:
  // - bool o null cuando la actualización es exitosa sin contenido
  // - un objeto con la subactividad actualizada
  update(id: number, data: SubactividadUpdate): Observable<Subactividad | null> {
    // Convertir a PascalCase para el backend
    const dto: any = {};
    
    if (data.idActividad !== undefined) dto.IdActividad = data.idActividad;
    if (data.nombre !== undefined) dto.Nombre = data.nombre;
    if (data.descripcion !== undefined) dto.Descripcion = data.descripcion;
    if (data.idTipoSubactividad !== undefined) dto.IdTipoSubactividad = data.idTipoSubactividad;
    if (data.fechaInicio !== undefined) dto.FechaInicio = data.fechaInicio;
    if (data.fechaFin !== undefined) dto.FechaFin = data.fechaFin;
    if (data.departamentoResponsableId !== undefined) dto.DepartamentoResponsableId = data.departamentoResponsableId;
    if (data.ubicacion !== undefined) dto.Ubicacion = data.ubicacion;
    if (data.modalidad !== undefined) dto.Modalidad = data.modalidad;
    if (data.organizador !== undefined) dto.Organizador = data.organizador;
    if (data.activo !== undefined) dto.Activo = data.activo;
    if (data.idCapacidadInstalada !== undefined) dto.IdCapacidadInstalada = data.idCapacidadInstalada;
    if (data.idDocenteOrganizador !== undefined) dto.IdDocenteOrganizador = data.idDocenteOrganizador;

    // Remover campos null
    Object.keys(dto).forEach(key => {
      if (dto[key] === null && key !== 'Activo') {
        delete dto[key];
      }
    });

    console.log('🔄 PUT Subactividad - ID:', id, 'DTO:', dto);

    return this.http.put<any>(`${this.apiUrl}/${id}`, dto).pipe(
      map(item => {
        // Si el backend devuelve bool, null o undefined, consideramos la operación exitosa sin datos
        if (item === null || item === undefined || typeof item === 'boolean') {
          return null;
        }

        const data = item.data || item;
        // Si tampoco hay data, devolvemos null
        if (!data) {
          return null;
        }

        // En caso de que venga un objeto subactividad, lo mapeamos normalmente
        return this.mapSubactividad(data);
      }),
      catchError(error => {
        console.error('❌ Error updating subactividad:', error);
        throw error;
      })
    );
  }

  // DELETE /api/subactividades/{id}
  delete(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('❌ Error deleting subactividad:', error);
        throw error;
      })
    );
  }

  // GET /api/subactividades/por-actividad/{idActividad}
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

  // GET /api/subactividades/buscar
  buscar(filters: SubactividadFilterDto): Observable<Subactividad[]> {
    let params = new HttpParams();
    
    if (filters.IdActividad !== undefined) {
      params = params.set('IdActividad', filters.IdActividad.toString());
    }
    if (filters.IdTipoSubactividad !== undefined) {
      params = params.set('IdTipoSubactividad', filters.IdTipoSubactividad.toString());
    }
    if (filters.DepartamentoResponsableId !== undefined) {
      params = params.set('DepartamentoResponsableId', filters.DepartamentoResponsableId.toString());
    }
    if (filters.BusquedaTexto) {
      params = params.set('BusquedaTexto', filters.BusquedaTexto);
    }
    if (filters.FechaInicioDesde) {
      params = params.set('FechaInicioDesde', filters.FechaInicioDesde);
    }
    if (filters.FechaInicioHasta) {
      params = params.set('FechaInicioHasta', filters.FechaInicioHasta);
    }
    if (filters.FechaFinDesde) {
      params = params.set('FechaFinDesde', filters.FechaFinDesde);
    }
    if (filters.FechaFinHasta) {
      params = params.set('FechaFinHasta', filters.FechaFinHasta);
    }
    if (filters.Activo !== undefined) {
      params = params.set('Activo', filters.Activo.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/buscar`, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividad(item)) : [];
      }),
      catchError(error => {
        console.error('Error searching subactividades:', error);
        return of([]);
      })
    );
  }

  // GET /api/subactividades/por-nombre
  getByNombre(nombre: string): Observable<Subactividad[]> {
    const params = new HttpParams().set('nombre', nombre);
    return this.http.get<any>(`${this.apiUrl}/por-nombre`, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividad(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching subactividades por nombre:', error);
        return of([]);
      })
    );
  }

  // GET /api/subactividades/por-departamento/{departamentoId}
  getByDepartamento(departamentoId: number): Observable<Subactividad[]> {
    return this.http.get<any>(`${this.apiUrl}/por-departamento/${departamentoId}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividad(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching subactividades por departamento:', error);
        return of([]);
      })
    );
  }

  // GET /api/subactividades/por-fechas
  getByFechas(fechaInicioDesde?: string, fechaInicioHasta?: string, fechaFinDesde?: string, fechaFinHasta?: string): Observable<Subactividad[]> {
    let params = new HttpParams();
    
    if (fechaInicioDesde) {
      params = params.set('FechaInicioDesde', fechaInicioDesde);
    }
    if (fechaInicioHasta) {
      params = params.set('FechaInicioHasta', fechaInicioHasta);
    }
    if (fechaFinDesde) {
      params = params.set('FechaFinDesde', fechaFinDesde);
    }
    if (fechaFinHasta) {
      params = params.set('FechaFinHasta', fechaFinHasta);
    }

    return this.http.get<any>(`${this.apiUrl}/por-fechas`, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividad(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching subactividades por fechas:', error);
        return of([]);
      })
    );
  }

  private mapSubactividad(item: any): Subactividad {
    return {
      idSubactividad: item.idSubactividad || item.IdSubactividad || item.id || 0,
      idActividad: item.idActividad || item.IdActividad || 0,
      nombreActividad: item.nombreActividad || item.NombreActividad,
      nombre: item.nombre || item.Nombre || '',
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
      creadoPor: item.creadoPor || item.CreadoPor || 0,
      fechaCreacion: item.fechaCreacion || item.FechaCreacion || new Date().toISOString(),
      fechaModificacion: item.fechaModificacion || item.FechaModificacion,
      idCapacidadInstalada: item.idCapacidadInstalada || item.IdCapacidadInstalada,
      idDocenteOrganizador: item.idDocenteOrganizador || item.IdDocenteOrganizador
    };
  }
}

