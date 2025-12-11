import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError, from } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ReporteConfig {
  tipoReporte: string;
  planificacionId?: number;
  actividadId?: number; // Mantener para compatibilidad (single activity)
  idActividades?: number[]; // Array de IDs de actividades para selección múltiple
  subactividadId?: number;
  fechaInicio?: string; // Formato: "YYYY-MM-DD" - Período del reporte (filtra actividades dentro de este rango)
  fechaFin?: string; // Formato: "YYYY-MM-DD" - Período del reporte (filtra actividades dentro de este rango)
  formato?: 'pdf' | 'excel' | 'html';
  incluirEvidencias?: boolean;
  incluirParticipaciones?: boolean;
  incluirIndicadores?: boolean;
  incluirDetalleParticipantes?: boolean;
  dividirPorGenero?: boolean;
  nombre?: string;
  rutaArchivo?: string;
  tipoArchivo?: string;
  idDepartamento?: number; // Para filtrar por departamento (legacy)
  idDepartamentos?: number[]; // Array de IDs de departamentos (permite múltiples)
  // @deprecated descripcionImpacto ya no se usa - el backend genera automáticamente este campo desde descripcion + objetivo de cada actividad
  // descripcionImpacto?: string;
  parametrosJson?: string; // JSON stringificado con configuración adicional
}

/**
 * Configuración para reporte institucional
 * Cuando se incluyen FechaInicio y FechaFin, el backend genera automáticamente
 * un Excel con estructura institucional de 15 columnas
 */
export interface ReporteInstitucionalConfig {
  FechaInicio: string; // Formato: "YYYY-MM-DD" - REQUERIDO
  FechaFin: string; // Formato: "YYYY-MM-DD" - REQUERIDO
  ActividadId?: number;
  SubactividadId?: number;
  IncluirEvidencias?: boolean;
  IncluirIndicadores?: boolean;
  IncluirParticipaciones?: boolean;
  IncluirDetalleParticipantes?: boolean;
  DividirPorGenero?: boolean;
  IdDepartamento?: number; // Para filtrar por departamento
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

export interface CampoExtraccion {
  nombre: string;
  etiqueta: string;
}

export interface CamposExtraccionDisponibles {
  estudiantes: CampoExtraccion[];
  docentes: CampoExtraccion[];
  administrativos: CampoExtraccion[];
  actividad: CampoExtraccion[];
  participacion: CampoExtraccion[];
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
   * GET /api/reportes/campos-extraccion
   * Obtener todos los campos disponibles para extracción de datos, agrupados por categoría
   */
  obtenerCamposExtraccionDisponibles(): Observable<CamposExtraccionDisponibles> {
    console.log('🔄 GET Campos Extracción - URL:', `${this.apiUrl}/campos-extraccion`);
    return this.http.get<CamposExtraccionDisponibles>(`${this.apiUrl}/campos-extraccion`).pipe(
      tap(data => {
        console.log('✅ GET Campos Extracción - Respuesta recibida:', data);
        console.log(`📊 Total campos: Estudiantes: ${data.estudiantes?.length || 0}, Docentes: ${data.docentes?.length || 0}, Administrativos: ${data.administrativos?.length || 0}, Actividad: ${data.actividad?.length || 0}, Participación: ${data.participacion?.length || 0}`);
      }),
      catchError(error => {
        console.error('❌ GET Campos Extracción - Error:', error);
        // Si el endpoint no existe, devolver campos por defecto
        console.warn('⚠️ Endpoint de campos no disponible, usando campos por defecto');
        return of({
          estudiantes: [
            { nombre: 'NombreEstudiante', etiqueta: 'Nombre Estudiante' }
          ],
          docentes: [
            { nombre: 'NombreDocente', etiqueta: 'Nombre Docente' }
          ],
          administrativos: [
            { nombre: 'NombreAdministrativo', etiqueta: 'Nombre Administrativo' }
          ],
          actividad: [
            { nombre: 'NombreActividad', etiqueta: 'Actividad' },
            { nombre: 'LugarDesarrollo', etiqueta: 'Lugar de la Actividad' },
            { nombre: 'FechaActividad', etiqueta: 'Fecha de Realización' },
            { nombre: 'FechaFinalizacion', etiqueta: 'Fecha de Finalización' },
            { nombre: 'idModalidad', etiqueta: 'Modalidad' },
            { nombre: 'idIndicador', etiqueta: 'Indicador' }
          ],
          participacion: [
            { nombre: 'TipoParticipante', etiqueta: 'Tipo de Participante' },
            { nombre: 'Sexo', etiqueta: 'Sexo' },
            { nombre: 'idCarrera', etiqueta: 'Carrera' }
          ]
        } as CamposExtraccionDisponibles);
      })
    );
  }

