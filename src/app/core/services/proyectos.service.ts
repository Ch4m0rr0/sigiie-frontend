import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Proyecto, ProyectoCreate, ProyectoUpdate, ProyectoParticipante } from '../models/proyecto';

@Injectable({ providedIn: 'root' })
export class ProyectosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Proyecto`;

  // Alineado con IProyectoService.GetAllAsync()
  getAll(): Observable<Proyecto[]> {
    console.log('🔄 GET Proyectos - URL:', this.apiUrl);
    
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        console.log('✅ GET Proyectos - Response:', response);
        const items = response.data || response;
        const result = Array.isArray(items) ? items.map(item => this.mapProyecto(item)) : [];
        console.log('✅ GET Proyectos - Mapped result:', result);
        return result;
      }),
      catchError(error => {
        // Silenciar errores 404 si el endpoint no existe aún
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/Proyecto no encontrado. El backend aún no tiene este endpoint implementado.');
          return of([]);
        }
        // Solo mostrar errores para otros códigos de estado
        console.error('❌ GET Proyectos - Error:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        return of([]);
      })
    );
  }

  // Método legacy - mantener para compatibilidad
  list(): Observable<Proyecto[]> {
    return this.getAll();
  }

  // Alineado con IProyectoService.GetByIdAsync()
  getById(id: number): Observable<Proyecto | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapProyecto(item)),
      catchError(error => {
        console.error('Error fetching proyecto by id:', error);
        return of(null);
      })
    );
  }

  // Método legacy - mantener para compatibilidad
  get(id: number): Observable<Proyecto | null> {
    return this.getById(id);
  }

  // Alineado con IProyectoService.CreateAsync()
  // Usa multipart/form-data porque el backend acepta ArchivoSoporte
  create(proyecto: ProyectoCreate): Observable<Proyecto> {
    const formData = new FormData();
    
    // Agregar campos del DTO
    formData.append('NombreProyecto', proyecto.nombreProyecto);
    if (proyecto.descripcion) {
      formData.append('Descripcion', proyecto.descripcion);
    }
    if (proyecto.fechaInicio) {
      formData.append('FechaInicio', proyecto.fechaInicio);
    }
    if (proyecto.fechaFin) {
      formData.append('FechaFin', proyecto.fechaFin);
    }
    if (proyecto.departamentoId) {
      formData.append('DepartamentoId', proyecto.departamentoId.toString());
    }
    if (proyecto.idEstadoProyecto) {
      formData.append('IdEstadoProyecto', proyecto.idEstadoProyecto.toString());
    }
    if (proyecto.idEdicion) {
      formData.append('IdEdicion', proyecto.idEdicion.toString());
    }
    if (proyecto.idTipoIniciativa) {
      formData.append('IdTipoIniciativa', proyecto.idTipoIniciativa.toString());
    }
    if (proyecto.idTipoInvestigacion) {
      formData.append('IdTipoInvestigacion', proyecto.idTipoInvestigacion.toString());
    }
    if (proyecto.idAreaConocimiento) {
      formData.append('IdAreaConocimiento', proyecto.idAreaConocimiento.toString());
    }
    if (proyecto.idTipoDocumento) {
      formData.append('IdTipoDocumento', proyecto.idTipoDocumento.toString());
    }
    if (proyecto.tipoAutor) {
      formData.append('TipoAutor', proyecto.tipoAutor);
    }
    if (proyecto.archivoSoporte) {
      formData.append('ArchivoSoporte', proyecto.archivoSoporte);
    }
    
    // Agregar participantes en formato que ASP.NET Core espera para arrays en FormData
    if (proyecto.docentes && proyecto.docentes.length > 0) {
      proyecto.docentes.forEach((docente, index) => {
        formData.append(`Docentes[${index}].Id`, docente.id.toString());
        if (docente.rolEnProyecto) {
          formData.append(`Docentes[${index}].RolEnProyecto`, docente.rolEnProyecto);
        }
      });
    }
    if (proyecto.estudiantes && proyecto.estudiantes.length > 0) {
      proyecto.estudiantes.forEach((estudiante, index) => {
        formData.append(`Estudiantes[${index}].Id`, estudiante.id.toString());
        if (estudiante.rolEnProyecto) {
          formData.append(`Estudiantes[${index}].RolEnProyecto`, estudiante.rolEnProyecto);
        }
      });
    }
    if (proyecto.administrativos && proyecto.administrativos.length > 0) {
      proyecto.administrativos.forEach((admin, index) => {
        formData.append(`Administrativos[${index}].Id`, admin.id.toString());
        if (admin.rolEnProyecto) {
          formData.append(`Administrativos[${index}].RolEnProyecto`, admin.rolEnProyecto);
        }
      });
    }
    
    return this.http.post<any>(this.apiUrl, formData).pipe(
      map(item => this.mapProyecto(item))
    );
  }

  // Alineado con IProyectoService.UpdateAsync()
  // Usa multipart/form-data porque el backend acepta ArchivoSoporte
  update(id: number, proyecto: ProyectoUpdate): Observable<Proyecto | null> {
    const formData = new FormData();
    
    // Agregar campos del DTO (todos opcionales en Update)
    if (proyecto.nombreProyecto) {
      formData.append('NombreProyecto', proyecto.nombreProyecto);
    }
    if (proyecto.descripcion !== undefined) {
      formData.append('Descripcion', proyecto.descripcion || '');
    }
    if (proyecto.fechaInicio) {
      formData.append('FechaInicio', proyecto.fechaInicio);
    }
    if (proyecto.fechaFin) {
      formData.append('FechaFin', proyecto.fechaFin);
    }
    if (proyecto.departamentoId !== undefined) {
      formData.append('DepartamentoId', proyecto.departamentoId?.toString() || '');
    }
    if (proyecto.idEstadoProyecto !== undefined) {
      formData.append('IdEstadoProyecto', proyecto.idEstadoProyecto?.toString() || '');
    }
    if (proyecto.idEdicion !== undefined) {
      formData.append('IdEdicion', proyecto.idEdicion?.toString() || '');
    }
    if (proyecto.idTipoIniciativa !== undefined) {
      formData.append('IdTipoIniciativa', proyecto.idTipoIniciativa?.toString() || '');
    }
    if (proyecto.idTipoInvestigacion !== undefined) {
      formData.append('IdTipoInvestigacion', proyecto.idTipoInvestigacion?.toString() || '');
    }
    if (proyecto.idAreaConocimiento !== undefined) {
      formData.append('IdAreaConocimiento', proyecto.idAreaConocimiento?.toString() || '');
    }
    if (proyecto.idTipoDocumento !== undefined) {
      formData.append('IdTipoDocumento', proyecto.idTipoDocumento?.toString() || '');
    }
    if (proyecto.tipoAutor !== undefined) {
      formData.append('TipoAutor', proyecto.tipoAutor || '');
    }
    if (proyecto.archivoSoporte) {
      formData.append('ArchivoSoporte', proyecto.archivoSoporte);
    }
    
    // Agregar participantes en formato que ASP.NET Core espera para arrays en FormData
    if (proyecto.docentes && proyecto.docentes.length > 0) {
      proyecto.docentes.forEach((docente, index) => {
        formData.append(`Docentes[${index}].Id`, docente.id.toString());
        if (docente.rolEnProyecto) {
          formData.append(`Docentes[${index}].RolEnProyecto`, docente.rolEnProyecto);
        }
      });
    }
    if (proyecto.estudiantes && proyecto.estudiantes.length > 0) {
      proyecto.estudiantes.forEach((estudiante, index) => {
        formData.append(`Estudiantes[${index}].Id`, estudiante.id.toString());
        if (estudiante.rolEnProyecto) {
          formData.append(`Estudiantes[${index}].RolEnProyecto`, estudiante.rolEnProyecto);
        }
      });
    }
    if (proyecto.administrativos && proyecto.administrativos.length > 0) {
      proyecto.administrativos.forEach((admin, index) => {
        formData.append(`Administrativos[${index}].Id`, admin.id.toString());
        if (admin.rolEnProyecto) {
          formData.append(`Administrativos[${index}].RolEnProyecto`, admin.rolEnProyecto);
        }
      });
    }
    
    return this.http.put<any>(`${this.apiUrl}/${id}`, formData).pipe(
      map(item => this.mapProyecto(item)),
      catchError(error => {
        console.error('Error updating proyecto:', error);
        return of(null);
      })
    );
  }

  // Alineado con IProyectoService.DeleteAsync()
  delete(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting proyecto:', error);
        return of(false);
      })
    );
  }

  // Alineado con IProyectoService.GetResumenPorTipoAsync()
  getResumenPorTipo(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/resumen-tipos`).pipe(
      catchError(error => {
        console.error('Error fetching resumen por tipo:', error);
        return of({});
      })
    );
  }

  // Alineado con IProyectoService.GetByEstadoAsync()
  getByEstado(activos: boolean): Observable<Proyecto[]> {
    return this.http.get<any>(`${this.apiUrl}/estado?activos=${activos}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapProyecto(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching proyectos by estado:', error);
        return of([]);
      })
    );
  }

  // Mapeo de datos del backend (PascalCase) a frontend (camelCase)
  private mapProyecto(item: any): Proyecto {
    const idProyecto = item.IdProyecto || item.idProyecto || item.id || item.Id;
    const nombreProyecto = item.NombreProyecto || item.nombreProyecto || item.nombre || item.Nombre || '';
    
    // Mapear participantes
    const mapParticipantes = (participantes: any[]): ProyectoParticipante[] => {
      if (!Array.isArray(participantes)) return [];
      return participantes.map(p => ({
        tipo: p.Tipo || p.tipo || '',
        id: p.Id || p.id || 0,
        nombreCompleto: p.NombreCompleto || p.nombreCompleto || '',
        rolEnProyecto: p.RolEnProyecto || p.rolEnProyecto
      }));
    };

    const docentes = mapParticipantes(item.Docentes || item.docentes || []);
    const estudiantes = mapParticipantes(item.Estudiantes || item.estudiantes || []);
    const administrativos = mapParticipantes(item.Administrativos || item.administrativos || []);

    // Calcular responsableNombre (primer participante o combinación)
    let responsableNombre: string | undefined;
    if (docentes.length > 0) {
      responsableNombre = docentes[0].nombreCompleto;
    } else if (estudiantes.length > 0) {
      responsableNombre = estudiantes[0].nombreCompleto;
    } else if (administrativos.length > 0) {
      responsableNombre = administrativos[0].nombreCompleto;
    }

    // Convertir DateOnly a string ISO si es necesario
    const formatDate = (date: any): string | undefined => {
      if (!date) return undefined;
      if (typeof date === 'string') return date;
      if (date.year && date.month && date.day) {
        return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
      }
      return undefined;
    };

    return {
      id: idProyecto,
      idProyecto: idProyecto,
      nombre: nombreProyecto,
      nombreProyecto: nombreProyecto,
      descripcion: item.Descripcion || item.descripcion,
      estado: item.Estado || item.estado,
      fechaInicio: formatDate(item.FechaInicio || item.fechaInicio),
      fechaFin: formatDate(item.FechaFin || item.fechaFin),
      soporteDocumentoUrl: item.SoporteDocumentoUrl || item.soporteDocumentoUrl,
      departamento: item.Departamento || item.departamento,
      departamentoId: item.DepartamentoId || item.departamentoId,
      edicion: item.Edicion || item.edicion,
      idEdicion: item.IdEdicion || item.idEdicion,
      tipoIniciativa: item.TipoIniciativa || item.tipoIniciativa,
      idTipoIniciativa: item.IdTipoIniciativa || item.idTipoIniciativa,
      tipoInvestigacion: item.TipoInvestigacion || item.tipoInvestigacion,
      idTipoInvestigacion: item.IdTipoInvestigacion || item.idTipoInvestigacion,
      areaConocimiento: item.AreaConocimiento || item.areaConocimiento,
      idAreaConocimiento: item.IdAreaConocimiento || item.idAreaConocimiento,
      tipoDocumento: item.TipoDocumento || item.tipoDocumento,
      idTipoDocumento: item.IdTipoDocumento || item.idTipoDocumento,
      tipoAutor: item.TipoAutor || item.tipoAutor,
      idEstadoProyecto: item.IdEstadoProyecto || item.idEstadoProyecto,
      // Participantes
      docentes: docentes,
      estudiantes: estudiantes,
      administrativos: administrativos,
      // Campos calculados/legacy
      responsableNombre: responsableNombre,
      fechaCreacion: item.FechaCreacion || item.fechaCreacion,
      fechaModificacion: item.FechaModificacion || item.fechaModificacion
    };
  }
}
