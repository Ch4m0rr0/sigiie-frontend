import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Participacion, ParticipacionCreate } from '../models/participacion';

@Injectable({ providedIn: 'root' })
export class ParticipacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/participaciones`;

  /**
   * Obtiene todas las participaciones
   */
  getAll(): Observable<Participacion[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapParticipacion(item)) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/participaciones no encontrado (404)');
          return of([]);
        } else if (error.status === 500) {
          console.error('❌ Error 500 del servidor al obtener participaciones:', error);
          throw error;
        } else if (error.status === 401 || error.status === 403) {
          console.error('❌ Error de autenticación/autorización:', error);
          throw error;
        }
        console.error('❌ Error fetching participaciones:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene una participación por ID
   */
  getById(id: number): Observable<Participacion | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        const item = response.data || response;
        return item ? this.mapParticipacion(item) : null;
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn(`⚠️ Participación con ID ${id} no encontrada (404)`);
          return of(null);
        }
        console.error(`❌ Error al obtener participación ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Crea una nueva participación
   * El backend espera ParticipacionCreateDto con PascalCase
   */
  create(data: ParticipacionCreate): Observable<Participacion> {
    // Convertir a PascalCase para el backend
    const dto: any = {
      EdicionId: data.edicionId,
      IdSubactividad: data.idSubactividad,
      GrupoNumero: data.grupoNumero,
      IdRolEquipo: data.idRolEquipo,
      IdTutor: data.idTutor,
      EstudianteId: data.estudianteId,
      DocenteId: data.docenteId,
      AdministrativoId: data.administrativoId,
      CategoriaParticipacionId: data.categoriaParticipacionId,
      EstadoParticipacionId: data.estadoParticipacionId,
      FechaParticipacion: data.fechaParticipacion 
        ? (data.fechaParticipacion instanceof Date 
          ? data.fechaParticipacion.toISOString() 
          : typeof data.fechaParticipacion === 'string' 
            ? data.fechaParticipacion 
            : new Date(data.fechaParticipacion).toISOString())
        : new Date().toISOString()
    };
    
    // Remover campos undefined
    Object.keys(dto).forEach(key => {
      if (dto[key] === undefined || dto[key] === null) {
        delete dto[key];
      }
    });
    
    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapParticipacion(item);
      }),
      catchError(error => {
        console.error('Error al crear participación:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza una participación existente
   * El backend espera ParticipacionUpdateDto con PascalCase
   */
  update(id: number, data: Partial<ParticipacionCreate>): Observable<Participacion> {
    // Convertir a PascalCase para el backend
    const dto: any = {};
    
    if (data.edicionId !== undefined) {
      dto.EdicionId = data.edicionId;
    }
    if (data.idSubactividad !== undefined) {
      dto.IdSubactividad = data.idSubactividad;
    }
    if (data.grupoNumero !== undefined) {
      dto.GrupoNumero = data.grupoNumero;
    }
    if (data.idRolEquipo !== undefined) {
      dto.IdRolEquipo = data.idRolEquipo;
    }
    if (data.idTutor !== undefined) {
      dto.IdTutor = data.idTutor;
    }
    if (data.estudianteId !== undefined) {
      dto.EstudianteId = data.estudianteId;
    }
    if (data.docenteId !== undefined) {
      dto.DocenteId = data.docenteId;
    }
    if (data.administrativoId !== undefined) {
      dto.AdministrativoId = data.administrativoId;
    }
    if (data.categoriaParticipacionId !== undefined) {
      dto.CategoriaParticipacionId = data.categoriaParticipacionId;
    }
    if (data.estadoParticipacionId !== undefined) {
      dto.EstadoParticipacionId = data.estadoParticipacionId;
    }
    if (data.fechaParticipacion !== undefined) {
      dto.FechaParticipacion = data.fechaParticipacion instanceof Date 
        ? data.fechaParticipacion.toISOString() 
        : data.fechaParticipacion;
    }
    
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapParticipacion(item);
      }),
      catchError(error => {
        console.error(`Error al actualizar participación ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Elimina una participación
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error(`❌ Error al eliminar participación ${id}:`, error);
        throw error;
      })
    );
  }

  // NUEVOS MÉTODOS
  getBySubactividad(subactividadId: number): Observable<Participacion[]> {
    return this.http.get<any>(`${this.apiUrl}/por-subactividad/${subactividadId}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapParticipacion(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching participaciones por subactividad:', error);
        return of([]);
      })
    );
  }

  getByGrupo(edicionId: number, grupoNumero?: number): Observable<Participacion[]> {
    let params = new HttpParams().set('edicionId', edicionId.toString());
    if (grupoNumero) {
      params = params.set('grupoNumero', grupoNumero.toString());
    }
    return this.http.get<any>(`${this.apiUrl}/por-grupo`, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapParticipacion(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching participaciones por grupo:', error);
        return of([]);
      })
    );
  }

  getEquipos(edicionId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/equipos/${edicionId}`);
  }

  getEquipo(edicionId: number, grupoNumero: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/equipos/${edicionId}/${grupoNumero}`);
  }

  /**
   * Crea múltiples participaciones
   * El backend espera un array de ParticipacionCreateDto con PascalCase
   */
  createMasivo(data: ParticipacionCreate[]): Observable<Participacion[]> {
    // Convertir cada item a PascalCase
    const dtos = data.map(item => {
      const dto: any = {
        EdicionId: item.edicionId,
        IdSubactividad: item.idSubactividad,
        GrupoNumero: item.grupoNumero,
        IdRolEquipo: item.idRolEquipo,
        IdTutor: item.idTutor,
        EstudianteId: item.estudianteId,
        DocenteId: item.docenteId,
        AdministrativoId: item.administrativoId,
        CategoriaParticipacionId: item.categoriaParticipacionId,
        EstadoParticipacionId: item.estadoParticipacionId,
        FechaParticipacion: item.fechaParticipacion 
          ? (item.fechaParticipacion instanceof Date 
            ? item.fechaParticipacion.toISOString() 
            : typeof item.fechaParticipacion === 'string' 
              ? item.fechaParticipacion 
              : new Date(item.fechaParticipacion).toISOString())
          : new Date().toISOString()
      };
      
      // Remover campos undefined
      Object.keys(dto).forEach(key => {
        if (dto[key] === undefined || dto[key] === null) {
          delete dto[key];
        }
      });
      
      return dto;
    });
    
    return this.http.post<any>(`${this.apiUrl}/masivo`, dtos).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapParticipacion(item)) : [];
      }),
      catchError(error => {
        console.error('Error al crear participaciones masivas:', error);
        throw error;
      })
    );
  }

  getConteos(filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined) {
        params = params.append(key, filters[key]);
      }
    });
    return this.http.get(`${this.apiUrl}/conteos`, { params });
  }

  private mapParticipacion(item: any): Participacion {
    return {
      id: item.idParticipacion || item.IdParticipacion || item.id,
      idParticipacion: item.idParticipacion || item.IdParticipacion || item.id,
      edicionId: item.edicionId || item.EdicionId,
      idSubactividad: item.idSubactividad || item.IdSubactividad,
      nombreSubactividad: item.nombreSubactividad || item.NombreSubactividad,
      grupoNumero: item.grupoNumero || item.GrupoNumero,
      idRolEquipo: item.idRolEquipo || item.IdRolEquipo,
      nombreRolEquipo: item.nombreRolEquipo || item.NombreRolEquipo,
      idTutor: item.idTutor || item.IdTutor,
      nombreTutor: item.nombreTutor || item.NombreTutor,
      estudianteId: item.estudianteId || item.EstudianteId,
      idEstudiante: item.estudianteId || item.EstudianteId || item.idEstudiante || item.IdEstudiante,
      docenteId: item.docenteId || item.DocenteId,
      idDocente: item.docenteId || item.DocenteId || item.idDocente || item.IdDocente,
      administrativoId: item.administrativoId || item.AdministrativoId,
      idAdmin: item.administrativoId || item.AdministrativoId || item.idAdmin || item.IdAdmin,
      nombreEstudiante: item.nombreEstudiante || item.NombreEstudiante,
      nombreDocente: item.nombreDocente || item.NombreDocente,
      nombreAdmin: item.nombreAdmin || item.NombreAdmin,
      categoriaParticipacionId: item.categoriaParticipacionId || item.CategoriaParticipacionId,
      estadoParticipacionId: item.estadoParticipacionId || item.EstadoParticipacionId,
      idEstadoParticipacion: item.estadoParticipacionId || item.EstadoParticipacionId || item.idEstadoParticipacion || item.IdEstadoParticipacion,
      fechaParticipacion: item.fechaParticipacion ? new Date(item.fechaParticipacion) : new Date()
    };
  }
}