  /**
   * POST /api/Reportes
   * Crear un nuevo reporte en la base de datos
   * NOTA: Este endpoint puede no existir en el backend. Si falla, se ignora silenciosamente.
   */
  create(reporte: Partial<ReporteGenerado>): Observable<ReporteGenerado | null> {
    console.log('🔄 POST Crear Reporte - URL:', this.apiUrl);
    console.log('🔄 POST Crear Reporte - DTO:', reporte);
    
    // Convertir a PascalCase para el backend
    const dto: any = {};
    if (reporte.nombre) dto.Nombre = reporte.nombre;
    if (reporte.tipoReporte) dto.TipoReporte = reporte.tipoReporte;
    if (reporte.formato) dto.Formato = reporte.formato;
    if (reporte.rutaArchivo) dto.RutaArchivo = reporte.rutaArchivo;
    if (reporte['tipoArchivo']) dto.TipoArchivo = reporte['tipoArchivo'];
    if (reporte.estado) dto.Estado = reporte.estado;
    if (reporte.fechaGeneracion) {
      dto.FechaGeneracion = typeof reporte.fechaGeneracion === 'string' 
        ? reporte.fechaGeneracion 
        : (reporte.fechaGeneracion as Date).toISOString();
    }
    // Soporte para ParametrosJson si viene en el reporte
    if (reporte['parametrosJson']) {
      dto.ParametrosJson = reporte['parametrosJson'];
    }
    // Soporte para IdDepartamento
    if (reporte['idDepartamento']) {
      dto.IdDepartamento = reporte['idDepartamento'];
    }
    
    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(response => {
        const item = response.data || response;
        console.log('✅ POST Crear Reporte - Respuesta recibida:', item);
        return this.mapReporte(item);
      }),
      catchError(error => {
        // Si el endpoint no existe (404) o no está permitido (405), retornar null silenciosamente
        if (error.status === 404 || error.status === 405) {
          console.warn('⚠️ POST Crear Reporte - Endpoint no disponible. El reporte no se guardará en la BD.');
          return of(null);
        }
        console.error('❌ POST Crear Reporte - Error:', error);
        // Para otros errores, también retornar null para no bloquear el flujo
        return of(null);
      })
    );
  }

  /**
   * @deprecated Este método intenta usar POST /api/reportes que no existe (405).
   * Usar generarExcel() directamente con fechaInicio y fechaFin en ReporteConfig.
   * El método generarExcel() detecta automáticamente el formato institucional.
   * 
   * Crear un reporte institucional
   * Cuando se incluyen FechaInicio y FechaFin, el backend genera automáticamente
   * un Excel con estructura institucional de 15 columnas
   */
  crearReporteInstitucional(config: ReporteInstitucionalConfig, nombre?: string): Observable<ReporteGenerado | null> {
    console.warn('⚠️ crearReporteInstitucional() está deprecated. Usar generarExcel() directamente con fechaInicio y fechaFin.');
    
    // Convertir a ReporteConfig y usar generarExcel
    const reporteConfig: ReporteConfig = {
      tipoReporte: 'actividad',
      fechaInicio: config.FechaInicio,
      fechaFin: config.FechaFin,
      actividadId: config.ActividadId,
      subactividadId: config.SubactividadId,
      idDepartamento: config.IdDepartamento,
      incluirEvidencias: config.IncluirEvidencias,
      incluirIndicadores: config.IncluirIndicadores,
      incluirParticipaciones: config.IncluirParticipaciones,
      incluirDetalleParticipantes: config.IncluirDetalleParticipantes,
      dividirPorGenero: config.DividirPorGenero,
      nombre: nombre,
      tipoArchivo: 'actividad'
    };
    
    // Usar generarExcel que detecta automáticamente el formato institucional
    // Nota: generarExcel devuelve Blob, no ReporteGenerado
    // Este método está deprecated, pero mantenemos compatibilidad
    return throwError(() => new Error('crearReporteInstitucional() está deprecated. Usar generarExcel() directamente con fechaInicio y fechaFin en ReporteConfig.'));
  }

