import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { ReportesService, ReporteConfig, ReporteInstitucionalConfig } from '../../core/services/reportes.service';
import { ActividadesService } from '../../core/services/actividades.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { Actividad } from '../../core/models/actividad';
import type { Subactividad } from '../../core/models/subactividad';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-reporte-generar',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './reporte-generar.component.html',
})
export class ReporteGenerarComponent implements OnInit {
  private fb = inject(FormBuilder);
  private reportesService = inject(ReportesService);
  private actividadesService = inject(ActividadesService);
  private subactividadService = inject(SubactividadService);
  private catalogosService = inject(CatalogosService);
  private router = inject(Router);

  form!: FormGroup;
  actividades = signal<Actividad[]>([]);
  subactividades = signal<Subactividad[]>([]);
  departamentos = signal<any[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  generando = signal(false);
  
  // Computed para detectar si es reporte institucional
  esReporteInstitucional = signal(false);
  
  // Tipo de operación: 'nuevo-reporte' o 'extraccion-datos'
  tipoOperacion = signal<'nuevo-reporte' | 'extraccion-datos'>('nuevo-reporte');
  
  // Filtro de búsqueda para actividades
  filtroActividad = signal<string>('');
  
  // Actividades filtradas basadas en el texto de búsqueda (sin filtrar por período)
  actividadesFiltradas = computed(() => {
    let actividades = this.actividades();
    
    // Filtrar solo por texto de búsqueda
    const filtro = this.filtroActividad().toLowerCase().trim();
    if (filtro) {
      actividades = actividades.filter(actividad => 
        actividad.nombre?.toLowerCase().includes(filtro) ||
        actividad.codigoActividad?.toLowerCase().includes(filtro) ||
        actividad.nombreActividad?.toLowerCase().includes(filtro)
      );
    }
    
    // Ordenar de más reciente a más antigua
    actividades.sort((a, b) => {
      const fechaA = new Date(a.fechaInicio || a.fechaEvento || 0);
      const fechaB = new Date(b.fechaInicio || b.fechaEvento || 0);
      return fechaB.getTime() - fechaA.getTime(); // Orden descendente (más reciente primero)
    });
    
    return actividades;
  });

  // Actividades dentro del período seleccionado (usa TODAS las actividades, sin filtro de búsqueda)
  // Esta es la versión completa para selección automática
  actividadesEnPeriodo = computed(() => {
    const fechaInicio = this.form.get('fechaInicio')?.value;
    const fechaFin = this.form.get('fechaFin')?.value;
    
    if (!fechaInicio && !fechaFin) {
      return [];
    }
    
    // Usar TODAS las actividades, no solo las filtradas por búsqueda
    return this.actividades().filter(actividad => {
      const fechaActividad = actividad.fechaInicio || actividad.fechaEvento;
      
      if (!fechaActividad) {
        return false;
      }
      
      const fechaAct = new Date(fechaActividad);
      fechaAct.setHours(0, 0, 0, 0);
      
      let dentroDelPeriodo = true;
      
      if (fechaInicio) {
        const fechaInicioObj = new Date(fechaInicio);
        fechaInicioObj.setHours(0, 0, 0, 0);
        if (fechaAct < fechaInicioObj) {
          dentroDelPeriodo = false;
        }
      }
      
      if (fechaFin) {
        const fechaFinObj = new Date(fechaFin);
        fechaFinObj.setHours(23, 59, 59, 999);
        if (fechaAct > fechaFinObj) {
          dentroDelPeriodo = false;
        }
      }
      
      return dentroDelPeriodo;
    });
  });

  // Actividades dentro del período filtradas por búsqueda (para mostrar en el HTML)
  actividadesEnPeriodoFiltradas = computed(() => {
    const actividadesEnPeriodo = this.actividadesEnPeriodo();
    const filtro = this.filtroActividad().toLowerCase().trim();
    
    if (!filtro) {
      return actividadesEnPeriodo;
    }
    
    return actividadesEnPeriodo.filter(actividad => 
      actividad.nombre?.toLowerCase().includes(filtro) ||
      actividad.codigoActividad?.toLowerCase().includes(filtro) ||
      actividad.nombreActividad?.toLowerCase().includes(filtro)
    );
  });

  // Actividades fuera del período seleccionado
  actividadesFueraPeriodo = computed(() => {
    const fechaInicio = this.form.get('fechaInicio')?.value;
    const fechaFin = this.form.get('fechaFin')?.value;
    
    if (!fechaInicio && !fechaFin) {
      return [];
    }
    
    const idsEnPeriodo = new Set(this.actividadesEnPeriodo().map(a => Number(a.id || a.idActividad)));
    
    return this.actividadesFiltradas().filter(actividad => {
      const id = Number(actividad.id || actividad.idActividad);
      return !idsEnPeriodo.has(id);
    });
  });
  
  // Campos disponibles para extracción de datos (cargados dinámicamente del backend)
  camposExtraccionDisponibles = signal<any>(null);
  camposExtraccion = signal<Array<{ value: string; label: string; categoria: string; checked: boolean }>>([]);
  loadingCampos = signal(false);

  tiposReporte = [
    { value: 'actividad', label: 'Reporte de Actividad' },
    { value: 'subactividad', label: 'Reporte de Subactividad' },
    { value: 'participaciones', label: 'Reporte de Participaciones' },
    { value: 'evidencias', label: 'Reporte de Evidencias' },
    { value: 'indicadores', label: 'Reporte de Indicadores' },
    { value: 'general', label: 'Reporte General' }
  ];

  formatos = [
    { value: 'excel', label: 'Excel (único formato disponible actualmente)' }
  ];

  ngOnInit(): void {
    this.initializeForm();
    this.loadActividades();
    this.loadSubactividades();
    this.loadDepartamentos();
    this.loadCamposExtraccionDisponibles();

    // Observar cambios en tipoReporte para mostrar/ocultar campos
    this.form.get('tipoReporte')?.valueChanges.subscribe(tipo => {
      this.updateFormFields(tipo);
      this.setDefaultMetadata(tipo);
    });

    // Observar cambios en dividirPorGenero - NO requiere actividad
    // Permite generar reporte general con estadísticas de género (F y M)
    this.form.get('dividirPorGenero')?.valueChanges.subscribe(dividirPorGenero => {
      const actividadControl = this.form.get('actividadId');
      const tipoReporte = this.form.get('tipoReporte')?.value;
      
      // dividirPorGenero NO hace que la actividad sea requerida
      // Solo actualizar validación si el tipo de reporte lo requiere
      if (tipoReporte === 'actividad') {
        actividadControl?.setValidators(Validators.required);
      } else {
        actividadControl?.clearValidators();
      }
      actividadControl?.updateValueAndValidity();
    });

    // Observar cambios en fechas para detectar reporte institucional y seleccionar actividades automáticamente
    this.form.get('fechaInicio')?.valueChanges.subscribe(() => {
      this.actualizarEsReporteInstitucional();
      this.seleccionarActividadesPorPeriodo();
    });
    this.form.get('fechaFin')?.valueChanges.subscribe(() => {
      this.actualizarEsReporteInstitucional();
      this.seleccionarActividadesPorPeriodo();
    });

    // Inicializar valores por defecto
    const initialType = this.form.get('tipoReporte')?.value || 'general';
    this.setDefaultMetadata(initialType);
    this.actualizarEsReporteInstitucional();
  }

  initializeForm(): void {
    this.form = this.fb.group({
      tipoOperacion: ['nuevo-reporte', Validators.required], // Nuevo campo para tipo de operación
      tipoReporte: ['', Validators.required],
      actividadId: [null], // Mantener para compatibilidad, pero también usar idActividades
      idActividades: [[]], // Array de IDs de actividades para selección múltiple
      subactividadId: [null],
      fechaInicio: [null], // Para reporte institucional o filtrar por período
      fechaFin: [null], // Para reporte institucional o filtrar por período
      idDepartamento: [null], // Para filtrar por departamento (opcional) - Legacy, mantener para compatibilidad
      idDepartamentos: [[]], // Array de IDs de departamentos (permite múltiples selecciones)
      descripcionImpacto: [''], // Descripción del impacto de la actividad desarrollada
      formato: ['excel', Validators.required],
      incluirEvidencias: [true],
      incluirParticipaciones: [true],
      incluirIndicadores: [true],
      dividirPorGenero: [true], // Por defecto true para nuevo reporte (consolidado)
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      rutaArchivo: ['', Validators.required],
      tipoArchivo: ['excel', Validators.required],
      // Campos para extracción de datos
      camposSeleccionados: [[]] // Array de campos seleccionados para extracción
    }, {
      validators: [this.validarFechas.bind(this)]
    });
    
    // Observar cambios en tipoOperacion
    this.form.get('tipoOperacion')?.valueChanges.subscribe(tipo => {
      this.tipoOperacion.set(tipo);
      // Actualizar validaciones según el tipo de operación
      if (tipo === 'extraccion-datos') {
        // Para extracción de datos, los campos de reporte tradicional no son requeridos
        this.form.get('tipoReporte')?.clearValidators();
        this.form.get('tipoReporte')?.updateValueAndValidity();
        // Los campos de nombre y ruta siguen siendo requeridos
      } else {
        // Para nuevo reporte, tipoReporte es requerido
        this.form.get('tipoReporte')?.setValidators(Validators.required);
        this.form.get('tipoReporte')?.updateValueAndValidity();
        // Asegurar que dividirPorGenero esté en true para consolidado
        this.form.get('dividirPorGenero')?.setValue(true);
      }
    });

    // Observar cambios en actividadId para cargar departamentos automáticamente
    this.form.get('actividadId')?.valueChanges.subscribe(actividadId => {
      if (actividadId) {
        this.cargarDepartamentosDeActividad(actividadId);
      } else {
        // Si se deselecciona la actividad, limpiar departamentos
        this.form.get('idDepartamentos')?.setValue([]);
      }
    });
  }

  /**
   * Validador personalizado para fechas
   * Si ambas fechas están presentes, fechaInicio debe ser <= fechaFin
   */
  validarFechas(control: AbstractControl): ValidationErrors | null {
    const fechaInicio = control.get('fechaInicio')?.value;
    const fechaFin = control.get('fechaFin')?.value;

    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      
      if (inicio > fin) {
        return { fechaInicioMayorQueFin: true };
      }
    }

    return null;
  }

