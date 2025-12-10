import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { ActividadResponsable } from '../models/actividad-responsable';

export interface ActividadResponsableCreate {
  idActividad: number;
  idUsuario?: number;
  idDocente?: number;
  idEstudiante?: number;
  idAdmin?: number;
  idResponsableExterno?: number; // Para responsables externos existentes
  responsableExterno?: {
    nombre: string;
    institucion: string;
    cargo?: string;
    telefono?: string;
    correo?: string;
  };
  idTipoResponsable: number;
  idRolResponsable?: number; // ID del rol responsable (Coordinador, Evaluador, etc.)
  departamentoId?: number;
  fechaAsignacion?: string; // DateOnly: YYYY-MM-DD
  rolResponsable?: string;
  rolResponsableDetalle?: string;
}

export interface ActividadResponsableUpdate {
  idActividad?: number;
  idUsuario?: number;
  idDocente?: number;
  idAdmin?: number;
  idTipoResponsable?: number;
  departamentoId?: number;
  fechaAsignacion?: string; // DateOnly: YYYY-MM-DD
  rolResponsable?: string;
  rolResponsableDetalle?: string;
  nombreDocente?: string;
  nombreUsuario?: string;
  nombreAdmin?: string;
  nombreDepartamento?: string;
  nombreTipoResponsable?: string;
}

