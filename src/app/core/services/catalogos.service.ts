import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  // Departamentos
  getDepartamentos(): Observable<Departamento[]> {
    return this.http.get<Departamento[]>(`${this.apiUrl}/departamentos`);
  }

  // Genero
  getGeneros(): Observable<Genero[]> {
    return this.http.get<Genero[]>(`${this.apiUrl}/generos`);
  }

  // Estado Estudiante
  getEstadosEstudiante(): Observable<EstadoEstudiante[]> {
    return this.http.get<EstadoEstudiante[]>(`${this.apiUrl}/estadoestudiantes`);
  }

  // Estado Participacion
  getEstadosParticipacion(): Observable<EstadoParticipacion[]> {
    return this.http.get<EstadoParticipacion[]>(`${this.apiUrl}/estadoparticipaciones`);
  }

  // Categoria Participacion
  getCategoriasParticipacion(): Observable<CategoriaParticipacion[]> {
    return this.http.get<CategoriaParticipacion[]>(`${this.apiUrl}/categoriaparticipaciones`);
  }

  // Categoria Actividad
  getCategoriasActividad(): Observable<CategoriaActividad[]> {
    return this.http.get<CategoriaActividad[]>(`${this.apiUrl}/categoriaactividades`);
  }

  // Tipo Unidad
  getTiposUnidad(): Observable<TipoUnidad[]> {
    return this.http.get<TipoUnidad[]>(`${this.apiUrl}/tiposunidad`);
  }

  // Tipo Iniciativa
  getTiposIniciativa(): Observable<TipoIniciativa[]> {
    return this.http.get<TipoIniciativa[]>(`${this.apiUrl}/tiposiniciativas`);
  }

  // Tipo Investigacion
  getTiposInvestigacion(): Observable<TipoInvestigacion[]> {
    return this.http.get<TipoInvestigacion[]>(`${this.apiUrl}/tiposinvestigaciones`);
  }

  // Tipo Documento
  getTiposDocumento(): Observable<TipoDocumento[]> {
    return this.http.get<TipoDocumento[]>(`${this.apiUrl}/tiposdocumentos`);
  }

  // Tipo Documento Divulgado
  getTiposDocumentoDivulgado(): Observable<TipoDocumentoDivulgado[]> {
    return this.http.get<TipoDocumentoDivulgado[]>(`${this.apiUrl}/tiposdocumentosdivulgados`);
  }

  // Area Conocimiento
  getAreasConocimiento(): Observable<AreaConocimiento[]> {
    return this.http.get<AreaConocimiento[]>(`${this.apiUrl}/areasconocimiento`);
  }
}