  /**
   * Actualiza el estado de esReporteInstitucional basado en las fechas
   */
  actualizarEsReporteInstitucional(): void {
    const fechaInicio = this.form.get('fechaInicio')?.value;
    const fechaFin = this.form.get('fechaFin')?.value;
    this.esReporteInstitucional.set(!!(fechaInicio && fechaFin));
  }

  updateFormFields(tipoReporte: string): void {
    const actividadControl = this.form.get('actividadId');
    const idActividadesControl = this.form.get('idActividades');
    const subactividadControl = this.form.get('subactividadId');

    // Limpiar validadores
    actividadControl?.clearValidators();
    idActividadesControl?.clearValidators();
    subactividadControl?.clearValidators();

    // Aplicar validadores según el tipo
    switch (tipoReporte) {
      case 'actividad':
        // Validar que idActividades tenga al menos un elemento
        idActividadesControl?.setValidators([
          (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;
            if (!value || !Array.isArray(value) || value.length === 0) {
              return { required: true };
            }
            return null;
          }
        ]);
        break;
      case 'subactividad':
        subactividadControl?.setValidators(Validators.required);
        break;
      case 'participaciones':
        // Para reportes de participaciones, la actividad es opcional pero útil para filtrar
        // No es requerida, pero si se selecciona, filtra solo esa actividad
        break;
    }

    // NOTA: dividirPorGenero NO requiere actividad - permite reporte general con estadísticas de género
    // El backend debe poder procesar dividirPorGenero sin actividadId

    actividadControl?.updateValueAndValidity();
    idActividadesControl?.updateValueAndValidity();
    subactividadControl?.updateValueAndValidity();
  }

  private generarNombreDefault(tipo: string): string {
    const fecha = new Date().toISOString().split('T')[0];
    const label = tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : 'General';
    return `Reporte ${label} ${fecha}`;
  }

  private generarRutaDefault(tipo: string): string {
    const safeTipo = tipo || 'general';
    return `reportes/${safeTipo}-${Date.now()}.xlsx`;
  }

  private setDefaultMetadata(tipo: string): void {
    const nombreControl = this.form.get('nombre');
    if (nombreControl && (!nombreControl.value || !nombreControl.dirty)) {
      nombreControl.setValue(this.generarNombreDefault(tipo), { emitEvent: false });
    }

    const rutaControl = this.form.get('rutaArchivo');
    if (rutaControl && (!rutaControl.value || !rutaControl.dirty)) {
      rutaControl.setValue(this.generarRutaDefault(tipo), { emitEvent: false });
    }

    const tipoArchivoControl = this.form.get('tipoArchivo');
    if (tipoArchivoControl && (!tipoArchivoControl.value || !tipoArchivoControl.dirty)) {
      tipoArchivoControl.setValue('excel', { emitEvent: false });
    }
  }

  loadActividades(): void {
    this.actividadesService.list().subscribe({
      next: (data) => this.actividades.set(data),
      error: (err) => console.error('Error loading actividades:', err)
    });
  }

  loadSubactividades(): void {
    this.subactividadService.getAll().subscribe({
      next: (data) => this.subactividades.set(data),
      error: (err) => console.error('Error loading subactividades:', err)
    });
  }

  loadDepartamentos(): void {
    this.catalogosService.getDepartamentos().subscribe({
      next: (data) => this.departamentos.set(data),
      error: (err) => console.error('Error loading departamentos:', err)
    });
  }

