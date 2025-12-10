import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SubactividadResponsable {
  idSubactividadResponsable: number;
  idSubactividad: number;
  idDocente?: number;
  idUsuario?: number;
  idAdmin?: number;
  idAdministrativo?: number; // Alias para idAdmin (legacy)
  idEstudiante?: number;
  idResponsableExterno?: number;
  nombreDocente?: string;
  nombreUsuario?: string;
  nombreAdmin?: string;
  nombreAdministrativo?: string;
  nombreEstudiante?: string;
  nombreResponsableExterno?: string;
  nombreResponsable?: string;
  nombrePersona?: string;
  idRolResponsable?: number;
  nombreRolResponsable?: string;
  rolResponsable?: string;
  cargo?: string;
  cargoResponsableExterno?: string;
  institucionResponsableExterno?: string;
  telefonoResponsableExterno?: string;
  correoResponsableExterno?: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion?: string;
  fechaAsignacion?: string;
}

export interface SubactividadResponsableCreate {
  idSubactividad: number;
  idDocente?: number;
  idUsuario?: number;
  idAdmin?: number;
  idAdministrativo?: number;
  idEstudiante?: number;
  idResponsableExterno?: number;
  nombre?: string; // Para responsables externos
  institucion?: string; // Para responsables externos
  cargo?: string; // Para responsables externos
  telefono?: string; // Para responsables externos
  telefonoResponsableExterno?: string; // Para responsables externos (alias)
  correo?: string; // Para responsables externos
  correoResponsableExterno?: string; // Para responsables externos (alias)
  idRolResponsable?: number;
  activo?: boolean;
}

export interface SubactividadResponsableUpdate extends Partial<SubactividadResponsableCreate> {}