@Injectable({ providedIn: 'root' })
export class ActividadResponsableService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/actividad-responsable`;

  /**
   * Obtiene todos los responsables
   */
  getAll(): Observable<ActividadResponsable[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapActividadResponsable(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching responsables:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene un responsable por ID
   */
  getById(id: number): Observable<ActividadResponsable | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        const item = response.data || response;
        return item ? this.mapActividadResponsable(item) : null;
      }),
      catchError(error => {
        console.error(`Error fetching responsable ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Obtiene responsables por actividad
   */
  getByActividad(idActividad: number): Observable<ActividadResponsable[]> {
    const url = `${this.apiUrl}/actividad/${idActividad}`;
    console.log(`🔄 GET Responsables por Actividad - URL: ${url}`);
    console.log(`🔄 GET Responsables por Actividad - ID Actividad: ${idActividad}`);
    return this.http.get<any>(url).pipe(
      map(response => {
        const items = response.data || response;
        console.log('📥 Respuesta del backend para responsables:', items);
        if (Array.isArray(items)) {
          const mapped = items.map(item => {
            console.log('📋 Mapeando responsable:', item);
            return this.mapActividadResponsable(item);
          });
          console.log('✅ Responsables mapeados:', mapped);
          return mapped;
        }
        return [];
      }),
      catchError(error => {
        console.error(`Error fetching responsables for actividad ${idActividad}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Crea un nuevo responsable
   */
  create(data: ActividadResponsableCreate): Observable<ActividadResponsable> {
    const payload: any = {
      IdActividad: Number(data.idActividad),
      IdTipoResponsable: Number(data.idTipoResponsable)
    };

    // El backend espera campos específicos según el tipo de responsable
    // IMPORTANTE: No enviar IDs si son 0 o null, ya que el backend rechazará
    if (data.idUsuario !== undefined && data.idUsuario !== null) {
      const idUsuarioNum = Number(data.idUsuario);
      if (idUsuarioNum > 0) {
        payload.IdUsuario = idUsuarioNum;
      }
    }
    if (data.idDocente !== undefined && data.idDocente !== null) {
      const idDocenteNum = Number(data.idDocente);
      if (idDocenteNum > 0) {
        payload.IdDocente = idDocenteNum;
      }
    }
    if (data.idEstudiante !== undefined && data.idEstudiante !== null) {
      const idEstudianteNum = Number(data.idEstudiante);
      if (idEstudianteNum > 0) {
        payload.IdEstudiante = idEstudianteNum;
      }
    }
    if (data.idAdmin !== undefined && data.idAdmin !== null) {
      const idAdminNum = Number(data.idAdmin);
      if (idAdminNum > 0) {
        payload.IdAdmin = idAdminNum;
      }
    }
    if (data.idResponsableExterno !== undefined && data.idResponsableExterno !== null) {
      const idResponsableExternoNum = Number(data.idResponsableExterno);
      if (idResponsableExternoNum > 0) {
        payload.IdResponsableExterno = idResponsableExternoNum;
      }
    }
    if (data.responsableExterno) {
      payload.ResponsableExterno = {
        Nombre: data.responsableExterno.nombre,
        Institucion: data.responsableExterno.institucion,
        Cargo: data.responsableExterno.cargo,
        Telefono: data.responsableExterno.telefono,
        Correo: data.responsableExterno.correo
      };
    }
    
    if (data.departamentoId !== undefined && data.departamentoId !== null) {
      payload.DepartamentoId = Number(data.departamentoId);
    }
    if (data.fechaAsignacion && data.fechaAsignacion.trim()) {
      payload.FechaAsignacion = data.fechaAsignacion.trim();
    }
    // Enviar IdRolResponsable si está presente
    if (data.idRolResponsable !== undefined && data.idRolResponsable !== null) {
      payload.IdRolResponsable = Number(data.idRolResponsable);
      console.log('✅ [CREATE] IdRolResponsable incluido en payload:', payload.IdRolResponsable);
    } else {
      console.warn('⚠️ [CREATE] IdRolResponsable NO está presente en data:', data);
    }
    // Enviar RolResponsable si está presente (nombre del rol)
    if (data.rolResponsable && data.rolResponsable.trim()) {
      payload.RolResponsable = data.rolResponsable.trim();
      console.log('✅ [CREATE] RolResponsable incluido en payload:', payload.RolResponsable);
    } else {
      console.warn('⚠️ [CREATE] RolResponsable NO está presente en data:', data);
    }

    console.log('🔄 CREATE ActividadResponsable - Payload completo enviado al backend:', JSON.stringify(payload, null, 2));
    console.log('🔄 CREATE ActividadResponsable - URL:', this.apiUrl);

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(response => {
        const item = response.data || response;
        if (!item) {
          throw new Error('No se recibió respuesta del servidor');
        }
        console.log('✅ CREATE ActividadResponsable - Respuesta recibida:', item);
        return this.mapActividadResponsable(item);
      }),
      catchError(error => {
        console.error('❌ Error creating responsable:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        if (error.error) {
          console.error('❌ Error body:', error.error);
          if (error.error.errors) {
            console.error('❌ Validation errors:', error.error.errors);
          }
        }
        throw error;
      })
    );
  }

  /**
   * Actualiza un responsable existente
   */
  update(id: number, data: ActividadResponsableUpdate): Observable<ActividadResponsable> {
    const payload: any = {};

    if (data.idActividad !== undefined) {
      payload.IdActividad = Number(data.idActividad);
    }
    // El backend actual solo maneja IdUsuario, no IdDocente ni IdAdmin
    // Si se envía idDocente o idAdmin, los convertimos a idUsuario
    // IMPORTANTE: No enviar IdUsuario si es 0 o null, ya que el backend rechazará con "El usuario especificado no existe"
    if (data.idUsuario !== undefined && data.idUsuario !== null) {
      const idUsuarioNum = Number(data.idUsuario);
      if (idUsuarioNum > 0) {
        payload.IdUsuario = idUsuarioNum;
      }
      // Si es 0 o menor, no enviar IdUsuario
    } else if (data.idDocente !== undefined && data.idDocente !== null) {
      // Si se envía idDocente, usar idUsuario (el backend no distingue)
      const idDocenteNum = Number(data.idDocente);
      if (idDocenteNum > 0) {
        payload.IdUsuario = idDocenteNum;
      }
      // Si es 0 o menor, no enviar IdUsuario
    } else if (data.idAdmin !== undefined && data.idAdmin !== null) {
      // Si se envía idAdmin, usar idUsuario (el backend no distingue)
      const idAdminNum = Number(data.idAdmin);
      if (idAdminNum > 0) {
        payload.IdUsuario = idAdminNum;
      }
      // Si es 0 o menor, no enviar IdUsuario
    }
    
    if (data.idTipoResponsable !== undefined) {
      payload.IdTipoResponsable = data.idTipoResponsable !== null ? Number(data.idTipoResponsable) : null;
    }
    if (data.departamentoId !== undefined) {
      payload.DepartamentoId = data.departamentoId !== null ? Number(data.departamentoId) : null;
    }
    if (data.fechaAsignacion !== undefined) {
      payload.FechaAsignacion = data.fechaAsignacion && data.fechaAsignacion.trim() ? data.fechaAsignacion.trim() : null;
    }
    // NOTA: El backend actual NO acepta RolResponsable ni RolResponsableDetalle en Update
    // El método UpdateAsync del backend no actualiza estos campos
    // Por lo tanto, no enviamos estos campos
    
    // NOTA: El backend actual NO acepta campos de nombre (NombreDocente, NombreUsuario, etc.)
    // Estos campos son calculados por el backend desde las relaciones
    // Sin embargo, el usuario puede querer editar nombreAdmin, así que lo enviamos aunque el backend no lo procese
    // (esto permite que el frontend mantenga el valor localmente)
    if (data.nombreAdmin !== undefined) {
      payload.NombreAdmin = data.nombreAdmin && data.nombreAdmin.trim() ? data.nombreAdmin.trim() : null;
    }

    console.log('🔄 UPDATE ActividadResponsable - Payload enviado:', JSON.stringify(payload, null, 2));
    console.log('🔄 UPDATE ActividadResponsable - URL:', `${this.apiUrl}/${id}`);

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(response => {
        // El backend puede devolver null, un objeto con data, o el objeto directamente
        const item = response?.data || response;
        if (!item || response === null) {
          // Si la respuesta es null o vacía, el backend probablemente actualizó correctamente pero no devuelve datos
          // Crear un objeto básico con los datos que enviamos para mantener consistencia
          console.log('ℹ️ UPDATE ActividadResponsable - Backend devolvió null, asumiendo actualización exitosa');
          // El backend devuelve NoContent (204) en Update, así que construimos el objeto desde los datos enviados
          // Pero necesitamos recargar desde el backend para obtener los nombres calculados
          const responsableActualizado: ActividadResponsable = {
            idActividadResponsable: id,
            idActividad: data.idActividad || 0,
            idTipoResponsable: data.idTipoResponsable || 0,
            idUsuario: data.idUsuario || data.idDocente || data.idAdmin || undefined,
            nombreUsuario: undefined, // Se obtendrá al recargar
            nombreAdmin: data.nombreAdmin || undefined, // Mantener el nombreAdmin editado
            nombreDepartamento: undefined, // Se obtendrá al recargar
            fechaAsignacion: data.fechaAsignacion || undefined,
            rolResponsable: undefined, // El backend no devuelve este campo
            rolResponsableDetalle: undefined // El backend no devuelve este campo
          };
          console.log('✅ UPDATE ActividadResponsable - Objeto creado desde datos enviados:', responsableActualizado);
          return responsableActualizado;
        }
        console.log('✅ UPDATE ActividadResponsable - Respuesta recibida del backend:', item);
        return this.mapActividadResponsable(item);
      }),
      catchError(error => {
        console.error('❌ Error updating responsable:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        if (error.error) {
          console.error('❌ Error body:', error.error);
          if (error.error.errors) {
            console.error('❌ Validation errors:', error.error.errors);
          }
        }
        throw error;
      })
    );
  }

  /**
   * Elimina un responsable
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
      map(response => {
        // 204 No Content o 200 OK
        return response.status === 204 || response.status === 200;
      }),
      catchError(error => {
        console.error(`❌ Error deleting responsable ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Mapea una respuesta del backend a la interfaz ActividadResponsable
   */
  private mapActividadResponsable(item: any): ActividadResponsable {
    const formatDate = (date: any): string | undefined => {
      if (!date) return undefined;
      if (typeof date === 'string') {
        return date.split('T')[0]; // Asegurar formato YYYY-MM-DD
      }
      return new Date(date).toISOString().split('T')[0];
    };

    // Intentar obtener el nombre de múltiples campos posibles (SOLO campos de persona, NO nombreActividad)
    // NOTA: Excluir "Administrador Sistema" ya que es un usuario del sistema, no un responsable real
    // El backend puede devolver el nombre en diferentes campos según el tipo de responsable
    let nombrePersona = 
      item.NombrePersona || item.nombrePersona ||
      item.NombreUsuario || item.nombreUsuario || 
      item.NombreDocente || item.nombreDocente || 
      item.NombreAdmin || item.nombreAdmin ||
      item.NombreEstudiante || item.nombreEstudiante ||
      item.NombreResponsableExterno || item.nombreResponsableExterno ||
      item.Nombre || item.nombre ||
      item.NombreCompleto || item.nombreCompleto ||
      item.Usuario || item.usuario ||
      item.Docente || item.docente ||
      item.Admin || item.admin ||
      item.NombreCompletoDocente || item.nombreCompletoDocente ||
      item.NombreCompletoEstudiante || item.nombreCompletoEstudiante ||
      item.NombreCompletoAdmin || item.nombreCompletoAdmin ||
      undefined;
    
    // Si el nombre es "Administrador Sistema" o similar, no usarlo
    if (nombrePersona && (
      nombrePersona.toLowerCase().includes('administrador sistema') ||
      nombrePersona.toLowerCase().includes('admin sistema') ||
      nombrePersona.toLowerCase() === 'administrador'
    )) {
      nombrePersona = undefined;
    }

    // NO usar nombreActividad como fallback para nombrePersona
    // El nombrePersona debe venir de los campos reales de persona
    const nombrePersonaFinal = nombrePersona || undefined;
    
    const mapped = {
      idActividadResponsable: item.IdActividadResponsable || item.idActividadResponsable || item.id || 0,
      idActividad: item.IdActividad || item.idActividad || 0,
      idUsuario: item.IdUsuario !== undefined && item.IdUsuario !== null ? item.IdUsuario : (item.idUsuario !== undefined && item.idUsuario !== null ? item.idUsuario : undefined),
      idDocente: item.IdDocente !== undefined && item.IdDocente !== null ? item.IdDocente : (item.idDocente !== undefined && item.idDocente !== null ? item.idDocente : undefined),
      idAdmin: item.IdAdmin !== undefined && item.IdAdmin !== null ? item.IdAdmin : (item.idAdmin !== undefined && item.idAdmin !== null ? item.idAdmin : undefined),
      idEstudiante: item.IdEstudiante !== undefined && item.IdEstudiante !== null ? item.IdEstudiante : (item.idEstudiante !== undefined && item.idEstudiante !== null ? item.idEstudiante : undefined),
      idResponsableExterno: item.IdResponsableExterno !== undefined && item.IdResponsableExterno !== null ? item.IdResponsableExterno : (item.idResponsableExterno !== undefined && item.idResponsableExterno !== null ? item.idResponsableExterno : undefined),
      nombrePersona: nombrePersonaFinal,
      idTipoResponsable: item.IdTipoResponsable || item.idTipoResponsable || 0,
      nombreTipoResponsable: item.NombreTipoResponsable || item.nombreTipoResponsable || item.TipoResponsable || item.tipoResponsable,
      departamentoId: item.DepartamentoId !== undefined && item.DepartamentoId !== null ? item.DepartamentoId : (item.departamentoId !== undefined && item.departamentoId !== null ? item.departamentoId : undefined),
      nombreDepartamento: item.NombreDepartamento || item.nombreDepartamento,
      fechaAsignacion: formatDate(item.FechaAsignacion || item.fechaAsignacion),
      // Mapear RolResponsable y RolResponsableDetalle - el backend ahora los devuelve
      // Prioridad: rolResponsable (camelCase) > RolResponsable (PascalCase) > nombreRolResponsable (camelCase) > NombreRolResponsable (PascalCase)
      rolResponsable: item.rolResponsable || item.RolResponsable || item.nombreRolResponsable || item.NombreRolResponsable || undefined,
      rolResponsableDetalle: item.RolResponsableDetalle || item.rolResponsableDetalle || undefined,
      idRolResponsable: item.IdRolResponsable !== undefined && item.IdRolResponsable !== null ? item.IdRolResponsable : (item.idRolResponsable !== undefined && item.idRolResponsable !== null ? item.idRolResponsable : undefined),
      nombreRolResponsable: item.NombreRolResponsable || item.nombreRolResponsable || undefined,
      // Mapear nombres específicos por tipo
      nombreDocente: item.NombreDocente || item.nombreDocente || undefined,
      nombreUsuario: (() => {
        const nombre = item.NombreUsuario || item.nombreUsuario;
        // Excluir "Administrador Sistema" ya que es un usuario del sistema
        if (nombre && (
          nombre.toLowerCase().includes('administrador sistema') ||
          nombre.toLowerCase().includes('admin sistema') ||
          nombre.toLowerCase() === 'administrador'
        )) {
          return undefined;
        }
        return nombre;
      })(),
      nombreAdmin: item.NombreAdmin || item.nombreAdmin || undefined,
      nombreEstudiante: item.NombreEstudiante || item.nombreEstudiante || undefined,
      nombreResponsableExterno: item.NombreResponsableExterno || item.nombreResponsableExterno || undefined,
      nombreActividad: item.NombreActividad || item.nombreActividad,
      // Campos adicionales del responsable externo
      cargo: item.Cargo || item.cargo || undefined,
      institucionResponsableExterno: item.InstitucionResponsableExterno || item.institucionResponsableExterno || undefined,
      cargoResponsableExterno: item.CargoResponsableExterno || item.cargoResponsableExterno || undefined,
      telefonoResponsableExterno: item.TelefonoResponsableExterno || item.telefonoResponsableExterno || undefined,
      correoResponsableExterno: item.CorreoResponsableExterno || item.correoResponsableExterno || undefined
    };

    console.log('🔍 [ActividadResponsableService] Mapeo de responsable - Item original del backend:', JSON.stringify(item, null, 2));
    console.log('🔍 [ActividadResponsableService] Campos de rol en item original:', {
      'item.rolResponsable': item.rolResponsable,
      'item.RolResponsable': item.RolResponsable,
      'item.nombreRolResponsable': item.nombreRolResponsable,
      'item.NombreRolResponsable': item.NombreRolResponsable,
      'item.idRolResponsable': item.idRolResponsable,
      'item.IdRolResponsable': item.IdRolResponsable
    });
    console.log('🔍 [ActividadResponsableService] Mapeo de responsable - Resultado mapeado:', JSON.stringify(mapped, null, 2));
    console.log('🎯 [ActividadResponsableService] Rol mapeado final:', {
      rolResponsable: mapped.rolResponsable,
      nombreRolResponsable: mapped.nombreRolResponsable,
      idRolResponsable: mapped.idRolResponsable
    });
    console.log('🔍 [ActividadResponsableService] IDs y campos extraídos:', {
      idActividadResponsable: mapped.idActividadResponsable,
      idActividad: mapped.idActividad,
      idUsuario: mapped.idUsuario,
      idDocente: mapped.idDocente,
      idAdmin: mapped.idAdmin,
      idEstudiante: mapped.idEstudiante,
      idResponsableExterno: mapped.idResponsableExterno,
      idRolResponsable: mapped.idRolResponsable,
      nombrePersona: mapped.nombrePersona,
      nombreUsuario: mapped.nombreUsuario,
      nombreDocente: mapped.nombreDocente,
      nombreAdmin: mapped.nombreAdmin,
      nombreEstudiante: mapped.nombreEstudiante,
      nombreResponsableExterno: mapped.nombreResponsableExterno,
      rolResponsable: mapped.rolResponsable,
      nombreRolResponsable: mapped.nombreRolResponsable,
      cargo: mapped.cargo,
      institucionResponsableExterno: mapped.institucionResponsableExterno,
      cargoResponsableExterno: mapped.cargoResponsableExterno
    });

    return mapped;
  }
}

