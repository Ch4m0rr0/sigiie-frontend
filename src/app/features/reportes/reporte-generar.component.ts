import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { ReportesService, ReporteConfig } from '../../core/services/reportes.service';
import { ActividadesService } from '../../core/services/actividades.service';
import { SubactividadService } from '../../core/services/subactividad.service';
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
  private router = inject(Router);

  form!: FormGroup;
  actividades = signal<Actividad[]>([]);
  subactividades = signal<Subactividad[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  generando = signal(false);

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
      actividadId: [null],
      subactividadId: [null],
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
    }

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

  onSubmit(): void {
    if (this.form.valid) {
      this.generando.set(true);
      this.error.set(null);

      const config: ReporteConfig = {
        tipoReporte: this.form.value.tipoReporte,
        actividadId: this.form.value.actividadId || undefined,
        subactividadId: this.form.value.subactividadId || undefined,
        formato: this.form.value.formato,
        incluirEvidencias: this.form.value.incluirEvidencias,
        incluirParticipaciones: this.form.value.incluirParticipaciones,
        incluirIndicadores: this.form.value.incluirIndicadores,
        nombre: this.form.value.nombre?.trim(),
        rutaArchivo: this.form.value.rutaArchivo?.trim(),
        tipoArchivo: this.form.value.tipoArchivo || 'excel'
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
            const nombreArchivo = config.nombre 
              ? `${config.nombre}.xlsx` 
              : `reporte-${config.tipoReporte || 'exportacion'}-${fecha}.xlsx`;
            a.download = nombreArchivo;
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
            if (err.backendMessage && (err.backendMessage.includes('endpoint de descarga') || err.backendMessage.includes('devuelve información del reporte'))) {
              // El reporte se generó pero el endpoint de descarga no funciona correctamente
              errorMessage = `El reporte se generó exitosamente pero no se pudo descargar.\n\n` +
                           `Problema: El backend está devolviendo información del reporte en lugar del archivo Excel.\n\n` +
                           `Solución: El endpoint GET /api/Reportes/descargar/{id} debe devolver el archivo binario Excel ` +
                           `con Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\n\n` +
                           (err.rutaArchivo ? `Ruta del archivo en el servidor: ${err.rutaArchivo}\n\n` : '') +
                           `Por favor, contacta al administrador del sistema para corregir el endpoint de descarga.`;
            } else if (err.message && err.message.includes('se generó exitosamente')) {
              errorMessage = err.message;
            } else {
              errorMessage = 'Error interno del servidor al generar el reporte. Por favor, intenta nuevamente más tarde.';
            }
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
  get actividadId() { return this.form.get('actividadId'); }
  get subactividadId() { return this.form.get('subactividadId'); }
  get formato() { return this.form.get('formato'); }
}

