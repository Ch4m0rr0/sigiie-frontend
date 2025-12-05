import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpParams } from '@angular/common/http';
import type { Actividad, ActividadCreate, ResponsableCreate } from '../models/actividad';
import type { Edicion } from '../models/edicion';
import type { Participacion } from '../models/participacion';
import type { ActividadResponsable } from '../models/actividad-responsable';
import type { ActividadIndicador } from '../models/indicador';
import type { Subactividad } from '../models/subactividad';
import type { EvidenciaCreate } from '../models/evidencia';
import type { ActividadAnual } from '../models/actividad-anual';
import type { ActividadMensualInst } from '../models/actividad-mensual-inst';

export interface ActividadFilterDto {
  IdActividadMensualInst?: number;
  IdActividadAnual?: number;
  IdIndicador?: number;
  IdEstadoActividad?: number;
  DepartamentoResponsableId?: number;
  EsPlanificada?: boolean;
  Anio?: number;
  IdTipoProtagonista?: number;
  Mes?: number; // 1-12
  BusquedaTexto?: string;
  FechaInicioDesde?: string; // YYYY-MM-DD
  FechaInicioHasta?: string; // YYYY-MM-DD
  FechaFinDesde?: string; // YYYY-MM-DD
  FechaFinHasta?: string; // YYYY-MM-DD
  FechaEventoDesde?: string; // YYYY-MM-DD
  FechaEventoHasta?: string; // YYYY-MM-DD
}

export interface ResponsableCreateDto {
  IdUsuario?: number;
  IdDocente?: number;
  IdEstudiante?: number;
  IdAdmin?: number;
  ResponsableExterno?: {
    Nombre: string;
    Institucion: string;
    Cargo?: string;
    Telefono?: string;
    Correo?: string;
  };
  IdRolResponsable?: number;
  RolResponsable?: string;
  FechaAsignacion?: string; // YYYY-MM-DD
}

export interface ActividadConParticipantesFilterDto {
  IdActividad?: number;
  Anio?: number;
  EsPlanificada?: boolean;
  DepartamentoResponsableId?: number;
  IdIndicador?: number;
  TipoProtagonistaReal?: string; // "Estudiantes", "Docentes", "Administrativos"
}

