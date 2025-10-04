import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Departamento } from '../models/departamento';
import type { Genero } from '../models/genero';
import type { EstadoEstudiante } from '../models/estado-estudiante';
import type { EstadoParticipacion } from '../models/estado-participacion';
import type { CategoriaParticipacion } from '../models/categoria-participacion';
import type { CategoriaActividad } from '../models/categoria-actividad';
import type { TipoUnidad } from '../models/tipo-unidad';
import type { TipoIniciativa } from '../models/tipo-iniciativa';
import type { TipoInvestigacion } from '../models/tipo-investigacion';
import type { TipoDocumento } from '../models/tipo-documento';
import type { TipoDocumentoDivulgado } from '../models/tipo-documento-divulgado';
import type { AreaConocimiento } from '../models/area-conocimiento';

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;

  // Datos de prueba para cuando la API no esté disponible
  private mockData = {
    departamentos: [
      { id: 1, nombre: 'Ciencia Económica y Administrativa 2025', descripcion: 'Departamento de ciencias económicas' },
      { id: 2, nombre: 'Ciencia, Tecnología y Salud', descripcion: 'Departamento de ciencias exactas' },
      { id: 3, nombre: 'Ciencias de la Educación y Humanidades', descripcion: 'Departamento de humanidades' }
    ],
    generos: [
      { id: 1, nombre: 'Masculino', descripcion: 'Género masculino' },
      { id: 2, nombre: 'Femenino', descripcion: 'Género femenino' },
      { id: 3, nombre: 'Otro', descripcion: 'Otro género' }
    ],
    estadoestudiantes: [
      { id: 1, nombre: 'Activo', descripcion: 'Estudiante activo' },
      { id: 2, nombre: 'Inactivo', descripcion: 'Estudiante inactivo' },
      { id: 3, nombre: 'Graduado', descripcion: 'Estudiante graduado' }
    ],
    estadoparticipaciones: [
      { id: 1, nombre: 'Pendiente', descripcion: 'Participación pendiente' },
      { id: 2, nombre: 'Aprobada', descripcion: 'Participación aprobada' },
      { id: 3, nombre: 'Rechazada', descripcion: 'Participación rechazada' }
    ],
    categoriaparticipaciones: [
      { id: 1, nombre: 'Estudiante', descripcion: 'Categoría estudiante' },
      { id: 2, nombre: 'Docente', descripcion: 'Categoría docente' },
      { id: 3, nombre: 'Administrativo', descripcion: 'Categoría administrativo' }
    ],
    categoriaactividades: [
      { id: 1, nombre: 'Conferencia', descripcion: 'Actividad de conferencia' },
      { id: 2, nombre: 'Taller', descripcion: 'Actividad de taller' },
      { id: 3, nombre: 'Seminario', descripcion: 'Actividad de seminario' }
    ],
    tiposunidad: [
      { id: 1, nombre: 'Facultad', descripcion: 'Tipo unidad facultad' },
      { id: 2, nombre: 'Escuela', descripcion: 'Tipo unidad escuela' },
      { id: 3, nombre: 'Departamento', descripcion: 'Tipo unidad departamento' }
    ],
    tiposiniciativas: [
      { id: 1, nombre: 'Investigación', descripcion: 'Iniciativa de investigación' },
      { id: 2, nombre: 'Extensión', descripcion: 'Iniciativa de extensión' },
      { id: 3, nombre: 'Docencia', descripcion: 'Iniciativa de docencia' }
    ],
    tiposinvestigaciones: [
      { id: 1, nombre: 'Básica', descripcion: 'Investigación básica' },
      { id: 2, nombre: 'Aplicada', descripcion: 'Investigación aplicada' },
      { id: 3, nombre: 'Experimental', descripcion: 'Investigación experimental' }
    ],
    tiposdocumentos: [
      { id: 1, nombre: 'Artículo', descripcion: 'Tipo documento artículo' },
      { id: 2, nombre: 'Libro', descripcion: 'Tipo documento libro' },
      { id: 3, nombre: 'Tesis', descripcion: 'Tipo documento tesis' }
    ],
    tiposdocumentosdivulgados: [
      { id: 1, nombre: 'Revista Científica', descripcion: 'Documento en revista científica' },
      { id: 2, nombre: 'Congreso', descripcion: 'Documento en congreso' },
      { id: 3, nombre: 'Libro', descripcion: 'Documento en libro' }
    ],
    areasconocimiento: [
      { id: 1, nombre: 'Ciencias Exactas', descripcion: 'Área de ciencias exactas' },
      { id: 2, nombre: 'Ciencias Sociales', descripcion: 'Área de ciencias sociales' },
      { id: 3, nombre: 'Ciencias de la Salud', descripcion: 'Área de ciencias de la salud' }
    ]
  };

  // Departamentos
  getDepartamentos(): Observable<Departamento[]> {
    return this.http.get<any>(`${this.apiUrl}/departamentos`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({ id: item.idDepartamento || item.Id || item.id, nombre: item.nombre || item.Nombre, descripcion: item.descripcion || item.Descripcion || '' })) : [];
      }),
      catchError(() => of(this.mockData.departamentos))
    );
  }

  createDepartamento(departamento: Omit<Departamento, 'id'>): Observable<Departamento> {
    const data = { Nombre: departamento.nombre, Descripcion: departamento.descripcion };
    return this.http.post<any>(`${this.apiUrl}/departamentos`, data).pipe(
      map(item => ({ id: item.Id, nombre: item.Nombre, descripcion: item.Descripcion }))
    );
  }

  updateDepartamento(id: number, departamento: Omit<Departamento, 'id'>): Observable<void> {
    const data = { Nombre: departamento.nombre, Descripcion: departamento.descripcion };
    return this.http.put<void>(`${this.apiUrl}/departamentos/${id}`, data);
  }

  deleteDepartamento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/departamentos/${id}`);
  }

  // Genero
  getGeneros(): Observable<Genero[]> {
    return this.http.get<any[]>(`${this.apiUrl}/generos`).pipe(
      map(items => items.map(item => ({ id: item.Id, nombre: item.Nombre, descripcion: item.Descripcion }))),
      catchError(() => of(this.mockData.generos))
    );
  }

  createGenero(genero: Omit<Genero, 'id'>): Observable<Genero> {
    const data = { Nombre: genero.nombre, Descripcion: genero.descripcion };
    return this.http.post<any>(`${this.apiUrl}/generos`, data).pipe(
      map(item => ({ id: item.Id, nombre: item.Nombre, descripcion: item.Descripcion }))
    );
  }

  updateGenero(id: number, genero: Omit<Genero, 'id'>): Observable<Genero> {
    const data = { Nombre: genero.nombre, Descripcion: genero.descripcion };
    return this.http.put<any>(`${this.apiUrl}/generos/${id}`, data).pipe(
      map(item => ({ id: item.Id, nombre: item.Nombre, descripcion: item.Descripcion }))
    );
  }

  deleteGenero(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/generos/${id}`);
  }

  // Estado Estudiante
  getEstadosEstudiante(): Observable<EstadoEstudiante[]> {
    return this.http.get<EstadoEstudiante[]>(`${this.apiUrl}/estado-estudiantes`).pipe(
      catchError(() => of(this.mockData.estadoestudiantes))
    );
  }

  createEstadoEstudiante(estado: Omit<EstadoEstudiante, 'id'>): Observable<EstadoEstudiante> {
    return this.http.post<EstadoEstudiante>(`${this.apiUrl}/estado-estudiantes`, estado);
  }

  updateEstadoEstudiante(id: number, estado: Omit<EstadoEstudiante, 'id'>): Observable<EstadoEstudiante> {
    return this.http.put<EstadoEstudiante>(`${this.apiUrl}/estado-estudiantes/${id}`, estado);
  }

  deleteEstadoEstudiante(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/estado-estudiantes/${id}`);
  }

  // Estado Participacion
  getEstadosParticipacion(): Observable<EstadoParticipacion[]> {
    return this.http.get<EstadoParticipacion[]>(`${this.apiUrl}/estados-participacion`).pipe(
      catchError(() => of(this.mockData.estadoparticipaciones))
    );
  }

  createEstadoParticipacion(estado: Omit<EstadoParticipacion, 'id'>): Observable<EstadoParticipacion> {
    return this.http.post<EstadoParticipacion>(`${this.apiUrl}/estados-participacion`, estado);
  }

  updateEstadoParticipacion(id: number, estado: Omit<EstadoParticipacion, 'id'>): Observable<EstadoParticipacion> {
    return this.http.put<EstadoParticipacion>(`${this.apiUrl}/estados-participacion/${id}`, estado);
  }

  deleteEstadoParticipacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/estados-participacion/${id}`);
  }

  // Categoria Participacion
  getCategoriasParticipacion(): Observable<CategoriaParticipacion[]> {
    return this.http.get<CategoriaParticipacion[]>(`${this.apiUrl}/categorias-participacion`).pipe(
      catchError(() => of(this.mockData.categoriaparticipaciones))
    );
  }

  createCategoriaParticipacion(categoria: Omit<CategoriaParticipacion, 'id'>): Observable<CategoriaParticipacion> {
    return this.http.post<CategoriaParticipacion>(`${this.apiUrl}/categorias-participacion`, categoria);
  }

  updateCategoriaParticipacion(id: number, categoria: Omit<CategoriaParticipacion, 'id'>): Observable<CategoriaParticipacion> {
    return this.http.put<CategoriaParticipacion>(`${this.apiUrl}/categorias-participacion/${id}`, categoria);
  }

  deleteCategoriaParticipacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categorias-participacion/${id}`);
  }

  // Categoria Actividad
  getCategoriasActividad(): Observable<CategoriaActividad[]> {
    return this.http.get<CategoriaActividad[]>(`${this.apiUrl}/categorias-actividad`).pipe(
      catchError(() => of(this.mockData.categoriaactividades))
    );
  }

  createCategoriaActividad(categoria: Omit<CategoriaActividad, 'id'>): Observable<CategoriaActividad> {
    return this.http.post<CategoriaActividad>(`${this.apiUrl}/categorias-actividad`, categoria);
  }

  updateCategoriaActividad(id: number, categoria: Omit<CategoriaActividad, 'id'>): Observable<CategoriaActividad> {
    return this.http.put<CategoriaActividad>(`${this.apiUrl}/categorias-actividad/${id}`, categoria);
  }

  deleteCategoriaActividad(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categorias-actividad/${id}`);
  }

  // Tipo Unidad
  getTiposUnidad(): Observable<TipoUnidad[]> {
    return this.http.get<TipoUnidad[]>(`${this.apiUrl}/tipo-unidad`).pipe(
      catchError(() => of(this.mockData.tiposunidad))
    );
  }

  createTipoUnidad(tipo: Omit<TipoUnidad, 'id'>): Observable<TipoUnidad> {
    return this.http.post<TipoUnidad>(`${this.apiUrl}/tipo-unidad`, tipo);
  }

  updateTipoUnidad(id: number, tipo: Omit<TipoUnidad, 'id'>): Observable<TipoUnidad> {
    return this.http.put<TipoUnidad>(`${this.apiUrl}/tipo-unidad/${id}`, tipo);
  }

  deleteTipoUnidad(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tipo-unidad/${id}`);
  }

  // Tipo Iniciativa
  getTiposIniciativa(): Observable<TipoIniciativa[]> {
    return this.http.get<TipoIniciativa[]>(`${this.apiUrl}/tipo-iniciativa`).pipe(
      catchError(() => of(this.mockData.tiposiniciativas))
    );
  }

  createTipoIniciativa(tipo: Omit<TipoIniciativa, 'id'>): Observable<TipoIniciativa> {
    return this.http.post<TipoIniciativa>(`${this.apiUrl}/tipo-iniciativa`, tipo);
  }

  updateTipoIniciativa(id: number, tipo: Omit<TipoIniciativa, 'id'>): Observable<TipoIniciativa> {
    return this.http.put<TipoIniciativa>(`${this.apiUrl}/tipo-iniciativa/${id}`, tipo);
  }

  deleteTipoIniciativa(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tipo-iniciativa/${id}`);
  }

  // Tipo Investigacion
  getTiposInvestigacion(): Observable<TipoInvestigacion[]> {
    return this.http.get<TipoInvestigacion[]>(`${this.apiUrl}/tipo-investigacion`).pipe(
      catchError(() => of(this.mockData.tiposinvestigaciones))
    );
  }

  createTipoInvestigacion(tipo: Omit<TipoInvestigacion, 'id'>): Observable<TipoInvestigacion> {
    return this.http.post<TipoInvestigacion>(`${this.apiUrl}/tipo-investigacion`, tipo);
  }

  updateTipoInvestigacion(id: number, tipo: Omit<TipoInvestigacion, 'id'>): Observable<TipoInvestigacion> {
    return this.http.put<TipoInvestigacion>(`${this.apiUrl}/tipo-investigacion/${id}`, tipo);
  }

  deleteTipoInvestigacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tipo-investigacion/${id}`);
  }

  // Tipo Documento
  getTiposDocumento(): Observable<TipoDocumento[]> {
    return this.http.get<TipoDocumento[]>(`${this.apiUrl}/tipo-documento`).pipe(
      catchError(() => of(this.mockData.tiposdocumentos))
    );
  }

  createTipoDocumento(tipo: Omit<TipoDocumento, 'id'>): Observable<TipoDocumento> {
    return this.http.post<TipoDocumento>(`${this.apiUrl}/tipo-documento`, tipo);
  }

  updateTipoDocumento(id: number, tipo: Omit<TipoDocumento, 'id'>): Observable<TipoDocumento> {
    return this.http.put<TipoDocumento>(`${this.apiUrl}/tipo-documento/${id}`, tipo);
  }

  deleteTipoDocumento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tipo-documento/${id}`);
  }

  // Tipo Documento Divulgado
  getTiposDocumentoDivulgado(): Observable<TipoDocumentoDivulgado[]> {
    return this.http.get<TipoDocumentoDivulgado[]>(`${this.apiUrl}/tipo-documento-divulgado`).pipe(
      catchError(() => of(this.mockData.tiposdocumentosdivulgados))
    );
  }

  createTipoDocumentoDivulgado(tipo: Omit<TipoDocumentoDivulgado, 'id'>): Observable<TipoDocumentoDivulgado> {
    return this.http.post<TipoDocumentoDivulgado>(`${this.apiUrl}/tipo-documento-divulgado`, tipo);
  }

  updateTipoDocumentoDivulgado(id: number, tipo: Omit<TipoDocumentoDivulgado, 'id'>): Observable<TipoDocumentoDivulgado> {
    return this.http.put<TipoDocumentoDivulgado>(`${this.apiUrl}/tipo-documento-divulgado/${id}`, tipo);
  }

  deleteTipoDocumentoDivulgado(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tipo-documento-divulgado/${id}`);
  }

  // Area Conocimiento
  getAreasConocimiento(): Observable<AreaConocimiento[]> {
    return this.http.get<AreaConocimiento[]>(`${this.apiUrl}/area-conocimiento`).pipe(
      catchError(() => of(this.mockData.areasconocimiento))
    );
  }

  createAreaConocimiento(area: Omit<AreaConocimiento, 'id'>): Observable<AreaConocimiento> {
    return this.http.post<AreaConocimiento>(`${this.apiUrl}/area-conocimiento`, area);
  }

  updateAreaConocimiento(id: number, area: Omit<AreaConocimiento, 'id'>): Observable<AreaConocimiento> {
    return this.http.put<AreaConocimiento>(`${this.apiUrl}/area-conocimiento/${id}`, area);
  }

  deleteAreaConocimiento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/area-conocimiento/${id}`);
  }
}
