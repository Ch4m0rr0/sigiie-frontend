import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { of } from 'rxjs';

export interface ActividadValidacionDto {
  idActividad: number;
  nombreActividad: string;
  estadoValidacion: string | null;
  mensajeValidacion: string | null;
  validadoPor: number | null;
  nombreValidador: string | null;
  fechaValidacion: string | null;
  creadoPor: number;
  nombreCreador: string | null;
  departamentoResponsableId: number | null;
  nombreDepartamento: string | null;
  esPlanificada: boolean;
  fechaCreacion: string;
}

export interface ValidarActividadDto {
  estadoValidacion: 'Aprobada' | 'Rechazada' | 'Corregir';
  mensajeValidacion?: string;
}

export interface FiltrarValidacionDto {
  estadoValidacion?: 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Corregir';
  departamentoId?: number;
  esPlanificada?: boolean;
  anio?: number;
}

@Injectable({ providedIn: 'root' })
export class ActividadValidacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/actividades`;

  /**
   * Obtiene todas las actividades pendientes de validación
   * @param departamentoId Opcional: Filtrar por departamento específico
   */
  getPendientes(departamentoId?: number): Observable<ActividadValidacionDto[]> {
    let params = new HttpParams();
    if (departamentoId !== undefined && departamentoId !== null) {
      params = params.set('departamentoId', departamentoId.toString());
    }

    const url = `${this.apiUrl}/pendientes-validacion`;
    console.log('🔄 GET Actividades pendientes de validación', departamentoId ? `- Departamento: ${departamentoId}` : '');

    return this.http.get<any>(url, { params }).pipe(
      map(response => {
        const items = response.data || response;
        if (!Array.isArray(items)) {
          console.warn('⚠️ La respuesta no es un array:', items);
          return [];
        }
        return items.map((item: any) => this.mapActividadValidacion(item));
      }),
      catchError(error => {
        console.error('❌ Error obteniendo actividades pendientes de validación:', error);
        return of([]);
      })
    );
  }

  /**
   * Valida una actividad (Aprobar, Rechazar o Solicitar Correcciones)
   * @param idActividad ID de la actividad a validar
   * @param dto Datos de validación (estado y mensaje opcional)
   */
  validar(idActividad: number, dto: ValidarActividadDto): Observable<ActividadValidacionDto> {
    const url = `${this.apiUrl}/${idActividad}/validar`;
    console.log('🔄 POST Validar actividad', idActividad, dto);

    const body = {
      EstadoValidacion: dto.estadoValidacion,
      MensajeValidacion: dto.mensajeValidacion || null
    };

    return this.http.post<any>(url, body).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapActividadValidacion(item);
      }),
      catchError(error => {
        console.error('❌ Error validando actividad:', error);
        throw error;
      })
    );
  }

  /**
   * Filtra actividades por estado de validación y otros criterios
   * @param filter Criterios de filtrado
   */
  filtrar(filter: FiltrarValidacionDto): Observable<ActividadValidacionDto[]> {
    const url = `${this.apiUrl}/validacion/filtrar`;
    console.log('🔄 POST Filtrar actividades por validación', filter);

    const body = {
      EstadoValidacion: filter.estadoValidacion || null,
      DepartamentoId: filter.departamentoId || null,
      EsPlanificada: filter.esPlanificada !== undefined ? filter.esPlanificada : null,
      Anio: filter.anio || null
    };

    return this.http.post<any>(url, body).pipe(
      map(response => {
        const items = response.data || response;
        if (!Array.isArray(items)) {
          console.warn('⚠️ La respuesta no es un array:', items);
          return [];
        }
        return items.map((item: any) => this.mapActividadValidacion(item));
      }),
      catchError(error => {
        console.error('❌ Error filtrando actividades por validación:', error);
        return of([]);
      })
    );
  }

  /**
   * Notifica que se completaron las correcciones de una actividad
   * Solo el creador puede usar este endpoint
   * @param idActividad ID de la actividad
   * @param mensaje Mensaje opcional del creador
   */
  notificarCorreccionesCompletadas(idActividad: number, mensaje?: string): Observable<void> {
    const url = `${this.apiUrl}/${idActividad}/notificar-correcciones-completadas`;
    console.log('🔄 POST Notificar correcciones completadas', idActividad, mensaje);

    const body = mensaje ? { Mensaje: mensaje } : {};

    return this.http.post<any>(url, body).pipe(
      map(() => {
        console.log('✅ Notificación de correcciones completadas enviada');
      }),
      catchError(error => {
        console.error('❌ Error notificando correcciones completadas:', error);
        throw error;
      })
    );
  }

  /**
   * Mapea la respuesta del backend a ActividadValidacionDto
   */
  private mapActividadValidacion(item: any): ActividadValidacionDto {
    return {
      idActividad: item.idActividad || item.IdActividad || item.id || item.Id || 0,
      nombreActividad: item.nombreActividad || item.NombreActividad || '',
      estadoValidacion: item.estadoValidacion || item.EstadoValidacion || null,
      mensajeValidacion: item.mensajeValidacion || item.MensajeValidacion || null,
      validadoPor: item.validadoPor || item.ValidadoPor || null,
      nombreValidador: item.nombreValidador || item.NombreValidador || null,
      fechaValidacion: item.fechaValidacion || item.FechaValidacion || null,
      creadoPor: item.creadoPor || item.CreadoPor || 0,
      nombreCreador: item.nombreCreador || item.NombreCreador || null,
      departamentoResponsableId: item.departamentoResponsableId || item.DepartamentoResponsableId || null,
      nombreDepartamento: item.nombreDepartamento || item.NombreDepartamento || null,
      esPlanificada: item.esPlanificada !== undefined ? item.esPlanificada : (item.EsPlanificada !== undefined ? item.EsPlanificada : false),
      fechaCreacion: item.fechaCreacion || item.FechaCreacion || new Date().toISOString()
    };
  }
}