@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/actividades`;

  // Actividades - Alineado con IActividadesService.GetAllAsync()
  // GET /api/actividades?filter=...
  getAll(filter?: ActividadFilterDto): Observable<Actividad[]> {
    let params = new HttpParams();
    
    // Agregar filtros como query params si se proporcionan
    if (filter) {
      if (filter.IdActividadMensualInst !== undefined) {
        params = params.set('IdActividadMensualInst', filter.IdActividadMensualInst.toString());
      }
      if (filter.IdActividadAnual !== undefined) {
        params = params.set('IdActividadAnual', filter.IdActividadAnual.toString());
      }
      if (filter.IdIndicador !== undefined) {
        params = params.set('IdIndicador', filter.IdIndicador.toString());
      }
      if (filter.IdEstadoActividad !== undefined) {
        params = params.set('IdEstadoActividad', filter.IdEstadoActividad.toString());
      }
      if (filter.DepartamentoResponsableId !== undefined) {
        params = params.set('DepartamentoResponsableId', filter.DepartamentoResponsableId.toString());
      }
      if (filter.EsPlanificada !== undefined) {
        params = params.set('EsPlanificada', filter.EsPlanificada.toString());
      }
      if (filter.Anio !== undefined) {
        params = params.set('Anio', filter.Anio.toString());
      }
      if (filter.IdTipoProtagonista !== undefined) {
        params = params.set('IdTipoProtagonista', filter.IdTipoProtagonista.toString());
      }
      if (filter.Mes !== undefined) {
        params = params.set('Mes', filter.Mes.toString());
      }
      if (filter.BusquedaTexto) {
        params = params.set('BusquedaTexto', filter.BusquedaTexto);
      }
      if (filter.FechaInicioDesde) {
        params = params.set('FechaInicioDesde', filter.FechaInicioDesde);
      }
      if (filter.FechaInicioHasta) {
        params = params.set('FechaInicioHasta', filter.FechaInicioHasta);
      }
      if (filter.FechaFinDesde) {
        params = params.set('FechaFinDesde', filter.FechaFinDesde);
      }
      if (filter.FechaFinHasta) {
        params = params.set('FechaFinHasta', filter.FechaFinHasta);
      }
      if (filter.FechaEventoDesde) {
        params = params.set('FechaEventoDesde', filter.FechaEventoDesde);
      }
      if (filter.FechaEventoHasta) {
        params = params.set('FechaEventoHasta', filter.FechaEventoHasta);
      }
    }
    
    return this.http.get<any>(this.apiUrl, { params }).pipe(
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
          if (error.error) {
            console.error('❌ Error body:', JSON.stringify(error.error, null, 2));
          }
          if (error.message) {
            console.error('❌ Error message:', error.message);
          }
          // Re-lanzar el error para que el componente pueda manejarlo
          throw error;
        } else if (error.status === 401 || error.status === 403) {
          console.error('❌ Error de autenticación/autorización:', error);
          // Re-lanzar el error para que el componente pueda manejarlo
          throw error;
        } else {
          console.error('❌ Error fetching actividades:', error);
          if (error.error) {
            console.error('❌ Error body:', error.error);
          }
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
   * NOTA: Este método es legacy. Se recomienda usar getAll() con filtros como query params
   */
  filtrar(filtros: ActividadFilterDto): Observable<Actividad[]> {
    // Convertir a PascalCase para el backend
    const dto: any = {};
    if (filtros.IdActividadMensualInst !== undefined) {
      dto.IdActividadMensualInst = filtros.IdActividadMensualInst;
    }
    if (filtros.IdActividadAnual !== undefined) {
      dto.IdActividadAnual = filtros.IdActividadAnual;
    }
    if (filtros.IdIndicador !== undefined) {
      dto.IdIndicador = filtros.IdIndicador;
    }
    if (filtros.IdEstadoActividad !== undefined) {
      dto.IdEstadoActividad = filtros.IdEstadoActividad;
    }
    if (filtros.DepartamentoResponsableId !== undefined) {
      dto.DepartamentoResponsableId = filtros.DepartamentoResponsableId;
    }
    if (filtros.EsPlanificada !== undefined) {
      dto.EsPlanificada = filtros.EsPlanificada;
    }
    if (filtros.Anio !== undefined) {
      dto.Anio = filtros.Anio;
    }
    if (filtros.IdTipoProtagonista !== undefined) {
      dto.IdTipoProtagonista = filtros.IdTipoProtagonista;
    }
    if (filtros.Mes !== undefined) {
      dto.Mes = filtros.Mes;
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
    if (filtros.FechaEventoDesde) {
      dto.FechaEventoDesde = filtros.FechaEventoDesde;
    }
    if (filtros.FechaEventoHasta) {
      dto.FechaEventoHasta = filtros.FechaEventoHasta;
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
      map(item => {
        console.log('📥 [ActividadesService] Respuesta RAW del backend al obtener actividad:', {
          id: item.id || item.Id || item.idActividad || item.IdActividad,
          tieneActividadesAnuales: !!(item.actividadesAnuales && Array.isArray(item.actividadesAnuales)),
          cantidadActividadesAnuales: item.actividadesAnuales?.length || 0,
          tieneActividadesMensualesInst: !!(item.actividadesMensualesInst && Array.isArray(item.actividadesMensualesInst)),
          cantidadActividadesMensualesInst: item.actividadesMensualesInst?.length || 0,
          keys: Object.keys(item).filter(k => k.toLowerCase().includes('anual') || k.toLowerCase().includes('mensual'))
        });
        const actividadMapeada = this.mapActividad(item);
        console.log('📥 [ActividadesService] Actividad mapeada - actividadesAnuales:', actividadMapeada.actividadesAnuales?.length || 0);
        console.log('📥 [ActividadesService] Actividad mapeada - actividadesMensualesInst:', actividadMapeada.actividadesMensualesInst?.length || 0);
        if (actividadMapeada.actividadesAnuales && actividadMapeada.actividadesAnuales.length > 0) {
          console.log('📋 [ActividadesService] Primera actividad anual mapeada:', actividadMapeada.actividadesAnuales[0]);
        }
        if (actividadMapeada.actividadesMensualesInst && actividadMapeada.actividadesMensualesInst.length > 0) {
          console.log('📋 [ActividadesService] Primera actividad mensual mapeada:', actividadMapeada.actividadesMensualesInst[0]);
        }
        return actividadMapeada;
      })
    );
  }

  // Método legacy - mantener para compatibilidad
  get(id: number): Observable<Actividad> {
    return this.getById(id);
  }

  // Alineado con IActividadesService.CreateAsync()
  create(actividad: ActividadCreate): Observable<Actividad> {
    // El backend espera ActividadCreateDto con PascalCase
    // Manejar arrays: si es un array con un solo elemento, usar ese elemento; si está vacío, no enviar
    const getIdActividadAnual = (value: number | number[] | undefined): number | number[] | undefined => {
      if (value === undefined || value === null) return undefined;
      if (Array.isArray(value)) {
        if (value.length === 0) return undefined; // No enviar arrays vacíos
        // Si el backend acepta arrays, enviar el array; si no, enviar solo el primer elemento
        // Por ahora, si hay múltiples elementos, enviar solo el primero para evitar errores
        return value.length === 1 ? value[0] : value[0];
      }
      return value;
    };

    const getDepartamentoResponsableId = (value: number | number[] | undefined): number | number[] | undefined => {
      if (value === undefined || value === null) return undefined;
      if (Array.isArray(value)) {
        if (value.length === 0) return undefined; // No enviar arrays vacíos
        // Si el backend acepta arrays, enviar el array; si no, enviar solo el primer elemento
        // Por ahora, si hay múltiples elementos, enviar solo el primero para evitar errores
        return value.length === 1 ? value[0] : value[0];
      }
      return value;
    };

    const getIdTipoProtagonista = (value: number | number[] | undefined): number | number[] | undefined => {
      if (value === undefined || value === null) return undefined;
      if (Array.isArray(value)) {
        if (value.length === 0) return undefined; // No enviar arrays vacíos
        // Si el backend acepta arrays, enviar el array; si no, enviar solo el primer elemento
        // Por ahora, si hay múltiples elementos, enviar solo el primero para evitar errores
        return value.length === 1 ? value[0] : value[0];
      }
      return value;
    };

    const getIdTipoActividad = (value: number | number[] | undefined): number | number[] | undefined => {
      if (value === undefined || value === null) return undefined;
      if (Array.isArray(value)) {
        if (value.length === 0) return undefined; // No enviar arrays vacíos
        // Si el backend acepta arrays, enviar el array; si no, enviar solo el primer elemento
        // Por ahora, si hay múltiples elementos, enviar solo el primero para evitar errores
        return value.length === 1 ? value[0] : value[0];
      }
      return value;
    };

    // Validar que nombreActividad esté presente
    const nombreActividad = actividad.nombreActividad || actividad.nombre;
    if (!nombreActividad || nombreActividad.trim() === '') {
      throw new Error('El nombre de la actividad es requerido');
    }

    // Construir DTO según los ejemplos del backend
    // No enviar campos con valor 0, null o undefined
    const dto: any = {
      NombreActividad: nombreActividad.trim(),
      EsPlanificada: actividad.esPlanificada !== undefined ? actividad.esPlanificada : true,
      // Activo no se envía al backend - el backend maneja el estado de forma diferente
    };
    
    // Campos opcionales - solo agregar si tienen valor válido
    if (actividad.descripcion) dto.Descripcion = actividad.descripcion;
    if (actividad.objetivo) dto.Objetivo = actividad.objetivo;
    
    // IdDepartamentosResponsables - el backend espera List<int>? (array)
    if (actividad.idDepartamentosResponsables && Array.isArray(actividad.idDepartamentosResponsables) && actividad.idDepartamentosResponsables.length > 0) {
      const idsValidos = actividad.idDepartamentosResponsables
        .map(id => Number(id))
        .filter(id => !isNaN(id) && id > 0);
      if (idsValidos.length > 0) {
        dto.IdDepartamentosResponsables = idsValidos;
      }
    } else if (actividad.departamentoResponsableId) {
      // Legacy: si viene departamentoResponsableId, convertirlo a array
      const deptResponsableId = getDepartamentoResponsableId(actividad.departamentoResponsableId);
      if (deptResponsableId !== undefined && deptResponsableId !== null) {
        if (Array.isArray(deptResponsableId)) {
          const idsValidos = deptResponsableId.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
          if (idsValidos.length > 0) {
            dto.IdDepartamentosResponsables = idsValidos;
          }
        } else {
          const idNum = Number(deptResponsableId);
          if (!isNaN(idNum) && idNum > 0) {
            dto.IdDepartamentosResponsables = [idNum];
          }
        }
      }
    }
    
    if (actividad.fechaInicio) dto.FechaInicio = actividad.fechaInicio;
    if (actividad.fechaFin) dto.FechaFin = actividad.fechaFin;
    if (actividad.horaRealizacion) dto.HoraRealizacion = actividad.horaRealizacion;
    if (actividad.modalidad) dto.Modalidad = actividad.modalidad;
    
    if (actividad.idCapacidadInstalada !== undefined && actividad.idCapacidadInstalada !== null && Number(actividad.idCapacidadInstalada) > 0) {
      dto.IdCapacidadInstalada = Number(actividad.idCapacidadInstalada);
    }
    
    // Estado de actividad - SIEMPRE enviar si tiene valor (incluso si es 0, aunque normalmente no debería ser 0)
    // El estado es requerido para crear una actividad
    if (actividad.idEstadoActividad !== undefined && actividad.idEstadoActividad !== null) {
      const estadoId = Number(actividad.idEstadoActividad);
      if (!isNaN(estadoId) && estadoId > 0) {
        dto.IdEstadoActividad = estadoId;
      }
    }
    
    if (actividad.idIndicador !== undefined && actividad.idIndicador !== null && Number(actividad.idIndicador) > 0) {
      dto.IdIndicador = Number(actividad.idIndicador);
    }
    
    // Manejar idActividadesAnuales - el backend espera List<int>? (array)
    if (actividad.idActividadesAnuales && Array.isArray(actividad.idActividadesAnuales) && actividad.idActividadesAnuales.length > 0) {
      const idsValidos = actividad.idActividadesAnuales
        .map(id => Number(id))
        .filter(id => !isNaN(id) && id > 0);
      if (idsValidos.length > 0) {
        dto.IdActividadesAnuales = idsValidos;
      }
    } else if (actividad.idActividadAnual !== undefined && actividad.idActividadAnual !== null) {
      // Legacy: si viene idActividadAnual, convertirlo a array
      if (Array.isArray(actividad.idActividadAnual) && actividad.idActividadAnual.length > 0) {
        const idsValidos = actividad.idActividadAnual
          .map(id => Number(id))
          .filter(id => !isNaN(id) && id > 0);
        if (idsValidos.length > 0) {
          dto.IdActividadesAnuales = idsValidos;
        }
      } else if (!Array.isArray(actividad.idActividadAnual)) {
        const idNum = Number(actividad.idActividadAnual);
        if (!isNaN(idNum) && idNum > 0) {
          dto.IdActividadesAnuales = [idNum];
        }
      }
    }
    
    // Manejar idActividadesMensualesInst - el backend espera List<int>? (array)
    if (actividad.idActividadesMensualesInst && Array.isArray(actividad.idActividadesMensualesInst) && actividad.idActividadesMensualesInst.length > 0) {
      const idsValidos = actividad.idActividadesMensualesInst
        .map(id => Number(id))
        .filter(id => !isNaN(id) && id > 0);
      if (idsValidos.length > 0) {
        dto.IdActividadesMensualesInst = idsValidos;
      }
    } else if (actividad.idActividadMensualInst !== undefined && actividad.idActividadMensualInst !== null) {
      // Legacy: si viene idActividadMensualInst, convertirlo a array
      if (Array.isArray(actividad.idActividadMensualInst) && actividad.idActividadMensualInst.length > 0) {
        const idsValidos = actividad.idActividadMensualInst
          .map(id => Number(id))
          .filter(id => !isNaN(id) && id > 0);
        if (idsValidos.length > 0) {
          dto.IdActividadesMensualesInst = idsValidos;
        }
      } else if (!Array.isArray(actividad.idActividadMensualInst)) {
        const idNum = Number(actividad.idActividadMensualInst);
        if (!isNaN(idNum) && idNum > 0) {
          dto.IdActividadesMensualesInst = [idNum];
        }
      }
    }
    
    if (actividad.cantidadParticipantesProyectados !== undefined && actividad.cantidadParticipantesProyectados !== null && Number(actividad.cantidadParticipantesProyectados) > 0) {
      dto.CantidadParticipantesProyectados = Number(actividad.cantidadParticipantesProyectados);
    }
    
    if (actividad.cantidadTotalParticipantesProtagonistas !== undefined && actividad.cantidadTotalParticipantesProtagonistas !== null && Number(actividad.cantidadTotalParticipantesProtagonistas) > 0) {
      dto.CantidadTotalParticipantesProtagonistas = Number(actividad.cantidadTotalParticipantesProtagonistas);
    }
    
    // IdTiposProtagonistas - el backend espera List<int>? (array)
    if (actividad.idTiposProtagonistas && Array.isArray(actividad.idTiposProtagonistas) && actividad.idTiposProtagonistas.length > 0) {
      const idsValidos = actividad.idTiposProtagonistas
        .map(id => Number(id))
        .filter(id => !isNaN(id) && id > 0);
      if (idsValidos.length > 0) {
        dto.IdTiposProtagonistas = idsValidos;
      }
    } else if (actividad.idTipoProtagonista) {
      // Legacy: si viene idTipoProtagonista, convertirlo a array
      const tipoProtagonista = getIdTipoProtagonista(actividad.idTipoProtagonista);
      if (tipoProtagonista !== undefined && tipoProtagonista !== null) {
        if (Array.isArray(tipoProtagonista)) {
          const idsValidos = tipoProtagonista.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
          if (idsValidos.length > 0) {
            dto.IdTiposProtagonistas = idsValidos;
          }
        } else {
          const idNum = Number(tipoProtagonista);
          if (!isNaN(idNum) && idNum > 0) {
            dto.IdTiposProtagonistas = [idNum];
          }
        }
      }
    }
    
    // idTipoEvidencias - array, solo si tiene elementos
    if (actividad.idTipoEvidencias && Array.isArray(actividad.idTipoEvidencias) && actividad.idTipoEvidencias.length > 0) {
      dto.IdTipoEvidencias = actividad.idTipoEvidencias.map(id => Number(id)).filter(id => id > 0);
    }
    
    // Responsables - solo si hay responsables
    if (actividad.responsables && Array.isArray(actividad.responsables) && actividad.responsables.length > 0) {
      dto.Responsables = actividad.responsables
        .map(r => {
          const responsableDto: any = {};
          let tieneTipo = false; // Flag para verificar que tiene al menos un tipo
          
          // Según los ejemplos del backend:
          // - Para usuarios: solo IdUsuario, NO se envía IdRolResponsable
          // - Para estudiantes: IdEstudiante + IdRolResponsable (obligatorio)
          // - Para docentes: IdDocente + IdRolResponsable (opcional)
          // - Para administrativos: IdAdmin + IdRolResponsable (opcional)
          // - Para responsables externos: ResponsableExterno + IdRolResponsable (obligatorio) o IdResponsableExterno + IdRolResponsable
          // - NO se envía FechaAsignacion en el POST
          // - NO se envía RolResponsable (texto), solo IdRolResponsable
          
          // Usuario
          if (r.idUsuario !== undefined && r.idUsuario !== null && Number(r.idUsuario) > 0) {
            responsableDto.IdUsuario = Number(r.idUsuario);
            tieneTipo = true;
            // Para usuarios, NO se envía IdRolResponsable (el sistema usa el rol del usuario)
          }
          
          // Docente
          if (r.idDocente !== undefined && r.idDocente !== null && Number(r.idDocente) > 0) {
            responsableDto.IdDocente = Number(r.idDocente);
            tieneTipo = true;
            // Para docentes, IdRolResponsable es opcional
            if (r.idRolResponsable !== undefined && r.idRolResponsable !== null && Number(r.idRolResponsable) > 0) {
              responsableDto.IdRolResponsable = Number(r.idRolResponsable);
            }
          }
          
          // Estudiante
          if (r.idEstudiante !== undefined && r.idEstudiante !== null && Number(r.idEstudiante) > 0) {
            responsableDto.IdEstudiante = Number(r.idEstudiante);
            tieneTipo = true;
            // Para estudiantes, IdRolResponsable es OBLIGATORIO
            if (r.idRolResponsable !== undefined && r.idRolResponsable !== null && Number(r.idRolResponsable) > 0) {
              responsableDto.IdRolResponsable = Number(r.idRolResponsable);
            }
          }
          
          // Administrativo
          if (r.idAdmin !== undefined && r.idAdmin !== null && Number(r.idAdmin) > 0) {
            responsableDto.IdAdmin = Number(r.idAdmin);
            tieneTipo = true;
            // Para administrativos, IdRolResponsable es opcional
            if (r.idRolResponsable !== undefined && r.idRolResponsable !== null && Number(r.idRolResponsable) > 0) {
              responsableDto.IdRolResponsable = Number(r.idRolResponsable);
            }
          }
          
          // Responsable externo existente
          if (r.idResponsableExterno !== undefined && r.idResponsableExterno !== null && Number(r.idResponsableExterno) > 0) {
            responsableDto.IdResponsableExterno = Number(r.idResponsableExterno);
            tieneTipo = true;
            // Para responsables externos existentes, IdRolResponsable es OBLIGATORIO
            if (r.idRolResponsable !== undefined && r.idRolResponsable !== null && Number(r.idRolResponsable) > 0) {
              responsableDto.IdRolResponsable = Number(r.idRolResponsable);
            }
          }
          
          // Responsable externo nuevo
          if (r.responsableExterno && r.responsableExterno.nombre && r.responsableExterno.institucion) {
            responsableDto.ResponsableExterno = {
              Nombre: r.responsableExterno.nombre,
              Institucion: r.responsableExterno.institucion
            };
            // Campos opcionales del responsable externo
            if (r.responsableExterno.cargo) responsableDto.ResponsableExterno.Cargo = r.responsableExterno.cargo;
            if (r.responsableExterno.telefono) responsableDto.ResponsableExterno.Telefono = r.responsableExterno.telefono;
            if (r.responsableExterno.correo) responsableDto.ResponsableExterno.Correo = r.responsableExterno.correo;
            tieneTipo = true;
            // Para responsables externos nuevos, IdRolResponsable es OBLIGATORIO
            if (r.idRolResponsable !== undefined && r.idRolResponsable !== null && Number(r.idRolResponsable) > 0) {
              responsableDto.IdRolResponsable = Number(r.idRolResponsable);
            }
          }
          
          // Solo retornar el responsable si tiene al menos un tipo definido
          return tieneTipo ? responsableDto : null;
        })
        .filter(r => r !== null); // Filtrar responsables inválidos
    }
    
    // Remover campos undefined, null, o arrays vacíos
    Object.keys(dto).forEach(key => {
      const value = dto[key];
      if (value === undefined || value === null) {
        delete dto[key];
      } else if (Array.isArray(value) && value.length === 0) {
        // Si es un array vacío, no enviar el campo
        delete dto[key];
      }
    });
    
    // Log solo en desarrollo para no ralentizar en producción
    if (!environment.production) {
      console.log('🔄 POST Actividad - DTO:', JSON.stringify(dto, null, 2));
      console.log('📤 IdTipoEvidencias enviado:', dto.IdTipoEvidencias);
    }
    
    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(item => {
        // Mapear directamente sin logs innecesarios en producción
        const actividadMapeada = this.mapActividad(item);
        if (!environment.production) {
          console.log('📥 Respuesta del backend al crear actividad:', item);
          console.log('📥 Actividad mapeada - idTipoEvidencias:', actividadMapeada.idTipoEvidencias);
        }
        return actividadMapeada;
      }),
      catchError(error => {
        // Si el error es 400 y menciona "Invalid column name", es probable que la actividad
        // se haya guardado pero el backend falló al mapear la respuesta
        if (error.status === 400 && error.error?.message?.includes('Invalid column name')) {
          console.warn('⚠️ Error de mapeo en respuesta del backend. La actividad puede haberse guardado correctamente.');
          console.warn('⚠️ Error details:', error.error);
          // Intentar crear un objeto de actividad básico con el nombre para que el flujo continúe
          // El usuario puede verificar en la lista de actividades
          const actividadBasica: Actividad = {
            id: 0, // ID desconocido, pero permitirá continuar el flujo
            idActividad: 0,
            nombre: dto.NombreActividad,
            nombreActividad: dto.NombreActividad,
            descripcion: dto.Descripcion,
            creadoPor: 0,
            fechaCreacion: new Date().toISOString(),
            totalSubactividades: 0,
            totalEvidencias: 0,
            totalResponsables: 0,
            totalEdiciones: 0,
            nivelActividad: 1
          };
          return of(actividadBasica);
        }
        
        // Si es un timeout, dejar que el componente maneje el error
        // No intentar crear una actividad básica porque el timeout puede indicar
        // que la actividad se creó pero el backend no pudo responder
        const errorMessage = error.error?.message || error.error?.details || error.error || error.message || '';
        const errorText = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
        if (errorText.includes('Execution Timeout Expired') || 
            errorText.includes('timeout period elapsed') ||
            errorText.includes('timeout period ela')) {
          console.warn('⚠️ Timeout en la creación de la actividad. La actividad puede haberse guardado correctamente.');
          console.warn('⚠️ Error details:', error.error);
          // Dejar que el componente maneje el error para mostrar el mensaje apropiado
        }
        
        return throwError(() => error);
      })
    );
  }

  // Alineado con IActividadesService.UpdateAsync()
  update(id: number, actividad: Partial<ActividadCreate>): Observable<boolean> {
    // El backend espera ActividadUpdateDto con PascalCase
    // Manejar arrays: si es un array con un solo elemento, usar ese elemento; si está vacío, no enviar
    const getIdActividadAnual = (value: number | number[] | undefined): number | number[] | undefined => {
      if (value === undefined || value === null) return undefined;
      if (Array.isArray(value)) {
        if (value.length === 0) return undefined; // No enviar arrays vacíos
        // Si el backend acepta arrays, enviar el array; si no, enviar solo el primer elemento
        // Por ahora, si hay múltiples elementos, enviar solo el primero para evitar errores
        return value.length === 1 ? value[0] : value[0];
      }
      return value;
    };

    const getDepartamentoResponsableId = (value: number | number[] | undefined): number | number[] | undefined => {
      if (value === undefined || value === null) return undefined;
      if (Array.isArray(value)) {
        if (value.length === 0) return undefined; // No enviar arrays vacíos
        // Si el backend acepta arrays, enviar el array; si no, enviar solo el primer elemento
        // Por ahora, si hay múltiples elementos, enviar solo el primero para evitar errores
        return value.length === 1 ? value[0] : value[0];
      }
      return value;
    };

    const getIdTipoProtagonista = (value: number | number[] | undefined): number | number[] | undefined => {
      if (value === undefined || value === null) return undefined;
      if (Array.isArray(value)) {
        if (value.length === 0) return undefined; // No enviar arrays vacíos
        // Si el backend acepta arrays, enviar el array; si no, enviar solo el primer elemento
        // Por ahora, si hay múltiples elementos, enviar solo el primero para evitar errores
        return value.length === 1 ? value[0] : value[0];
      }
      return value;
    };

    const getIdTipoActividad = (value: number | number[] | undefined): number | number[] | undefined => {
      if (value === undefined || value === null) return undefined;
      if (Array.isArray(value)) {
        if (value.length === 0) return undefined; // No enviar arrays vacíos
        // Si el backend acepta arrays, enviar el array; si no, enviar solo el primer elemento
        // Por ahora, si hay múltiples elementos, enviar solo el primero para evitar errores
        return value.length === 1 ? value[0] : value[0];
      }
      return value;
    };

    const dto: any = {};
    
    if (actividad.nombreActividad !== undefined || actividad.nombre !== undefined) {
      const nombreActividad = actividad.nombreActividad || actividad.nombre;
      if (nombreActividad && nombreActividad.trim() !== '') {
        dto.NombreActividad = nombreActividad.trim();
      }
    }
    if (actividad.descripcion !== undefined) {
      dto.Descripcion = actividad.descripcion;
    }
    if (actividad.departamentoId !== undefined) {
      dto.DepartamentoId = actividad.departamentoId;
    }
    if (actividad.departamentoResponsableId !== undefined) {
      const deptId = getDepartamentoResponsableId(actividad.departamentoResponsableId);
      if (deptId !== undefined) {
        dto.DepartamentoResponsableId = deptId;
      }
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
    if (actividad.fechaEvento !== undefined) {
      dto.FechaEvento = actividad.fechaEvento;
    }
    // Estado de actividad - SIEMPRE enviar si tiene valor para actualizar
    if (actividad.idEstadoActividad !== undefined && actividad.idEstadoActividad !== null) {
      const estadoId = Number(actividad.idEstadoActividad);
      if (!isNaN(estadoId) && estadoId > 0) {
        dto.IdEstadoActividad = estadoId;
      }
    }
    if (actividad.idTipoActividad !== undefined || actividad.categoriaActividadId !== undefined) {
      const tipoActividadId = getIdTipoActividad(actividad.idTipoActividad);
      if (tipoActividadId !== undefined) {
        dto.IdTipoActividad = tipoActividadId;
      } else if (actividad.categoriaActividadId !== undefined) {
        dto.IdTipoActividad = actividad.categoriaActividadId;
      }
    }
    if (actividad.idArea !== undefined || actividad.areaConocimientoId !== undefined) {
      dto.IdArea = actividad.idArea || actividad.areaConocimientoId;
    }
    if (actividad.idTipoDocumento !== undefined) {
      dto.IdTipoDocumento = actividad.idTipoDocumento;
    }
    if (actividad.modalidad !== undefined) {
      dto.Modalidad = actividad.modalidad;
    }
    if (actividad.idCapacidadInstalada !== undefined) {
      dto.IdCapacidadInstalada = actividad.idCapacidadInstalada;
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
    // Manejar idActividadMensualInst - puede ser número o array
    if (actividad.idActividadMensualInst !== undefined && actividad.idActividadMensualInst !== null) {
      if (Array.isArray(actividad.idActividadMensualInst) && actividad.idActividadMensualInst.length > 0) {
        // Si es un array, enviar el array completo con números válidos
        const idsValidos = actividad.idActividadMensualInst
          .map(id => Number(id))
          .filter(id => !isNaN(id) && id > 0);
        if (idsValidos.length > 0) {
          dto.IdActividadMensualInst = idsValidos.length === 1 ? idsValidos[0] : idsValidos;
        }
      } else if (!Array.isArray(actividad.idActividadMensualInst)) {
        // Si es un solo número, enviarlo
        const idNum = Number(actividad.idActividadMensualInst);
        if (!isNaN(idNum) && idNum > 0) {
          dto.IdActividadMensualInst = idNum;
        }
      }
    }
    if (actividad.esPlanificada !== undefined) {
      dto.EsPlanificada = actividad.esPlanificada;
    }
    if (actividad.idIndicador !== undefined) {
      dto.IdIndicador = actividad.idIndicador;
    }
    // Manejar idActividadAnual - puede ser número o array
    if (actividad.idActividadAnual !== undefined && actividad.idActividadAnual !== null) {
      if (Array.isArray(actividad.idActividadAnual) && actividad.idActividadAnual.length > 0) {
        // Si es un array, enviar el array completo con números válidos
        const idsValidos = actividad.idActividadAnual
          .map(id => Number(id))
          .filter(id => !isNaN(id) && id > 0);
        if (idsValidos.length > 0) {
          dto.IdActividadAnual = idsValidos.length === 1 ? idsValidos[0] : idsValidos;
        }
      } else if (!Array.isArray(actividad.idActividadAnual)) {
        // Si es un solo número, enviarlo
        const idNum = Number(actividad.idActividadAnual);
        if (!isNaN(idNum) && idNum > 0) {
          dto.IdActividadAnual = idNum;
        }
      }
    }
    if (actividad.objetivo !== undefined) {
      dto.Objetivo = actividad.objetivo;
    }
    if (actividad.cantidadMaximaParticipantesEstudiantes !== undefined) {
      dto.CantidadMaximaParticipantesEstudiantes = actividad.cantidadMaximaParticipantesEstudiantes;
    }
    if (actividad.tipoResumenAccion !== undefined) {
      dto.TipoResumenAccion = actividad.tipoResumenAccion;
    }
    if (actividad.metaAlcanzada !== undefined) {
      dto.MetaAlcanzada = actividad.metaAlcanzada;
    }
    if (actividad.metaCumplimiento !== undefined) {
      dto.MetaCumplimiento = actividad.metaCumplimiento;
    }
    if (actividad.valoracionIndicadorEstrategico !== undefined) {
      dto.ValoracionIndicadorEstrategico = actividad.valoracionIndicadorEstrategico;
    }
    if (actividad.brechaEstrategica !== undefined) {
      dto.BrechaEstrategica = actividad.brechaEstrategica;
    }
    if (actividad.anio !== undefined) {
      dto.Anio = actividad.anio;
    }
    if (actividad.horaRealizacion !== undefined) {
      dto.HoraRealizacion = actividad.horaRealizacion;
    }
    if (actividad.cantidadParticipantesProyectados !== undefined) {
      dto.CantidadParticipantesProyectados = actividad.cantidadParticipantesProyectados;
    }
    if (actividad.cantidadParticipantesEstudiantesProyectados !== undefined) {
      dto.CantidadParticipantesEstudiantesProyectados = actividad.cantidadParticipantesEstudiantesProyectados;
    }
    if (actividad.idTipoProtagonista !== undefined) {
      const tipoProtagonistaId = getIdTipoProtagonista(actividad.idTipoProtagonista);
      if (tipoProtagonistaId !== undefined) {
        dto.IdTipoProtagonista = tipoProtagonistaId;
      }
    }
    if (actividad.responsableActividad !== undefined) {
      dto.ResponsableActividad = actividad.responsableActividad;
    }
    if (actividad.idTipoEvidencias !== undefined) {
      dto.IdTipoEvidencias = actividad.idTipoEvidencias;
    }
    if (actividad.responsables !== undefined) {
      dto.Responsables = actividad.responsables.map(r => {
        const responsableDto: any = {};
        if (r.idUsuario !== undefined) responsableDto.IdUsuario = r.idUsuario;
        if (r.idDocente !== undefined) responsableDto.IdDocente = r.idDocente;
        if (r.idEstudiante !== undefined) responsableDto.IdEstudiante = r.idEstudiante;
        if (r.idAdmin !== undefined) responsableDto.IdAdmin = r.idAdmin;
        if (r.responsableExterno) {
          responsableDto.ResponsableExterno = {
            Nombre: r.responsableExterno.nombre,
            Institucion: r.responsableExterno.institucion,
            Cargo: r.responsableExterno.cargo,
            Telefono: r.responsableExterno.telefono,
            Correo: r.responsableExterno.correo
          };
        }
        if (r.idRolResponsable !== undefined) responsableDto.IdRolResponsable = r.idRolResponsable;
        if (r.rolResponsable) responsableDto.RolResponsable = r.rolResponsable;
        if (r.fechaAsignacion) responsableDto.FechaAsignacion = r.fechaAsignacion;
        return responsableDto;
      });
    }
    
    // Remover campos undefined, null, o arrays vacíos
    Object.keys(dto).forEach(key => {
      const value = dto[key];
      if (value === undefined || value === null) {
        delete dto[key];
      } else if (Array.isArray(value) && value.length === 0) {
        // Si es un array vacío, no enviar el campo
        delete dto[key];
      }
    });
    
    console.log('🔄 PUT Actividad - DTO:', JSON.stringify(dto, null, 2));
    
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating actividad:', error);
        if (error.error) {
          console.error('Error details:', JSON.stringify(error.error, null, 2));
        }
        return of(false);
      })
    );
  }

  // Alineado con IActividadesService.DeleteAsync()
  delete(id: number): Observable<boolean> {
    console.log('🗑️ DELETE Actividad - ID:', id);
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(() => {
        console.log('✅ Actividad eliminada exitosamente');
        return true;
      }),
      catchError(error => {
        console.error('❌ Error deleting actividad:', error);
        if (error.error) {
          console.error('Error details:', JSON.stringify(error.error, null, 2));
        }
        if (error.status === 500) {
          console.error('Error 500: El servidor encontró un error interno. Esto puede deberse a restricciones de integridad referencial (la actividad puede tener relaciones con otros registros).');
        }
        return throwError(() => error); // Propagar el error para que el componente pueda manejarlo
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

  /**
   * POST /api/actividades/{idActividad}/indicadores
   * Asocia un indicador a una actividad
   */
  agregarIndicador(idActividad: number, idIndicador: number): Observable<ActividadIndicador> {
    const payload = {
      IdIndicador: idIndicador
    };
    return this.http.post<any>(`${this.apiUrl}/${idActividad}/indicadores`, payload).pipe(
      map(response => {
        const item = response.data || response;
        return {
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
        };
      })
    );
  }

  getSubactividades(id: number): Observable<Subactividad[]> {
    return this.http.get<any>(`${this.apiUrl}/${id}/subactividades`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({
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

  /**
   * GET /api/actividades/con-participantes
   * Obtiene actividades agrupadas por tipo de protagonista real (basado en participaciones)
   * Útil para informes donde una actividad puede aparecer múltiples veces (una por cada tipo de protagonista)
   */
  getActividadesConParticipantes(filter?: ActividadConParticipantesFilterDto): Observable<any[]> {
    let params = new HttpParams();
    
    if (filter) {
      if (filter.IdActividad !== undefined) {
        params = params.set('IdActividad', filter.IdActividad.toString());
      }
      if (filter.Anio !== undefined) {
        params = params.set('Anio', filter.Anio.toString());
      }
      if (filter.EsPlanificada !== undefined) {
        params = params.set('EsPlanificada', filter.EsPlanificada.toString());
      }
      if (filter.DepartamentoResponsableId !== undefined) {
        params = params.set('DepartamentoResponsableId', filter.DepartamentoResponsableId.toString());
      }
      if (filter.IdIndicador !== undefined) {
        params = params.set('IdIndicador', filter.IdIndicador.toString());
      }
      if (filter.TipoProtagonistaReal) {
        params = params.set('TipoProtagonistaReal', filter.TipoProtagonistaReal);
      }
    }
    
    return this.http.get<any>(`${this.apiUrl}/con-participantes`, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items : [];
      }),
      catchError(error => {
        console.error('Error fetching actividades con participantes:', error);
        return of([]);
      })
    );
  }

  /**
   * GET /api/actividades/{idActividad}/estadisticas-participantes
   * Obtiene estadísticas de participantes de una actividad (totales por género sin duplicar)
   */
  getEstadisticasParticipantes(idActividad: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${idActividad}/estadisticas-participantes`).pipe(
      map((response: any) => {
        return response.data || response;
      }),
      catchError((error: any) => {
        console.error(`Error fetching estadísticas de participantes para actividad ${idActividad}:`, error);
        return of(null);
      })
    );
  }

  /**
   * GET /api/actividades/{idActividad}/participantes-con-nombres
   * Obtiene lista de participantes de una actividad con nombres, separados por género
   */
  getParticipantesConNombres(idActividad: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${idActividad}/participantes-con-nombres`).pipe(
      map((response: any) => {
        return response.data || response;
      }),
      catchError((error: any) => {
        console.error(`Error fetching participantes con nombres para actividad ${idActividad}:`, error);
        return of(null);
      })
    );
  }

  private mapActividad(item: any): Actividad {
    // Log solo en desarrollo para no ralentizar en producción
    if (!environment.production && (item.IdTipoEvidencias || item.idTipoEvidencias)) {
      console.log('🔍 Backend devolvió IdTipoEvidencias:', item.IdTipoEvidencias || item.idTipoEvidencias, 'Tipo:', typeof (item.IdTipoEvidencias || item.idTipoEvidencias));
    }
    
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
        creadoPor: s.CreadoPor || s.creadoPor || 0,
        fechaCreacion: s.FechaCreacion || s.fechaCreacion || new Date().toISOString(),
        fechaModificacion: s.FechaModificacion || s.fechaModificacion,
        idCapacidadInstalada: s.IdCapacidadInstalada || s.idCapacidadInstalada,
        idDocenteOrganizador: s.IdDocenteOrganizador || s.idDocenteOrganizador
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
        idUsuario: r.IdUsuario !== undefined && r.IdUsuario !== null ? r.IdUsuario : (r.idUsuario !== undefined && r.idUsuario !== null ? r.idUsuario : undefined),
        idDocente: r.IdDocente !== undefined && r.IdDocente !== null ? r.IdDocente : (r.idDocente !== undefined && r.idDocente !== null ? r.idDocente : undefined),
        idAdmin: r.IdAdmin !== undefined && r.IdAdmin !== null ? r.IdAdmin : (r.idAdmin !== undefined && r.idAdmin !== null ? r.idAdmin : undefined),
        // Incluir idEstudiante e idResponsableExterno si el backend los envía
        idEstudiante: r.IdEstudiante !== undefined && r.IdEstudiante !== null ? r.IdEstudiante : (r.idEstudiante !== undefined && r.idEstudiante !== null ? r.idEstudiante : undefined),
        idResponsableExterno: r.IdResponsableExterno !== undefined && r.IdResponsableExterno !== null ? r.IdResponsableExterno : (r.idResponsableExterno !== undefined && r.idResponsableExterno !== null ? r.idResponsableExterno : undefined),
        idRolResponsable: r.IdRolResponsable !== undefined && r.IdRolResponsable !== null ? r.IdRolResponsable : (r.idRolResponsable !== undefined && r.idRolResponsable !== null ? r.idRolResponsable : undefined),
        // Mapear nombres en orden de prioridad: Persona > Docente > Admin > Usuario > Estudiante > ResponsableExterno
        nombrePersona: r.NombrePersona || r.nombrePersona || 
                      r.NombreDocente || r.nombreDocente || 
                      r.NombreAdmin || r.nombreAdmin || 
                      r.NombreUsuario || r.nombreUsuario ||
                      r.NombreEstudiante || r.nombreEstudiante ||
                      r.NombreResponsableExterno || r.nombreResponsableExterno,
        nombreDocente: r.NombreDocente || r.nombreDocente,
        nombreAdmin: r.NombreAdmin || r.nombreAdmin,
        nombreUsuario: r.NombreUsuario || r.nombreUsuario,
        nombreEstudiante: r.NombreEstudiante || r.nombreEstudiante,
        nombreResponsableExterno: r.NombreResponsableExterno || r.nombreResponsableExterno,
        idTipoResponsable: r.IdTipoResponsable || r.idTipoResponsable || 0,
        nombreTipoResponsable: r.NombreTipoResponsable || r.nombreTipoResponsable,
        departamentoId: r.DepartamentoId !== undefined && r.DepartamentoId !== null ? r.DepartamentoId : (r.departamentoId !== undefined && r.departamentoId !== null ? r.departamentoId : undefined),
        nombreDepartamento: r.NombreDepartamento || r.nombreDepartamento,
        fechaAsignacion: r.FechaAsignacion || r.fechaAsignacion ? formatDate(r.FechaAsignacion || r.fechaAsignacion) : undefined,
        rolResponsable: r.RolResponsable || r.rolResponsable,
        rolResponsableDetalle: r.RolResponsableDetalle || r.rolResponsableDetalle,
        nombreActividad: r.NombreActividad || r.nombreActividad
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

    // Mapear actividades anuales si existen (el backend devuelve el array completo con nombres)
    const mapActividadesAnuales = (anuales: any[]): ActividadAnual[] => {
      if (!Array.isArray(anuales)) return [];
      return anuales.map(a => ({
        idActividadAnual: a.idActividadAnual || a.IdActividadAnual || a.Id || a.id || 0,
        idIndicador: a.idIndicador || a.IdIndicador || 0,
        nombreIndicador: a.nombreIndicador || a.NombreIndicador,
        codigoIndicador: a.codigoIndicador || a.CodigoIndicador,
        nombre: a.nombre || a.Nombre,
        descripcion: a.descripcion || a.Descripcion,
        anio: a.anio || a.Anio || 0,
        metaAnual: a.metaAnual !== undefined ? a.metaAnual : (a.MetaAnual !== undefined ? a.MetaAnual : undefined),
        metaAlcanzada: a.metaAlcanzada !== undefined ? a.metaAlcanzada : (a.MetaAlcanzada !== undefined ? a.MetaAlcanzada : undefined),
        porcentajeCumplimiento: a.porcentajeCumplimiento !== undefined ? a.porcentajeCumplimiento : (a.PorcentajeCumplimiento !== undefined ? a.PorcentajeCumplimiento : undefined),
        valoracionCualitativa: a.valoracionCualitativa || a.ValoracionCualitativa,
        brechas: a.brechas || a.Brechas,
        evidenciaResumen: a.evidenciaResumen || a.EvidenciaResumen,
        activo: a.activo !== undefined ? a.activo : (a.Activo !== undefined ? a.Activo : true),
        creadoPor: a.creadoPor || a.CreadoPor,
        fechaCreacion: a.fechaCreacion || a.FechaCreacion,
        fechaModificacion: a.fechaModificacion || a.FechaModificacion
      }));
    };

    // Mapear actividades mensuales si existen (el backend devuelve el array completo con nombres)
    const mapActividadesMensualesInst = (mensuales: any[]): ActividadMensualInst[] => {
      if (!Array.isArray(mensuales)) return [];
      const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return mensuales.map(m => {
        const mes = m.mes || m.Mes || 0;
        return {
          idActividadMensualInst: m.idActividadMensualInst || m.IdActividadMensualInst || m.Id || m.id || 0,
          idActividadAnual: m.idActividadAnual || m.IdActividadAnual || 0,
          mes: mes,
          nombre: m.nombre || m.Nombre,
          descripcion: m.descripcion || m.Descripcion,
          nombreMes: meses[mes] || m.nombreMes || m.NombreMes,
          metaMensual: m.metaMensual !== undefined ? m.metaMensual : (m.MetaMensual !== undefined ? m.MetaMensual : undefined),
          metaAlcanzada: m.metaAlcanzada !== undefined ? m.metaAlcanzada : (m.MetaAlcanzada !== undefined ? m.MetaAlcanzada : undefined),
          porcentajeCumplimiento: m.porcentajeCumplimiento !== undefined ? m.porcentajeCumplimiento : (m.PorcentajeCumplimiento !== undefined ? m.PorcentajeCumplimiento : undefined),
          valoracionCualitativa: m.valoracionCualitativa || m.ValoracionCualitativa,
          brechas: m.brechas || m.Brechas,
          evidenciaResumen: m.evidenciaResumen || m.EvidenciaResumen,
          activo: m.activo !== undefined ? m.activo : (m.Activo !== undefined ? m.Activo : true),
          creadoPor: m.creadoPor || m.CreadoPor,
          fechaCreacion: m.fechaCreacion || m.FechaCreacion,
          fechaModificacion: m.fechaModificacion || m.FechaModificacion,
          actividadAnual: m.actividadAnual || m.ActividadAnual ? {
            idActividadAnual: m.actividadAnual?.idActividadAnual || m.ActividadAnual?.IdActividadAnual || 0,
            idIndicador: m.actividadAnual?.idIndicador || m.ActividadAnual?.IdIndicador || 0,
            anio: m.actividadAnual?.anio || m.ActividadAnual?.Anio || 0,
            nombreIndicador: m.actividadAnual?.nombreIndicador || m.ActividadAnual?.NombreIndicador
          } : undefined
        };
      });
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
      
      // Arrays de Departamentos (mapear desde el backend)
      idDepartamentosResponsables: (() => {
        // Buscar en diferentes formatos
        if (Array.isArray(item.IdDepartamentosResponsables) && item.IdDepartamentosResponsables.length > 0) {
          return item.IdDepartamentosResponsables;
        }
        if (Array.isArray(item.idDepartamentosResponsables) && item.idDepartamentosResponsables.length > 0) {
          return item.idDepartamentosResponsables;
        }
        // Si hay un solo valor, convertirlo a array
        if (item.DepartamentoResponsableId || item.departamentoResponsableId) {
          return [item.DepartamentoResponsableId || item.departamentoResponsableId];
        }
        return undefined;
      })(),
      
      // Tipos e Iniciativas
      idTipoIniciativa: item.IdTipoIniciativa || item.idTipoIniciativa,
      nombreTipoIniciativa: item.NombreTipoIniciativa || item.nombreTipoIniciativa,
      
      // Fechas
      fechaInicio: formatDate(item.FechaInicio || item.fechaInicio),
      fechaFin: formatDate(item.FechaFin || item.fechaFin),
      fechaEvento: formatDate(item.FechaEvento || item.fechaEvento),
      
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
      idCapacidadInstalada: (() => {
        // Buscar en diferentes formatos posibles - incluyendo id_instalacion
        const id = item.IdCapacidadInstalada ?? item.idCapacidadInstalada 
          ?? item.IdCapacidad ?? item.idCapacidad
          ?? item.CapacidadInstaladaId ?? item.capacidadInstaladaId
          ?? item.IdInstalacion ?? item.id_instalacion ?? item.idInstalacion;
        
        // Si viene como objeto relacionado, extraer el ID
        if (!id && item.CapacidadInstalada) {
          const capacidadObj = item.CapacidadInstalada;
          const capacidadId = capacidadObj.IdCapacidadInstalada ?? capacidadObj.idCapacidadInstalada 
            ?? capacidadObj.Id ?? capacidadObj.id
            ?? capacidadObj.IdInstalacion ?? capacidadObj.id_instalacion ?? capacidadObj.idInstalacion;
          if (capacidadId) {
            console.log('✅ idCapacidadInstalada encontrado en objeto CapacidadInstalada:', capacidadId);
            return capacidadId;
          }
        }
        
        if (!id && item.capacidadInstalada) {
          const capacidadObj = item.capacidadInstalada;
          const capacidadId = capacidadObj.IdCapacidadInstalada ?? capacidadObj.idCapacidadInstalada 
            ?? capacidadObj.Id ?? capacidadObj.id
            ?? capacidadObj.IdInstalacion ?? capacidadObj.id_instalacion ?? capacidadObj.idInstalacion;
          if (capacidadId) {
            console.log('✅ idCapacidadInstalada encontrado en objeto capacidadInstalada:', capacidadId);
            return capacidadId;
          }
        }
        
        console.log('🔍 CAPACIDAD INSTALADA - Buscando en item:', {
          IdCapacidadInstalada: item.IdCapacidadInstalada,
          idCapacidadInstalada: item.idCapacidadInstalada,
          id_instalacion: item.id_instalacion,
          IdInstalacion: item.IdInstalacion,
          idInstalacion: item.idInstalacion,
          encontrado: id
        });
        
        return id !== null && id !== undefined ? id : undefined;
      })(),
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
      
      // Planificación
      esPlanificada: item.EsPlanificada !== undefined ? item.EsPlanificada : (item.esPlanificada !== undefined ? item.esPlanificada : false),
      idIndicador: item.IdIndicador || item.idIndicador,
      nombreIndicador: item.NombreIndicador || item.nombreIndicador,
      codigoIndicadorAsociado: item.CodigoIndicadorAsociado || item.codigoIndicadorAsociado,
      nombreIndicadorAsociado: item.NombreIndicadorAsociado || item.nombreIndicadorAsociado,
      metaIndicador: item.MetaIndicador !== undefined ? item.MetaIndicador : (item.metaIndicador !== undefined ? item.metaIndicador : undefined),
      idActividadAnual: item.IdActividadAnual || item.idActividadAnual,
      nombreActividadAnual: item.NombreActividadAnual || item.nombreActividadAnual,
      
      // Arrays de Planificación (mapear desde el backend)
      idActividadesAnuales: (() => {
        // Buscar en diferentes formatos
        if (Array.isArray(item.IdActividadesAnuales) && item.IdActividadesAnuales.length > 0) {
          return item.IdActividadesAnuales;
        }
        if (Array.isArray(item.idActividadesAnuales) && item.idActividadesAnuales.length > 0) {
          return item.idActividadesAnuales;
        }
        // Si hay un solo valor, convertirlo a array
        if (item.IdActividadAnual || item.idActividadAnual) {
          return [item.IdActividadAnual || item.idActividadAnual];
        }
        return undefined;
      })(),
      idActividadesMensualesInst: (() => {
        // Buscar en diferentes formatos
        if (Array.isArray(item.IdActividadesMensualesInst) && item.IdActividadesMensualesInst.length > 0) {
          return item.IdActividadesMensualesInst;
        }
        if (Array.isArray(item.idActividadesMensualesInst) && item.idActividadesMensualesInst.length > 0) {
          return item.idActividadesMensualesInst;
        }
        // Si hay un solo valor, convertirlo a array
        if (item.IdActividadMensualInst || item.idActividadMensualInst) {
          return [item.IdActividadMensualInst || item.idActividadMensualInst];
        }
        return undefined;
      })(),
      
      // Objetivos y Metas
      objetivo: item.Objetivo || item.objetivo,
      cantidadMaximaParticipantesEstudiantes: item.CantidadMaximaParticipantesEstudiantes || item.cantidadMaximaParticipantesEstudiantes,
      tipoResumenAccion: item.TipoResumenAccion || item.tipoResumenAccion,
      metaAlcanzada: item.MetaAlcanzada !== undefined ? item.MetaAlcanzada : (item.metaAlcanzada !== undefined ? item.metaAlcanzada : undefined),
      metaCumplimiento: item.MetaCumplimiento !== undefined ? item.MetaCumplimiento : (item.metaCumplimiento !== undefined ? item.metaCumplimiento : undefined),
      valoracionIndicadorEstrategico: item.ValoracionIndicadorEstrategico || item.valoracionIndicadorEstrategico,
      brechaEstrategica: item.BrechaEstrategica || item.brechaEstrategica,
      anio: item.Anio || item.anio,
      horaRealizacion: item.HoraRealizacion || item.horaRealizacion,
      cantidadParticipantesProyectados: item.CantidadParticipantesProyectados || item.cantidadParticipantesProyectados,
      cantidadParticipantesEstudiantesProyectados: item.CantidadParticipantesEstudiantesProyectados !== undefined ? item.CantidadParticipantesEstudiantesProyectados : (item.cantidadParticipantesEstudiantesProyectados !== undefined ? item.cantidadParticipantesEstudiantesProyectados : undefined),
      cantidadTotalParticipantesProtagonistas: item.CantidadTotalParticipantesProtagonistas !== undefined ? item.CantidadTotalParticipantesProtagonistas : (item.cantidadTotalParticipantesProtagonistas !== undefined ? item.cantidadTotalParticipantesProtagonistas : undefined),
      idTipoProtagonista: item.IdTipoProtagonista || item.idTipoProtagonista,
      
      // Arrays de Tipos Protagonistas (mapear desde el backend)
      idTiposProtagonistas: (() => {
        // Buscar en diferentes formatos
        if (Array.isArray(item.IdTiposProtagonistas) && item.IdTiposProtagonistas.length > 0) {
          return item.IdTiposProtagonistas;
        }
        if (Array.isArray(item.idTiposProtagonistas) && item.idTiposProtagonistas.length > 0) {
          return item.idTiposProtagonistas;
        }
        // Si hay un solo valor, convertirlo a array
        if (item.IdTipoProtagonista || item.idTipoProtagonista) {
          return [item.IdTipoProtagonista || item.idTipoProtagonista];
        }
        return undefined;
      })(),
      idTipoEvidencias: (() => {
        console.log('🔍 Buscando IdTipoEvidencias en item:', {
          IdTipoEvidencias: item.IdTipoEvidencias,
          idTipoEvidencias: item.idTipoEvidencias,
          TiposEvidencia: item.TiposEvidencia,
          allKeys: Object.keys(item).filter(k => k.toLowerCase().includes('evidencia') || k.toLowerCase().includes('tipo'))
        });
        
        // Intentar obtener IdTipoEvidencias en diferentes formatos
        if (Array.isArray(item.IdTipoEvidencias) && item.IdTipoEvidencias.length > 0) {
          console.log('✅ IdTipoEvidencias encontrado como array (PascalCase):', item.IdTipoEvidencias);
          return item.IdTipoEvidencias;
        }
        if (Array.isArray(item.idTipoEvidencias) && item.idTipoEvidencias.length > 0) {
          console.log('✅ idTipoEvidencias encontrado como array (camelCase):', item.idTipoEvidencias);
          return item.idTipoEvidencias;
        }
        // Si es un array vacío, retornar array vacío en lugar de undefined
        if (Array.isArray(item.IdTipoEvidencias) || Array.isArray(item.idTipoEvidencias)) {
          console.log('⚠️ IdTipoEvidencias es un array vacío');
          return [];
        }
        // Si viene como string (JSON), parsearlo
        if (typeof item.IdTipoEvidencias === 'string' && item.IdTipoEvidencias.trim() !== '') {
          try {
            const parsed = JSON.parse(item.IdTipoEvidencias);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('✅ IdTipoEvidencias parseado desde string (PascalCase):', parsed);
              return parsed;
            }
          } catch (e) {
            console.warn('⚠️ Error parsing IdTipoEvidencias:', e);
          }
        }
        if (typeof item.idTipoEvidencias === 'string' && item.idTipoEvidencias.trim() !== '') {
          try {
            const parsed = JSON.parse(item.idTipoEvidencias);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('✅ idTipoEvidencias parseado desde string (camelCase):', parsed);
              return parsed;
            }
          } catch (e) {
            console.warn('⚠️ Error parsing idTipoEvidencias:', e);
          }
        }
        // Si no se encuentra, verificar si hay algún campo relacionado
        if (item.TiposEvidencia && Array.isArray(item.TiposEvidencia)) {
          const tipos = item.TiposEvidencia.map((t: any) => t.IdTipoEvidencia || t.idTipoEvidencia).filter((id: any) => id);
          if (tipos.length > 0) {
            console.log('✅ TiposEvidencia encontrado como objeto, extrayendo IDs:', tipos);
            return tipos;
          }
        }
        // Si el campo es null o array vacío, retornar array vacío
        if (item.IdTipoEvidencias === null || item.idTipoEvidencias === null) {
          console.log('ℹ️ IdTipoEvidencias es null (actividad sin tipos asignados)');
          return [];
        }
        // Si es un array vacío, retornarlo
        if (Array.isArray(item.IdTipoEvidencias) && item.IdTipoEvidencias.length === 0) {
          console.log('ℹ️ IdTipoEvidencias es un array vacío (actividad sin tipos asignados)');
          return [];
        }
        if (Array.isArray(item.idTipoEvidencias) && item.idTipoEvidencias.length === 0) {
          console.log('ℹ️ idTipoEvidencias es un array vacío (actividad sin tipos asignados)');
          return [];
        }
        // Si no está presente, retornar undefined (campo opcional)
        console.log('⚠️ IdTipoEvidencias no encontrado en la respuesta del backend');
        return undefined;
      })(),
      
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
      // Actividades anuales y mensuales (el backend devuelve arrays completos con nombres)
      // El backend devuelve en camelCase: actividadesAnuales y actividadesMensualesInst
      actividadesAnuales: (() => {
        // Buscar primero en camelCase (formato del backend)
        const anuales = item.actividadesAnuales || item.ActividadesAnuales || [];
        if (Array.isArray(anuales) && anuales.length > 0) {
          console.log(`📥 [ActividadesService] Mapeando ${anuales.length} actividades anuales del backend`);
          console.log(`📋 [ActividadesService] Primera actividad anual RAW:`, anuales[0]);
        } else {
          console.log(`⚠️ [ActividadesService] No se encontraron actividades anuales en la respuesta del backend`);
        }
        const mapeadas = mapActividadesAnuales(anuales);
        if (mapeadas.length > 0) {
          console.log(`✅ [ActividadesService] ${mapeadas.length} actividades anuales mapeadas exitosamente`);
        }
        return mapeadas;
      })(),
      actividadesMensualesInst: (() => {
        // Buscar primero en camelCase (formato del backend)
        const mensuales = item.actividadesMensualesInst || item.ActividadesMensualesInst || [];
        if (Array.isArray(mensuales) && mensuales.length > 0) {
          console.log(`📥 [ActividadesService] Mapeando ${mensuales.length} actividades mensuales del backend`);
          console.log(`📋 [ActividadesService] Primera actividad mensual RAW:`, mensuales[0]);
        } else {
          console.log(`⚠️ [ActividadesService] No se encontraron actividades mensuales en la respuesta del backend`);
        }
        const mapeadas = mapActividadesMensualesInst(mensuales);
        if (mapeadas.length > 0) {
          console.log(`✅ [ActividadesService] ${mapeadas.length} actividades mensuales mapeadas exitosamente`);
        }
        return mapeadas;
      })(),
      
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