@Injectable({ providedIn: 'root' })
export class SubactividadResponsableService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/SubactividadResponsable`;

  // GET /api/SubactividadResponsable
  getAll(): Observable<SubactividadResponsable[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividadResponsable(item)) : [];
      }),
      catchError(error => {
        if (error.status !== 404) {
          console.error('Error fetching subactividad responsables:', error);
        }
        return of([]);
      })
    );
  }

  // GET /api/SubactividadResponsable/{id}
  getById(id: number): Observable<SubactividadResponsable> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapSubactividadResponsable(item)),
      catchError(error => {
        console.error('Error fetching subactividad responsable:', error);
        throw error;
      })
    );
  }

  // GET /api/SubactividadResponsable/subactividad/{idSubactividad}
  getBySubactividad(idSubactividad: number): Observable<SubactividadResponsable[]> {
    return this.http.get<any>(`${this.apiUrl}/subactividad/${idSubactividad}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividadResponsable(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching responsables por subactividad:', error);
        return of([]);
      })
    );
  }

  // GET /api/SubactividadResponsable/filtrar
  filtrar(filters: any): Observable<SubactividadResponsable[]> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });

    return this.http.get<any>(`${this.apiUrl}/filtrar`, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapSubactividadResponsable(item)) : [];
      }),
      catchError(error => {
        console.error('Error filtrando responsables:', error);
        return of([]);
      })
    );
  }

  // POST /api/SubactividadResponsable
  create(data: SubactividadResponsableCreate): Observable<SubactividadResponsable> {
    const dto: any = {
      IdSubactividad: Number(data.idSubactividad),
      Activo: data.activo !== undefined ? data.activo : true
    };

    // Solo agregar un tipo de responsable a la vez
    // El backend probablemente solo acepta uno de estos campos
    if (data.idDocente !== undefined && data.idDocente !== null) {
      const idDocenteNum = Number(data.idDocente);
      if (!isNaN(idDocenteNum) && idDocenteNum > 0) {
        dto.IdDocente = idDocenteNum;
      }
    } else if (data.idUsuario !== undefined && data.idUsuario !== null) {
      const idUsuarioNum = Number(data.idUsuario);
      if (!isNaN(idUsuarioNum) && idUsuarioNum > 0) {
        dto.IdUsuario = idUsuarioNum;
      }
    } else if (data.idAdmin !== undefined && data.idAdmin !== null) {
      const idAdminNum = Number(data.idAdmin);
      if (!isNaN(idAdminNum) && idAdminNum > 0) {
        dto.IdAdmin = idAdminNum;
      }
    } else if (data.idAdministrativo !== undefined && data.idAdministrativo !== null) {
      const idAdminNum = Number(data.idAdministrativo);
      if (!isNaN(idAdminNum) && idAdminNum > 0) {
        dto.IdAdmin = idAdminNum;
      }
    } else if (data.idEstudiante !== undefined && data.idEstudiante !== null) {
      // El backend ahora soporta IdEstudiante directamente
      const idEstudianteNum = Number(data.idEstudiante);
      if (!isNaN(idEstudianteNum) && idEstudianteNum > 0) {
        dto.IdEstudiante = idEstudianteNum;
      }
    } else if (data.idResponsableExterno !== undefined && data.idResponsableExterno !== null) {
      const idResponsableExternoNum = Number(data.idResponsableExterno);
      if (!isNaN(idResponsableExternoNum) && idResponsableExternoNum > 0) {
        dto.IdResponsableExterno = idResponsableExternoNum;
      }
    } else if (data.nombre) {
      // Para responsables externos nuevos, el backend espera:
      // Según SubactividadResponsableCreateDto, puede aceptar:
      // - ResponsableExterno (objeto anidado) O
      // - NombreResponsable (string)
      // El backend requiere que si se envía ResponsableExterno, debe tener al menos Telefono o Correo
      // Por lo tanto, usamos NombreResponsable como campo principal
      dto.NombreResponsable = data.nombre;
      
      // Obtener teléfono y correo (pueden venir de diferentes campos)
      const telefono = data.telefono || data.telefonoResponsableExterno;
      const correo = data.correo || data.correoResponsableExterno;
      
      // Solo enviar el objeto ResponsableExterno anidado si tenemos:
      // 1. institucion (requerida)
      // 2. Y al menos teléfono o correo (requerido por el backend)
      if (data.institucion && (telefono || correo)) {
        const responsableExternoObj: any = {
          Nombre: data.nombre.trim(),
          Institucion: data.institucion.trim()
        };
        
        if (data.cargo && data.cargo.trim()) {
          responsableExternoObj.Cargo = data.cargo.trim();
        }
        if (telefono && telefono.trim()) {
          responsableExternoObj.Telefono = telefono.trim();
        }
        if (correo && correo.trim()) {
          responsableExternoObj.Correo = correo.trim();
        }
        
        dto.ResponsableExterno = responsableExternoObj;
      }
    }

    // Agregar IdRolResponsable si está presente (convertir a número)
    if (data.idRolResponsable !== undefined && data.idRolResponsable !== null) {
      const idRolNum = Number(data.idRolResponsable);
      if (!isNaN(idRolNum) && idRolNum > 0) {
        dto.IdRolResponsable = idRolNum;
      }
    }

    console.log('🔄 POST SubactividadResponsable - DTO:', JSON.stringify(dto, null, 2));

    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(item => this.mapSubactividadResponsable(item)),
      catchError(error => {
        console.error('❌ Error creating subactividad responsable:', error);
        console.error('❌ Error details:', error.error);
        if (error.error?.errors) {
          console.error('❌ Validation errors:', JSON.stringify(error.error.errors, null, 2));
        }
        throw error;
      })
    );
  }

  // PUT /api/SubactividadResponsable/{id}
  update(id: number, data: SubactividadResponsableUpdate): Observable<SubactividadResponsable> {
    const dto: any = {};
    
    if (data.idSubactividad !== undefined) dto.IdSubactividad = data.idSubactividad;
    if (data.idDocente !== undefined) dto.IdDocente = data.idDocente;
    if (data.idAdministrativo !== undefined) dto.IdAdministrativo = data.idAdministrativo;
    if (data.activo !== undefined) dto.Activo = data.activo;

    // Remover campos null
    Object.keys(dto).forEach(key => {
      if (dto[key] === null && key !== 'Activo') {
        delete dto[key];
      }
    });

    console.log('🔄 PUT SubactividadResponsable - ID:', id, 'DTO:', dto);

    return this.http.put<any>(`${this.apiUrl}/${id}`, dto).pipe(
      map(item => this.mapSubactividadResponsable(item)),
      catchError(error => {
        console.error('❌ Error updating subactividad responsable:', error);
        throw error;
      })
    );
  }

  // DELETE /api/SubactividadResponsable/{id}
  delete(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('❌ Error deleting subactividad responsable:', error);
        throw error;
      })
    );
  }

  private mapSubactividadResponsable(item: any): SubactividadResponsable {
    return {
      idSubactividadResponsable: item.idSubactividadResponsable || item.IdSubactividadResponsable || item.id || 0,
      idSubactividad: item.idSubactividad || item.IdSubactividad || 0,
      idDocente: item.idDocente || item.IdDocente,
      idUsuario: item.idUsuario || item.IdUsuario,
      idAdmin: item.idAdmin || item.IdAdmin || item.idAdministrativo || item.IdAdministrativo,
      idAdministrativo: item.idAdministrativo || item.IdAdministrativo || item.idAdmin || item.IdAdmin,
      idEstudiante: item.idEstudiante || item.IdEstudiante,
      idResponsableExterno: item.idResponsableExterno || item.IdResponsableExterno,
      nombreDocente: item.nombreDocente || item.NombreDocente,
      nombreUsuario: item.nombreUsuario || item.NombreUsuario,
      nombreAdmin: item.nombreAdmin || item.NombreAdmin,
      nombreAdministrativo: item.nombreAdministrativo || item.NombreAdministrativo,
      nombreEstudiante: item.nombreEstudiante || item.NombreEstudiante,
      nombreResponsableExterno: item.nombreResponsableExterno || item.NombreResponsableExterno,
      nombreResponsable: item.nombreResponsable || item.NombreResponsable,
      nombrePersona: item.nombrePersona || item.NombrePersona,
      idRolResponsable: item.idRolResponsable || item.IdRolResponsable,
      nombreRolResponsable: item.nombreRolResponsable || item.NombreRolResponsable,
      rolResponsable: item.rolResponsable || item.RolResponsable,
      cargo: item.cargo || item.Cargo,
      cargoResponsableExterno: item.cargoResponsableExterno || item.CargoResponsableExterno,
      institucionResponsableExterno: item.institucionResponsableExterno || item.InstitucionResponsableExterno,
      telefonoResponsableExterno: item.telefonoResponsableExterno || item.TelefonoResponsableExterno,
      correoResponsableExterno: item.correoResponsableExterno || item.CorreoResponsableExterno,
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      fechaCreacion: item.fechaCreacion || item.FechaCreacion || new Date().toISOString(),
      fechaModificacion: item.fechaModificacion || item.FechaModificacion,
      fechaAsignacion: item.fechaAsignacion || item.FechaAsignacion
    };
  }
}

