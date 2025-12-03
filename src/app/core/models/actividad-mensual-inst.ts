export interface ActividadMensualInst {
  idActividadMensualInst: number;
  idActividadAnual: number;
  mes: number;
  nombre?: string; // Campo de la tabla SQL
  descripcion?: string; // Campo de la tabla SQL
  nombreMes?: string;
  metaMensual?: number;
  metaAlcanzada?: number;
  porcentajeCumplimiento?: number;
  valoracionCualitativa?: string;
  brechas?: string;
  evidenciaResumen?: string;
  activo?: boolean;
  creadoPor?: number; // Campo de la tabla SQL
  fechaCreacion?: string;
  fechaModificacion?: string;
  // Relación con ActividadAnual
  actividadAnual?: {
    idActividadAnual: number;
    idIndicador: number;
    anio: number;
    nombreIndicador?: string;
  };
}

export interface ActividadMensualInstCreate {
  idActividadAnual: number;
  mes?: number; // Opcional, se maneja automáticamente en el backend
  nombre?: string; // Campo de la tabla SQL
  descripcion?: string; // Campo de la tabla SQL
  metaMensual?: number;
  metaAlcanzada?: number;
  porcentajeCumplimiento?: number;
  valoracionCualitativa?: string;
  brechas?: string;
  evidenciaResumen?: string;
  activo?: boolean;
}

export interface ActividadMensualInstUpdate {
  idActividadAnual?: number;
  mes?: number;
  nombre?: string; // Campo de la tabla SQL
  descripcion?: string; // Campo de la tabla SQL
  metaMensual?: number;
  metaAlcanzada?: number;
  porcentajeCumplimiento?: number;
  valoracionCualitativa?: string;
  brechas?: string;
  evidenciaResumen?: string;
  activo?: boolean;
}

export interface ActividadMensualInstFilterDto {
  idActividadAnual?: number;
  mes?: number;
  anio?: number;
  idIndicador?: number;
  activo?: boolean;
}

