export interface ActividadAnual {
  idActividadAnual: number;
  idIndicador: number;
  nombreIndicador?: string;
  codigoIndicador?: string;
  nombre?: string; // Campo de la tabla SQL
  descripcion?: string; // Campo de la tabla SQL
  anio: number;
  metaAnual?: number;
  metaAlcanzada?: number;
  porcentajeCumplimiento?: number;
  valoracionCualitativa?: string;
  brechas?: string;
  evidenciaResumen?: string;
  activo?: boolean;
  creadoPor?: number; // Campo de la tabla SQL
  fechaCreacion?: string;
  fechaModificacion?: string;
}

export interface ActividadAnualCreate {
  idIndicador: number;
  anio?: number; // Opcional, se usa año actual si no se proporciona
  nombre?: string; // Campo de la tabla SQL
  descripcion?: string; // Campo de la tabla SQL
  metaAnual?: number;
  metaAlcanzada?: number;
  porcentajeCumplimiento?: number;
  valoracionCualitativa?: string;
  brechas?: string;
  evidenciaResumen?: string;
  activo?: boolean; // Opcional, por defecto es true
}

export interface ActividadAnualUpdate {
  idIndicador?: number;
  anio?: number;
  nombre?: string; // Campo de la tabla SQL
  descripcion?: string; // Campo de la tabla SQL
  metaAnual?: number;
  metaAlcanzada?: number;
  porcentajeCumplimiento?: number;
  valoracionCualitativa?: string;
  brechas?: string;
  evidenciaResumen?: string;
  activo?: boolean;
}

export interface ActividadAnualFilterDto {
  idIndicador?: number;
  anio?: number;
  activo?: boolean;
}