  /**
   * Formatear fecha de YYYY-MM-DD a DD/MM/YYYY
   */
  private formatearFecha(fecha: string): string {
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
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
   * GET /api/exportar/plantillas/participantes-actividad
   * Obtener plantilla de participantes para actividad (con dropdowns y validaciones)
   */
  obtenerPlantillaParticipantesActividad(): Observable<Blob> {
    console.log('🔄 GET Plantilla Participantes Actividad - URL:', `${this.exportarUrl}/plantillas/participantes-actividad`);
    
    return this.http.get<Blob>(`${this.exportarUrl}/plantillas/participantes-actividad`, {
      responseType: 'blob' as 'json',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    }).pipe(
      map(blob => {
        console.log('✅ GET Plantilla Participantes Actividad - Archivo recibido, tamaño:', blob.size);
        return blob;
      }),
      catchError(error => {
        console.error('❌ GET Plantilla Participantes Actividad - Error:', error);
        return this.handleBlobError(error);
      })
    );
  }

  /**
   * POST /api/exportar/importar/participantes?idSubactividad={id}
   * Importar participantes desde Excel para subactividad
   */
  importarParticipantesPorSubactividad(idSubactividad: number, archivo: File, anio?: number): Observable<any> {
    let url = `${this.exportarUrl}/importar/participantes`;
    const params = new URLSearchParams();
    params.append('idSubactividad', idSubactividad.toString());
    if (anio) {
      params.append('anio', anio.toString());
    }
    url += `?${params.toString()}`;
    
    console.log('🔄 POST Importar Participantes (Subactividad) - URL:', url);
    
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);
    
    return this.http.post<any>(url, formData).pipe(
      map(response => {
        console.log('✅ POST Importar Participantes (Subactividad) - Respuesta recibida:', response);
        return response.data || response;
      }),
      catchError(error => {
        console.error('❌ POST Importar Participantes (Subactividad) - Error:', error);
        throw error;
      })
    );
  }

  /**
   * POST /api/exportar/importar/participantes?idActividad={id}&anio={anio}
   * Importar participantes desde Excel para actividad
   */
  importarParticipantesPorActividad(idActividad: number, archivo: File, anio?: number): Observable<any> {
    let url = `${this.exportarUrl}/importar/participantes`;
    const params = new URLSearchParams();
    params.append('idActividad', idActividad.toString());
    if (anio) {
      params.append('anio', anio.toString());
    }
    url += `?${params.toString()}`;
    
    console.log('🔄 POST Importar Participantes (Actividad) - URL:', url);
    
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);
    
