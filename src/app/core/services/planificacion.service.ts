import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { 
  Planificacion, 
  PlanificacionCreate, 
  PlanificacionUpdate,
  PlanificacionFilterDto,
  PlanificacionArbol,
  PlanificacionResumen
} from '../models/planificacion';

@Injectable({ providedIn: 'root' })
export class PlanificacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/planificaciones`;

  // CRUD básico - Alineado con IPlanificacionService.GetAllAsync()
  getAll(filter?: PlanificacionFilterDto): Observable<Planificacion[]> {
    let params = new HttpParams();
    
    if (filter) {
      if (filter.TipoId !== undefined && filter.TipoId !== null) {
        params = params.append('TipoId', filter.TipoId.toString());
      }
      if (filter.Anio !== undefined && filter.Anio !== null) {
        params = params.append('Anio', filter.Anio.toString());
      }
      if (filter.PadreId !== undefined && filter.PadreId !== null) {
        params = params.append('PadreId', filter.PadreId.toString());
      }
      // IMPORTANTE: Solo enviar IncluirInactivos si es explícitamente true
      // Si no se envía, el backend debería devolver solo activas por defecto
      if (filter.IncluirInactivos === true) {
        params = params.append('IncluirInactivos', 'true');
      }
      if (filter.PeriodoInicio) {
        params = params.append('PeriodoInicio', filter.PeriodoInicio);
      }
      if (filter.PeriodoFin) {
        params = params.append('PeriodoFin', filter.PeriodoFin);
      }
      if (filter.Profundidad !== undefined && filter.Profundidad !== null) {
        params = params.append('Profundidad', filter.Profundidad.toString());
      }
      if (filter.Page !== undefined && filter.Page !== null) {
        params = params.append('Page', filter.Page.toString());
      }
      if (filter.PageSize !== undefined && filter.PageSize !== null) {
        params = params.append('PageSize', filter.PageSize.toString());
      }
      if (filter.IncluirActividades !== undefined) {
        params = params.append('IncluirActividades', filter.IncluirActividades.toString());
      }
      if (filter.IncluirReportes !== undefined) {
        params = params.append('IncluirReportes', filter.IncluirReportes.toString());
      }
    }
    
    // Log para debugging
    const paramsString = params.toString();
    console.log('🔄 GET Planificaciones - Filtros enviados:', filter);
    console.log('🔄 GET Planificaciones - Query params:', paramsString);
    console.log('🔄 GET Planificaciones - URL completa:', `${this.apiUrl}${paramsString ? '?' + paramsString : ''}`);
    
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        console.log('✅ GET Planificaciones - Respuesta recibida:', response);
        const items = response.data || response;
        let result = Array.isArray(items) ? items.map(item => this.mapPlanificacion(item)) : [];
        
        // Si no se especifica IncluirInactivos, filtrar solo activas en el frontend
        // (por si el backend no lo hace automáticamente)
        if (!filter || filter.IncluirInactivos !== true) {
          const antes = result.length;
          result = result.filter(p => p.activo === true);
          console.log(`🔍 GET Planificaciones - Filtrado frontend: ${antes} → ${result.length} (solo activas)`);
        }
        
        console.log('✅ GET Planificaciones - Total items mapeados:', result.length);
        console.log('✅ GET Planificaciones - Items activos:', result.filter(p => p.activo).length);
        console.log('✅ GET Planificaciones - Items inactivos:', result.filter(p => !p.activo).length);
        return result;
      }),
      catchError(error => {
        // Silenciar errores 404 si el endpoint no existe aún
        if (error.status !== 404) {
          console.error('❌ GET Planificaciones - Error:', error);
        }
        return of([]);
      })
    );
  }

  // Alineado con IPlanificacionService.GetByIdAsync()
  getById(id: number): Observable<Planificacion | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapPlanificacion(item)),
      catchError(error => {
        if (error.status === 404) {
          return of(null);
        }
        console.error('Error fetching planificacion by id:', error);
        return of(null);
      })
    );
  }

  // Alineado con IPlanificacionService.CreateAsync()
  create(data: PlanificacionCreate): Observable<Planificacion> {
    // El backend espera PlanificacionCreateDto con PascalCase
    // Asegurar que Activo sea un booleano explícito
    const activoValue = data.activo !== undefined ? Boolean(data.activo) : true;
    
    const dto: any = {
      Nombre: data.nombre,
      Descripcion: data.descripcion || null,
      IdTipoPlanificacion: data.idTipoPlanificacion,
      IdPlanificacionPadre: data.idPlanificacionPadre || null,
      PeriodoInicio: data.periodoInicio || null,
      PeriodoFin: data.periodoFin || null,
      Anio: data.anio,
      Activo: activoValue
    };
    
    console.log('🔄 CREATE Planificacion - Valor Activo enviado:', activoValue, 'Tipo:', typeof activoValue);
    
    // Remover campos null
    Object.keys(dto).forEach(key => {
      if (dto[key] === null) {
        delete dto[key];
      }
    });
    
    console.log('🔄 CREATE Planificacion - Enviando datos:', dto);
    
    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(response => {
        console.log('✅ CREATE Planificacion - Respuesta completa:', response);
        console.log('✅ CREATE Planificacion - Tipo de respuesta:', typeof response);
        console.log('✅ CREATE Planificacion - Es array?', Array.isArray(response));
        
        const item = response.data || response;
        console.log('✅ CREATE Planificacion - Item extraído:', item);
        
        if (!item) {
          console.error('❌ CREATE Planificacion - Respuesta vacía o null');
          throw new Error('No se recibió respuesta del servidor');
        }
        
        const mapped = this.mapPlanificacion(item);
        console.log('✅ CREATE Planificacion - Mapeado exitoso:', mapped);
        return mapped;
      }),
      catchError(error => {
        console.error('❌ CREATE Planificacion - Error:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.error);
        throw error;
      })
    );
  }

  // Alineado con IPlanificacionService.UpdateAsync()
  update(id: number, data: PlanificacionUpdate): Observable<boolean> {
    // El backend espera PlanificacionUpdateDto con PascalCase
    // Asegurar que Activo sea un booleano explícito
    const activoValue = Boolean(data.activo);
    
    const dto: any = {
      Nombre: data.nombre,
      Descripcion: data.descripcion || null,
      IdTipoPlanificacion: data.idTipoPlanificacion,
      IdPlanificacionPadre: data.idPlanificacionPadre || null,
      PeriodoInicio: data.periodoInicio || null,
      PeriodoFin: data.periodoFin || null,
      Anio: data.anio,
      Activo: activoValue
    };
    
    console.log('🔄 UPDATE Planificacion - Valor Activo enviado:', activoValue, 'Tipo:', typeof activoValue);
    
    // Remover campos null
    Object.keys(dto).forEach(key => {
      if (dto[key] === null) {
        delete dto[key];
      }
    });
    
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto).pipe(
      map(() => true),
      catchError(error => {
        if (error.status === 404) {
          return of(false);
        }
        console.error('Error updating planificacion:', error);
        return of(false);
      })
    );
  }

  // Alineado con IPlanificacionService.DeleteAsync()
  delete(id: number): Observable<boolean> {
    console.log('🔄 DELETE Planificacion - Eliminando ID:', id);
    console.log('🔄 DELETE Planificacion - URL:', `${this.apiUrl}/${id}`);
    
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
      map((response) => {
        console.log('✅ DELETE Planificacion - Status HTTP:', response.status);
        console.log('✅ DELETE Planificacion - Headers:', response.headers);
        console.log('✅ DELETE Planificacion - Body:', response.body);
        console.log('✅ DELETE Planificacion - Tipo de body:', typeof response.body);
        
        // El backend puede devolver:
        // - 204 No Content (sin body) -> éxito
        // - 200 OK con body boolean -> éxito si es true
        // - 200 OK con body objeto -> verificar si tiene éxito
        
        if (response.status === 204) {
          // Respuesta vacía (204 No Content) significa éxito
          console.log('✅ DELETE Planificacion - Respuesta 204 (No Content) - Éxito');
          return true;
        }
        
        if (response.status === 200) {
          const body = response.body;
          
          // Si el body es null o undefined, considerar éxito (algunos backends devuelven 200 con body null)
          if (body === null || body === undefined) {
            console.log('✅ DELETE Planificacion - Respuesta 200 con body null - Éxito');
            return true;
          }
          
          // Si es un booleano directo
          if (typeof body === 'boolean') {
            console.log('✅ DELETE Planificacion - Respuesta boolean:', body);
            return body;
          }
          
          // Si es un objeto, verificar propiedades de éxito
          if (typeof body === 'object') {
            console.log('✅ DELETE Planificacion - Respuesta objeto:', body);
            
            if ('success' in body) {
              const success = Boolean(body.success);
              console.log('✅ DELETE Planificacion - Propiedad success:', success);
              return success;
            }
            if ('result' in body) {
              const result = Boolean(body.result);
              console.log('✅ DELETE Planificacion - Propiedad result:', result);
              return result;
            }
            if ('deleted' in body) {
              const deleted = Boolean(body.deleted);
              console.log('✅ DELETE Planificacion - Propiedad deleted:', deleted);
              return deleted;
            }
            
            // Si es un objeto vacío o sin propiedades de éxito, asumir éxito
            console.log('✅ DELETE Planificacion - Objeto sin propiedades de éxito, asumiendo éxito');
            return true;
          }
        }
        
        // Si llegamos aquí, asumimos éxito (status 200 sin error)
        console.log('✅ DELETE Planificacion - Asumiendo éxito por defecto');
        return true;
      }),
      catchError(error => {
        console.error('❌ DELETE Planificacion - Error capturado:', error);
        console.error('❌ DELETE Planificacion - Error status:', error.status);
        console.error('❌ DELETE Planificacion - Error message:', error.message);
        console.error('❌ DELETE Planificacion - Error error:', error.error);
        console.error('❌ DELETE Planificacion - Error completo:', JSON.stringify(error, null, 2));
        
        // Propagar el error para que el componente pueda manejarlo
        throw error;
      })
    );
  }

  // Endpoints especiales - Alineado con IPlanificacionService
  // GET /api/planificaciones/{id}/hijas
  getHijas(id: number): Observable<PlanificacionArbol[]> {
    return this.http.get<any>(`${this.apiUrl}/${id}/hijas`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapPlanificacionArbol(item)) : [];
      }),
      catchError(error => {
        if (error.status !== 404) {
          console.error('Error fetching hijas:', error);
        }
        return of([]);
      })
    );
  }

  // GET /api/planificaciones/{id}/arbol-completo
  getArbolCompleto(id: number): Observable<PlanificacionArbol | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}/arbol-completo`).pipe(
      map(item => this.mapPlanificacionArbol(item)),
      catchError(error => {
        if (error.status === 404) {
          return of(null);
        }
        console.error('Error fetching arbol completo:', error);
        return of(null);
      })
    );
  }

  // GET /api/planificaciones/anuales
  getAnuales(filter?: PlanificacionFilterDto): Observable<Planificacion[]> {
    let params = new HttpParams();
    
    if (filter) {
      if (filter.Anio !== undefined && filter.Anio !== null) {
        params = params.append('Anio', filter.Anio.toString());
      }
      if (filter.PadreId !== undefined && filter.PadreId !== null) {
        params = params.append('PadreId', filter.PadreId.toString());
      }
      if (filter.IncluirInactivos !== undefined) {
        params = params.append('IncluirInactivos', filter.IncluirInactivos.toString());
      }
      if (filter.PeriodoInicio) {
        params = params.append('PeriodoInicio', filter.PeriodoInicio);
      }
      if (filter.PeriodoFin) {
        params = params.append('PeriodoFin', filter.PeriodoFin);
      }
    }
    
    return this.http.get<any>(`${this.apiUrl}/anuales`, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapPlanificacion(item)) : [];
      }),
      catchError(error => {
        if (error.status !== 404) {
          console.error('Error fetching anuales:', error);
        }
        return of([]);
      })
    );
  }

  // GET /api/planificaciones/{id}/actividades
  getActividades(id: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/${id}/actividades`).pipe(
      map(response => {
        // Manejar respuesta null o undefined
        if (!response) {
          console.warn('⚠️ GET Actividades - Respuesta nula o undefined');
          return [];
        }
        
        const items = response.data || response;
        return Array.isArray(items) ? items : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ GET Actividades - Endpoint no encontrado (404)');
          return of([]);
        }
        console.error('❌ GET Actividades - Error:', error);
        return of([]);
      })
    );
  }

  // GET /api/planificaciones/{id}/resumen
  getResumen(id: number, incluirActividades = false, incluirReportes = false): Observable<PlanificacionResumen | null> {
    const params = new HttpParams()
      .set('IncluirActividades', incluirActividades.toString())
      .set('IncluirReportes', incluirReportes.toString());
    
    return this.http.get<any>(`${this.apiUrl}/${id}/resumen`, { params }).pipe(
      map(item => this.mapPlanificacionResumen(item)),
      catchError(error => {
        if (error.status === 404) {
          return of(null);
        }
        console.error('Error fetching resumen:', error);
        return of(null);
      })
    );
  }

  // POST /api/planificaciones/{id}/duplicar
  duplicar(id: number): Observable<Planificacion> {
    return this.http.post<any>(`${this.apiUrl}/${id}/duplicar`, {}).pipe(
      map(item => this.mapPlanificacion(item))
    );
  }

  // Mapeo de datos del backend
  private mapPlanificacion(item: any): Planificacion {
    return {
      idPlanificacion: item.IdPlanificacion || item.idPlanificacion || item.id || 0,
      nombre: item.Nombre || item.nombre || '',
      descripcion: item.Descripcion || item.descripcion,
      idTipoPlanificacion: item.IdTipoPlanificacion || item.idTipoPlanificacion || 0,
      nombreTipoPlanificacion: item.NombreTipoPlanificacion || item.nombreTipoPlanificacion,
      periodoInicio: item.PeriodoInicio || item.periodoInicio,
      periodoFin: item.PeriodoFin || item.periodoFin,
      idPlanificacionPadre: item.IdPlanificacionPadre || item.idPlanificacionPadre,
      nombrePadre: item.NombrePadre || item.nombrePadre,
      anio: item.Anio || item.anio || 0,
      activo: item.Activo !== undefined ? item.Activo : (item.activo !== undefined ? item.activo : true),
      creadoPor: item.CreadoPor || item.creadoPor || 0,
      fechaCreacion: item.FechaCreacion || item.fechaCreacion || new Date().toISOString(),
      fechaModificacion: item.FechaModificacion || item.fechaModificacion,
      hijasCount: item.HijasCount !== undefined ? item.HijasCount : (item.hijasCount !== undefined ? item.hijasCount : 0)
    };
  }

  private mapPlanificacionArbol(item: any): PlanificacionArbol {
    return {
      idPlanificacion: item.IdPlanificacion || item.idPlanificacion || item.id || 0,
      nombre: item.Nombre || item.nombre || '',
      idPlanificacionPadre: item.IdPlanificacionPadre || item.idPlanificacionPadre,
      idTipoPlanificacion: item.IdTipoPlanificacion || item.idTipoPlanificacion || 0,
      nombreTipoPlanificacion: item.NombreTipoPlanificacion || item.nombreTipoPlanificacion,
      periodoInicio: item.PeriodoInicio || item.periodoInicio,
      periodoFin: item.PeriodoFin || item.periodoFin,
      anio: item.Anio || item.anio || 0,
      activo: item.Activo !== undefined ? item.Activo : (item.activo !== undefined ? item.activo : true),
      hijas: Array.isArray(item.Hijas || item.hijas) 
        ? (item.Hijas || item.hijas).map((h: any) => this.mapPlanificacionArbol(h))
        : []
    };
  }

  private mapPlanificacionResumen(item: any): PlanificacionResumen {
    return {
      idPlanificacion: item.IdPlanificacion || item.idPlanificacion || item.id || 0,
      nombre: item.Nombre || item.nombre || '',
      descripcion: item.Descripcion || item.descripcion,
      idTipoPlanificacion: item.IdTipoPlanificacion || item.idTipoPlanificacion || 0,
      nombreTipoPlanificacion: item.NombreTipoPlanificacion || item.nombreTipoPlanificacion,
      periodoInicio: item.PeriodoInicio || item.periodoInicio,
      periodoFin: item.PeriodoFin || item.periodoFin,
      anio: item.Anio || item.anio || 0,
      activo: item.Activo !== undefined ? item.Activo : (item.activo !== undefined ? item.activo : true),
      totalHijas: item.TotalHijas !== undefined ? item.TotalHijas : (item.totalHijas !== undefined ? item.totalHijas : 0),
      totalActividades: item.TotalActividades !== undefined ? item.TotalActividades : (item.totalActividades !== undefined ? item.totalActividades : 0),
      totalProyectosRelacionados: item.TotalProyectosRelacionados !== undefined ? item.TotalProyectosRelacionados : (item.totalProyectosRelacionados !== undefined ? item.totalProyectosRelacionados : 0),
      totalReportesGenerados: item.TotalReportesGenerados !== undefined ? item.TotalReportesGenerados : (item.totalReportesGenerados !== undefined ? item.totalReportesGenerados : 0),
      fechaConsulta: item.FechaConsulta || item.fechaConsulta || new Date().toISOString(),
      actividadesResumen: item.ActividadesResumen || item.actividadesResumen,
      reportesResumen: item.ReportesResumen || item.reportesResumen
    };
  }
}

