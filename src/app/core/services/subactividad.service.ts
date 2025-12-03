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
      Nombre: data.nombre
    };

    // Agregar campos opcionales solo si tienen valores válidos
    if (data.descripcion !== undefined && data.descripcion !== null && data.descripcion !== '') {
      dto.Descripcion = data.descripcion;
    }

    // Manejar IdTipoSubactividad: si es array, tomar el primer elemento; si es número, usarlo; si no, omitir
    if (data.idTipoSubactividad !== undefined && data.idTipoSubactividad !== null) {
      if (Array.isArray(data.idTipoSubactividad) && data.idTipoSubactividad.length > 0) {
        dto.IdTipoSubactividad = data.idTipoSubactividad[0];
      } else if (!Array.isArray(data.idTipoSubactividad)) {
        dto.IdTipoSubactividad = data.idTipoSubactividad;
      }
    }

    if (data.fechaInicio !== undefined && data.fechaInicio !== null && data.fechaInicio !== '') {
      dto.FechaInicio = data.fechaInicio;
    }

    if (data.fechaFin !== undefined && data.fechaFin !== null && data.fechaFin !== '') {
      dto.FechaFin = data.fechaFin;
    }

    // Manejar DepartamentoResponsableId: si es array, tomar el primer elemento; si es número, usarlo; si no, omitir
    if (data.departamentoResponsableId !== undefined && data.departamentoResponsableId !== null) {
      if (Array.isArray(data.departamentoResponsableId) && data.departamentoResponsableId.length > 0) {
        dto.DepartamentoResponsableId = data.departamentoResponsableId[0];
      } else if (!Array.isArray(data.departamentoResponsableId)) {
        dto.DepartamentoResponsableId = data.departamentoResponsableId;
      }
    }

    if (data.ubicacion !== undefined && data.ubicacion !== null && data.ubicacion !== '') {
      dto.Ubicacion = data.ubicacion;
    }

    if (data.modalidad !== undefined && data.modalidad !== null && data.modalidad !== '') {
      dto.Modalidad = data.modalidad;
    }

    if (data.organizador !== undefined && data.organizador !== null && data.organizador !== '') {
      dto.Organizador = data.organizador;
    }

    if (data.activo !== undefined) {
      dto.Activo = data.activo;
    } else {
      dto.Activo = true; // Valor por defecto
    }

    if (data.esPlanificada !== undefined) {
      dto.EsPlanificada = data.esPlanificada;
    } else {
      dto.EsPlanificada = false; // Valor por defecto
    }

    if (data.idCapacidadInstalada !== undefined && data.idCapacidadInstalada !== null && data.idCapacidadInstalada > 0) {
      dto.IdCapacidadInstalada = data.idCapacidadInstalada;
    }

    if (data.idDocenteOrganizador !== undefined && data.idDocenteOrganizador !== null) {
      dto.IdDocenteOrganizador = data.idDocenteOrganizador;
    }

    // Agregar campos de planificación (IdIndicador, IdActividadAnual, IdActividadMensualInst)
    // El backend espera estos campos como int? (nullable int), no como arrays
    if (data.idIndicador !== undefined && data.idIndicador !== null) {
      dto.IdIndicador = data.idIndicador;
    }

    if (data.idActividadAnual !== undefined && data.idActividadAnual !== null) {
      // Si es un array, tomar el primer elemento; si es un número, usarlo directamente
      if (Array.isArray(data.idActividadAnual) && data.idActividadAnual.length > 0) {
        dto.IdActividadAnual = data.idActividadAnual[0];
      } else if (!Array.isArray(data.idActividadAnual)) {
        dto.IdActividadAnual = data.idActividadAnual;
      }
    }

    if (data.idActividadMensualInst !== undefined && data.idActividadMensualInst !== null) {
      // Si es un array, tomar el primer elemento; si es un número, usarlo directamente
      if (Array.isArray(data.idActividadMensualInst) && data.idActividadMensualInst.length > 0) {
        dto.IdActividadMensualInst = data.idActividadMensualInst[0];
      } else if (!Array.isArray(data.idActividadMensualInst)) {
        dto.IdActividadMensualInst = data.idActividadMensualInst;
      }
    }

    // Agregar campos adicionales
    if (data.objetivo !== undefined && data.objetivo !== null && data.objetivo !== '') {
      dto.Objetivo = data.objetivo;
    }

    if (data.horaRealizacion !== undefined && data.horaRealizacion !== null && data.horaRealizacion !== '') {
      dto.HoraRealizacion = data.horaRealizacion;
    }

    if (data.idEstadoActividad !== undefined && data.idEstadoActividad !== null) {
      dto.IdEstadoActividad = data.idEstadoActividad;
    }

    if (data.idTipoProtagonista !== undefined && data.idTipoProtagonista !== null) {
      // El backend espera un int? (nullable int), no un array
      // Si es un array, tomar el primer elemento; si es un número, usarlo directamente
      if (Array.isArray(data.idTipoProtagonista) && data.idTipoProtagonista.length > 0) {
        dto.IdTipoProtagonista = data.idTipoProtagonista[0];
      } else if (!Array.isArray(data.idTipoProtagonista)) {
        dto.IdTipoProtagonista = data.idTipoProtagonista;
      }
    }

    if (data.idTipoEvidencias !== undefined && data.idTipoEvidencias !== null) {
      // El backend espera un array para IdTipoEvidencias, mantener como array
      if (Array.isArray(data.idTipoEvidencias)) {
        dto.IdTipoEvidencias = data.idTipoEvidencias;
      } else {
        dto.IdTipoEvidencias = [data.idTipoEvidencias];
      }
    }

    if (data.cantidadTotalParticipantesProtagonistas !== undefined && data.cantidadTotalParticipantesProtagonistas !== null) {
      dto.CantidadTotalParticipantesProtagonistas = data.cantidadTotalParticipantesProtagonistas;
    }

    if (data.cantidadParticipantesProyectados !== undefined && data.cantidadParticipantesProyectados !== null) {
      dto.CantidadParticipantesProyectados = data.cantidadParticipantesProyectados;
    }

    if (data.cantidadParticipantesEstudiantesProyectados !== undefined && data.cantidadParticipantesEstudiantesProyectados !== null) {
      dto.CantidadParticipantesEstudiantesProyectados = data.cantidadParticipantesEstudiantesProyectados;
    }

    if (data.anio !== undefined && data.anio !== null && data.anio !== '') {
      dto.Anio = data.anio;
    }

    if (data.horaInicioPrevista !== undefined && data.horaInicioPrevista !== null && data.horaInicioPrevista !== '') {
      dto.HoraInicioPrevista = data.horaInicioPrevista;
    }

    if (data.semanaMes !== undefined && data.semanaMes !== null) {
      dto.SemanaMes = data.semanaMes;
    }

    if (data.codigoSubactividad !== undefined && data.codigoSubactividad !== null && data.codigoSubactividad !== '') {
      dto.CodigoSubactividad = data.codigoSubactividad;
    }

    if (data.responsableSubactividad !== undefined && data.responsableSubactividad !== null && data.responsableSubactividad !== '') {
      dto.ResponsableSubactividad = data.responsableSubactividad;
    }

    if (data.categoriaActividadId !== undefined && data.categoriaActividadId !== null) {
      dto.CategoriaActividadId = data.categoriaActividadId;
    }

    if (data.areaConocimientoId !== undefined && data.areaConocimientoId !== null) {
      dto.AreaConocimientoId = data.areaConocimientoId;
    }

    if (data.departamentoId !== undefined && data.departamentoId !== null) {
      dto.DepartamentoId = data.departamentoId;
    }

    console.log('🔄 POST Subactividad - DTO completo:', JSON.stringify(dto, null, 2));
    console.log('🔍 Campos específicos en DTO:', {
      'dto.Objetivo': dto.Objetivo,
      'dto.HoraRealizacion': dto.HoraRealizacion,
      'dto.IdEstadoActividad': dto.IdEstadoActividad,
      'dto.IdCapacidadInstalada': dto.IdCapacidadInstalada,
      'dto.IdTipoProtagonista': dto.IdTipoProtagonista,
      'dto.IdTipoEvidencias': dto.IdTipoEvidencias,
      'dto.CantidadTotalParticipantesProtagonistas': dto.CantidadTotalParticipantesProtagonistas
    });

    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(item => this.mapSubactividad(item)),
      catchError(error => {
        console.error('❌ Error creating subactividad:', error);
        console.error('❌ Error details:', error.error);
        if (error.error?.errors) {
          console.error('❌ Validation errors:', JSON.stringify(error.error.errors, null, 2));
        }
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
    
    if (data.idActividad !== undefined && data.idActividad !== null) {
      dto.IdActividad = data.idActividad;
    }
    
    if (data.nombre !== undefined && data.nombre !== null && data.nombre !== '') {
      dto.Nombre = data.nombre;
    }
    
    if (data.descripcion !== undefined && data.descripcion !== null && data.descripcion !== '') {
      dto.Descripcion = data.descripcion;
    }
    
    // Manejar IdTipoSubactividad: si es array, tomar el primer elemento; si es número, usarlo; si no, omitir
    if (data.idTipoSubactividad !== undefined && data.idTipoSubactividad !== null) {
      if (Array.isArray(data.idTipoSubactividad) && data.idTipoSubactividad.length > 0) {
        dto.IdTipoSubactividad = data.idTipoSubactividad[0];
      } else if (!Array.isArray(data.idTipoSubactividad)) {
        dto.IdTipoSubactividad = data.idTipoSubactividad;
      }
    }
    
    if (data.fechaInicio !== undefined && data.fechaInicio !== null && data.fechaInicio !== '') {
      dto.FechaInicio = data.fechaInicio;
    }
    
    if (data.fechaFin !== undefined && data.fechaFin !== null && data.fechaFin !== '') {
      dto.FechaFin = data.fechaFin;
    }
    
    // Manejar DepartamentoResponsableId: si es array, tomar el primer elemento; si es número, usarlo; si no, omitir
    if (data.departamentoResponsableId !== undefined && data.departamentoResponsableId !== null) {
      if (Array.isArray(data.departamentoResponsableId) && data.departamentoResponsableId.length > 0) {
        dto.DepartamentoResponsableId = data.departamentoResponsableId[0];
      } else if (!Array.isArray(data.departamentoResponsableId)) {
        dto.DepartamentoResponsableId = data.departamentoResponsableId;
      }
    }
    
    if (data.ubicacion !== undefined && data.ubicacion !== null && data.ubicacion !== '') {
      dto.Ubicacion = data.ubicacion;
    }
    
    if (data.modalidad !== undefined && data.modalidad !== null && data.modalidad !== '') {
      dto.Modalidad = data.modalidad;
    }
    
    if (data.organizador !== undefined && data.organizador !== null && data.organizador !== '') {
      dto.Organizador = data.organizador;
    }
    
    if (data.activo !== undefined) {
      dto.Activo = data.activo;
    }
    
    if (data.esPlanificada !== undefined) {
      dto.EsPlanificada = data.esPlanificada;
    }
    
    if (data.idCapacidadInstalada !== undefined && data.idCapacidadInstalada !== null && data.idCapacidadInstalada > 0) {
      dto.IdCapacidadInstalada = data.idCapacidadInstalada;
    }
    
    if (data.idDocenteOrganizador !== undefined && data.idDocenteOrganizador !== null) {
      dto.IdDocenteOrganizador = data.idDocenteOrganizador;
    }

    // Agregar campos adicionales
    if (data.objetivo !== undefined && data.objetivo !== null && data.objetivo !== '') {
      dto.Objetivo = data.objetivo;
    }

    if (data.horaRealizacion !== undefined && data.horaRealizacion !== null && data.horaRealizacion !== '') {
      dto.HoraRealizacion = data.horaRealizacion;
    }

    if (data.idEstadoActividad !== undefined && data.idEstadoActividad !== null) {
      dto.IdEstadoActividad = data.idEstadoActividad;
    }

    if (data.idTipoProtagonista !== undefined && data.idTipoProtagonista !== null) {
      // El backend espera un int? (nullable int), no un array
      // Si es un array, tomar el primer elemento; si es un número, usarlo directamente
      if (Array.isArray(data.idTipoProtagonista) && data.idTipoProtagonista.length > 0) {
        dto.IdTipoProtagonista = data.idTipoProtagonista[0];
      } else if (!Array.isArray(data.idTipoProtagonista)) {
        dto.IdTipoProtagonista = data.idTipoProtagonista;
      }
    }

    if (data.idTipoEvidencias !== undefined && data.idTipoEvidencias !== null) {
      // El backend espera un array para IdTipoEvidencias, mantener como array
      if (Array.isArray(data.idTipoEvidencias)) {
        dto.IdTipoEvidencias = data.idTipoEvidencias;
      } else {
        dto.IdTipoEvidencias = [data.idTipoEvidencias];
      }
    }

    if (data.cantidadTotalParticipantesProtagonistas !== undefined && data.cantidadTotalParticipantesProtagonistas !== null) {
      dto.CantidadTotalParticipantesProtagonistas = data.cantidadTotalParticipantesProtagonistas;
    }

    if (data.cantidadParticipantesProyectados !== undefined && data.cantidadParticipantesProyectados !== null) {
      dto.CantidadParticipantesProyectados = data.cantidadParticipantesProyectados;
    }

    if (data.cantidadParticipantesEstudiantesProyectados !== undefined && data.cantidadParticipantesEstudiantesProyectados !== null) {
      dto.CantidadParticipantesEstudiantesProyectados = data.cantidadParticipantesEstudiantesProyectados;
    }

    if (data.anio !== undefined && data.anio !== null && data.anio !== '') {
      dto.Anio = data.anio;
    }

    if (data.horaInicioPrevista !== undefined && data.horaInicioPrevista !== null && data.horaInicioPrevista !== '') {
      dto.HoraInicioPrevista = data.horaInicioPrevista;
    }

    if (data.semanaMes !== undefined && data.semanaMes !== null) {
      dto.SemanaMes = data.semanaMes;
    }

    if (data.codigoSubactividad !== undefined && data.codigoSubactividad !== null && data.codigoSubactividad !== '') {
      dto.CodigoSubactividad = data.codigoSubactividad;
    }

    if (data.responsableSubactividad !== undefined && data.responsableSubactividad !== null && data.responsableSubactividad !== '') {
      dto.ResponsableSubactividad = data.responsableSubactividad;
    }

    if (data.categoriaActividadId !== undefined && data.categoriaActividadId !== null) {
      dto.CategoriaActividadId = data.categoriaActividadId;
    }

    if (data.areaConocimientoId !== undefined && data.areaConocimientoId !== null) {
      dto.AreaConocimientoId = data.areaConocimientoId;
    }

    if (data.departamentoId !== undefined && data.departamentoId !== null) {
      dto.DepartamentoId = data.departamentoId;
    }

    // Agregar campos de planificación
    if (data.idIndicador !== undefined && data.idIndicador !== null) {
      dto.IdIndicador = data.idIndicador;
    }

    if (data.idActividadAnual !== undefined && data.idActividadAnual !== null) {
      // Si es un array, tomar el primer elemento; si es un número, usarlo directamente
      if (Array.isArray(data.idActividadAnual) && data.idActividadAnual.length > 0) {
        dto.IdActividadAnual = data.idActividadAnual[0];
      } else if (!Array.isArray(data.idActividadAnual)) {
        dto.IdActividadAnual = data.idActividadAnual;
      }
    }

    if (data.idActividadMensualInst !== undefined && data.idActividadMensualInst !== null) {
      // Si es un array, tomar el primer elemento; si es un número, usarlo directamente
      if (Array.isArray(data.idActividadMensualInst) && data.idActividadMensualInst.length > 0) {
        dto.IdActividadMensualInst = data.idActividadMensualInst[0];
      } else if (!Array.isArray(data.idActividadMensualInst)) {
        dto.IdActividadMensualInst = data.idActividadMensualInst;
      }
    }

    console.log('🔄 PUT Subactividad - ID:', id, 'DTO:', JSON.stringify(dto, null, 2));

    return this.http.put<any>(`${this.apiUrl}/${id}`, dto).pipe(
      map(item => {
        // Si el backend devuelve bool, null o undefined, consideramos la operación exitosa sin datos
        if (item === null || item === undefined || typeof item === 'boolean') {
          return null;
        }

        const responseData = item.data || item;
        // Si tampoco hay data, devolvemos null
        if (!responseData) {
          return null;
        }

        // En caso de que venga un objeto subactividad, lo mapeamos normalmente
        return this.mapSubactividad(responseData);
      }),
      catchError(error => {
        console.error('❌ Error updating subactividad:', error);
        console.error('❌ Error details:', error.error);
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
    console.log('🔄 mapSubactividad - Item original del backend:', JSON.stringify(item, null, 2));
    console.log('🔍 Campos específicos en item original:', {
      'item.objetivo': item.objetivo,
      'item.Objetivo': item.Objetivo,
      'item.horaRealizacion': item.horaRealizacion,
      'item.HoraRealizacion': item.HoraRealizacion,
      'item.idCapacidadInstalada': item.idCapacidadInstalada,
      'item.IdCapacidadInstalada': item.IdCapacidadInstalada,
      'item.idTipoProtagonista': item.idTipoProtagonista,
      'item.IdTipoProtagonista': item.IdTipoProtagonista,
      'item.idTipoEvidencias': item.idTipoEvidencias,
      'item.IdTipoEvidencias': item.IdTipoEvidencias,
      'item.idTipoEvidencias (array)': Array.isArray(item.idTipoEvidencias) ? item.idTipoEvidencias : 'no es array',
      'item.IdTipoEvidencias (array)': Array.isArray(item.IdTipoEvidencias) ? item.IdTipoEvidencias : 'no es array',
      'item.cantidadTotalParticipantesProtagonistas': item.cantidadTotalParticipantesProtagonistas,
      'item.CantidadTotalParticipantesProtagonistas': item.CantidadTotalParticipantesProtagonistas,
      'Todas las claves del objeto': Object.keys(item)
    });
    
    const mapped = {
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
      idCapacidadInstalada: item.idCapacidadInstalada !== undefined && item.idCapacidadInstalada !== null ? item.idCapacidadInstalada : (item.IdCapacidadInstalada !== undefined && item.IdCapacidadInstalada !== null ? item.IdCapacidadInstalada : undefined),
      idDocenteOrganizador: item.idDocenteOrganizador || item.IdDocenteOrganizador,
      esPlanificada: item.esPlanificada !== undefined ? item.esPlanificada : (item.EsPlanificada !== undefined ? item.EsPlanificada : false),
      horaRealizacion: item.horaRealizacion !== undefined && item.horaRealizacion !== null ? item.horaRealizacion : (item.HoraRealizacion !== undefined && item.HoraRealizacion !== null ? item.HoraRealizacion : undefined),
      horaInicioPrevista: item.horaInicioPrevista || item.HoraInicioPrevista,
      idEstadoActividad: item.idEstadoActividad !== undefined && item.idEstadoActividad !== null ? item.idEstadoActividad : (item.IdEstadoActividad !== undefined && item.IdEstadoActividad !== null ? item.IdEstadoActividad : undefined),
      semanaMes: item.semanaMes || item.SemanaMes,
      codigoSubactividad: item.codigoSubactividad || item.CodigoSubactividad,
      responsableSubactividad: item.responsableSubactividad || item.ResponsableSubactividad,
      idIndicador: item.idIndicador !== undefined && item.idIndicador !== null ? item.idIndicador : (item.IdIndicador !== undefined && item.IdIndicador !== null ? item.IdIndicador : undefined),
      idActividadAnual: item.idActividadAnual !== undefined && item.idActividadAnual !== null ? item.idActividadAnual : (item.IdActividadAnual !== undefined && item.IdActividadAnual !== null ? item.IdActividadAnual : undefined),
      idActividadMensualInst: item.idActividadMensualInst !== undefined && item.idActividadMensualInst !== null ? item.idActividadMensualInst : (item.IdActividadMensualInst !== undefined && item.IdActividadMensualInst !== null ? item.IdActividadMensualInst : undefined),
      idTipoProtagonista: item.idTipoProtagonista !== undefined && item.idTipoProtagonista !== null ? item.idTipoProtagonista : (item.IdTipoProtagonista !== undefined && item.IdTipoProtagonista !== null ? item.IdTipoProtagonista : undefined),
      idTipoEvidencias: (() => {
        // Intentar obtener idTipoEvidencias en diferentes formatos
        if (item.idTipoEvidencias !== undefined && item.idTipoEvidencias !== null) {
          return item.idTipoEvidencias;
        }
        if (item.IdTipoEvidencias !== undefined && item.IdTipoEvidencias !== null) {
          return item.IdTipoEvidencias;
        }
        // Buscar en otras posibles propiedades
        if (item.tipoEvidencias !== undefined && item.tipoEvidencias !== null) {
          return item.tipoEvidencias;
        }
        if (item.TipoEvidencias !== undefined && item.TipoEvidencias !== null) {
          return item.TipoEvidencias;
        }
        return undefined;
      })(),
      objetivo: item.objetivo !== undefined && item.objetivo !== null ? item.objetivo : (item.Objetivo !== undefined && item.Objetivo !== null ? item.Objetivo : undefined),
      anio: item.anio !== undefined && item.anio !== null ? item.anio : (item.Anio !== undefined && item.Anio !== null ? item.Anio : undefined),
      cantidadParticipantesProyectados: item.cantidadParticipantesProyectados !== undefined && item.cantidadParticipantesProyectados !== null ? item.cantidadParticipantesProyectados : (item.CantidadParticipantesProyectados !== undefined && item.CantidadParticipantesProyectados !== null ? item.CantidadParticipantesProyectados : undefined),
      cantidadParticipantesEstudiantesProyectados: item.cantidadParticipantesEstudiantesProyectados !== undefined && item.cantidadParticipantesEstudiantesProyectados !== null ? item.cantidadParticipantesEstudiantesProyectados : (item.CantidadParticipantesEstudiantesProyectados !== undefined && item.CantidadParticipantesEstudiantesProyectados !== null ? item.CantidadParticipantesEstudiantesProyectados : undefined),
      cantidadTotalParticipantesProtagonistas: item.cantidadTotalParticipantesProtagonistas !== undefined && item.cantidadTotalParticipantesProtagonistas !== null ? item.cantidadTotalParticipantesProtagonistas : (item.CantidadTotalParticipantesProtagonistas !== undefined && item.CantidadTotalParticipantesProtagonistas !== null ? item.CantidadTotalParticipantesProtagonistas : undefined),
      categoriaActividadId: item.categoriaActividadId !== undefined && item.categoriaActividadId !== null ? item.categoriaActividadId : (item.CategoriaActividadId !== undefined && item.CategoriaActividadId !== null ? item.CategoriaActividadId : undefined),
      areaConocimientoId: item.areaConocimientoId !== undefined && item.areaConocimientoId !== null ? item.areaConocimientoId : (item.AreaConocimientoId !== undefined && item.AreaConocimientoId !== null ? item.AreaConocimientoId : undefined),
      departamentoId: item.departamentoId !== undefined && item.departamentoId !== null ? item.departamentoId : (item.DepartamentoId !== undefined && item.DepartamentoId !== null ? item.DepartamentoId : undefined)
    };
    
    console.log('✅ mapSubactividad - Datos mapeados:', {
      objetivo: mapped.objetivo,
      horaRealizacion: mapped.horaRealizacion,
      idEstadoActividad: mapped.idEstadoActividad,
      idCapacidadInstalada: mapped.idCapacidadInstalada,
      idTipoProtagonista: mapped.idTipoProtagonista,
      idTipoEvidencias: mapped.idTipoEvidencias,
      cantidadTotalParticipantesProtagonistas: mapped.cantidadTotalParticipantesProtagonistas
    });
    
    return mapped;
  }
}

