import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ReporteConfig {
  tipoReporte: string;
  planificacionId?: number;
  actividadId?: number;
  subactividadId?: number;
  fechaInicio?: string;
  fechaFin?: string;
  formato?: 'pdf' | 'excel' | 'html';
  incluirEvidencias?: boolean;
  incluirParticipaciones?: boolean;
  incluirIndicadores?: boolean;
  nombre?: string;
  rutaArchivo?: string;
  tipoArchivo?: string;
}

export interface ReporteGenerado {
  id: number;
  idReporte?: number; // Alias para compatibilidad
  nombre?: string;
  tipoReporte?: string;
  fechaGeneracion?: Date | string;
  formato?: string;
  rutaArchivo?: string;
  estado?: 'generando' | 'completado' | 'error';
  [key: string]: any; // Para campos adicionales del backend
}

export interface ReportePersonalizadoRequest {
  tipoReporte?: string;
  filtros?: any;
  parametros?: any;
  [key: string]: any;
}

export interface ReporteEstudiantesGenero {
  idActividad: number;
  nombreActividad?: string;
  generos: Array<{
    genero: string;
    codigo?: string;
    cantidad: number;
    porcentaje?: number;
  }>;
  total?: number;
}

export interface ReportePorDepartamento {
  departamentoId: number;
  nombreDepartamento?: string;
  cantidad?: number;
  porcentaje?: number;
  detalles?: any[];
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reportes`;
  private exportarUrl = `${environment.apiUrl}/exportar`;

  /**
   * GET /api/Reportes
   * Obtener lista de todos los reportes
   */
  getAll(): Observable<ReporteGenerado[]> {
    console.log('🔄 GET Reportes - URL:', this.apiUrl);
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        const itemsArray = Array.isArray(items) ? items : [];
        console.log('✅ GET Reportes - Respuesta recibida:', itemsArray.length, 'items');
        return itemsArray.map(item => this.mapReporte(item));
      }),
      catchError(error => {
        console.error('❌ GET Reportes - Error:', error);
        const backendMessage =
          error?.error?.message ||
          error?.error?.title ||
          error?.message ||
          'No se pudieron cargar los reportes. El servidor respondió con un error.';
        if (error.status === 404) {
          console.warn('⚠️ GET Reportes - Endpoint no encontrado (404)');
          return of([]);
        }
        return throwError(() => new Error(backendMessage));
      })
    );
  }

  /**
   * GET /api/Reportes/{id}
   * Obtener un reporte por ID
   */
  getById(id: number): Observable<ReporteGenerado | null> {
    console.log('🔄 GET Reporte por ID - URL:', `${this.apiUrl}/${id}`);
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        const item = response.data || response;
        if (!item) return null;
        console.log('✅ GET Reporte por ID - Respuesta recibida:', item);
        return this.mapReporte(item);
      }),
      catchError(error => {
        console.error('❌ GET Reporte por ID - Error:', error);
        if (error.status === 404) {
          console.warn('⚠️ GET Reporte por ID - No encontrado (404)');
          return of(null);
        }
        throw error;
      })
    );
  }

  /**
   * DELETE /api/Reportes/{id}
   * Eliminar un reporte
   */
  delete(id: number): Observable<boolean> {
    console.log('🔄 DELETE Reporte - URL:', `${this.apiUrl}/${id}`);
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
      map(response => {
        console.log('✅ DELETE Reporte - Respuesta recibida:', response.status);
        return response.status === 200 || response.status === 204;
      }),
      catchError(error => {
        console.error('❌ DELETE Reporte - Error:', error);
        throw error;
      })
    );
  }

  /**
   * POST /api/exportar/excel/actividades
   * Exportar actividades a Excel
   */
  exportarExcelActividades(config?: ReporteConfig): Observable<Blob> {
    console.log('🔄 POST Exportar Excel Actividades - URL:', `${this.exportarUrl}/excel/actividades`);
    
    const dto: any = {};
    if (config) {
      if (config.actividadId) dto.ActividadId = config.actividadId;
      if (config.planificacionId) dto.PlanificacionId = config.planificacionId;
      if (config.fechaInicio) dto.FechaInicio = config.fechaInicio;
      if (config.fechaFin) dto.FechaFin = config.fechaFin;
    }
    
    console.log('🔄 POST Exportar Excel Actividades - DTO enviado:', dto);
    
    return this.http.post<Blob>(`${this.exportarUrl}/excel/actividades`, dto, {
      responseType: 'blob' as 'json',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    }).pipe(
      map(blob => {
        console.log('✅ POST Exportar Excel Actividades - Archivo recibido, tamaño:', blob.size);
        return blob;
      }),
      catchError(error => {
        console.error('❌ POST Exportar Excel Actividades - Error:', error);
        return this.handleBlobError(error);
      })
    );
  }

  /**
   * POST /api/exportar/excel/todo
   * Exportar todo a Excel
   */
  exportarExcelTodo(config?: ReporteConfig): Observable<Blob> {
    console.log('🔄 POST Exportar Excel Todo - URL:', `${this.exportarUrl}/excel/todo`);
    
    const dto: any = {};
    if (config) {
      if (config.fechaInicio) dto.FechaInicio = config.fechaInicio;
      if (config.fechaFin) dto.FechaFin = config.fechaFin;
    }
    
    console.log('🔄 POST Exportar Excel Todo - DTO enviado:', dto);
    
    return this.http.post<Blob>(`${this.exportarUrl}/excel/todo`, dto, {
      responseType: 'blob' as 'json',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    }).pipe(
      map(blob => {
        console.log('✅ POST Exportar Excel Todo - Archivo recibido, tamaño:', blob.size);
        return blob;
      }),
      catchError(error => {
        console.error('❌ POST Exportar Excel Todo - Error:', error);
        return this.handleBlobError(error);
      })
    );
  }

  /**
   * POST /api/exportar/excel/participaciones
   * Exportar participaciones a Excel
   */
  exportarExcelParticipaciones(config?: ReporteConfig): Observable<Blob> {
    console.log('🔄 POST Exportar Excel Participaciones - URL:', `${this.exportarUrl}/excel/participaciones`);
    
    const dto: any = {};
    if (config) {
      if (config.subactividadId) dto.SubactividadId = config.subactividadId;
      if (config.actividadId) dto.ActividadId = config.actividadId;
      if (config.fechaInicio) dto.FechaInicio = config.fechaInicio;
      if (config.fechaFin) dto.FechaFin = config.fechaFin;
    }
    
    console.log('🔄 POST Exportar Excel Participaciones - DTO enviado:', dto);
    
    return this.http.post<Blob>(`${this.exportarUrl}/excel/participaciones`, dto, {
      responseType: 'blob' as 'json',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    }).pipe(
      map(blob => {
        console.log('✅ POST Exportar Excel Participaciones - Archivo recibido, tamaño:', blob.size);
        return blob;
      }),
      catchError(error => {
        console.error('❌ POST Exportar Excel Participaciones - Error:', error);
        return this.handleBlobError(error);
      })
    );
  }

  /**
   * GET /api/exportar/plantillas/participantes
   * Obtener plantilla de participantes
   */
  obtenerPlantillaParticipantes(): Observable<Blob> {
    console.log('🔄 GET Plantilla Participantes - URL:', `${this.exportarUrl}/plantillas/participantes`);
    
    return this.http.get<Blob>(`${this.exportarUrl}/plantillas/participantes`, {
      responseType: 'blob' as 'json',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    }).pipe(
      map(blob => {
        console.log('✅ GET Plantilla Participantes - Archivo recibido, tamaño:', blob.size);
        return blob;
      }),
      catchError(error => {
        console.error('❌ GET Plantilla Participantes - Error:', error);
        return this.handleBlobError(error);
      })
    );
  }

  /**
   * POST /api/exportar/importar/participantes/{idSubactividad}
   * Importar participantes desde Excel
   */
  importarParticipantes(idSubactividad: number, archivo: File): Observable<any> {
    console.log('🔄 POST Importar Participantes - URL:', `${this.exportarUrl}/importar/participantes/${idSubactividad}`);
    
    const formData = new FormData();
    formData.append('archivo', archivo);
    
    return this.http.post<any>(`${this.exportarUrl}/importar/participantes/${idSubactividad}`, formData).pipe(
      map(response => {
        console.log('✅ POST Importar Participantes - Respuesta recibida:', response);
        return response.data || response;
      }),
      catchError(error => {
        console.error('❌ POST Importar Participantes - Error:', error);
        throw error;
      })
    );
  }

  /**
   * POST /api/Reportes/generar/excel
   * Generar reporte en Excel (método legacy, ahora usa exportarExcelActividades)
   * @deprecated Usar exportarExcelActividades, exportarExcelTodo o exportarExcelParticipaciones
   */
  generarExcel(config: ReporteConfig): Observable<Blob> {
    console.log('🔄 POST Generar Excel (legacy) - Redirigiendo a exportarExcelActividades');
    
    // Determinar qué endpoint usar basado en el tipo de reporte
    const tipoReporte = (config.tipoReporte || '').toLowerCase();
    
    if (tipoReporte.includes('participacion') || tipoReporte.includes('participaciones')) {
      return this.exportarExcelParticipaciones(config);
    } else if (tipoReporte.includes('todo') || tipoReporte === 'completo') {
      return this.exportarExcelTodo(config);
    } else {
      // Por defecto, exportar actividades
      return this.exportarExcelActividades(config);
    }
  }

  /**
   * Manejar errores de respuesta Blob
   */
  private handleBlobError(error: any): Observable<never> {
    if (error?.error instanceof Blob) {
      return from(error.error.text() as Promise<string>).pipe(
        switchMap((text: string) => {
          let parsed: any = text;
          try {
            parsed = JSON.parse(text);
          } catch {
            // keep raw text
          }

          const backendMessage =
            typeof parsed === 'string'
              ? parsed
              : parsed?.detail || parsed?.message || parsed?.title || text;

          (error as any).backendMessage = backendMessage;
          (error as any).validationErrors = parsed?.errors;
          (error as any).error = parsed;

          if (parsed?.errors && typeof parsed.errors === 'object') {
            console.error('❌ Error con validaciones:', parsed.errors);
          }

          return throwError(() => error);
        })
      );
    }
    return throwError(() => error);
  }

  /**
   * GET /api/Reportes/descargar/{idReporte}
   * Descargar un reporte por ID
   */
  descargar(idReporte: number): Observable<Blob> {
    console.log('🔄 GET Descargar Reporte - URL:', `${this.apiUrl}/descargar/${idReporte}`);
    return this.http.get<Blob>(`${this.apiUrl}/descargar/${idReporte}`, {
      responseType: 'blob' as 'json'
    }).pipe(
      map(blob => {
        console.log('✅ GET Descargar Reporte - Archivo recibido, tamaño:', blob.size);
        return blob;
      }),
      catchError(error => {
        console.error('❌ GET Descargar Reporte - Error:', error);
        throw error;
      })
    );
  }

  /**
   * POST /api/Reportes/personalizado/consultar
   * Consultar reporte personalizado
   */
  consultarPersonalizado(request: ReportePersonalizadoRequest): Observable<any> {
    console.log('🔄 POST Consultar Personalizado - URL:', `${this.apiUrl}/personalizado/consultar`);
    console.log('🔄 POST Consultar Personalizado - Request:', request);
    
    // Convertir a PascalCase si es necesario
    const dto: any = { ...request };
    if (request.tipoReporte) {
      dto.TipoReporte = request.tipoReporte;
      delete dto.tipoReporte;
    }
    
    return this.http.post<any>(`${this.apiUrl}/personalizado/consultar`, dto).pipe(
      map(response => {
        const item = response.data || response;
        console.log('✅ POST Consultar Personalizado - Respuesta recibida:', item);
        return item;
      }),
      catchError(error => {
        console.error('❌ POST Consultar Personalizado - Error:', error);
        throw error;
      })
    );
  }

  /**
   * GET /api/Reportes/actividad/{idActividad}/estudiantes/genero
   * Reporte de estudiantes por género por actividad
   */
  getEstudiantesPorGeneroPorActividad(idActividad: number): Observable<ReporteEstudiantesGenero> {
    console.log('🔄 GET Estudiantes por Género - URL:', `${this.apiUrl}/actividad/${idActividad}/estudiantes/genero`);
    return this.http.get<any>(`${this.apiUrl}/actividad/${idActividad}/estudiantes/genero`).pipe(
      map(response => {
        const item = response.data || response;
        console.log('✅ GET Estudiantes por Género - Respuesta recibida:', item);
        return item;
      }),
      catchError(error => {
        console.error('❌ GET Estudiantes por Género - Error:', error);
        throw error;
      })
    );
  }

  /**
   * GET /api/Reportes/actividades/departamentos
   * Reporte de actividades por departamentos
   */
  getActividadesPorDepartamentos(): Observable<ReportePorDepartamento[]> {
    console.log('🔄 GET Actividades por Departamentos - URL:', `${this.apiUrl}/actividades/departamentos`);
    return this.http.get<any>(`${this.apiUrl}/actividades/departamentos`).pipe(
      map(response => {
        const items = response.data || response;
        const itemsArray = Array.isArray(items) ? items : [];
        console.log('✅ GET Actividades por Departamentos - Respuesta recibida:', itemsArray.length, 'items');
        return itemsArray;
      }),
      catchError(error => {
        console.error('❌ GET Actividades por Departamentos - Error:', error);
        if (error.status === 404) {
          console.warn('⚠️ GET Actividades por Departamentos - Endpoint no encontrado (404)');
          return of([]);
        }
        throw error;
      })
    );
  }

  /**
   * GET /api/Reportes/estudiantes/departamentos
   * Reporte de estudiantes por departamentos
   */
  getEstudiantesPorDepartamentos(): Observable<ReportePorDepartamento[]> {
    console.log('🔄 GET Estudiantes por Departamentos - URL:', `${this.apiUrl}/estudiantes/departamentos`);
    return this.http.get<any>(`${this.apiUrl}/estudiantes/departamentos`).pipe(
      map(response => {
        const items = response.data || response;
        const itemsArray = Array.isArray(items) ? items : [];
        console.log('✅ GET Estudiantes por Departamentos - Respuesta recibida:', itemsArray.length, 'items');
        return itemsArray;
      }),
      catchError(error => {
        console.error('❌ GET Estudiantes por Departamentos - Error:', error);
        if (error.status === 404) {
          console.warn('⚠️ GET Estudiantes por Departamentos - Endpoint no encontrado (404)');
          return of([]);
        }
        throw error;
      })
    );
  }

  /**
   * GET /api/Reportes/docentes/departamentos
   * Reporte de docentes por departamentos
   */
  getDocentesPorDepartamentos(): Observable<ReportePorDepartamento[]> {
    console.log('🔄 GET Docentes por Departamentos - URL:', `${this.apiUrl}/docentes/departamentos`);
    return this.http.get<any>(`${this.apiUrl}/docentes/departamentos`).pipe(
      map(response => {
        const items = response.data || response;
        const itemsArray = Array.isArray(items) ? items : [];
        console.log('✅ GET Docentes por Departamentos - Respuesta recibida:', itemsArray.length, 'items');
        return itemsArray;
      }),
      catchError(error => {
        console.error('❌ GET Docentes por Departamentos - Error:', error);
        if (error.status === 404) {
          console.warn('⚠️ GET Docentes por Departamentos - Endpoint no encontrado (404)');
          return of([]);
        }
        throw error;
      })
    );
  }

  /**
   * GET /api/Reportes/proyectos/departamentos
   * Reporte de proyectos por departamentos
   */
  getProyectosPorDepartamentos(): Observable<ReportePorDepartamento[]> {
    console.log('🔄 GET Proyectos por Departamentos - URL:', `${this.apiUrl}/proyectos/departamentos`);
    return this.http.get<any>(`${this.apiUrl}/proyectos/departamentos`).pipe(
      map(response => {
        const items = response.data || response;
        const itemsArray = Array.isArray(items) ? items : [];
        console.log('✅ GET Proyectos por Departamentos - Respuesta recibida:', itemsArray.length, 'items');
        return itemsArray;
      }),
      catchError(error => {
        console.error('❌ GET Proyectos por Departamentos - Error:', error);
        if (error.status === 404) {
          console.warn('⚠️ GET Proyectos por Departamentos - Endpoint no encontrado (404)');
          return of([]);
        }
        throw error;
      })
    );
  }

  // Métodos de mapeo privados
  private mapReporte(item: any): ReporteGenerado {
    return {
      id: item.id || item.Id || item.idReporte || item.IdReporte || 0,
      idReporte: item.idReporte || item.IdReporte || item.id || item.Id || 0,
      nombre: item.nombre || item.Nombre || '',
      tipoReporte: item.tipoReporte || item.TipoReporte || '',
      fechaGeneracion: item.fechaGeneracion 
        ? (typeof item.fechaGeneracion === 'string' ? new Date(item.fechaGeneracion) : item.fechaGeneracion)
        : (item.FechaGeneracion 
          ? (typeof item.FechaGeneracion === 'string' ? new Date(item.FechaGeneracion) : item.FechaGeneracion)
          : new Date()),
      formato: item.formato || item.Formato || '',
      rutaArchivo: item.rutaArchivo || item.RutaArchivo || undefined,
      estado: item.estado || item.Estado || 'completado'
    };
  }

  // Métodos legacy para compatibilidad (deprecados, usar los nuevos métodos)
  /**
   * @deprecated Usar getAll() en su lugar
   */
  getReportes(filters?: any): Observable<ReporteGenerado[]> {
    return this.getAll();
  }

  /**
   * @deprecated Usar getById() en su lugar
   */
  getReporteById(id: number): Observable<ReporteGenerado> {
    return this.getById(id).pipe(
      map(reporte => {
        if (!reporte) {
          throw new Error(`Reporte con ID ${id} no encontrado`);
        }
        return reporte;
      })
    );
  }

  /**
   * @deprecated Usar descargar() en su lugar
   */
  descargarReporte(id: number): Observable<Blob> {
    return this.descargar(id);
  }

  /**
   * @deprecated Usar delete() en su lugar
   */
  deleteReporte(id: number): Observable<void> {
    return this.delete(id).pipe(
      map(() => undefined)
    );
  }

  /**
   * @deprecated Usar generarExcel() en su lugar
   */
  generarReporte(config: ReporteConfig): Observable<ReporteGenerado> {
    // Este método legacy intenta generar un reporte y devolver un objeto ReporteGenerado
    // Pero el nuevo endpoint genera Excel directamente, así que adaptamos
    return this.generarExcel(config).pipe(
      map(blob => {
        // Crear un objeto ReporteGenerado simulado
        return {
          id: Date.now(), // ID temporal
          nombre: `reporte-${config.tipoReporte}-${new Date().toISOString()}`,
          tipoReporte: config.tipoReporte,
          fechaGeneracion: new Date(),
          formato: 'excel',
          estado: 'completado'
        };
      })
    );
  }
}

