import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpParams } from '@angular/common/http';
import type { Actividad, ActividadCreate } from '../models/actividad';
import type { Edicion } from '../models/edicion';
import type { Participacion } from '../models/participacion';
import type { ActividadResponsable } from '../models/actividad-responsable';
import type { ActividadIndicador } from '../models/indicador';
import type { Subactividad } from '../models/subactividad';
import type { EvidenciaCreate } from '../models/evidencia';

export interface ActividadFilterDto {
  IdActividadMensualInst?: number;
  IdEstadoActividad?: number;
  IdTipoActividad?: number;
  DepartamentoId?: number;
  DepartamentoResponsableId?: number;
  BusquedaTexto?: string;
  FechaInicioDesde?: string;
  FechaInicioHasta?: string;
  FechaFinDesde?: string;
  FechaFinHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/actividades`;

  // Actividades - Alineado con IActividadesService.GetAllAsync()
  getAll(): Observable<Actividad[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapActividad(item)) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/actividades no encontrado (404)');
          return of([]);
        } else if (error.status === 500) {
          console.error('❌ Error 500 del servidor al obtener actividades:', error);
          // Re-lanzar el error para que el componente pueda manejarlo
          throw error;
        } else if (error.status === 401 || error.status === 403) {
          console.error('❌ Error de autenticación/autorización:', error);
          // Re-lanzar el error para que el componente pueda manejarlo
          throw error;
        } else {
          console.error('❌ Error fetching actividades:', error);
          return of([]);
        }
      })
    );
  }

  // Método legacy - mantener para compatibilidad
  list(): Observable<Actividad[]> {
    return this.getAll();
  }

  /**
   * POST /api/actividades/filtrar
   * Filtra actividades según los criterios proporcionados
   * El backend espera ActividadFilterDto con PascalCase
   */
  filtrar(filtros: ActividadFilterDto): Observable<Actividad[]> {
    // Convertir a PascalCase para el backend
    const dto: any = {};
    if (filtros.IdActividadMensualInst !== undefined) {
      dto.IdActividadMensualInst = filtros.IdActividadMensualInst;
    }
    if (filtros.IdEstadoActividad !== undefined) {
      dto.IdEstadoActividad = filtros.IdEstadoActividad;
    }
    if (filtros.IdTipoActividad !== undefined) {
      dto.IdTipoActividad = filtros.IdTipoActividad;
    }
    if (filtros.DepartamentoId !== undefined) {
      dto.DepartamentoId = filtros.DepartamentoId;
    }
    if (filtros.DepartamentoResponsableId !== undefined) {
      dto.DepartamentoResponsableId = filtros.DepartamentoResponsableId;
    }
    if (filtros.BusquedaTexto) {
      dto.BusquedaTexto = filtros.BusquedaTexto;
    }
    if (filtros.FechaInicioDesde) {
      dto.FechaInicioDesde = filtros.FechaInicioDesde;
    }
    if (filtros.FechaInicioHasta) {
      dto.FechaInicioHasta = filtros.FechaInicioHasta;
    }
    if (filtros.FechaFinDesde) {
      dto.FechaFinDesde = filtros.FechaFinDesde;
    }
    if (filtros.FechaFinHasta) {
      dto.FechaFinHasta = filtros.FechaFinHasta;
    }
    
    return this.http.post<any>(`${this.apiUrl}/filtrar`, dto).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapActividad(item)) : [];
      }),
      catchError(error => {
        console.error('Error filtrando actividades:', error);
        return of([]);
      })
    );
  }

  // Alineado con IActividadesService.GetByIdAsync()
  getById(id: number): Observable<Actividad> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapActividad(item))
    );
  }

  // Método legacy - mantener para compatibilidad
  get(id: number): Observable<Actividad> {
    return this.getById(id);
  }

  // Alineado con IActividadesService.CreateAsync()
  create(actividad: ActividadCreate): Observable<Actividad> {
    // El backend espera ActividadCreateDto con PascalCase
    const dto: any = {
      NombreActividad: actividad.nombreActividad || actividad.nombre,
      Descripcion: actividad.descripcion,
      DepartamentoId: actividad.departamentoId,
      DepartamentoResponsableId: actividad.departamentoResponsableId,
      IdTipoIniciativa: actividad.idTipoIniciativa,
      FechaInicio: actividad.fechaInicio,
      FechaFin: actividad.fechaFin,
      IdEstadoActividad: actividad.idEstadoActividad,
      IdTipoActividad: actividad.idTipoActividad || actividad.categoriaActividadId,
      IdArea: actividad.idArea || actividad.areaConocimientoId,
      IdTipoDocumento: actividad.idTipoDocumento,
      Organizador: actividad.organizador,
      Modalidad: actividad.modalidad,
      Ubicacion: actividad.ubicacion,
      IdNivel: actividad.idNivel,
      NivelActividad: actividad.nivelActividad ?? 1,
      SemanaMes: actividad.semanaMes,
      CodigoActividad: actividad.codigoActividad,
      IdActividadMensualInst: actividad.idActividadMensualInst,
      IdTipoActividadJerarquica: actividad.idTipoActividadJerarquica
    };
    
    // Remover campos undefined
    Object.keys(dto).forEach(key => {
      if (dto[key] === undefined || dto[key] === null) {
        delete dto[key];
      }
    });
    
    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(item => this.mapActividad(item))
    );
  }

  // Alineado con IActividadesService.UpdateAsync()
  update(id: number, actividad: Partial<ActividadCreate>): Observable<boolean> {
    // El backend espera ActividadUpdateDto con PascalCase
    const dto: any = {};
    
    if (actividad.nombreActividad !== undefined || actividad.nombre !== undefined) {
      dto.NombreActividad = actividad.nombreActividad || actividad.nombre;
    }
    if (actividad.descripcion !== undefined) {
      dto.Descripcion = actividad.descripcion;
    }
    if (actividad.departamentoId !== undefined) {
      dto.DepartamentoId = actividad.departamentoId;
    }
    if (actividad.departamentoResponsableId !== undefined) {
      dto.DepartamentoResponsableId = actividad.departamentoResponsableId;
    }
    if (actividad.idTipoIniciativa !== undefined) {
      dto.IdTipoIniciativa = actividad.idTipoIniciativa;
    }
    if (actividad.fechaInicio !== undefined) {
      dto.FechaInicio = actividad.fechaInicio;
    }
    if (actividad.fechaFin !== undefined) {
      dto.FechaFin = actividad.fechaFin;
    }
    if (actividad.idEstadoActividad !== undefined) {
      dto.IdEstadoActividad = actividad.idEstadoActividad;
    }
    if (actividad.idTipoActividad !== undefined || actividad.categoriaActividadId !== undefined) {
      dto.IdTipoActividad = actividad.idTipoActividad || actividad.categoriaActividadId;
    }
    if (actividad.idArea !== undefined || actividad.areaConocimientoId !== undefined) {
      dto.IdArea = actividad.idArea || actividad.areaConocimientoId;
    }
    if (actividad.idTipoDocumento !== undefined) {
      dto.IdTipoDocumento = actividad.idTipoDocumento;
    }
    if (actividad.organizador !== undefined) {
      dto.Organizador = actividad.organizador;
    }
    if (actividad.modalidad !== undefined) {
      dto.Modalidad = actividad.modalidad;
    }
    if (actividad.ubicacion !== undefined) {
      dto.Ubicacion = actividad.ubicacion;
    }
    if (actividad.idNivel !== undefined) {
      dto.IdNivel = actividad.idNivel;
    }
    if (actividad.nivelActividad !== undefined) {
      dto.NivelActividad = actividad.nivelActividad;
    }
    if (actividad.semanaMes !== undefined) {
      dto.SemanaMes = actividad.semanaMes;
    }
    if (actividad.codigoActividad !== undefined) {
      dto.CodigoActividad = actividad.codigoActividad;
    }
    if (actividad.idActividadMensualInst !== undefined) {
      dto.IdActividadMensualInst = actividad.idActividadMensualInst;
    }
    if (actividad.idTipoActividadJerarquica !== undefined) {
      dto.IdTipoActividadJerarquica = actividad.idTipoActividadJerarquica;
    }
    
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating actividad:', error);
        return of(false);
      })
    );
  }

  // Alineado con IActividadesService.DeleteAsync()
  delete(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting actividad:', error);
        return of(false);
      })
    );
  }

  // Ediciones
  createEdicion(id: number, edicion: Omit<Edicion, 'id'>): Observable<Edicion> {
    return this.http.post<Edicion>(`${this.apiUrl}/${id}/ediciones`, edicion);
  }

  // Participaciones
  createParticipacion(edicionId: number, participacion: Omit<Participacion, 'id'>): Observable<Participacion> {
    return this.http.post<Participacion>(`${environment.apiUrl}/ediciones/${edicionId}/participaciones`, participacion);
  }

  deleteParticipacion(edicionId: number, participacionId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/ediciones/${edicionId}/participaciones/${participacionId}`);
  }

  // Vista Participantes
  getParticipantesPorEdicion(edicionId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/ediciones/${edicionId}/participantes`);
  }

  // NUEVOS MÉTODOS
  getByPlanificacion(planificacionId: number): Observable<Actividad[]> {
    return this.http.get<any>(`${this.apiUrl}/por-planificacion/${planificacionId}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapActividad(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching actividades por planificacion:', error);
        return of([]);
      })
    );
  }

  getByNivel(nivelId: number): Observable<Actividad[]> {
    const params = new HttpParams().set('nivelId', nivelId.toString());
    return this.http.get<any>(`${this.apiUrl}/por-nivel`, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapActividad(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching actividades por nivel:', error);
        return of([]);
      })
    );
  }

  getDepartamentos(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/departamentos`);
  }

  getResponsables(id: number): Observable<ActividadResponsable[]> {
    return this.http.get<any>(`${this.apiUrl}/${id}/responsables`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => {
          const fechaAsignacion = item.FechaAsignacion || item.fechaAsignacion;
          return {
            idActividadResponsable: item.idActividadResponsable || item.IdActividadResponsable || item.id,
            idActividad: item.idActividad || item.IdActividad,
            idUsuario: item.idUsuario || item.IdUsuario,
            idDocente: item.idDocente || item.IdDocente,
            idAdmin: item.idAdmin || item.IdAdmin,
            nombrePersona: item.nombrePersona || item.NombrePersona || item.NombreUsuario || item.nombreUsuario,
            idTipoResponsable: item.idTipoResponsable || item.IdTipoResponsable || 0,
            nombreTipoResponsable: item.nombreTipoResponsable || item.NombreTipoResponsable,
            departamentoId: item.departamentoId || item.DepartamentoId,
            fechaAsignacion: fechaAsignacion ? (typeof fechaAsignacion === 'string' ? fechaAsignacion : new Date(fechaAsignacion).toISOString().split('T')[0]) : undefined,
            rolResponsable: item.rolResponsable || item.RolResponsable,
            rolResponsableDetalle: item.rolResponsableDetalle || item.RolResponsableDetalle
          };
        }) : [];
      }),
      catchError(error => {
        console.error('Error fetching responsables:', error);
        return of([]);
      })
    );
  }

  getIndicadores(id: number): Observable<ActividadIndicador[]> {
    return this.http.get<any>(`${this.apiUrl}/${id}/indicadores`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({
          idActividadIndicador: item.idActividadIndicador || item.IdActividadIndicador || item.id,
          idActividad: item.idActividad || item.IdActividad,
          idIndicador: item.idIndicador || item.IdIndicador,
          nombreIndicador: item.nombreIndicador || item.NombreIndicador,
          codigoIndicador: item.codigoIndicador || item.CodigoIndicador,
          metaAnual: item.metaAnual || item.MetaAnual,
          metaPeriodo: item.metaPeriodo || item.MetaPeriodo,
          metaAlcanzada: item.metaAlcanzada || item.MetaAlcanzada,
          porcentajeCumplimiento: item.porcentajeCumplimiento || item.PorcentajeCumplimiento,
          valoracionCualitativa: item.valoracionCualitativa || item.ValoracionCualitativa,
          brechas: item.brechas || item.Brechas,
          evidenciaResumen: item.evidenciaResumen || item.EvidenciaResumen
        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching indicadores:', error);
        return of([]);
      })
    );
  }

  getSubactividades(id: number): Observable<Subactividad[]> {
    return this.http.get<any>(`${this.apiUrl}/${id}/subactividades`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({
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
        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching subactividades:', error);
        return of([]);
      })
    );
  }

  getResumen(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/resumen`);
  }

  asignarDepartamento(id: number, departamentoId: number, esResponsable: boolean): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/departamentos`, { departamentoId, esResponsable });
  }

  removerDepartamento(id: number, departamentoId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/departamentos/${departamentoId}`);
  }

  /**
   * POST /api/actividades/{idActividad}/evidencias
   * Sube una evidencia a una actividad (multipart/form-data)
   * El backend espera EvidenciaCreateDto con campo "Archivo"
   */
  subirEvidencia(idActividad: number, file: File, evidenciaData: EvidenciaCreate): Observable<any> {
    const formData = new FormData();
    formData.append('Archivo', file); // El backend espera "Archivo", no "file"
    
    // Agregar campos del DTO al FormData (PascalCase)
    if (evidenciaData.idTipoEvidencia !== undefined) {
      formData.append('IdTipoEvidencia', evidenciaData.idTipoEvidencia.toString());
    }
    if (evidenciaData.descripcion) {
      formData.append('Descripcion', evidenciaData.descripcion);
    }
    if (evidenciaData.fechaEvidencia) {
      formData.append('FechaEvidencia', evidenciaData.fechaEvidencia);
    }
    if (evidenciaData.seleccionadaParaReporte !== undefined) {
      formData.append('SeleccionadaParaReporte', evidenciaData.seleccionadaParaReporte.toString());
    }
    if (evidenciaData.idProyecto) {
      formData.append('IdProyecto', evidenciaData.idProyecto.toString());
    }
    if (evidenciaData.idSubactividad) {
      formData.append('IdSubactividad', evidenciaData.idSubactividad.toString());
    }
    
    return this.http.post<any>(`${this.apiUrl}/${idActividad}/evidencias`, formData);
  }

  /**
   * POST /api/actividades/{idActividad}/evidencias/multiple
   * Sube múltiples evidencias a una actividad (multipart/form-data)
   * El backend espera EvidenciaMultipleCreateDto con campo "Archivos"
   */
  subirEvidenciasMultiple(idActividad: number, files: File[], evidenciaData: EvidenciaCreate): Observable<any> {
    const formData = new FormData();
    
    // Agregar todos los archivos (el backend espera "Archivos", no "files")
    files.forEach((file) => {
      formData.append('Archivos', file);
    });
    
    // Agregar campos del DTO al FormData (PascalCase)
    if (evidenciaData.idTipoEvidencia !== undefined) {
      formData.append('IdTipoEvidencia', evidenciaData.idTipoEvidencia.toString());
    }
    if (evidenciaData.descripcion) {
      formData.append('Descripcion', evidenciaData.descripcion);
    }
    if (evidenciaData.fechaEvidencia) {
      formData.append('FechaEvidencia', evidenciaData.fechaEvidencia);
    }
    if (evidenciaData.seleccionadaParaReporte !== undefined) {
      formData.append('SeleccionadaParaReporte', evidenciaData.seleccionadaParaReporte.toString());
    }
    if (evidenciaData.idProyecto) {
      formData.append('IdProyecto', evidenciaData.idProyecto.toString());
    }
    if (evidenciaData.idSubactividad) {
      formData.append('IdSubactividad', evidenciaData.idSubactividad.toString());
    }
    
    return this.http.post<any>(`${this.apiUrl}/${idActividad}/evidencias/multiple`, formData);
  }

  private mapActividad(item: any): Actividad {
    const idActividad = item.IdActividad || item.idActividad || item.id || item.Id;
    const nombreActividad = item.NombreActividad || item.nombreActividad || item.nombre || item.Nombre || '';
    
    // Convertir DateOnly a string ISO si es necesario
    const formatDate = (date: any): string | undefined => {
      if (!date) return undefined;
      if (typeof date === 'string') return date;
      if (date.year && date.month && date.day) {
        return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
      }
      return undefined;
    };

    // Mapear subactividades si existen
    const mapSubactividades = (subs: any[]): Subactividad[] => {
      if (!Array.isArray(subs)) return [];
      return subs.map(s => ({
        idSubactividad: s.IdSubactividad || s.idSubactividad || s.id || 0,
        idActividad: s.IdActividad || s.idActividad || idActividad,
        nombreActividad: nombreActividad,
        nombre: s.Nombre || s.nombre || '',
        descripcion: s.Descripcion || s.descripcion,
        idTipoSubactividad: s.IdTipoSubactividad || s.idTipoSubactividad,
        nombreTipoSubactividad: s.NombreTipoSubactividad || s.nombreTipoSubactividad,
        fechaInicio: formatDate(s.FechaInicio || s.fechaInicio),
        fechaFin: formatDate(s.FechaFin || s.fechaFin),
        departamentoResponsableId: s.DepartamentoResponsableId || s.departamentoResponsableId,
        nombreDepartamentoResponsable: s.NombreDepartamentoResponsable || s.nombreDepartamentoResponsable,
        ubicacion: s.Ubicacion || s.ubicacion,
        modalidad: s.Modalidad || s.modalidad,
        organizador: s.Organizador || s.organizador,
        activo: s.Activo !== undefined ? s.Activo : (s.activo !== undefined ? s.activo : true),
        fechaCreacion: s.FechaCreacion || s.fechaCreacion || new Date().toISOString(),
        fechaModificacion: s.FechaModificacion || s.fechaModificacion
      }));
    };

    // Mapear evidencias si existen
    const mapEvidencias = (evs: any[]): any[] => {
      if (!Array.isArray(evs)) return [];
      return evs.map(e => ({
        idEvidencia: e.IdEvidencia || e.idEvidencia || e.id || 0,
        id: e.IdEvidencia || e.idEvidencia || e.id || 0,
        idProyecto: e.IdProyecto || e.idProyecto,
        nombreProyecto: e.NombreProyecto || e.nombreProyecto,
        idActividad: e.IdActividad || e.idActividad || idActividad,
        nombreActividad: e.NombreActividad || e.nombreActividad || nombreActividad,
        idSubactividad: e.IdSubactividad || e.idSubactividad,
        nombreSubactividad: e.NombreSubactividad || e.nombreSubactividad,
        idTipoEvidencia: e.IdTipoEvidencia || e.idTipoEvidencia,
        nombreTipoEvidencia: e.NombreTipoEvidencia || e.nombreTipoEvidencia,
        fechaEvidencia: formatDate(e.FechaEvidencia || e.fechaEvidencia),
        seleccionadaParaReporte: e.SeleccionadaParaReporte !== undefined ? e.SeleccionadaParaReporte : (e.seleccionadaParaReporte !== undefined ? e.seleccionadaParaReporte : false),
        tipo: e.Tipo || e.tipo,
        rutaArchivo: e.RutaArchivo || e.rutaArchivo,
        descripcion: e.Descripcion || e.descripcion,
        fechaSubida: e.FechaSubida || e.fechaSubida,
        subidoPor: e.SubidoPor || e.subidoPor,
        nombreSubidoPor: e.NombreSubidoPor || e.nombreSubidoPor
      }));
    };

    // Mapear responsables si existen
    const mapResponsables = (resps: any[]): ActividadResponsable[] => {
      if (!Array.isArray(resps)) return [];
      return resps.map(r => ({
        idActividadResponsable: r.IdActividadResponsable || r.idActividadResponsable || r.id || 0,
        idActividad: r.IdActividad || r.idActividad || idActividad,
        idUsuario: r.IdUsuario || r.idUsuario,
        idDocente: r.IdDocente || r.idDocente,
        idAdmin: r.IdAdmin || r.idAdmin,
        nombrePersona: r.NombreUsuario || r.nombreUsuario || r.NombreDocente || r.nombreDocente || r.NombreAdmin || r.nombreAdmin,
        idTipoResponsable: r.IdTipoResponsable || r.idTipoResponsable || 0,
        nombreTipoResponsable: r.NombreTipoResponsable || r.nombreTipoResponsable,
        departamentoId: r.DepartamentoId || r.departamentoId,
        fechaAsignacion: r.FechaAsignacion || r.fechaAsignacion ? formatDate(r.FechaAsignacion || r.fechaAsignacion) : undefined,
        rolResponsable: r.RolResponsable || r.rolResponsable,
        rolResponsableDetalle: r.RolResponsableDetalle || r.rolResponsableDetalle
      }));
    };

    // Mapear ediciones si existen
    const mapEdiciones = (eds: any[]): any[] => {
      if (!Array.isArray(eds)) return [];
      return eds.map(e => ({
        id: e.IdEdicion || e.idEdicion || e.id || 0,
        idEdicion: e.IdEdicion || e.idEdicion || e.id || 0,
        idActividad: e.IdActividad || e.idActividad || idActividad,
        actividadId: e.IdActividad || e.idActividad || idActividad, // Alias legacy
        nombreActividad: e.NombreActividad || e.nombreActividad || nombreActividad,
        anio: e.Anio || e.anio || 0,
        año: e.Anio || e.anio || 0, // Alias legacy
        fechaInicio: formatDate(e.FechaInicio || e.fechaInicio) || '',
        fechaFin: formatDate(e.FechaFin || e.fechaFin) || '',
        cupos: e.Cupos || e.cupos,
        idCategoriaActividad: e.IdCategoriaActividad || e.idCategoriaActividad || e.CategoriaActividadId || e.categoriaActividadId,
        categoria: e.Categoria || e.categoria,
        lugar: e.Lugar || e.lugar,
        creadoPor: e.CreadoPor || e.creadoPor,
        fechaCreacion: e.FechaCreacion || e.fechaCreacion,
        fechaModificacion: e.FechaModificacion || e.fechaModificacion
      }));
    };

    return {
      id: idActividad,
      idActividad: idActividad,
      nombre: nombreActividad,
      nombreActividad: nombreActividad,
      descripcion: item.Descripcion || item.descripcion,
      
      // Departamentos
      departamentoId: item.DepartamentoId || item.departamentoId,
      nombreDepartamento: item.NombreDepartamento || item.nombreDepartamento,
      departamentoResponsableId: item.DepartamentoResponsableId || item.departamentoResponsableId,
      nombreDepartamentoResponsable: item.NombreDepartamentoResponsable || item.nombreDepartamentoResponsable,
      
      // Tipos e Iniciativas
      idTipoIniciativa: item.IdTipoIniciativa || item.idTipoIniciativa,
      nombreTipoIniciativa: item.NombreTipoIniciativa || item.nombreTipoIniciativa,
      
      // Fechas
      fechaInicio: formatDate(item.FechaInicio || item.fechaInicio),
      fechaFin: formatDate(item.FechaFin || item.fechaFin),
      
      // Documentos
      soporteDocumentoUrl: item.SoporteDocumentoUrl || item.soporteDocumentoUrl,
      idTipoDocumento: item.IdTipoDocumento || item.idTipoDocumento,
      nombreTipoDocumento: item.NombreTipoDocumento || item.nombreTipoDocumento,
      
      // Estado
      idEstadoActividad: item.IdEstadoActividad || item.idEstadoActividad,
      nombreEstadoActividad: item.NombreEstadoActividad || item.nombreEstadoActividad,
      
      // Tipo de Actividad
      idTipoActividad: item.IdTipoActividad || item.idTipoActividad,
      nombreTipoActividad: item.NombreTipoActividad || item.nombreTipoActividad,
      
      // Área de Conocimiento
      idArea: item.IdArea || item.idArea,
      nombreArea: item.NombreArea || item.nombreArea,
      
      // Información adicional
      organizador: item.Organizador || item.organizador,
      modalidad: item.Modalidad || item.modalidad,
      ubicacion: item.Ubicacion || item.ubicacion,
      
      // Nivel
      idNivel: item.IdNivel || item.idNivel,
      nombreNivel: item.NombreNivel || item.nombreNivel,
      nivelActividad: item.NivelActividad !== undefined ? item.NivelActividad : (item.nivelActividad !== undefined ? item.nivelActividad : 1),
      
      // Campos adicionales
      semanaMes: item.SemanaMes || item.semanaMes,
      codigoActividad: item.CodigoActividad || item.codigoActividad,
      idActividadMensualInst: item.IdActividadMensualInst || item.idActividadMensualInst,
      nombreActividadMensualInst: item.NombreActividadMensualInst || item.nombreActividadMensualInst,
      codigoIndicador: item.CodigoIndicador || item.codigoIndicador,
      idTipoActividadJerarquica: item.IdTipoActividadJerarquica || item.idTipoActividadJerarquica,
      nombreTipoActividadJerarquica: item.NombreTipoActividadJerarquica || item.nombreTipoActividadJerarquica,
      
      // Usuario creador
      creadoPor: item.CreadoPor || item.creadoPor || 0,
      nombreCreador: item.NombreCreador || item.nombreCreador,
      fechaCreacion: item.FechaCreacion || item.fechaCreacion || new Date().toISOString(),
      fechaModificacion: item.FechaModificacion || item.fechaModificacion,
      
      // Contadores
      totalSubactividades: item.TotalSubactividades !== undefined ? item.TotalSubactividades : (item.totalSubactividades !== undefined ? item.totalSubactividades : 0),
      totalEvidencias: item.TotalEvidencias !== undefined ? item.TotalEvidencias : (item.totalEvidencias !== undefined ? item.totalEvidencias : 0),
      totalResponsables: item.TotalResponsables !== undefined ? item.TotalResponsables : (item.totalResponsables !== undefined ? item.totalResponsables : 0),
      totalEdiciones: item.TotalEdiciones !== undefined ? item.TotalEdiciones : (item.totalEdiciones !== undefined ? item.totalEdiciones : 0),
      
      // Relaciones
      subactividades: mapSubactividades(item.Subactividades || item.subactividades || []),
      evidencias: mapEvidencias(item.Evidencias || item.evidencias || []),
      responsables: mapResponsables(item.Responsables || item.responsables || []),
      ediciones: mapEdiciones(item.Ediciones || item.ediciones || []),
      
      // Campos de compatibilidad (legacy)
      categoriaActividadId: item.IdTipoActividad || item.idTipoActividad,
      areaConocimientoId: item.IdArea || item.idArea,
      departamento: item.NombreDepartamento || item.nombreDepartamento,
      creadoPorId: item.CreadoPor || item.creadoPor,
      creadoPorNombre: item.NombreCreador || item.nombreCreador,
      tipoIniciativa: item.NombreTipoIniciativa || item.nombreTipoIniciativa,
      activo: item.NombreEstadoActividad === 'Activo' || item.nombreEstadoActividad === 'Activo'
    };
  }
}
