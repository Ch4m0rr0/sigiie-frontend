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
    // El backend espera un formato unificado, pero este método se usa para crear una sola participación
    // Por compatibilidad, creamos el formato unificado con un solo participante
    return this.createUnificada([data]).pipe(
      map(participaciones => participaciones[0]) // Devolver solo la primera
    );
  }

  /**
   * Crea participaciones usando el formato unificado que espera el backend
   */
  createUnificada(participaciones: ParticipacionCreate[]): Observable<Participacion[]> {
    // Función helper para convertir a número si es necesario
    const toNumber = (value: any): number | undefined => {
      if (value === null || value === undefined || value === '') return undefined;
      const num = typeof value === 'string' ? parseInt(value, 10) : Number(value);
      return isNaN(num) ? undefined : num;
    };

    if (participaciones.length === 0) {
      throw new Error('Debe proporcionar al menos una participación');
    }

    // Usar los datos de la primera participación para los campos comunes
    const primera = participaciones[0];
    
    // Agrupar participantes por tipo
    const estudiantes: Array<{ id: number; idRolEquipo?: number }> = [];
    const docentes: Array<{ id: number; idRolEquipo?: number }> = [];
    const administrativos: Array<{ id: number; idRolEquipo?: number }> = [];

    participaciones.forEach(p => {
      const rolEquipo = toNumber(p.idRolEquipo);
      if (p.estudianteId) {
        const estudianteId = toNumber(p.estudianteId);
        if (estudianteId !== undefined) {
          estudiantes.push({
            id: estudianteId,
            idRolEquipo: rolEquipo
          });
        }
      } else if (p.docenteId) {
        const docenteId = toNumber(p.docenteId);
        if (docenteId !== undefined) {
          docentes.push({
            id: docenteId,
            idRolEquipo: rolEquipo
          });
        }
      } else if (p.administrativoId) {
        const administrativoId = toNumber(p.administrativoId);
        if (administrativoId !== undefined) {
          administrativos.push({
            id: administrativoId,
            idRolEquipo: rolEquipo
          });
        }
      }
    });

    // Construir el DTO en el formato que espera el backend (camelCase)
    const dto: any = {
      idEdicion: toNumber(primera.edicionId),
      idEstadoParticipacion: toNumber(primera.estadoParticipacionId),
      idCategoriaParticipacionParticipante: toNumber(primera.categoriaParticipacionId),
      participantesExistentes: {}
    };

    // Agregar campos opcionales solo si tienen valor (0 es un valor válido)
    const grupoNumero = toNumber(primera.grupoNumero);
    if (grupoNumero !== undefined && grupoNumero !== null) {
      dto.grupoNumero = grupoNumero;
    }

    const idTutor = toNumber(primera.idTutor);
    console.log('🔍 idTutor antes de convertir:', primera.idTutor, 'después:', idTutor);
    if (idTutor !== undefined && idTutor !== null) {
      dto.idTutor = idTutor;
    }

    const idSubactividad = toNumber(primera.idSubactividad);
    if (idSubactividad !== undefined && idSubactividad !== null) {
      dto.idSubactividad = idSubactividad;
    }

    // Agregar participantes solo si hay
    if (estudiantes.length > 0) {
      dto.participantesExistentes.estudiantes = estudiantes;
    }
    if (docentes.length > 0) {
      dto.participantesExistentes.docentes = docentes;
    }
    if (administrativos.length > 0) {
      dto.participantesExistentes.administrativos = administrativos;
    }

    console.log('🔄 POST Participación Unificada - DTO enviado:', JSON.stringify(dto, null, 2));
    console.log('🔄 POST Participación Unificada - Verificando campos:', {
      tieneIdSubactividad: !!dto.idSubactividad,
      idSubactividad: dto.idSubactividad,
      tieneIdTutor: !!dto.idTutor,
      idTutor: dto.idTutor,
      tieneIdCategoria: !!dto.idCategoriaParticipacionParticipante,
      idCategoria: dto.idCategoriaParticipacionParticipante
    });
    
    // Intentar primero con el endpoint /unificada, si falla usar el endpoint base
    return this.http.post<any>(`${this.apiUrl}/unificada`, dto).pipe(
      catchError(error => {
        // Si el endpoint /unificada no está disponible (405 o 404), intentar con el endpoint base
        if (error.status === 405 || error.status === 404) {
          console.warn('⚠️ Endpoint /unificada no disponible, intentando con endpoint base');
          return this.http.post<any>(this.apiUrl, dto).pipe(
            catchError(innerError => {
              console.error('❌ Error también con endpoint base:', innerError);
              throw innerError;
            })
          );
        }
        throw error;
      }),
      map(response => {
        console.log('✅ POST Participación Unificada - Respuesta completa:', response);
        console.log('✅ POST Participación Unificada - Tipo de respuesta:', typeof response);
        console.log('✅ POST Participación Unificada - Claves de respuesta:', response ? Object.keys(response) : []);
        
        // El backend devuelve un ParticipacionUnificadaResultDto con participacionesCreadas
        const participacionesCreadas = response.data?.participacionesCreadas || 
                                       response.participacionesCreadas || 
                                       (Array.isArray(response.data) ? response.data : [response.data || response]);
        
        console.log('✅ POST Participación Unificada - Participaciones creadas extraídas:', participacionesCreadas);
        console.log('✅ POST Participación Unificada - ¿Es array?', Array.isArray(participacionesCreadas));
        
        if (Array.isArray(participacionesCreadas)) {
          const mapeadas = participacionesCreadas
            .filter((item: any) => item !== null && item !== undefined)
            .map((item: any) => {
              console.log('✅ POST Participación Unificada - Item antes de mapear:', item);
              console.log('✅ POST Participación Unificada - Campos específicos del item:', {
                idParticipacion: item.idParticipacion,
                idSubactividad: item.idSubactividad,
                nombreSubactividad: item.nombreSubactividad,
                idTutor: item.idTutor,
                nombreTutor: item.nombreTutor,
                grupoNumero: item.grupoNumero
              });
              return this.mapParticipacion(item);
            });
          console.log('✅ POST Participación Unificada - Participaciones mapeadas:', mapeadas);
          return mapeadas;
        }
        
        // Si es un solo objeto, devolverlo en un array
        if (participacionesCreadas) {
          console.log('✅ POST Participación Unificada - Participación única antes de mapear:', participacionesCreadas);
          const mapeada = this.mapParticipacion(participacionesCreadas);
          console.log('✅ POST Participación Unificada - Participación única mapeada:', mapeada);
          return [mapeada];
        }
        
        // Si no hay datos, devolver array vacío
        console.warn('⚠️ POST Participación Unificada - No se encontraron participaciones creadas en la respuesta');
        return [];
      }),
      catchError(error => {
        console.error('❌ Error al crear participación unificada:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        if (error.error) {
          console.error('❌ Error body:', error.error);
          if (error.error.errors) {
            console.error('❌ Validation errors:', error.error.errors);
          }
        }
        console.error('❌ DTO que causó el error:', JSON.stringify(dto, null, 2));
        throw error;
      })
    );
  }

  /**
   * Actualiza una participación existente
   * El backend espera ParticipacionUpdateDto con PascalCase
   * El backend devuelve bool o null cuando es exitoso
   */
  update(id: number, data: Partial<ParticipacionCreate>): Observable<Participacion | null> {
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
      dto.IdCategoriaParticipacionParticipante = data.categoriaParticipacionId;
    }
    if (data.estadoParticipacionId !== undefined) {
      dto.IdEstadoParticipacion = data.estadoParticipacionId;
    }
    if (data.fechaParticipacion !== undefined) {
      dto.FechaParticipacion = data.fechaParticipacion instanceof Date 
        ? data.fechaParticipacion.toISOString() 
        : data.fechaParticipacion;
    }
    
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto).pipe(
      map(response => {
        // El backend puede devolver bool, null, o un objeto con data
        // Si es null/undefined/true/false, la actualización fue exitosa pero no hay datos de retorno
        if (response === null || response === undefined || response === true || response === false) {
          // La actualización fue exitosa, devolvemos null (el componente manejará la navegación)
          return null;
        }
        // Si hay datos, los mapeamos
        const item = response.data || response;
        if (!item) {
          return null;
        }
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
        IdCategoriaParticipacionParticipante: item.categoriaParticipacionId,
        IdEstadoParticipacion: item.estadoParticipacionId,
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
    // Log detallado del item recibido (solo para debugging)
    const idParticipacion = item.idParticipacion || item.IdParticipacion || item.id;
    const idSubactividad = item.idSubactividad || item.IdSubactividad;
    const idTutor = item.idTutor || item.IdTutor;
    
    // Extraer nombres de objetos anidados (navegación de Entity Framework)
    // Para subactividad
    const subactividadNav = item.IdSubactividadNavigation || item.idSubactividadNavigation || 
                            item.Subactividad || item.subactividad;
    const nombreSubactividad = item.nombreSubactividad || item.NombreSubactividad ||
                              subactividadNav?.nombre || subactividadNav?.Nombre ||
                              subactividadNav?.NombreSubactividad || subactividadNav?.nombreSubactividad;
    
    // Para tutor (puede ser Docente)
    const tutorNav = item.IdTutorNavigation || item.idTutorNavigation || 
                     item.Tutor || item.tutor ||
                     item.IdDocenteNavigation || item.idDocenteNavigation ||
                     item.Docente || item.docente;
    const nombreTutor = item.nombreTutor || item.NombreTutor ||
                        tutorNav?.nombreCompleto || tutorNav?.NombreCompleto ||
                        tutorNav?.nombre || tutorNav?.Nombre ||
                        (tutorNav?.primerNombre && tutorNav?.primerApellido 
                          ? `${tutorNav.primerNombre} ${tutorNav.primerApellido}` 
                          : undefined) ||
                        (tutorNav?.PrimerNombre && tutorNav?.PrimerApellido 
                          ? `${tutorNav.PrimerNombre} ${tutorNav.PrimerApellido}` 
                          : undefined);
    
    // Para rol equipo
    const rolEquipoNav = item.IdRolEquipoNavigation || item.idRolEquipoNavigation ||
                         item.RolEquipo || item.rolEquipo;
    const nombreRolEquipo = item.nombreRolEquipo || item.NombreRolEquipo ||
                           rolEquipoNav?.nombre || rolEquipoNav?.Nombre;
    
    // Log de advertencia solo cuando hay IDs pero no nombres (para debugging)
    if (idSubactividad && !nombreSubactividad) {
      console.warn('⚠️ Participación tiene idSubactividad pero no nombreSubactividad:', {
        idParticipacion,
        idSubactividad,
        itemKeys: Object.keys(item)
      });
    }
    if (idTutor && !nombreTutor) {
      console.warn('⚠️ Participación tiene idTutor pero no nombreTutor:', {
        idParticipacion,
        idTutor,
        itemKeys: Object.keys(item),
        itemNombreTutor: item.nombreTutor,
        itemNombreTutorPascal: item.NombreTutor
      });
    }
    
    // Log del objeto final antes de retornarlo
    const participacionMapeada = {
      id: item.idParticipacion || item.IdParticipacion || item.id,
      idParticipacion: item.idParticipacion || item.IdParticipacion || item.id,
      edicionId: item.edicionId || item.EdicionId || item.idEdicion || item.IdEdicion,
      idSubactividad: idSubactividad,
      nombreSubactividad: nombreSubactividad,
      grupoNumero: item.grupoNumero || item.GrupoNumero,
      idRolEquipo: item.idRolEquipo || item.IdRolEquipo,
      nombreRolEquipo: nombreRolEquipo,
      idTutor: idTutor,
      nombreTutor: nombreTutor,
      estudianteId: item.estudianteId || item.EstudianteId || item.idEstudiante || item.IdEstudiante,
      idEstudiante: item.estudianteId || item.EstudianteId || item.idEstudiante || item.IdEstudiante,
      docenteId: item.docenteId || item.DocenteId || item.idDocente || item.IdDocente,
      idDocente: item.docenteId || item.DocenteId || item.idDocente || item.IdDocente,
      administrativoId: item.administrativoId || item.AdministrativoId || item.idAdmin || item.IdAdmin,
      idAdmin: item.administrativoId || item.AdministrativoId || item.idAdmin || item.IdAdmin,
      nombreEstudiante: item.nombreEstudiante || item.NombreEstudiante ||
                       (item.IdEstudianteNavigation?.nombreCompleto || item.idEstudianteNavigation?.nombreCompleto ||
                        item.Estudiante?.nombreCompleto || item.estudiante?.nombreCompleto),
      nombreDocente: item.nombreDocente || item.NombreDocente ||
                    (item.IdDocenteNavigation?.nombreCompleto || item.idDocenteNavigation?.nombreCompleto ||
                     item.Docente?.nombreCompleto || item.docente?.nombreCompleto),
      nombreAdmin: item.nombreAdmin || item.NombreAdmin ||
                  (item.IdAdminNavigation?.nombreCompleto || item.idAdminNavigation?.nombreCompleto ||
                   item.Admin?.nombreCompleto || item.admin?.nombreCompleto),
      categoriaParticipacionId: item.categoriaParticipacionId || item.CategoriaParticipacionId || item.idCategoriaParticipacionParticipante || item.IdCategoriaParticipacionParticipante,
      estadoParticipacionId: item.estadoParticipacionId || item.EstadoParticipacionId || item.idEstadoParticipacion || item.IdEstadoParticipacion,
      idEstadoParticipacion: item.estadoParticipacionId || item.EstadoParticipacionId || item.idEstadoParticipacion || item.IdEstadoParticipacion,
      fechaParticipacion: (item.fechaParticipacion || item.FechaParticipacion || item.fechaRegistro || item.FechaRegistro) ? new Date(item.fechaParticipacion || item.FechaParticipacion || item.fechaRegistro || item.FechaRegistro) : new Date()
    };
    
    return participacionMapeada;
  }

  /**
   * Filtra participaciones con múltiples criterios
   * GET /api/participaciones?{filtros}
   */
  filtrar(filtros: {
    idActividad?: number;
    idSubactividad?: number;
    idEdicion?: number;
    anio?: number;
    busquedaTexto?: string;
    idEstudiante?: number;
    idDocente?: number;
    idAdmin?: number;
    esParticipacionSubactividad?: boolean;
    fechaRegistroDesde?: string;
    fechaRegistroHasta?: string;
  }): Observable<Participacion[]> {
    let params = new HttpParams();
    
    if (filtros.idActividad !== undefined && filtros.idActividad !== null) {
      params = params.set('idActividad', filtros.idActividad.toString());
    }
    if (filtros.idSubactividad !== undefined && filtros.idSubactividad !== null) {
      params = params.set('idSubactividad', filtros.idSubactividad.toString());
    }
    if (filtros.idEdicion !== undefined && filtros.idEdicion !== null) {
      params = params.set('idEdicion', filtros.idEdicion.toString());
    }
    if (filtros.anio !== undefined && filtros.anio !== null) {
      params = params.set('anio', filtros.anio.toString());
    }
    if (filtros.busquedaTexto) {
      params = params.set('busquedaTexto', filtros.busquedaTexto);
    }
    if (filtros.idEstudiante !== undefined && filtros.idEstudiante !== null) {
      params = params.set('idEstudiante', filtros.idEstudiante.toString());
    }
    if (filtros.idDocente !== undefined && filtros.idDocente !== null) {
      params = params.set('idDocente', filtros.idDocente.toString());
    }
    if (filtros.idAdmin !== undefined && filtros.idAdmin !== null) {
      params = params.set('idAdmin', filtros.idAdmin.toString());
    }
    if (filtros.esParticipacionSubactividad !== undefined) {
      params = params.set('esParticipacionSubactividad', filtros.esParticipacionSubactividad.toString());
    }
    if (filtros.fechaRegistroDesde) {
      params = params.set('fechaRegistroDesde', filtros.fechaRegistroDesde);
    }
    if (filtros.fechaRegistroHasta) {
      params = params.set('fechaRegistroHasta', filtros.fechaRegistroHasta);
    }

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapParticipacion(item)) : [];
      }),
      catchError(error => {
        console.error('Error filtrando participaciones:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene participaciones por actividad específica
   * GET /api/participaciones/por-actividad/{idActividad}
   */
  getPorActividad(idActividad: number, anio?: number): Observable<Participacion[]> {
    let url = `${this.apiUrl}/por-actividad/${idActividad}`;
    if (anio) {
      url += `/anio/${anio}`;
    }
    
    return this.http.get<any>(url).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapParticipacion(item)) : [];
      }),
      catchError(error => {
        console.error('Error obteniendo participaciones por actividad:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene participaciones por subactividad
   * GET /api/participaciones/por-subactividad/{idSubactividad}
   */
  getPorSubactividad(idSubactividad: number): Observable<Participacion[]> {
    return this.http.get<any>(`${this.apiUrl}/por-subactividad/${idSubactividad}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapParticipacion(item)) : [];
      }),
      catchError(error => {
        console.error('Error obteniendo participaciones por subactividad:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene estadísticas de participaciones (totales por género)
   * GET /api/participaciones/estadisticas?idActividad={id}&anio={anio}
   * GET /api/participaciones/estadisticas?idSubactividad={id}
   */
  getEstadisticas(filtros: { idActividad?: number; idSubactividad?: number; anio?: number }): Observable<any> {
    let params = new HttpParams();
    
    if (filtros.idActividad !== undefined && filtros.idActividad !== null) {
      params = params.set('idActividad', filtros.idActividad.toString());
    }
    if (filtros.idSubactividad !== undefined && filtros.idSubactividad !== null) {
      params = params.set('idSubactividad', filtros.idSubactividad.toString());
    }
    if (filtros.anio !== undefined && filtros.anio !== null) {
      params = params.set('anio', filtros.anio.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/estadisticas`, { params }).pipe(
      catchError(error => {
        console.error('Error obteniendo estadísticas:', error);
        return of(null);
      })
    );
  }

  /**
   * Obtiene lista de participantes con nombres
   * GET /api/participaciones/participantes-con-nombres?idActividad={id}
   */
  getParticipantesConNombres(idActividad: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/participantes-con-nombres`, {
      params: new HttpParams().set('idActividad', idActividad.toString())
    }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items : [];
      }),
      catchError(error => {
        console.error('Error obteniendo participantes con nombres:', error);
        return of([]);
      })
    );
  }

  /**
   * Crea participaciones por actividad
   * POST /api/participaciones/por-actividad
   */
  createPorActividad(data: {
    idActividad: number;
    anio: number;
    participantes: Array<{
      tipoParticipante: 'Estudiante' | 'Docente' | 'Administrativo';
      idEstudiante?: number;
      idDocente?: number;
      idAdmin?: number;
    }>;
  }): Observable<Participacion[]> {
    return this.http.post<any>(`${this.apiUrl}/por-actividad`, data).pipe(
      map(response => {
        const items = response.data || response;
        if (Array.isArray(items)) {
          return items.map(item => this.mapParticipacion(item));
        }
        if (items && typeof items === 'object') {
          return [this.mapParticipacion(items)];
        }
        return [];
      }),
      catchError(error => {
        console.error('Error creando participaciones por actividad:', error);
        throw error;
      })
    );
  }

  /**
   * Crea participaciones por subactividad
   * POST /api/participaciones/por-subactividad
   */
  createPorSubactividad(data: {
    idSubactividad: number;
    anio: number;
    participantes: Array<{
      tipoParticipante: 'Estudiante' | 'Docente' | 'Administrativo';
      idEstudiante?: number;
      idDocente?: number;
      idAdmin?: number;
    }>;
  }): Observable<Participacion[]> {
    return this.http.post<any>(`${this.apiUrl}/por-subactividad`, data).pipe(
      map(response => {
        const items = response.data || response;
        if (Array.isArray(items)) {
          return items.map(item => this.mapParticipacion(item));
        }
        if (items && typeof items === 'object') {
          return [this.mapParticipacion(items)];
        }
        return [];
      }),
      catchError(error => {
        console.error('Error creando participaciones por subactividad:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene resumen de participaciones por actividad/subactividad
   * GET /api/participaciones/resumen
   */
  getResumen(filtros?: { idActividad?: number; idSubactividad?: number; busquedaTexto?: string }): Observable<any> {
    let params = new HttpParams();
    
    if (filtros?.idActividad !== undefined && filtros.idActividad !== null) {
      params = params.set('idActividad', filtros.idActividad.toString());
    }
    if (filtros?.idSubactividad !== undefined && filtros.idSubactividad !== null) {
      params = params.set('idSubactividad', filtros.idSubactividad.toString());
    }
    if (filtros?.busquedaTexto) {
      params = params.set('busquedaTexto', filtros.busquedaTexto);
    }

    return this.http.get<any>(`${this.apiUrl}/resumen`, { params }).pipe(
      map(response => response.data || response),
      catchError(error => {
        console.error('Error obteniendo resumen de participaciones:', error);
        return of(null);
      })
    );
  }

  /**
   * Obtiene participaciones por actividad
   * GET /api/participaciones?idActividad={id}
   */
  getByActividad(idActividad: number): Observable<Participacion[]> {
    return this.http.get<any>(this.apiUrl, {
      params: new HttpParams().set('idActividad', idActividad.toString())
    }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapParticipacion(item)) : [];
      }),
      catchError(error => {
        console.error('Error obteniendo participaciones por actividad:', error);
        return of([]);
      })
    );
  }

  /**
   * Crea una participación individual
   * POST /api/participaciones/individual
   */
  createIndividual(data: ParticipacionCreate): Observable<Participacion> {
    // Convertir a formato que espera el backend
    const dto: any = {
      EdicionId: data.edicionId,
      IdCategoriaParticipacionParticipante: data.categoriaParticipacionId,
      IdEstadoParticipacion: data.estadoParticipacionId,
      FechaParticipacion: data.fechaParticipacion instanceof Date 
        ? data.fechaParticipacion.toISOString() 
        : data.fechaParticipacion
    };

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

    return this.http.post<any>(`${this.apiUrl}/individual`, dto).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapParticipacion(item);
      }),
      catchError(error => {
        console.error('Error creando participación individual:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza una participación individual
   * PUT /api/participaciones/individual/{id}
   */
  updateIndividual(id: number, data: Partial<ParticipacionCreate>): Observable<Participacion> {
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
      dto.IdCategoriaParticipacionParticipante = data.categoriaParticipacionId;
    }
    if (data.estadoParticipacionId !== undefined) {
      dto.IdEstadoParticipacion = data.estadoParticipacionId;
    }
    if (data.fechaParticipacion !== undefined) {
      dto.FechaParticipacion = data.fechaParticipacion instanceof Date 
        ? data.fechaParticipacion.toISOString() 
        : data.fechaParticipacion;
    }

    return this.http.put<any>(`${this.apiUrl}/individual/${id}`, dto).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapParticipacion(item);
      }),
      catchError(error => {
        console.error('Error actualizando participación individual:', error);
        throw error;
      })
    );
  }
}

