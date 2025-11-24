// Catálogos nuevos para las nuevas funcionalidades

export interface TipoPlanificacion {
  idTipoPlanificacion: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface NivelActividad {
  idNivel: number;
  nombre: string; // Centro, Departamento, Multi
  descripcion?: string;
  activo: boolean;
}

export interface TipoSubactividad {
  idTipoSubactividad: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface TipoEvidencia {
  idTipoEvidencia: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface RolEquipo {
  idRolEquipo: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