  /**
   * Carga los campos disponibles para extracción de datos desde el backend
   */
  loadCamposExtraccionDisponibles(): void {
    this.loadingCampos.set(true);
    this.reportesService.obtenerCamposExtraccionDisponibles().subscribe({
      next: (data) => {
        this.camposExtraccionDisponibles.set(data);
        
        // Convertir la estructura del backend a la estructura del componente
        const campos: Array<{ value: string; label: string; categoria: string; checked: boolean }> = [];
        
        // Agregar campos de estudiantes
        if (data.estudiantes && Array.isArray(data.estudiantes)) {
          data.estudiantes.forEach((campo: any) => {
            campos.push({
              value: campo.nombre,
              label: campo.etiqueta,
              categoria: 'estudiantes',
              checked: false
            });
          });
        }
        
        // Agregar campos de docentes
        if (data.docentes && Array.isArray(data.docentes)) {
          data.docentes.forEach((campo: any) => {
            campos.push({
              value: campo.nombre,
              label: campo.etiqueta,
              categoria: 'docentes',
              checked: false
            });
          });
        }
        
        // Agregar campos de administrativos
        if (data.administrativos && Array.isArray(data.administrativos)) {
          data.administrativos.forEach((campo: any) => {
            campos.push({
              value: campo.nombre,
              label: campo.etiqueta,
              categoria: 'administrativos',
              checked: false
            });
          });
        }
        
        // Agregar campos de actividad
        if (data.actividad && Array.isArray(data.actividad)) {
          data.actividad.forEach((campo: any) => {
            campos.push({
              value: campo.nombre,
              label: campo.etiqueta,
              categoria: 'actividad',
              checked: false
            });
          });
        }
        
        // Agregar campos de participación
        if (data.participacion && Array.isArray(data.participacion)) {
          data.participacion.forEach((campo: any) => {
            campos.push({
              value: campo.nombre,
              label: campo.etiqueta,
              categoria: 'participacion',
              checked: false
            });
          });
        }
        
        this.camposExtraccion.set(campos);
        console.log('✅ Campos de extracción cargados:', campos.length, 'campos en', 
          new Set(campos.map(c => c.categoria)).size, 'categorías');
        this.loadingCampos.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading campos de extracción:', err);
        // Usar campos por defecto si falla
        this.camposExtraccion.set([
          { value: 'NombreEstudiante', label: 'Nombre de estudiantes', categoria: 'estudiantes', checked: false },
          { value: 'NombreDocente', label: 'Nombre de docentes', categoria: 'docentes', checked: false },
          { value: 'NombreAdministrativo', label: 'Nombre de administrativos', categoria: 'administrativos', checked: false },
          { value: 'Sexo', label: 'Sexo', categoria: 'participacion', checked: false },
          { value: 'NombreActividad', label: 'Actividades', categoria: 'actividad', checked: false },
          { value: 'LugarDesarrollo', label: 'Lugar de la actividad', categoria: 'actividad', checked: false },
          { value: 'FechaActividad', label: 'Fecha de realización', categoria: 'actividad', checked: false },
          { value: 'FechaFinalizacion', label: 'Fecha de finalización', categoria: 'actividad', checked: false },
          { value: 'idModalidad', label: 'Modalidad', categoria: 'actividad', checked: false },
          { value: 'TipoParticipante', label: 'Tipo de participante', categoria: 'participacion', checked: false },
          { value: 'idCarrera', label: 'Carrera', categoria: 'estudiantes', checked: false },
          { value: 'idIndicador', label: 'Indicador asignado a esa actividad', categoria: 'actividad', checked: false }
        ]);
        this.loadingCampos.set(false);
      }
    });
  }

  /**
   * Obtiene los campos agrupados por categoría
   */
  getCamposPorCategoria(categoria: string) {
    return this.camposExtraccion().filter(c => c.categoria === categoria);
  }

  /**
   * Obtiene el nombre legible de la categoría
   */
  getNombreCategoria(categoria: string): string {
    const nombres: { [key: string]: string } = {
      'estudiantes': 'Estudiantes',
      'docentes': 'Docentes',
      'administrativos': 'Administrativos',
      'actividad': 'Actividad',
      'participacion': 'Participación'
    };
    return nombres[categoria] || categoria;
  }

  /**
   * Verifica si todos los campos de una categoría están seleccionados
   */
  todosCamposSeleccionados(categoria: string): boolean {
    const campos = this.getCamposPorCategoria(categoria);
    return campos.length > 0 && campos.every(c => c.checked);
  }

  /**
   * Carga los departamentos asociados a múltiples actividades y los selecciona automáticamente
   * Combina todos los departamentos únicos de las actividades seleccionadas
   */
  cargarDepartamentosDeActividades(actividadIds: number[]): void {
    if (!actividadIds || actividadIds.length === 0) {
      return;
    }
    
    const idsDepartamentosSet = new Set<number>();
    
    actividadIds.forEach(actividadId => {
      const id = typeof actividadId === 'string' ? parseInt(actividadId, 10) : actividadId;
      if (isNaN(id) || id <= 0) {
        return;
      }
      
      const actividad = this.actividades().find(a => {
        const aId = Number(a.id || a.idActividad);
        return aId === id;
      });
      
      if (actividad) {
        // Agregar departamento principal
        if (actividad.departamentoId) {
          const deptId = Number(actividad.departamentoId);
          if (deptId > 0) {
            idsDepartamentosSet.add(deptId);
          }
        }
        
        // Agregar departamentos responsables
        const actividadData = actividad as any;
        const departamentosResponsables = 
          actividadData.idDepartamentosResponsables || 
          actividadData.IdDepartamentosResponsables || 
          (Array.isArray(actividadData.departamentoResponsableId) ? actividadData.departamentoResponsableId : [actividadData.departamentoResponsableId]);
        
        if (departamentosResponsables && Array.isArray(departamentosResponsables)) {
          departamentosResponsables.forEach((deptId: any) => {
            const numId = Number(deptId);
            if (numId > 0) {
              idsDepartamentosSet.add(numId);
            }
          });
        }
      }
    });
    
    if (idsDepartamentosSet.size > 0) {
      const idsDepartamentos = Array.from(idsDepartamentosSet);
      this.form.get('idDepartamentos')?.setValue(idsDepartamentos);
      console.log('✅ Departamentos seleccionados automáticamente desde actividades:', idsDepartamentos);
    }
  }

  /**
   * Carga los departamentos asociados a una actividad y los selecciona automáticamente
   * Extrae los departamentos directamente del objeto Actividad que ya está cargado
   */
  cargarDepartamentosDeActividad(actividadId: number | string): void {
    // Convertir a número si es string
    const id = typeof actividadId === 'string' ? parseInt(actividadId, 10) : actividadId;
    
    if (isNaN(id) || id <= 0) {
      console.warn('⚠️ ID de actividad inválido:', actividadId);
      return;
    }
    
    // Buscar la actividad en la lista cargada (puede tener id o idActividad)
    const actividad = this.actividades().find(a => {
      const aId = Number(a.id || a.idActividad);
      return aId === id;
    });
    
    if (actividad) {
      const idsDepartamentos: number[] = [];
      const idsDepartamentosSet = new Set<number>();
      
      // Agregar departamento principal si existe
      if (actividad.departamentoId) {
        const deptId = Number(actividad.departamentoId);
        if (deptId > 0 && !idsDepartamentosSet.has(deptId)) {
          idsDepartamentosSet.add(deptId);
          idsDepartamentos.push(deptId);
        }
      }
      
      // Agregar departamentos responsables (puede venir en diferentes formatos)
      const actividadData = actividad as any;
      
      // Formato 1: idDepartamentosResponsables (array)
      if (actividadData.idDepartamentosResponsables && Array.isArray(actividadData.idDepartamentosResponsables)) {
        actividadData.idDepartamentosResponsables.forEach((id: any) => {
          const numId = Number(id);
          if (numId > 0 && !idsDepartamentosSet.has(numId)) {
            idsDepartamentosSet.add(numId);
            idsDepartamentos.push(numId);
          }
        });
      }
      
      // Formato 2: IdDepartamentosResponsables (array, PascalCase)
      if (actividadData.IdDepartamentosResponsables && Array.isArray(actividadData.IdDepartamentosResponsables)) {
        actividadData.IdDepartamentosResponsables.forEach((id: any) => {
          const numId = Number(id);
          if (numId > 0 && !idsDepartamentosSet.has(numId)) {
            idsDepartamentosSet.add(numId);
            idsDepartamentos.push(numId);
          }
        });
      }
      
      // Formato 3: departamentoResponsableId (puede ser single o array)
      if (actividadData.departamentoResponsableId) {
        if (Array.isArray(actividadData.departamentoResponsableId)) {
          actividadData.departamentoResponsableId.forEach((id: any) => {
            const numId = Number(id);
            if (numId > 0 && !idsDepartamentosSet.has(numId)) {
              idsDepartamentosSet.add(numId);
              idsDepartamentos.push(numId);
            }
          });
        } else {
          const numId = Number(actividadData.departamentoResponsableId);
          if (numId > 0 && !idsDepartamentosSet.has(numId)) {
            idsDepartamentosSet.add(numId);
            idsDepartamentos.push(numId);
          }
        }
      }
      
      // Seleccionar automáticamente los departamentos encontrados
      if (idsDepartamentos.length > 0) {
        this.form.get('idDepartamentos')?.setValue(idsDepartamentos);
        console.log('✅ Departamentos seleccionados automáticamente desde la actividad:', idsDepartamentos);
      } else {
        console.log('ℹ️ La actividad no tiene departamentos asociados en sus datos');
      }
    } else {
      // Si la actividad no está en la lista, puede ser que la lista aún no se haya cargado
      // o que la actividad no esté disponible. Intentar obtenerla del backend como fallback
      // pero solo si realmente no está en la lista (evitar advertencias innecesarias)
      const actividadEnLista = this.actividades().length > 0;
      
      if (actividadEnLista) {
        // La lista está cargada pero la actividad no está - puede ser un problema de sincronización
        // o la actividad fue eliminada. No hacer nada, el usuario puede seleccionar manualmente.
        console.log('ℹ️ La actividad no se encontró en la lista cargada. El usuario puede seleccionar los departamentos manualmente.');
        return;
      }
      
      // Si la lista está vacía, intentar obtener la actividad del backend
      this.actividadesService.getById(id).subscribe({
        next: (actividadCompleta) => {
          if (actividadCompleta) {
            // Recursivamente llamar a este método con la actividad completa
            // Pero mejor extraer los departamentos directamente aquí
            const idsDepartamentos: number[] = [];
            const idsDepartamentosSet = new Set<number>();
            
            if (actividadCompleta.departamentoId) {
              const deptId = Number(actividadCompleta.departamentoId);
              if (deptId > 0) {
                idsDepartamentosSet.add(deptId);
                idsDepartamentos.push(deptId);
              }
            }
            
            const actividadData = actividadCompleta as any;
            if (actividadData.idDepartamentosResponsables && Array.isArray(actividadData.idDepartamentosResponsables)) {
              actividadData.idDepartamentosResponsables.forEach((id: any) => {
                const numId = Number(id);
                if (numId > 0 && !idsDepartamentosSet.has(numId)) {
                  idsDepartamentosSet.add(numId);
                  idsDepartamentos.push(numId);
                }
              });
            }
            
            if (idsDepartamentos.length > 0) {
              this.form.get('idDepartamentos')?.setValue(idsDepartamentos);
              console.log('✅ Departamentos seleccionados automáticamente desde backend:', idsDepartamentos);
            }
          }
        },
        error: (err) => {
          // Error silencioso - el usuario puede seleccionar los departamentos manualmente
          // No mostrar advertencia en consola para no generar ruido
        }
      });
    }
  }

