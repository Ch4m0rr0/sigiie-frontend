/**
 * Roles por Defecto del Sistema SIGIIE
 * 
 * Este archivo define los roles estándar del sistema con sus permisos asociados.
 * Los roles se pueden usar como referencia para asignar permisos a usuarios.
 */

export interface RolDefault {
  nombre: string;
  descripcion: string;
  permisos: string[];
  nivel: 'alto' | 'medio' | 'bajo'; // Nivel de acceso
}

/**
 * Roles por defecto del sistema con sus permisos asociados
 */
export const ROLES_DEFAULT: { [key: string]: RolDefault } = {
  'Administrador del Sistema': {
    nombre: 'Administrador del Sistema',
    descripcion: 'Acceso completo al sistema. Puede gestionar usuarios, roles, permisos y todos los módulos.',
    nivel: 'alto',
    permisos: [
      // Dashboard
      'dashboard.ver',
      'dashboard.ver_todos',
      
      // Proyectos - Acceso completo
      'proyectos.ver',
      'proyectos.crear',
      'proyectos.editar',
      'proyectos.eliminar',
      'proyectos.asignar_responsables',
      'proyectos.ver_todos',
      
      // Actividades - Acceso completo
      'actividades.ver',
      'actividades.crear',
      'actividades.editar',
      'actividades.eliminar',
      'actividades.cambiar_estado',
      'actividades.asignar_responsables',
      'actividades.ver_todas',
      'actividades.aprobar',
      
      // Subactividades - Acceso completo
      'subactividades.ver',
      'subactividades.crear',
      'subactividades.editar',
      'subactividades.eliminar',
      'subactividades.ver_todas',
      
      // Participaciones - Acceso completo
      'participaciones.ver',
      'participaciones.crear',
      'participaciones.editar',
      'participaciones.eliminar',
      'participaciones.aprobar',
      'participaciones.ver_todas',
      
      // Evidencias - Acceso completo
      'evidencias.ver',
      'evidencias.crear',
      'evidencias.editar',
      'evidencias.eliminar',
      'evidencias.aprobar',
      'evidencias.ver_todas',
      
      // Reportes - Acceso completo
      'reportes.ver',
      'reportes.generar',
      'reportes.exportar',
      'reportes.ver_todos',
      
      // Personas - Acceso completo
      'personas.ver',
      'personas.crear',
      'personas.editar',
      'personas.eliminar',
      
      // Usuarios - Acceso completo
      'usuarios.ver',
      'usuarios.crear',
      'usuarios.editar',
      'usuarios.eliminar',
      'usuarios.asignar_roles',
      'usuarios.activar_desactivar',
      
      // Catálogos - Acceso completo
      'catalogos.ver',
      'catalogos.gestionar',
    ]
  },

  'Director General': {
    nombre: 'Director General',
    descripcion: 'Rol de dirección con acceso a visualización y aprobación en todos los módulos. Puede ver reportes y aprobar actividades.',
    nivel: 'alto',
    permisos: [
      // Dashboard
      'dashboard.ver',
      'dashboard.ver_todos',
      
      // Proyectos - Visualización y aprobación
      'proyectos.ver',
      'proyectos.ver_todos',
      'proyectos.asignar_responsables',
      
      // Actividades - Visualización y aprobación
      'actividades.ver',
      'actividades.ver_todas',
      'actividades.aprobar',
      'actividades.cambiar_estado',
      
      // Subactividades - Visualización
      'subactividades.ver',
      'subactividades.ver_todas',
      
      // Participaciones - Visualización y aprobación
      'participaciones.ver',
      'participaciones.ver_todas',
      'participaciones.aprobar',
      
      // Evidencias - Visualización y aprobación
      'evidencias.ver',
      'evidencias.ver_todas',
      'evidencias.aprobar',
      
      // Reportes - Acceso completo
      'reportes.ver',
      'reportes.generar',
      'reportes.exportar',
      'reportes.ver_todos',
      
      // Personas - Solo visualización
      'personas.ver',
      
      // Usuarios - Solo visualización
      'usuarios.ver',
      'usuarios.ver_todos',
      
      // Catálogos - Solo visualización
      'catalogos.ver',
    ]
  },

  'Encargado / Coordinador': {
    nombre: 'Encargado / Coordinador',
    descripcion: 'Rol de coordinación con acceso a crear, editar y gestionar proyectos y actividades. Puede asignar responsables.',
    nivel: 'medio',
    permisos: [
      // Dashboard
      'dashboard.ver',
      
      // Proyectos - Gestión completa
      'proyectos.ver',
      'proyectos.crear',
      'proyectos.editar',
      'proyectos.asignar_responsables',
      'proyectos.ver_todos',
      
      // Actividades - Gestión completa
      'actividades.ver',
      'actividades.crear',
      'actividades.editar',
      'actividades.cambiar_estado',
      'actividades.asignar_responsables',
      'actividades.ver_todas',
      
      // Subactividades - Gestión completa
      'subactividades.ver',
      'subactividades.crear',
      'subactividades.editar',
      'subactividades.ver_todas',
      
      // Participaciones - Gestión
      'participaciones.ver',
      'participaciones.crear',
      'participaciones.editar',
      'participaciones.ver_todas',
      
      // Evidencias - Gestión
      'evidencias.ver',
      'evidencias.crear',
      'evidencias.editar',
      'evidencias.ver_todas',
      
      // Reportes - Visualización y generación
      'reportes.ver',
      'reportes.generar',
      'reportes.exportar',
      
      // Personas - Visualización y edición
      'personas.ver',
      'personas.crear',
      'personas.editar',
      
      // Catálogos - Visualización
      'catalogos.ver',
    ]
  },

  'Sub-Encargado / Asistente': {
    nombre: 'Sub-Encargado / Asistente',
    descripcion: 'Rol de asistencia con permisos limitados para crear y editar actividades y subactividades.',
    nivel: 'medio',
    permisos: [
      // Dashboard
      'dashboard.ver',
      
      // Proyectos - Solo visualización
      'proyectos.ver',
      
      // Actividades - Crear y editar (propias)
      'actividades.ver',
      'actividades.crear',
      'actividades.editar',
      
      // Subactividades - Gestión completa
      'subactividades.ver',
      'subactividades.crear',
      'subactividades.editar',
      'subactividades.eliminar',
      
      // Participaciones - Crear y editar
      'participaciones.ver',
      'participaciones.crear',
      'participaciones.editar',
      
      // Evidencias - Crear y editar
      'evidencias.ver',
      'evidencias.crear',
      'evidencias.editar',
      
      // Reportes - Solo visualización
      'reportes.ver',
      
      // Personas - Solo visualización
      'personas.ver',
    ]
  },

  'Responsable de Actividad': {
    nombre: 'Responsable de Actividad',
    descripcion: 'Rol para responsables de actividades específicas. Puede gestionar sus actividades asignadas y sus subactividades.',
    nivel: 'bajo',
    permisos: [
      // Dashboard
      'dashboard.ver',
      
      // Proyectos - Solo visualización
      'proyectos.ver',
      
      // Actividades - Ver y editar (solo asignadas)
      'actividades.ver',
      'actividades.editar',
      
      // Subactividades - Gestión completa
      'subactividades.ver',
      'subactividades.crear',
      'subactividades.editar',
      'subactividades.eliminar',
      
      // Participaciones - Crear y editar
      'participaciones.ver',
      'participaciones.crear',
      'participaciones.editar',
      
      // Evidencias - Crear y editar
      'evidencias.ver',
      'evidencias.crear',
      'evidencias.editar',
    ]
  },

  'Participante / Colaborador': {
    nombre: 'Participante / Colaborador',
    descripcion: 'Rol básico para participantes que pueden ver y crear participaciones y evidencias.',
    nivel: 'bajo',
    permisos: [
      // Dashboard
      'dashboard.ver',
      
      // Proyectos - Solo visualización
      'proyectos.ver',
      
      // Actividades - Solo visualización
      'actividades.ver',
      
      // Subactividades - Solo visualización
      'subactividades.ver',
      
      // Participaciones - Crear y editar (propias)
      'participaciones.ver',
      'participaciones.crear',
      'participaciones.editar',
      
      // Evidencias - Crear y editar (propias)
      'evidencias.ver',
      'evidencias.crear',
      'evidencias.editar',
    ]
  },

  'Consultor / Visualizador': {
    nombre: 'Consultor / Visualizador',
    descripcion: 'Rol de solo lectura para consultores que necesitan visualizar información sin modificar.',
    nivel: 'bajo',
    permisos: [
      // Dashboard
      'dashboard.ver',
      
      // Proyectos - Solo visualización
      'proyectos.ver',
      
      // Actividades - Solo visualización
      'actividades.ver',
      
      // Subactividades - Solo visualización
      'subactividades.ver',
      
      // Participaciones - Solo visualización
      'participaciones.ver',
      
      // Evidencias - Solo visualización
      'evidencias.ver',
      
      // Reportes - Solo visualización
      'reportes.ver',
    ]
  },
};

/**
 * Obtiene un rol por defecto por su nombre
 */
export function getRolDefault(nombre: string): RolDefault | undefined {
  return ROLES_DEFAULT[nombre];
}

/**
 * Obtiene todos los nombres de roles por defecto
 */
export function getNombresRolesDefault(): string[] {
  return Object.keys(ROLES_DEFAULT);
}

/**
 * Obtiene todos los roles por defecto
 */
export function getAllRolesDefault(): RolDefault[] {
  return Object.values(ROLES_DEFAULT);
}

/**
 * Obtiene los permisos de un rol por defecto
 */
export function getPermisosRolDefault(nombre: string): string[] {
  const rol = getRolDefault(nombre);
  return rol ? rol.permisos : [];
}

/**
 * Verifica si un rol por defecto existe
 */
export function existeRolDefault(nombre: string): boolean {
  return nombre in ROLES_DEFAULT;
}