    return this.http.post<any>(url, formData).pipe(
      map(response => {
        console.log('✅ POST Importar Participantes (Actividad) - Respuesta recibida:', response);
        return response.data || response;
      }),
      catchError(error => {
        console.error('❌ POST Importar Participantes (Actividad) - Error:', error);
        throw error;
      })
    );
  }

  /**
   * POST /api/exportar/importar/participantes/{idSubactividad}
   * Importar participantes desde Excel (método legacy - mantener para compatibilidad)
   */
  importarParticipantes(idSubactividad: number, archivo: File): Observable<any> {
    return this.importarParticipantesPorSubactividad(idSubactividad, archivo);
  }

  /**
   * POST /api/Reportes/generar/excel
   * Generar reporte en Excel y guardarlo en la base de datos
   * Este endpoint genera el Excel y lo guarda en la tabla Reporte_Generado
   */
  generarExcel(config: ReporteConfig): Observable<Blob> {
    console.log('🔄 POST Generar Excel - URL:', `${this.apiUrl}/generar/excel`);
    console.log('🔄 POST Generar Excel - Config:', config);
    console.log('🔄 POST Generar Excel - ParametrosJson:', config.parametrosJson);
    
    // Si hay fechaInicio y fechaFin, usar formato institucional con ParametrosJson
    const esReporteInstitucional = config.fechaInicio && config.fechaFin;
    
    // Construir el DTO en PascalCase para el backend
    const dto: any = {
      TipoReporte: config.tipoReporte || '',
      Formato: config.formato || 'excel',
      Nombre: config.nombre || `Reporte ${config.tipoReporte || 'General'}`,
      RutaArchivo: config.rutaArchivo || `reportes/${config.tipoReporte || 'exportacion'}-${Date.now()}.xlsx`,
      TipoArchivo: config.tipoArchivo || 'excel'
    };
    
    // Verificar si es extracción de datos
    const esExtraccionDatos = config.tipoReporte === 'extraccion-datos';
    
    // Si es reporte institucional, enviar parámetros en ParametrosJson
    if (esReporteInstitucional) {
      // Primero parsear parametrosJson si viene del componente (para preservar SinInstrucciones, etc.)
      let parametrosExistentes: any = {};
      if (config.parametrosJson) {
        try {
          parametrosExistentes = JSON.parse(config.parametrosJson);
        } catch (e) {
          console.warn('No se pudo parsear parametrosJson adicional:', e);
        }
      }
      
      // Construir parametrosJson: primero los existentes, luego los del config (tienen prioridad)
      const parametrosJson: any = {
        ...parametrosExistentes, // Merge de parámetros existentes primero (SinInstrucciones, etc.)
        FechaInicio: config.fechaInicio,
        FechaFin: config.fechaFin,
      };
      
      // Convertir actividadId a número si es string y agregarlo (tiene prioridad sobre parametrosExistentes)
      if (config.actividadId) {
        const actividadIdNum = typeof config.actividadId === 'string' ? parseInt(config.actividadId, 10) : Number(config.actividadId);
        if (!isNaN(actividadIdNum) && actividadIdNum > 0) {
          parametrosJson.ActividadId = actividadIdNum;
        }
      }
      // Agregar idActividades (array) si existe
      if (config.idActividades && Array.isArray(config.idActividades) && config.idActividades.length > 0) {
        parametrosJson.IdActividades = config.idActividades;
        console.log('✅ IdActividades agregado al ParametrosJson:', config.idActividades);
      }
      if (config.subactividadId) {
        const subactividadIdNum = typeof config.subactividadId === 'string' ? parseInt(config.subactividadId, 10) : Number(config.subactividadId);
        if (!isNaN(subactividadIdNum) && subactividadIdNum > 0) {
          parametrosJson.SubactividadId = subactividadIdNum;
        }
      }
      if (config.incluirEvidencias !== undefined) parametrosJson.IncluirEvidencias = config.incluirEvidencias;
      if (config.incluirParticipaciones !== undefined) parametrosJson.IncluirParticipaciones = config.incluirParticipaciones;
      if (config.incluirIndicadores !== undefined) parametrosJson.IncluirIndicadores = config.incluirIndicadores;
      if (config.incluirDetalleParticipantes !== undefined) parametrosJson.IncluirDetalleParticipantes = config.incluirDetalleParticipantes;
      if (config.dividirPorGenero !== undefined) parametrosJson.DividirPorGenero = config.dividirPorGenero;
      if (config.idDepartamento) parametrosJson.IdDepartamento = config.idDepartamento;
      if (config.idDepartamentos && config.idDepartamentos.length > 0) parametrosJson.IdDepartamentos = config.idDepartamentos;
      // DescripcionImpacto ya no se envía - el backend lo genera automáticamente desde descripcion + objetivo de cada actividad
      
      dto.ParametrosJson = JSON.stringify(parametrosJson);
      
      console.log('🔍 ParametrosJson construido para reporte institucional:', dto.ParametrosJson);
      console.log('🔍 ParametrosJson parseado (para verificar estructura):', JSON.parse(dto.ParametrosJson));
      
      // DescripcionImpacto ya no se envía - el backend lo genera automáticamente desde descripcion + objetivo de cada actividad
      
      // Asegurar que TipoArchivo contenga "actividad" para que el backend detecte el formato institucional
      if (!dto.TipoArchivo.includes('actividad')) {
        dto.TipoArchivo = 'actividad';
      }
      
      // También enviar campos directamente al DTO para asegurar que el backend los reciba
      if (config.actividadId) {
        const actividadIdNum = typeof config.actividadId === 'string' ? parseInt(config.actividadId, 10) : Number(config.actividadId);
        if (!isNaN(actividadIdNum) && actividadIdNum > 0) {
          dto.ActividadId = actividadIdNum;
        }
      }
      // Enviar idActividades al DTO si existe
      if (config.idActividades && Array.isArray(config.idActividades) && config.idActividades.length > 0) {
        dto.IdActividades = config.idActividades;
        console.log('✅ IdActividades agregado al DTO:', config.idActividades);
      }
      if (config.subactividadId) {
        const subactividadIdNum = typeof config.subactividadId === 'string' ? parseInt(config.subactividadId, 10) : Number(config.subactividadId);
        if (!isNaN(subactividadIdNum) && subactividadIdNum > 0) {
          dto.SubactividadId = subactividadIdNum;
        }
      }
      if (config.idDepartamento) {
        dto.IdDepartamento = config.idDepartamento;
      }
      if (config.idDepartamentos && config.idDepartamentos.length > 0) {
        dto.IdDepartamentos = config.idDepartamentos;
      }
      // DescripcionImpacto ya no se envía - el backend lo genera automáticamente desde descripcion + objetivo de cada actividad
      
      // Agregar idActividades al ParametrosJson también para reportes institucionales
      if (config.idActividades && Array.isArray(config.idActividades) && config.idActividades.length > 0) {
        parametrosJson.IdActividades = config.idActividades;
        console.log('✅ IdActividades agregado al ParametrosJson (reporte institucional):', config.idActividades);
      }
      
      console.log('🔍 DTO para reporte institucional:', dto);
      console.log('🔍 ParametrosJson final:', dto.ParametrosJson);
    } else if (esExtraccionDatos) {
      // Para extracción de datos, usar ParametrosJson con los campos seleccionados
      const parametrosJson: any = {};
      
      if (config.actividadId) parametrosJson.ActividadId = config.actividadId;
      if (config.subactividadId) parametrosJson.SubactividadId = config.subactividadId;
      if (config.fechaInicio) parametrosJson.FechaInicio = config.fechaInicio;
      if (config.fechaFin) parametrosJson.FechaFin = config.fechaFin;
      if (config.idDepartamento) parametrosJson.IdDepartamento = config.idDepartamento;
      if (config.idDepartamentos && config.idDepartamentos.length > 0) parametrosJson.IdDepartamentos = config.idDepartamentos;
      // DescripcionImpacto ya no se envía - el backend lo genera automáticamente desde descripcion + objetivo de cada actividad
      
      // Si viene parametrosJson directamente (con los campos seleccionados), hacer merge
      if (config.parametrosJson) {
        try {
          const parametrosAdicionales = JSON.parse(config.parametrosJson);
          Object.assign(parametrosJson, parametrosAdicionales);
        } catch (e) {
          console.warn('No se pudo parsear parametrosJson adicional:', e);
        }
      }
      
      dto.ParametrosJson = JSON.stringify(parametrosJson);
      
      console.log('🔍 DTO para extracción de datos:', dto);
      console.log('🔍 ParametrosJson final:', dto.ParametrosJson);
      
      // También enviar campos directamente por si el backend los necesita
      if (config.actividadId) dto.ActividadId = config.actividadId;
      if (config.idActividades && Array.isArray(config.idActividades) && config.idActividades.length > 0) {
        dto.IdActividades = config.idActividades;
        console.log('✅ IdActividades agregado al DTO (extracción de datos):', config.idActividades);
      }
      if (config.fechaInicio) dto.FechaInicio = config.fechaInicio;
      if (config.fechaFin) dto.FechaFin = config.fechaFin;
      if (config.idDepartamento) dto.IdDepartamento = config.idDepartamento;
      if (config.idDepartamentos && config.idDepartamentos.length > 0) dto.IdDepartamentos = config.idDepartamentos;
      // DescripcionImpacto ya no se envía - el backend lo genera automáticamente desde descripcion + objetivo de cada actividad
    } else {
      // Formato tradicional: enviar campos directamente
      if (config.actividadId) dto.ActividadId = config.actividadId;
      if (config.idActividades && Array.isArray(config.idActividades) && config.idActividades.length > 0) {
        dto.IdActividades = config.idActividades;
        console.log('✅ IdActividades agregado al DTO (formato tradicional):', config.idActividades);
      }
      if (config.subactividadId) dto.SubactividadId = config.subactividadId;
      if (config.planificacionId) dto.PlanificacionId = config.planificacionId;
      if (config.fechaInicio) dto.FechaInicio = config.fechaInicio;
      if (config.fechaFin) dto.FechaFin = config.fechaFin;
      if (config.incluirEvidencias !== undefined) dto.IncluirEvidencias = config.incluirEvidencias;
      if (config.incluirParticipaciones !== undefined) dto.IncluirParticipaciones = config.incluirParticipaciones;
      if (config.incluirIndicadores !== undefined) dto.IncluirIndicadores = config.incluirIndicadores;
      if (config.incluirDetalleParticipantes !== undefined) dto.IncluirDetalleParticipantes = config.incluirDetalleParticipantes;
      if (config.dividirPorGenero !== undefined) dto.DividirPorGenero = config.dividirPorGenero;
      if (config.idDepartamento) dto.IdDepartamento = config.idDepartamento;
      if (config.idDepartamentos && config.idDepartamentos.length > 0) dto.IdDepartamentos = config.idDepartamentos;
      // DescripcionImpacto ya no se envía - el backend lo genera automáticamente desde descripcion + objetivo de cada actividad
      
      // Si viene parametrosJson directamente, hacer merge en lugar de reemplazar
      if (config.parametrosJson) {
        try {
          const parametrosExistentes = dto.ParametrosJson ? JSON.parse(dto.ParametrosJson) : {};
          const parametrosAdicionales = JSON.parse(config.parametrosJson);
          const parametrosCombinados = { ...parametrosExistentes, ...parametrosAdicionales };
          // Asegurar que los nuevos campos estén incluidos (tienen prioridad)
          if (config.idDepartamentos && config.idDepartamentos.length > 0) parametrosCombinados.IdDepartamentos = config.idDepartamentos;
          if (config.idActividades && Array.isArray(config.idActividades) && config.idActividades.length > 0) {
            parametrosCombinados.IdActividades = config.idActividades;
            console.log('✅ IdActividades agregado al ParametrosJson (formato tradicional):', config.idActividades);
          }
          // DescripcionImpacto ya no se envía - el backend lo genera automáticamente desde descripcion + objetivo de cada actividad
          dto.ParametrosJson = JSON.stringify(parametrosCombinados);
          console.log('🔍 ParametrosJson final (formato tradicional):', dto.ParametrosJson);
        } catch (e) {
          console.warn('No se pudo parsear parametrosJson, usando directamente:', e);
          // Si falla el parse, crear uno nuevo con los campos necesarios
          const parametrosJson: any = JSON.parse(config.parametrosJson);
          // DescripcionImpacto ya no se envía - el backend lo genera automáticamente desde descripcion + objetivo de cada actividad
          dto.ParametrosJson = JSON.stringify(parametrosJson);
        }
      } else {
        // Si no hay parametrosJson, crear uno con los nuevos campos
        const parametrosJson: any = {};
        if (config.idDepartamentos && config.idDepartamentos.length > 0) parametrosJson.IdDepartamentos = config.idDepartamentos;
        if (config.idActividades && Array.isArray(config.idActividades) && config.idActividades.length > 0) {
          parametrosJson.IdActividades = config.idActividades;
          console.log('✅ IdActividades agregado al ParametrosJson (sin parametrosJson previo):', config.idActividades);
        }
        // DescripcionImpacto ya no se envía - el backend lo genera automáticamente desde descripcion + objetivo de cada actividad
        if (Object.keys(parametrosJson).length > 0) {
          dto.ParametrosJson = JSON.stringify(parametrosJson);
          console.log('🔍 ParametrosJson creado (formato tradicional):', dto.ParametrosJson);
        }
      }
      
      // DescripcionImpacto ya no se envía - el backend lo genera automáticamente desde descripcion + objetivo de cada actividad
    }
    
    return this.http.post<Blob>(`${this.apiUrl}/generar/excel`, dto, {
      responseType: 'blob' as 'json',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      observe: 'response' // Necesitamos ver los headers de la respuesta
    }).pipe(
      switchMap(response => {
        const blob = response.body;
        if (!blob) {
          return throwError(() => new Error('No se recibió ningún archivo del servidor'));
        }
        
        // Verificar el Content-Type de la respuesta
        const contentType = response.headers.get('content-type') || '';
        console.log('📄 POST Generar Excel - Content-Type recibido:', contentType);
        console.log('📄 POST Generar Excel - Status:', response.status);
        console.log('📄 POST Generar Excel - Tamaño del blob:', blob.size, 'bytes');
        
        // Si el backend devolvió JSON (puede ser éxito con metadatos o error)
        if (contentType.includes('application/json') || contentType.includes('text/html') || contentType.includes('text/plain')) {
          return from(blob.text()).pipe(
            switchMap((text: string) => {
              let jsonData: any;
              try {
                jsonData = JSON.parse(text);
              } catch {
                jsonData = { message: text || 'Error desconocido del servidor' };
              }
              
              console.log('📄 POST Generar Excel - JSON recibido:', jsonData);
              console.log('📄 POST Generar Excel - Status:', response.status);
              console.log('📄 POST Generar Excel - Tiene id?', !!jsonData.id);
              console.log('📄 POST Generar Excel - Tiene rutaArchivo?', !!jsonData.rutaArchivo);
              
              // Si el status es 201 y tiene id, el backend guardó el reporte y devolvió metadatos
              // Usamos el endpoint GET /api/Reportes/descargar/{id} para descargar el archivo
              if (response.status === 201 && jsonData.id) {
                console.log('✅ POST Generar Excel - El backend guardó el reporte con ID:', jsonData.id);
                console.log('📥 Descargando archivo Excel usando endpoint de descarga con ID:', jsonData.id);
                
                // Usar el método descargar del servicio que usa el endpoint correcto
                return this.descargar(jsonData.id).pipe(
                  map(downloadedBlob => {
                    console.log('✅ Archivo Excel descargado exitosamente, tamaño:', downloadedBlob.size, 'bytes');
                    return downloadedBlob;
                  }),
                  catchError(downloadError => {
                    console.error('❌ Error al descargar el archivo Excel:', downloadError);
                    
                    let errorMessage = `El reporte se generó exitosamente (ID: ${jsonData.id}) pero no se pudo descargar el archivo.`;
                    let backendMessage = downloadError.message || 'Error al descargar el archivo generado';
                    
                    // Si el endpoint no existe (404), proporcionar un mensaje más específico
                    if (downloadError.status === 404) {
                      errorMessage = `El reporte se generó exitosamente (ID: ${jsonData.id}) pero el endpoint de descarga no está disponible.`;
                      backendMessage = 'El endpoint GET /api/Reportes/descargar/{id} no existe en el backend. Por favor, verifica que el backend tenga implementado este endpoint o que el POST /api/Reportes/generar/excel devuelva el archivo directamente.';
                    }
                    
                    return throwError(() => ({
                      status: downloadError.status || 500,
                      error: jsonData,
                      message: errorMessage,
                      backendMessage: backendMessage
                    }));
                  })
                );
              }
              
              // Si es un error real (status diferente de 201 o no tiene rutaArchivo)
              console.error('❌ POST Generar Excel - El servidor devolvió un error o no tiene rutaArchivo. Status:', response.status, 'rutaArchivo:', jsonData.rutaArchivo);
              return throwError(() => ({
                status: response.status,
                error: jsonData,
                message: jsonData.message || jsonData.title || jsonData.detail || 'Error al generar el reporte',
                backendMessage: jsonData.message || jsonData.title || jsonData.detail
              }));
            })
          );
        }
        
        // Validar que el blob sea un archivo Excel válido
        // Los archivos .xlsx son archivos ZIP, deben empezar con "PK" (50 4B en hex)
        if (blob.size < 4) {
          return throwError(() => new Error('El archivo recibido es demasiado pequeño para ser un Excel válido'));
        }
        
        return from(blob.slice(0, 4).arrayBuffer()).pipe(
          switchMap((buffer: ArrayBuffer) => {
            const bytes = new Uint8Array(buffer);
            const isValidExcel = bytes[0] === 0x50 && bytes[1] === 0x4B; // "PK" (ZIP signature)
            
            if (!isValidExcel) {
              // Si no es un Excel válido, intentar leer como texto para ver qué devolvió el servidor
              return from(blob.text()).pipe(
                switchMap((text: string) => {
                  console.error('❌ POST Generar Excel - El archivo no es un Excel válido. Contenido recibido:', text.substring(0, 200));
                  let errorData: any;
                  try {
                    errorData = JSON.parse(text);
                  } catch {
                    errorData = { message: 'El servidor no devolvió un archivo Excel válido' };
                  }
                  return throwError(() => ({
                    status: response.status,
                    error: errorData,
                    message: errorData.message || errorData.title || errorData.detail || 'El servidor no devolvió un archivo Excel válido',
                    backendMessage: errorData.message || errorData.title || errorData.detail
                  }));
                })
              );
            }
            
            console.log('✅ POST Generar Excel - Archivo Excel válido recibido, tamaño:', blob.size, 'bytes');
            return of(blob);
          })
        );
      }),
      catchError(error => {
        console.error('❌ POST Generar Excel - Error:', error);
        // Si ya es un error manejado, pasarlo directamente
        if (error.backendMessage || error.message) {
          return throwError(() => error);
        }
        return this.handleBlobError(error);
      })
    );
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
   * 
   * IMPORTANTE: Este endpoint debe GENERAR el reporte dinámicamente basándose en la configuración
   * almacenada en la base de datos (usando el idReporte), NO debe buscar un archivo almacenado.
   * 
   * El backend debe:
   * 1. Obtener la configuración del reporte desde la BD usando idReporte
   * 2. Generar el archivo Excel dinámicamente con los datos actuales
   * 3. Devolver el archivo Excel binario con Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   */
  descargar(idReporte: number): Observable<Blob> {
    console.log('🔄 GET Descargar Reporte - URL:', `${this.apiUrl}/descargar/${idReporte}`);
    console.log('📋 El backend debe GENERAR el reporte dinámicamente basándose en la configuración del reporte con ID:', idReporte);
    return this.http.get<Blob>(`${this.apiUrl}/descargar/${idReporte}`, {
      responseType: 'blob' as 'json',
      observe: 'response',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    }).pipe(
      switchMap(response => {
        const blob = response.body;
        if (!blob) {
          return throwError(() => new Error('No se recibió ningún archivo del servidor'));
        }
        
        const contentType = response.headers.get('content-type') || '';
        console.log('📄 GET Descargar Reporte - Content-Type:', contentType);
        console.log('📄 GET Descargar Reporte - Tamaño:', blob.size, 'bytes');
        
        // Si el backend devolvió JSON, HTML o texto plano (error o metadatos), leerlo y lanzar error
        if (contentType.includes('application/json') || contentType.includes('text/html') || contentType.includes('text/plain')) {
          return from(blob.text()).pipe(
            switchMap((text: string) => {
              let errorData: any;
              try {
                errorData = JSON.parse(text);
              } catch {
                // Si no es JSON, puede ser texto plano con información del reporte
                errorData = { message: text || 'Error desconocido del servidor' };
              }
              
              console.error('❌ GET Descargar Reporte - El servidor devolvió un error o metadatos en lugar del archivo:', errorData);
              console.error('❌ GET Descargar Reporte - Status Code:', response.status);
              console.error('❌ GET Descargar Reporte - Content-Type:', contentType);
              
              // Construir mensaje de error más descriptivo
              let errorMessage = 'Error al generar/descargar el reporte.';
              if (response.status === 500) {
                errorMessage = 'Error interno del servidor al generar el reporte. El backend no pudo generar el archivo Excel.';
              } else if (response.status === 404) {
                errorMessage = 'El reporte no se encontró o el endpoint no está disponible.';
              }
              
              // El backend debe generar el reporte dinámicamente, no devolver metadatos
              return throwError(() => ({
                status: response.status,
                error: errorData,
                message: errorData.message || errorData.title || errorData.detail || errorMessage,
                backendMessage: errorData.message || errorData.title || errorData.detail || `El endpoint GET /api/Reportes/descargar/${idReporte} debe generar el reporte dinámicamente y devolver el archivo Excel binario con Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet. Error recibido: ${response.status} ${response.statusText}`
              }));
            })
          );
        }
        
        // Validar que el blob sea un archivo Excel válido
        // Los archivos .xlsx son archivos ZIP, deben empezar con "PK" (50 4B en hex)
        if (blob.size < 4) {
          return throwError(() => new Error('El archivo recibido es demasiado pequeño para ser un Excel válido'));
        }
        
        return from(blob.slice(0, 4).arrayBuffer()).pipe(
          switchMap((buffer: ArrayBuffer) => {
            const bytes = new Uint8Array(buffer);
            const isValidExcel = bytes[0] === 0x50 && bytes[1] === 0x4B; // "PK" (ZIP signature)
            
            if (!isValidExcel) {
              // Si no es un Excel válido, intentar leer como texto para ver qué devolvió el servidor
              return from(blob.text()).pipe(
                switchMap((text: string) => {
                  console.error('❌ GET Descargar Reporte - El archivo no es un Excel válido. Contenido recibido:', text);
                  
                  let errorData: any;
                  try {
                    errorData = JSON.parse(text);
                  } catch {
                    errorData = { message: text || 'El servidor no devolvió un archivo Excel válido' };
                  }
                  
                  return throwError(() => ({
                    status: 500,
                    error: errorData,
                    message: errorData.message || 'El servidor no devolvió un archivo Excel válido. El backend debe generar el reporte dinámicamente y devolver el archivo Excel binario.',
                    backendMessage: errorData.message || 'El endpoint GET /api/Reportes/descargar/{id} debe generar el reporte dinámicamente y devolver el archivo Excel binario con Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  }));
                })
              );
            }
            
            console.log('✅ GET Descargar Reporte - Archivo Excel válido recibido, tamaño:', blob.size, 'bytes');
            return of(blob);
          })
        );
      }),
      catchError((error: any) => {
        console.error('❌ GET Descargar Reporte - Error:', error);
        
        // Si el error es 404 o 500, el backend puede estar devolviendo un JSON con el mensaje de error
        if ((error.status === 404 || error.status === 500) && error.error) {
          // Si error.error es un Blob (porque responseType es 'blob'), leerlo como texto
          if (error.error instanceof Blob) {
            return from(error.error.text() as Promise<string>).pipe(
              switchMap((text: string) => {
                let errorData: any;
                try {
                  errorData = JSON.parse(text);
                } catch {
                  errorData = { message: text || 'Error al generar o descargar el reporte' };
                }
                
                const statusCode = error.status;
                const statusMessage = statusCode === 404 
                  ? 'no existe o no está configurado'
                  : 'tiene un error interno';
                
                return throwError(() => ({
                  status: statusCode,
                  error: errorData,
                  message: errorData.message || errorData.title || errorData.detail || `El endpoint GET /api/reportes/descargar/${idReporte} ${statusMessage}. El backend debe implementar este endpoint para generar el reporte dinámicamente basándose en la configuración almacenada en la base de datos.`,
                  backendMessage: errorData.message || errorData.title || errorData.detail || `El endpoint GET /api/reportes/descargar/${idReporte} debe: 1) Obtener la configuración del reporte desde la BD usando idReporte=${idReporte}, 2) Generar el Excel dinámicamente con los datos actuales, 3) Devolver el archivo Excel binario con Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
                }));
              })
            );
          } else if (typeof error.error === 'object' && error.error.message) {
            // Si ya es un objeto JSON
            const statusCode = error.status;
            const statusMessage = statusCode === 404 
              ? 'no existe o no está configurado'
              : 'tiene un error interno';
            
            return throwError(() => ({
              status: statusCode,
              error: error.error,
              message: error.error.message || error.error.title || error.error.detail || `El endpoint GET /api/reportes/descargar/${idReporte} ${statusMessage}. El backend debe implementar este endpoint para generar el reporte dinámicamente basándose en la configuración almacenada en la base de datos.`,
              backendMessage: error.error.message || error.error.title || error.error.detail || `El endpoint GET /api/reportes/descargar/${idReporte} debe: 1) Obtener la configuración del reporte desde la BD usando idReporte=${idReporte}, 2) Generar el Excel dinámicamente con los datos actuales, 3) Devolver el archivo Excel binario con Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
            }));
          }
        }
        
        // Para otros errores, usar el manejo de errores de blob estándar
        return this.handleBlobError(error);
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

