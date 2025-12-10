import { Component, inject, OnInit, signal } from '@angular/core';
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
  
  // Campos disponibles para extracción de datos
  // Los valores deben coincidir con los nombres de campos que el backend espera
  camposExtraccion = signal([
    { value: 'NombreEstudiante', label: 'Nombre de estudiantes', checked: false },
    { value: 'Sexo', label: 'Sexo', checked: false },
    { value: 'NombreActividad', label: 'Actividades', checked: false },
    { value: 'LugarDesarrollo', label: 'Lugar de la actividad', checked: false },
    { value: 'FechaActividad', label: 'Fecha de realización', checked: false },
    { value: 'FechaFinalizacion', label: 'Fecha de finalización', checked: false },
    { value: 'idModalidad', label: 'Modalidad', checked: false },
    { value: 'TipoParticipante', label: 'Tipo de participante', checked: false },
    { value: 'idCarrera', label: 'Carrera', checked: false },
    { value: 'idIndicador', label: 'Indicador asignado a esa actividad', checked: false }
  ]);

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

    // Observar cambios en fechas para detectar reporte institucional
    this.form.get('fechaInicio')?.valueChanges.subscribe(() => {
      this.actualizarEsReporteInstitucional();
    });
    this.form.get('fechaFin')?.valueChanges.subscribe(() => {
      this.actualizarEsReporteInstitucional();
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
      actividadId: [null],
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
    const subactividadControl = this.form.get('subactividadId');

    // Limpiar validadores
    actividadControl?.clearValidators();
    subactividadControl?.clearValidators();

    // Aplicar validadores según el tipo
    switch (tipoReporte) {
      case 'actividad':
        actividadControl?.setValidators(Validators.required);
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
          
          // Obtener el nombre de la actividad si se seleccionó una
          let nombreActividad = '';
          if (formValue.actividadId) {
            const actividad = this.actividades().find(a => a.id === formValue.actividadId);
            nombreActividad = actividad?.nombre || '';
          }
          
        // Construir el nombre del reporte con el nombre de la actividad
        // Formato: "Reporte de * nombre de actividad"
        let nombreReporte = formValue.nombre?.trim();
        if (!nombreReporte) {
          if (nombreActividad) {
            nombreReporte = `Reporte de ${nombreActividad}`;
          } else {
            nombreReporte = `Reporte Institucional ${this.formatearFecha(fechaInicio)} - ${this.formatearFecha(fechaFin)}`;
          }
        } else if (nombreActividad && !nombreReporte.includes(nombreActividad)) {
          // Si el usuario ingresó un nombre pero hay actividad, usar el formato con actividad
          nombreReporte = `Reporte de ${nombreActividad}`;
        } else if (!nombreActividad) {
          // Si no hay actividad pero el usuario ingresó un nombre, mantenerlo
          nombreReporte = formValue.nombre?.trim();
        }

          const config: ReporteConfig = {
            tipoReporte: formValue.tipoReporte || 'actividad', // Importante: debe contener "actividad"
            actividadId: formValue.actividadId || undefined,
            subactividadId: formValue.subactividadId || undefined,
            fechaInicio: fechaInicio,
            fechaFin: fechaFin,
            idDepartamento: formValue.idDepartamento || undefined,
            idDepartamentos: formValue.idDepartamentos || undefined, // Array de departamentos
            descripcionImpacto: formValue.descripcionImpacto || undefined,
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
        
        // Obtener el nombre de la actividad si se seleccionó una
        let nombreActividad = '';
        if (formValue.actividadId) {
          const actividad = this.actividades().find(a => a.id === formValue.actividadId);
          nombreActividad = actividad?.nombre || '';
        }
        
        // Construir el nombre del reporte con el nombre de la actividad
        // Formato: "Reporte de * nombre de actividad"
        let nombreReporte = formValue.nombre?.trim();
        if (!nombreReporte) {
          if (nombreActividad) {
            nombreReporte = `Reporte de ${nombreActividad}`;
          } else {
            nombreReporte = this.generarNombreDefault(formValue.tipoReporte || 'general');
          }
        } else if (nombreActividad && !nombreReporte.includes(nombreActividad)) {
          // Si el usuario ingresó un nombre pero hay actividad, usar el formato con actividad
          nombreReporte = `Reporte de ${nombreActividad}`;
        } else if (!nombreActividad) {
          // Si no hay actividad pero el usuario ingresó un nombre, mantenerlo
          nombreReporte = formValue.nombre?.trim();
        }
        
        const config: ReporteConfig = {
          tipoReporte: formValue.tipoReporte,
          actividadId: formValue.actividadId || undefined,
          subactividadId: formValue.subactividadId || undefined,
          fechaInicio: fechaInicio || undefined, // Para filtrar actividades por período
          fechaFin: fechaFin || undefined, // Para filtrar actividades por período
          idDepartamento: formValue.idDepartamento || undefined,
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
            const fecha = new Date().toISOString().split('T')[0];
            // Limpiar el nombre del archivo para que sea válido (sin caracteres especiales)
            const nombreArchivoLimpio = config.nombre 
              ? config.nombre.replace(/[<>:"/\\|?*]/g, '_')
              : `reporte-${config.tipoReporte || 'exportacion'}-${fecha}`;
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
      // Obtener el nombre de la actividad si se seleccionó una
      let nombreActividad = '';
      if (formValue.actividadId) {
        const actividad = this.actividades().find(a => a.id === formValue.actividadId);
        nombreActividad = actividad?.nombre || '';
      }
      
      // Construir el nombre del reporte con el nombre de la actividad
      // Formato: "Extracción de datos de + nombre de actividad"
      let nombreReporte = formValue.nombre?.trim();
      if (!nombreReporte) {
        if (nombreActividad) {
          nombreReporte = `Extracción de datos de ${nombreActividad}`;
        } else {
          nombreReporte = `Extracción de Datos ${new Date().toISOString().split('T')[0]}`;
        }
      } else if (nombreActividad && !nombreReporte.includes(nombreActividad)) {
        // Si el usuario ingresó un nombre pero hay actividad, usar el formato con actividad
        nombreReporte = `Extracción de datos de ${nombreActividad}`;
      } else if (!nombreActividad) {
        // Si no hay actividad pero el usuario ingresó un nombre, mantenerlo
        nombreReporte = formValue.nombre?.trim();
      }
      
      // Configurar para extracción de datos
      // El backend usará CamposSeleccionados para generar las columnas dinámicamente
      const config: ReporteConfig = {
        tipoReporte: 'extraccion-datos',
        actividadId: formValue.actividadId || undefined,
        fechaInicio: formValue.fechaInicio || undefined,
        fechaFin: formValue.fechaFin || undefined,
        idDepartamento: formValue.idDepartamento || undefined,
        formato: 'excel',
        nombre: nombreReporte,
        rutaArchivo: formValue.rutaArchivo?.trim() || `reportes/extraccion-datos-${Date.now()}.xlsx`,
        tipoArchivo: 'excel',
        parametrosJson: JSON.stringify({
          CamposSeleccionados: camposSeleccionados, // Campos seleccionados por el usuario - el backend generará columnas dinámicamente
          TipoOperacion: 'extraccion-datos',
          SinInstrucciones: true, // Eliminar instrucciones del Excel
          OmitirInstrucciones: true // Algunos backends usan este nombre
        })
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
    }
  }

  /**
   * Actualiza el nombre del archivo para extracción de datos cuando se selecciona una actividad
   */
  actualizarNombreArchivoExtraccion(): void {
    const actividadId = this.form.get('actividadId')?.value;
    if (actividadId) {
      const actividad = this.actividades().find(a => a.id === actividadId);
      if (actividad) {
        const nombreReporte = `Extracción de datos de ${actividad.nombre}`;
        this.form.get('nombre')?.setValue(nombreReporte, { emitEvent: false });
      }
    }
  }

  /**
   * Actualiza el nombre del archivo para nuevo reporte cuando se selecciona una actividad
   */
  actualizarNombreArchivoReporte(): void {
    const actividadId = this.form.get('actividadId')?.value;
    const tipoOperacion = this.form.get('tipoOperacion')?.value;
    
    // Solo actualizar si es nuevo reporte
    if (tipoOperacion === 'nuevo-reporte' && actividadId) {
      const actividad = this.actividades().find(a => a.id === actividadId);
      if (actividad) {
        const nombreReporte = `Reporte de ${actividad.nombre}`;
        this.form.get('nombre')?.setValue(nombreReporte, { emitEvent: false });
      }
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
    } else {
      this.form.get('idDepartamentos')?.setValue([]);
    }
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

