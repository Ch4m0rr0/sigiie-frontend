import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { ReportesService, ReporteConfig } from '../../core/services/reportes.service';
import { PlanificacionService } from '../../core/services/planificacion.service';
import { ActividadesService } from '../../core/services/actividades.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import type { Planificacion } from '../../core/models/planificacion';
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
  private planificacionService = inject(PlanificacionService);
  private actividadesService = inject(ActividadesService);
  private subactividadService = inject(SubactividadService);
  private router = inject(Router);

  form!: FormGroup;
  planificaciones = signal<Planificacion[]>([]);
  actividades = signal<Actividad[]>([]);
  subactividades = signal<Subactividad[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  generando = signal(false);

  tiposReporte = [
    { value: 'planificacion', label: 'Reporte de Planificación' },
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
    this.loadPlanificaciones();
    this.loadActividades();
    this.loadSubactividades();

    // Observar cambios en tipoReporte para mostrar/ocultar campos
    this.form.get('tipoReporte')?.valueChanges.subscribe(tipo => {
      this.updateFormFields(tipo);
      this.setDefaultMetadata(tipo);
    });

    // Inicializar valores por defecto
    const initialType = this.form.get('tipoReporte')?.value || 'general';
    this.setDefaultMetadata(initialType);
  }

  initializeForm(): void {
    this.form = this.fb.group({
      tipoReporte: ['', Validators.required],
      planificacionId: [null],
      actividadId: [null],
      subactividadId: [null],
      fechaInicio: [''],
      fechaFin: [''],
      formato: ['excel', Validators.required],
      incluirEvidencias: [true],
      incluirParticipaciones: [true],
      incluirIndicadores: [true],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      rutaArchivo: ['', Validators.required],
      tipoArchivo: ['excel', Validators.required]
    });
  }

  updateFormFields(tipoReporte: string): void {
    const planificacionControl = this.form.get('planificacionId');
    const actividadControl = this.form.get('actividadId');
    const subactividadControl = this.form.get('subactividadId');

    // Limpiar validadores
    planificacionControl?.clearValidators();
    actividadControl?.clearValidators();
    subactividadControl?.clearValidators();

    // Aplicar validadores según el tipo
    switch (tipoReporte) {
      case 'planificacion':
        planificacionControl?.setValidators(Validators.required);
        break;
      case 'actividad':
        actividadControl?.setValidators(Validators.required);
        break;
      case 'subactividad':
        subactividadControl?.setValidators(Validators.required);
        break;
    }

    planificacionControl?.updateValueAndValidity();
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

  loadPlanificaciones(): void {
    this.planificacionService.getAll().subscribe({
      next: (data) => this.planificaciones.set(data),
      error: (err) => console.error('Error loading planificaciones:', err)
    });
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

  onSubmit(): void {
    if (this.form.valid) {
      this.generando.set(true);
      this.error.set(null);

      const config: ReporteConfig = {
        tipoReporte: this.form.value.tipoReporte,
        planificacionId: this.form.value.planificacionId || undefined,
        actividadId: this.form.value.actividadId || undefined,
        subactividadId: this.form.value.subactividadId || undefined,
        fechaInicio: this.form.value.fechaInicio || undefined,
        fechaFin: this.form.value.fechaFin || undefined,
        formato: this.form.value.formato,
        incluirEvidencias: this.form.value.incluirEvidencias,
        incluirParticipaciones: this.form.value.incluirParticipaciones,
        incluirIndicadores: this.form.value.incluirIndicadores,
        nombre: this.form.value.nombre?.trim(),
        rutaArchivo: this.form.value.rutaArchivo?.trim(),
        tipoArchivo: this.form.value.tipoArchivo || 'excel'
      };

      // Determinar qué método de exportación usar basado en el tipo de reporte
      const tipoReporte = (config.tipoReporte || '').toLowerCase();
      let exportObservable: Observable<Blob>;
      
      if (tipoReporte.includes('participacion') || tipoReporte.includes('participaciones')) {
        exportObservable = this.reportesService.exportarExcelParticipaciones(config);
      } else if (tipoReporte.includes('todo') || tipoReporte === 'completo') {
        exportObservable = this.reportesService.exportarExcelTodo(config);
      } else {
        // Por defecto, exportar actividades
        exportObservable = this.reportesService.exportarExcelActividades(config);
      }
      
      exportObservable.subscribe({
        next: (blob) => {
          console.log('✅ ReporteGenerarComponent - Reporte generado exitosamente, tamaño:', blob.size);
          this.generando.set(false);
          
          // Verificar que el blob sea válido
          if (!blob || blob.size === 0) {
            this.error.set('El archivo generado está vacío o es inválido.');
            return;
          }
          
          // Crear un nuevo Blob con el tipo MIME correcto para Excel
          const excelBlob = new Blob([blob], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
          
          // Descargar el archivo Excel generado
          const url = window.URL.createObjectURL(excelBlob);
          const a = document.createElement('a');
          a.href = url;
          const fecha = new Date().toISOString().split('T')[0];
          const nombreArchivo = `reporte-${config.tipoReporte || 'exportacion'}-${fecha}.xlsx`;
          a.download = nombreArchivo;
          document.body.appendChild(a);
          a.click();
          
          // Limpiar después de un breve delay
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 100);
          
          // Navegar a la lista de reportes
          this.router.navigate(['/reportes']);
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
            } else {
              errorMessage = err.error?.message || err.error?.title || err.backendMessage || 'Los datos proporcionados no son válidos. Por favor, revisa el formulario.';
            }
          } else if (err.status === 500) {
            errorMessage = 'Error interno del servidor al generar el reporte. Por favor, intenta nuevamente más tarde.';
          } else if (err.message) {
            errorMessage = err.message;
          }
          
          this.error.set(errorMessage);
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  get tipoReporte() { return this.form.get('tipoReporte'); }
  get planificacionId() { return this.form.get('planificacionId'); }
  get actividadId() { return this.form.get('actividadId'); }
  get subactividadId() { return this.form.get('subactividadId'); }
  get formato() { return this.form.get('formato'); }
}