  async onSubmit(): Promise<void> {
    // Validación personalizada según el tipo de operación
    const tipoOperacion = this.form.get('tipoOperacion')?.value || 'nuevo-reporte';
    
    if (tipoOperacion === 'extraccion-datos') {
      // Para extracción de datos, validar que haya campos seleccionados
      const camposSeleccionados = this.form.get('camposSeleccionados')?.value || [];
      if (camposSeleccionados.length === 0) {
        this.form.get('camposSeleccionados')?.setErrors({ required: true });
        this.form.get('camposSeleccionados')?.markAsTouched();
        this.form.markAllAsTouched();
        return;
      }
    }
    
    if (this.form.valid) {
      this.generando.set(true);
      this.error.set(null);

      const formValue = this.form.value;
      
      // Si es extracción de datos, manejar de forma diferente
      if (tipoOperacion === 'extraccion-datos') {
        await this.generarExtraccionDatos(formValue);
        return;
      }
      
      // Si es nuevo reporte, continuar con la lógica existente
      const fechaInicio = formValue.fechaInicio;
      const fechaFin = formValue.fechaFin;
      const esInstitucional = fechaInicio && fechaFin;

      try {
        let reporteId: number | null = null;

        // Si es reporte institucional, usar generarExcel que detecta automáticamente el formato
        // El método generarExcel ya maneja ParametrosJson cuando hay fechas
        if (esInstitucional) {
          console.log('📊 Generando reporte institucional con fechas:', fechaInicio, 'a', fechaFin);
          
          // Generar nombre del reporte con el nuevo formato
          // Formato: "Reporte de [Código de actividad O Nombre de subActividad O Indicador O participaciones O evidencias] [fecha del reporte]"
          const nombreReporte = this.generarNombreReporte(formValue);

          // Verificar que descripcionImpacto se está capturando
          // Capturar el valor tal cual está (sin trim para no perder espacios intencionales)
          // Solo enviar si tiene contenido (no cadena vacía después de trim)
          const descripcionImpactoRaw = formValue.descripcionImpacto || '';
          const descripcionImpacto = descripcionImpactoRaw.trim() || undefined;
          
          console.log('🔍 DescripcionImpacto del formulario (raw):', descripcionImpactoRaw);
          console.log('🔍 DescripcionImpacto del formulario (trimmed):', descripcionImpacto);
          console.log('🔍 DescripcionImpacto length (raw):', descripcionImpactoRaw.length);
          console.log('🔍 DescripcionImpacto length (trimmed):', descripcionImpacto?.length || 0);
          console.log('🔍 DescripcionImpacto será enviado?', descripcionImpacto !== undefined);
          
          const config: ReporteConfig = {
            tipoReporte: formValue.tipoReporte || 'actividad', // Importante: debe contener "actividad"
            actividadId: formValue.actividadId || undefined,
            subactividadId: formValue.subactividadId || undefined,
            fechaInicio: fechaInicio,
            fechaFin: fechaFin,
            idDepartamento: formValue.idDepartamento || undefined,
            idDepartamentos: formValue.idDepartamentos || undefined, // Array de departamentos
            descripcionImpacto: descripcionImpacto,
            formato: formValue.formato,
            incluirEvidencias: formValue.incluirEvidencias ?? true,
            incluirParticipaciones: formValue.incluirParticipaciones ?? true,
            incluirIndicadores: formValue.incluirIndicadores ?? true,
            dividirPorGenero: formValue.dividirPorGenero ?? false, // Incluir cantidad de hombres y mujeres
            nombre: nombreReporte,
            rutaArchivo: formValue.rutaArchivo?.trim() || `reportes/institucional-${Date.now()}.xlsx`,
            tipoArchivo: 'actividad', // Importante: debe contener "actividad" para que el backend detecte el formato institucional
            parametrosJson: JSON.stringify({
              SinInstrucciones: true // Eliminar instrucciones del Excel
            })
          };

          // Usar generarExcel que detecta automáticamente el formato institucional
          this.reportesService.generarExcel(config).subscribe({
            next: (blob) => {
              console.log('✅ ReporteGenerarComponent - Reporte institucional generado exitosamente, tamaño:', blob.size);
              
              // Verificar que el blob sea válido
              if (!blob || blob.size === 0) {
                this.error.set('El archivo generado está vacío o es inválido.');
                this.generando.set(false);
                return;
              }
              
              // Validar que el blob sea un archivo Excel válido
              blob.slice(0, 4).arrayBuffer().then((buffer: ArrayBuffer) => {
                const bytes = new Uint8Array(buffer);
                const isValidExcel = bytes[0] === 0x50 && bytes[1] === 0x4B; // "PK" (ZIP signature)
                
                if (!isValidExcel) {
                  console.error('❌ ReporteGenerarComponent - El archivo no es un Excel válido.');
                  this.error.set('El archivo generado no es un Excel válido. Por favor, intenta nuevamente.');
                  this.generando.set(false);
                  return;
                }
                
                // Descargar el archivo Excel generado
                const excelBlob = blob.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                  ? blob 
                  : new Blob([blob], {
                      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                
                console.log('✅ ReporteGenerarComponent - Archivo Excel válido, descargando...');
                
                const url = window.URL.createObjectURL(excelBlob);
                const a = document.createElement('a');
                a.href = url;
                // Limpiar el nombre del archivo para que sea válido (sin caracteres especiales)
                // Usar el nombre generado con la misma lógica del backend
                const nombreArchivoLimpio = nombreReporte.replace(/[<>:"/\\|?*]/g, '_');
                a.download = `${nombreArchivoLimpio}.xlsx`;
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                }, 100);
                
                this.generando.set(false);
                this.router.navigate(['/reportes']);
              }).catch((error) => {
                console.error('❌ ReporteGenerarComponent - Error al validar el archivo:', error);
                this.error.set('Error al validar el archivo generado. Por favor, intenta nuevamente.');
                this.generando.set(false);
              });
            },
            error: (err: any) => {
              console.error('❌ ReporteGenerarComponent - Error generando reporte institucional:', err);
              this.generando.set(false);
              
              let errorMessage = 'Error al generar el reporte institucional';
              
              if (err.backendMessage) {
                errorMessage = err.backendMessage;
              } else if (err.message) {
                errorMessage = err.message;
              } else if (err.error?.message) {
                errorMessage = err.error.message;
              }

              if (err.status === 404) {
                errorMessage = 'El endpoint de generación de reportes no está disponible. Por favor, verifica que el backend tenga implementado el endpoint POST /api/reportes/generar/excel';
              } else if (err.status === 400) {
                const validationErrors = err.validationErrors || err.error?.errors;
                if (validationErrors && typeof validationErrors === 'object') {
                  const flattened = Object.entries(validationErrors)
                    .map(([field, messages]) => {
                      const msgArray = Array.isArray(messages) ? messages : [messages];
                      return `${field}: ${msgArray.join(', ')}`;
                    })
                    .join('\n');
                  errorMessage = `Errores de validación:\n${flattened}`;
                }
              } else if (err.status === 500) {
                errorMessage = 'Error interno del servidor al generar el reporte. Por favor, intenta nuevamente más tarde.';
              }
              
              this.error.set(errorMessage);
            }
          });
          return;
        }

        // Si no es institucional, usar el método tradicional
        // Para nuevo reporte, siempre incluir dividirPorGenero para el consolidado
        
        // Generar nombre del reporte con el nuevo formato
        // Formato: "Reporte de [Código de actividad O Nombre de subActividad O Indicador O participaciones O evidencias] [fecha del reporte]"
        const nombreReporte = this.generarNombreReporte(formValue);
        
        // Verificar que descripcionImpacto se está capturando (para formato no institucional)
        const descripcionImpactoRaw = formValue.descripcionImpacto || '';
        const descripcionImpacto = descripcionImpactoRaw.trim() || undefined;
        
        console.log('🔍 [Formato no institucional] DescripcionImpacto del formulario (raw):', descripcionImpactoRaw);
        console.log('🔍 [Formato no institucional] DescripcionImpacto del formulario (trimmed):', descripcionImpacto);
        console.log('🔍 [Formato no institucional] DescripcionImpacto length (raw):', descripcionImpactoRaw.length);
        console.log('🔍 [Formato no institucional] DescripcionImpacto será enviado?', descripcionImpacto !== undefined);
        
        // Obtener actividades seleccionadas (puede ser array o single)
        const idActividades = formValue.idActividades && Array.isArray(formValue.idActividades) && formValue.idActividades.length > 0
          ? formValue.idActividades
          : (formValue.actividadId ? [formValue.actividadId] : undefined);
        
        const config: ReporteConfig = {
          tipoReporte: formValue.tipoReporte,
          actividadId: formValue.actividadId || undefined, // Mantener para compatibilidad
          idActividades: idActividades, // Array de actividades seleccionadas
          subactividadId: formValue.subactividadId || undefined,
          fechaInicio: fechaInicio || undefined, // Período del reporte - filtra actividades dentro de este rango
          fechaFin: fechaFin || undefined, // Período del reporte - filtra actividades dentro de este rango
          idDepartamento: formValue.idDepartamento || undefined,
          idDepartamentos: formValue.idDepartamentos || undefined, // Array de departamentos
          descripcionImpacto: descripcionImpacto, // Descripción del impacto
          formato: formValue.formato,
          incluirEvidencias: formValue.incluirEvidencias,
          incluirParticipaciones: formValue.incluirParticipaciones,
          incluirIndicadores: formValue.incluirIndicadores,
          dividirPorGenero: formValue.dividirPorGenero ?? true, // Por defecto true para consolidado (M y F)
          nombre: nombreReporte,
          rutaArchivo: formValue.rutaArchivo?.trim(),
          tipoArchivo: formValue.tipoArchivo || 'excel',
          parametrosJson: JSON.stringify({
            SinInstrucciones: true // Eliminar instrucciones del Excel
          })
        };

        // Usar el endpoint POST /api/Reportes/generar/excel que genera el Excel Y lo guarda en la BD
        this.reportesService.generarExcel(config).subscribe({
          next: (blob) => {
          console.log('✅ ReporteGenerarComponent - Reporte generado y guardado exitosamente, tamaño:', blob.size);
          
          // Verificar que el blob sea válido
          if (!blob || blob.size === 0) {
            this.error.set('El archivo generado está vacío o es inválido.');
            this.generando.set(false);
            return;
          }
          
          // Validar que el blob sea un archivo Excel válido
          // Los archivos .xlsx son archivos ZIP, deben empezar con "PK" (50 4B en hex)
          blob.slice(0, 4).arrayBuffer().then((buffer: ArrayBuffer) => {
            const bytes = new Uint8Array(buffer);
            const isValidExcel = bytes[0] === 0x50 && bytes[1] === 0x4B; // "PK" (ZIP signature)
            
            if (!isValidExcel) {
              console.error('❌ ReporteGenerarComponent - El archivo no es un Excel válido. Primeros bytes:', Array.from(bytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
              this.error.set('El archivo generado no es un Excel válido. Por favor, intenta nuevamente.');
              this.generando.set(false);
              return;
            }
            
            // Usar el blob directamente si ya tiene el tipo MIME correcto, o crear uno nuevo
            const excelBlob = blob.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
              ? blob 
              : new Blob([blob], {
                  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
            
            console.log('✅ ReporteGenerarComponent - Archivo Excel válido, descargando...');
            
            // Descargar el archivo Excel generado
            const url = window.URL.createObjectURL(excelBlob);
            const a = document.createElement('a');
            a.href = url;
            // Limpiar el nombre del archivo para que sea válido (sin caracteres especiales)
            // Usar el nombre del config que ya fue generado con la misma lógica del backend
            const nombreArchivoLimpio = config.nombre 
              ? config.nombre.replace(/[<>:"/\\|?*]/g, '_')
              : this.generarNombreReporte(formValue).replace(/[<>:"/\\|?*]/g, '_');
            a.download = `${nombreArchivoLimpio}.xlsx`;
            document.body.appendChild(a);
            a.click();
            
            // Limpiar después de un breve delay
            setTimeout(() => {
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            }, 100);
            
            this.generando.set(false);
            // Navegar a la lista de reportes (el reporte ya está guardado en la BD por el endpoint)
            this.router.navigate(['/reportes']);
          }).catch((error) => {
            console.error('❌ ReporteGenerarComponent - Error al validar el archivo:', error);
            this.error.set('Error al validar el archivo generado. Por favor, intenta nuevamente.');
            this.generando.set(false);
          });
        },
        error: (err: any) => {
          console.error('❌ ReporteGenerarComponent - Error generating reporte:', err);
          console.error('❌ Error status:', err.status);
          console.error('❌ Error message:', err.message);
          console.error('❌ Error details:', err.error);
          
          this.generando.set(false);
          
          let errorMessage = 'Error al generar el reporte';
          
          if (err.backendMessage) {
            errorMessage = err.backendMessage;
          }

          if (err.status === 404) {
            // Verificar si el error es sobre el endpoint de descarga o el de generación
            if (err.backendMessage && (err.backendMessage.includes('descargar') || err.backendMessage.includes('GET /api/Reportes/descargar'))) {
              // El reporte se generó pero no se puede descargar porque falta el endpoint
              errorMessage = err.message || 'El reporte se generó exitosamente y está guardado en la base de datos, pero el endpoint de descarga (GET /api/Reportes/descargar/{id}) no está disponible en el backend. Por favor, contacta al administrador del sistema.';
            } else {
              errorMessage = 'El endpoint de generación de reportes no está disponible. Por favor, verifica que el backend tenga implementado el endpoint POST /api/reportes/generar/excel';
            }
          } else if (err.status === 400) {
            const validationErrors = err.validationErrors || err.error?.errors;
            if (validationErrors && typeof validationErrors === 'object') {
              const flattened = Object.entries(validationErrors)
                .map(([field, messages]) => {
                  const msgArray = Array.isArray(messages) ? messages : [messages];
                  return `${field}: ${msgArray.join(', ')}`;
                })
                .join('\n');
              errorMessage = `Errores de validación:\n${flattened}`;
            } else {
              errorMessage = err.error?.message || err.error?.title || err.backendMessage || 'Los datos proporcionados no son válidos. Por favor, revisa el formulario.';
            }
          } else if (err.status === 500) {
            // Verificar si el error es específico sobre el endpoint de descarga
            if (err.backendMessage && err.backendMessage.includes('endpoint de descarga')) {
              errorMessage = err.backendMessage;
            } else {
              errorMessage = 'Error interno del servidor al generar el reporte. Por favor, intenta nuevamente más tarde.';
            }
          } else if (err.message) {
            errorMessage = err.message;
          }
          
          this.error.set(errorMessage);
        }
      });
      } catch (error: any) {
        console.error('❌ ReporteGenerarComponent - Error en onSubmit:', error);
        this.generando.set(false);
        this.error.set(error.message || 'Error al generar el reporte');
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  /**
   * Descarga un reporte por ID
   */
  private async descargarReportePorId(idReporte: number, nombreArchivo?: string): Promise<void> {
    try {
      const blob = await firstValueFrom(this.reportesService.descargar(idReporte));
      
      // Validar que sea un Excel válido
      if (blob.size < 4) {
        throw new Error('El archivo recibido es demasiado pequeño para ser un Excel válido');
      }

      const arrayBuffer = await blob.slice(0, 2).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
        throw new Error('El archivo recibido no es un Excel válido (firma ZIP incorrecta)');
      }

      // Descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo ? `${nombreArchivo}.xlsx` : `reporte-${idReporte}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log('✅ Reporte descargado exitosamente');
    } catch (error: any) {
      console.error('❌ Error al descargar reporte:', error);
      throw error;
    }
  }

  /**
   * Formatear fecha de YYYY-MM-DD a DD/MM/YYYY
   */
  /**
   * Genera el nombre del reporte con el formato: 
   * "Reporte de {identificador} {fecha}"
   * Sigue la misma lógica y prioridad que el backend
   */
  private generarNombreReporte(formValue: any): string {
    // Fecha en formato yyyy-MM-dd (igual que el backend)
    const fechaActual = new Date();
    const fechaFormateada = fechaActual.toISOString().split('T')[0]; // Formato: yyyy-MM-dd
    
    let identificador = '';
    
    // Prioridad 1: Código de la actividad (si hay ActividadId, busca CodigoActividad)
    if (formValue.actividadId) {
      const actividad = this.actividades().find(a => a.id === formValue.actividadId);
      if (actividad?.codigoActividad) {
        identificador = actividad.codigoActividad;
      }
    }
    
    // Prioridad 2: Indicador de la actividad (si no hay código pero hay indicador)
    // Usa el nombre o código del indicador
    if (!identificador && formValue.actividadId) {
      const actividad = this.actividades().find(a => a.id === formValue.actividadId);
      if (actividad) {
        // Primero intentar código del indicador
        if (actividad.codigoIndicador) {
          identificador = actividad.codigoIndicador;
        } else if (actividad.codigoIndicadorAsociado) {
          identificador = actividad.codigoIndicadorAsociado;
        }
        // Si no hay código, usar nombre del indicador
        else if (actividad.nombreIndicador) {
          identificador = actividad.nombreIndicador;
        } else if (actividad.nombreIndicadorAsociado) {
          identificador = actividad.nombreIndicadorAsociado;
        }
      }
    }
    
    // Prioridad 3: Nombre de subactividad (si hay SubactividadId)
    if (!identificador && formValue.subactividadId) {
      const subactividad = this.subactividades().find(s => s.idSubactividad === formValue.subactividadId);
      if (subactividad) {
        // Primero intentar código de subactividad
        if (subactividad.codigoSubactividad) {
          identificador = subactividad.codigoSubactividad;
        }
        // Si no hay código, usar nombre
        else if (subactividad.nombre) {
          identificador = subactividad.nombre;
        } else if (subactividad.nombreSubactividad) {
          identificador = subactividad.nombreSubactividad;
        }
      }
    }
    
    // Prioridad 4: Tipo de reporte (si el tipo contiene "participacion" o "evidencia")
    if (!identificador) {
      const tipoReporte = (formValue.tipoReporte || '').toLowerCase();
      if (tipoReporte.includes('participacion')) {
        identificador = 'participaciones';
      } else if (tipoReporte.includes('evidencia')) {
        identificador = 'evidencias';
      }
    }
    
    // Prioridad 5: Indicador genérico (si el tipo es "indicador" y hay actividad)
    if (!identificador && formValue.actividadId) {
      const tipoReporte = (formValue.tipoReporte || '').toLowerCase();
      if (tipoReporte.includes('indicador')) {
        const actividad = this.actividades().find(a => a.id === formValue.actividadId);
        if (actividad) {
          if (actividad.codigoIndicador) {
            identificador = actividad.codigoIndicador;
          } else if (actividad.nombreIndicador) {
            identificador = actividad.nombreIndicador;
          }
        }
      }
    }
    
    // Prioridad 6: Valor por defecto (usa el tipo de reporte o "Actividad" si no hay nada específico)
    if (!identificador) {
      const tipoReporte = formValue.tipoReporte || '';
      if (tipoReporte) {
        // Capitalizar primera letra del tipo de reporte
        identificador = tipoReporte.charAt(0).toUpperCase() + tipoReporte.slice(1);
      } else {
        identificador = 'Actividad';
      }
    }
    
    // Construir el nombre final: "Reporte de {identificador} {fecha}"
    const nombreFinal = `Reporte de ${identificador} ${fechaFormateada}`;
    
    console.log('🔍 Nombre del reporte generado:', nombreFinal);
    console.log('🔍 Identificador usado:', identificador);
    console.log('🔍 Fecha formateada:', fechaFormateada);
    
    return nombreFinal;
  }

  private formatearFecha(fecha: string): string {
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  }

  /**
   * Maneja la generación de extracción de datos
   * El backend genera columnas dinámicamente según los campos seleccionados por el usuario.
   * Si no hay campos seleccionados, el backend usa campos por defecto:
   * NombreEstudiante, TipoParticipante, NombreActividad, FechaRegistro
   */
  async generarExtraccionDatos(formValue: any): Promise<void> {
    const camposSeleccionados = formValue.camposSeleccionados || [];
    
    if (camposSeleccionados.length === 0) {
      this.error.set('Debe seleccionar al menos un campo para la extracción de datos.');
      this.generando.set(false);
      return;
    }
    
    try {
      // Generar nombre del reporte usando la misma lógica del backend
      // Si el usuario no ha modificado el nombre manualmente, generarlo automáticamente
      let nombreReporte = formValue.nombre?.trim();
      const nombreControl = this.form.get('nombre');
      
      if (!nombreReporte || (nombreControl && !nombreControl.dirty)) {
        // Usar la misma lógica de generación de nombre que el backend
        // Para extracción de datos, el tipo será "extraccion-datos"
        const formValueConTipo = { ...formValue, tipoReporte: 'extraccion-datos' };
        nombreReporte = this.generarNombreReporte(formValueConTipo);
      }
      
      // Configurar para extracción de datos
      // El backend usará CamposSeleccionados para generar las columnas dinámicamente
      const parametrosJson: any = {
        CamposSeleccionados: camposSeleccionados, // Campos seleccionados por el usuario - el backend generará columnas dinámicamente
        TipoOperacion: 'extraccion-datos',
        SinInstrucciones: true, // Eliminar instrucciones del Excel
        OmitirInstrucciones: true // Algunos backends usan este nombre
      };
      
      // Agregar filtros opcionales al ParametrosJson
      if (formValue.actividadId) {
        const actividadIdNum = typeof formValue.actividadId === 'string' ? parseInt(formValue.actividadId, 10) : Number(formValue.actividadId);
        if (!isNaN(actividadIdNum) && actividadIdNum > 0) {
          parametrosJson.ActividadId = actividadIdNum;
        }
      }
      
      if (formValue.fechaInicio) {
        parametrosJson.FechaInicio = formValue.fechaInicio;
      }
      
      if (formValue.fechaFin) {
        parametrosJson.FechaFin = formValue.fechaFin;
      }
      
      if (formValue.idDepartamentos && Array.isArray(formValue.idDepartamentos) && formValue.idDepartamentos.length > 0) {
        parametrosJson.IdDepartamentos = formValue.idDepartamentos;
      } else if (formValue.idDepartamento) {
        parametrosJson.IdDepartamento = formValue.idDepartamento;
      }
      
      const config: ReporteConfig = {
        tipoReporte: 'extraccion-datos',
        actividadId: formValue.actividadId || undefined,
        fechaInicio: formValue.fechaInicio || undefined,
        fechaFin: formValue.fechaFin || undefined,
        idDepartamento: formValue.idDepartamento || undefined,
        idDepartamentos: formValue.idDepartamentos || undefined,
        formato: 'excel',
        nombre: nombreReporte,
        rutaArchivo: formValue.rutaArchivo?.trim() || `reportes/extraccion-datos-${Date.now()}.xlsx`,
        tipoArchivo: 'excel',
        parametrosJson: JSON.stringify(parametrosJson)
      };
      
      console.log('🔍 Configuración de extracción de datos:', config);
      console.log('🔍 Campos seleccionados:', camposSeleccionados);
      console.log('🔍 ParametrosJson:', config.parametrosJson);
      
      this.reportesService.generarExcel(config).subscribe({
        next: (blob) => {
          console.log('✅ Extracción de datos generada exitosamente, tamaño:', blob.size);
          
          if (!blob || blob.size === 0) {
            this.error.set('El archivo generado está vacío o es inválido.');
            this.generando.set(false);
            return;
          }
          
          blob.slice(0, 4).arrayBuffer().then((buffer: ArrayBuffer) => {
            const bytes = new Uint8Array(buffer);
            const isValidExcel = bytes[0] === 0x50 && bytes[1] === 0x4B;
            
            if (!isValidExcel) {
              this.error.set('El archivo generado no es un Excel válido.');
              this.generando.set(false);
              return;
            }
            
            const excelBlob = blob.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
              ? blob 
              : new Blob([blob], {
                  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
            
            const url = window.URL.createObjectURL(excelBlob);
            const a = document.createElement('a');
            a.href = url;
            // Limpiar el nombre del archivo para que sea válido (sin caracteres especiales)
            const nombreArchivo = nombreReporte.replace(/[<>:"/\\|?*]/g, '_');
            a.download = `${nombreArchivo}.xlsx`;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            }, 100);
            
            this.generando.set(false);
            this.router.navigate(['/reportes']);
          }).catch((error) => {
            console.error('❌ Error al validar el archivo:', error);
            this.error.set('Error al validar el archivo generado.');
            this.generando.set(false);
          });
        },
        error: (err: any) => {
          console.error('❌ Error generando extracción de datos:', err);
          this.generando.set(false);
          
          let errorMessage = 'Error al generar la extracción de datos';
          if (err.backendMessage) {
            errorMessage = err.backendMessage;
          } else if (err.message) {
            errorMessage = err.message;
          } else if (err.error?.message) {
            errorMessage = err.error.message;
          }
          
          this.error.set(errorMessage);
        }
      });
    } catch (error: any) {
      console.error('❌ Error en generarExtraccionDatos:', error);
      this.generando.set(false);
      this.error.set(error.message || 'Error al generar la extracción de datos');
    }
  }
  
  /**
   * Toggle para seleccionar/deseleccionar campos de extracción
   */
  toggleCampoExtraccion(campoValue: string): void {
    const campos = this.camposExtraccion();
    const campo = campos.find(c => c.value === campoValue);
    if (campo) {
      campo.checked = !campo.checked;
      this.camposExtraccion.set([...campos]);
      
      // Actualizar el formulario
      const camposSeleccionados = campos.filter(c => c.checked).map(c => c.value);
      this.form.get('camposSeleccionados')?.setValue(camposSeleccionados);
      
      console.log('🔍 Campos seleccionados:', camposSeleccionados);
    }
  }
  
  /**
   * Seleccionar todos los campos de una categoría
   */
  seleccionarTodosCategoria(categoria: string): void {
    const campos = this.camposExtraccion();
    const camposCategoria = campos.filter(c => c.categoria === categoria);
    const todosSeleccionados = camposCategoria.every(c => c.checked);
    
    campos.forEach(campo => {
      if (campo.categoria === categoria) {
        campo.checked = !todosSeleccionados;
      }
    });
    
    this.camposExtraccion.set([...campos]);
    
    // Actualizar el formulario
    const camposSeleccionados = campos.filter(c => c.checked).map(c => c.value);
    this.form.get('camposSeleccionados')?.setValue(camposSeleccionados);
  }

  /**
   * Actualiza el nombre del archivo para extracción de datos cuando se selecciona una actividad
   */
  actualizarNombreArchivoExtraccion(): void {
    const actividadId = this.form.get('actividadId')?.value;
    const nombreControl = this.form.get('nombre');
    
    // Solo actualizar si el usuario no ha modificado manualmente el nombre
    if (actividadId && nombreControl && !nombreControl.dirty) {
      const actividad = this.actividades().find(a => a.id === actividadId);
      if (actividad) {
        const nombreReporte = `Extracción de datos de ${actividad.nombre}`;
        nombreControl.setValue(nombreReporte, { emitEvent: false });
      }
    }
  }

  /**
   * Actualiza el nombre del archivo para nuevo reporte cuando se selecciona una actividad
   */
  actualizarNombreArchivoReporte(): void {
    const tipoOperacion = this.form.get('tipoOperacion')?.value;
    const nombreControl = this.form.get('nombre');
    
    // Solo actualizar si es nuevo reporte y el usuario no ha modificado manualmente el nombre
    if (tipoOperacion === 'nuevo-reporte' && nombreControl) {
      // Si el campo no ha sido modificado por el usuario (no está dirty), actualizar automáticamente
      if (!nombreControl.dirty) {
        const formValue = this.form.value;
        const nombreReporte = this.generarNombreReporte(formValue);
        nombreControl.setValue(nombreReporte, { emitEvent: false });
      }
      // Si el usuario ya modificó el nombre manualmente, no sobrescribirlo
    }
  }

  /**
   * Maneja el cambio de actividad
   */
  onActividadChange(actividadId: number | string): void {
    const id = typeof actividadId === 'string' ? parseInt(actividadId) : actividadId;
    if (id && !isNaN(id)) {
      this.actualizarNombreArchivoReporte();
      this.cargarDepartamentosDeActividad(id);
      // Limpiar el filtro de búsqueda después de seleccionar una actividad
      this.filtroActividad.set('');
    } else {
      this.form.get('idDepartamentos')?.setValue([]);
    }
  }

  /**
   * Selecciona automáticamente todas las actividades que caen dentro del período definido
   * Si el usuario ya tenía actividades seleccionadas antes de poner el período, las mantiene
   */
  seleccionarActividadesPorPeriodo(): void {
    // Usar setTimeout para asegurar que el computed se actualice después del cambio del formulario
    setTimeout(() => {
      const fechaInicio = this.form.get('fechaInicio')?.value;
      const fechaFin = this.form.get('fechaFin')?.value;
      
      // Obtener actividades actualmente seleccionadas
      const actividadesSeleccionadasActuales = this.form.get('idActividades')?.value || [];
      const idsSeleccionadosActuales = new Set<number>(
        actividadesSeleccionadasActuales
          .map((id: any) => {
            const numId = Number(id);
            return isNaN(numId) || numId <= 0 ? null : numId;
          })
          .filter((id: number | null): id is number => id !== null)
      );
      
      // Si se limpiaron las fechas, mantener las selecciones manuales del usuario
      if (!fechaInicio && !fechaFin) {
        // No limpiar las selecciones - el usuario puede haber seleccionado actividades sin período
        return;
      }
      
      // Obtener IDs de actividades dentro del período
      const actividadesEnPeriodo = this.actividadesEnPeriodo();
      const idsEnPeriodo = actividadesEnPeriodo
        .map(actividad => {
          const id = Number(actividad.id || actividad.idActividad);
          return isNaN(id) || id <= 0 ? null : id;
        })
        .filter((id): id is number => id !== null);
      
      // Combinar: mantener selecciones actuales + agregar actividades del período
      const idsFinales = new Set<number>();
      
      // Agregar actividades ya seleccionadas
      idsSeleccionadosActuales.forEach(id => idsFinales.add(id));
      
      // Agregar todas las actividades dentro del período
      idsEnPeriodo.forEach(id => idsFinales.add(id));
      
      const idsFinalesArray = Array.from(idsFinales);
      
      // Actualizar solo si hay cambios
      if (idsFinalesArray.length !== actividadesSeleccionadasActuales.length ||
          !idsFinalesArray.every(id => idsSeleccionadosActuales.has(id))) {
        const idActividadesControl = this.form.get('idActividades');
        idActividadesControl?.setValue(idsFinalesArray, { emitEvent: false });
        idActividadesControl?.markAsTouched();
        idActividadesControl?.updateValueAndValidity();
        
        // Cargar departamentos automáticamente
        this.cargarDepartamentosDeActividades(idsFinalesArray);
        
        // Actualizar nombre del archivo
        this.actualizarNombreArchivoReporte();
        
        console.log(`✅ ${idsEnPeriodo.length} actividad(es) dentro del período agregada(s). Total seleccionadas: ${idsFinalesArray.length}`);
      }
    }, 0);
  }

  /**
   * Verifica si una actividad está seleccionada
   */
  estaActividadSeleccionada(actividadId: number | string): boolean {
    const id = Number(actividadId);
    const actividadesSeleccionadas = this.form.get('idActividades')?.value || [];
    return actividadesSeleccionadas.includes(id);
  }

  /**
   * Toggle para seleccionar/deseleccionar una actividad
   */
  toggleActividad(actividadId: number | string): void {
    const id = Number(actividadId);
    if (isNaN(id) || id <= 0) {
      return;
    }
    
    const actividadesSeleccionadas = this.form.get('idActividades')?.value || [];
    const index = actividadesSeleccionadas.indexOf(id);
    
    let nuevasSelecciones: number[];
    if (index >= 0) {
      // Deseleccionar
      nuevasSelecciones = actividadesSeleccionadas.filter((selectedId: number) => selectedId !== id);
    } else {
      // Seleccionar
      nuevasSelecciones = [...actividadesSeleccionadas, id];
    }
    
    // Actualizar el form control
    const idActividadesControl = this.form.get('idActividades');
    idActividadesControl?.setValue(nuevasSelecciones, { emitEvent: false });
    idActividadesControl?.markAsTouched();
    idActividadesControl?.updateValueAndValidity();
    
    // Cargar departamentos de las actividades seleccionadas
    if (nuevasSelecciones.length > 0) {
      this.cargarDepartamentosDeActividades(nuevasSelecciones);
      this.actualizarNombreArchivoReporte();
    } else {
      this.form.get('idDepartamentos')?.setValue([]);
    }
    
    console.log('✅ Actividades seleccionadas:', nuevasSelecciones);
  }

  /**
   * Maneja el cambio en la selección múltiple de actividades (legacy - para compatibilidad)
   */
  onActividadesChange(selectedOptions: HTMLCollectionOf<HTMLOptionElement>): void {
    const selectedIds: number[] = [];
    for (let i = 0; i < selectedOptions.length; i++) {
      const option = selectedOptions[i];
      const value = option.value;
      if (value) {
        const id = parseInt(value, 10);
        if (!isNaN(id) && id > 0) {
          selectedIds.push(id);
        }
      }
    }
    
    // Actualizar el form control
    this.form.get('idActividades')?.setValue(selectedIds, { emitEvent: false });
    
    // Cargar departamentos de las actividades seleccionadas
    if (selectedIds.length > 0) {
      this.cargarDepartamentosDeActividades(selectedIds);
      this.actualizarNombreArchivoReporte();
    } else {
      this.form.get('idDepartamentos')?.setValue([]);
    }
    
    // Limpiar el filtro de búsqueda
    this.filtroActividad.set('');
    
    console.log('✅ Actividades seleccionadas:', selectedIds);
  }

  /**
   * Obtiene un departamento por su ID
   */
  obtenerDepartamentoPorId(id: number): any | null {
    return this.departamentos().find(d => d.id === id) || null;
  }

  /**
   * Remueve un departamento de la selección
   */
  removerDepartamento(departamentoId: number): void {
    const departamentosActuales = this.form.get('idDepartamentos')?.value || [];
    const nuevosDepartamentos = departamentosActuales.filter((id: number) => id !== departamentoId);
    this.form.get('idDepartamentos')?.setValue(nuevosDepartamentos);
  }

  get tipoReporte() { return this.form.get('tipoReporte'); }
  get actividadId() { return this.form.get('actividadId'); }
  get subactividadId() { return this.form.get('subactividadId'); }
  get formato() { return this.form.get('formato'); }
  get fechaInicio() { return this.form.get('fechaInicio'); }
  get fechaFin() { return this.form.get('fechaFin'); }
  get idDepartamento() { return this.form.get('idDepartamento'); }
  get tipoOperacionControl() { return this.form.get('tipoOperacion'); }
}

