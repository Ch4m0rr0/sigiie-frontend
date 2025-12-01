import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EvidenciaService } from '../../core/services/evidencia.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { ActividadesService } from '../../core/services/actividades.service';
import type { EvidenciaCreate } from '../../core/models/evidencia';
import type { Subactividad } from '../../core/models/subactividad';
import type { TipoEvidencia } from '../../core/models/catalogos-nuevos';
import type { Actividad } from '../../core/models/actividad';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-evidencia-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './evidencia-form.component.html',
})
export class EvidenciaFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private evidenciaService = inject(EvidenciaService);
  private subactividadService = inject(SubactividadService);
  private catalogosService = inject(CatalogosService);
  private actividadesService = inject(ActividadesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  form!: FormGroup;
  subactividades = signal<Subactividad[]>([]);
  tiposEvidencia = signal<TipoEvidencia[]>([]);
  actividades = signal<Actividad[]>([]);
  isEditMode = signal(false);
  evidenciaId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | SafeUrl | null>(null);
  private objectUrl: string | null = null;

  ngOnInit(): void {
    this.initializeForm();
    this.loadSubactividades();
    this.loadTiposEvidencia();
    this.loadActividades();

    const id = this.route.snapshot.paramMap.get('id');
    const subactividadId = this.route.snapshot.queryParamMap.get('subactividadId');
    const actividadId = this.route.snapshot.queryParamMap.get('actividadId');
    
    if (id) {
      this.isEditMode.set(true);
      this.evidenciaId.set(+id);
      this.loadEvidencia(+id);
    } else if (subactividadId) {
      this.form.patchValue({ idSubactividad: +subactividadId });
    } else if (actividadId) {
      this.form.patchValue({ idActividad: +actividadId });
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      idProyecto: [null],
      idActividad: [null],
      idSubactividad: [null],
      idTipoEvidencia: ['', Validators.required],
      fechaEvidencia: [''],
      seleccionadaParaReporte: [false],
      descripcion: [''],
      tipo: ['']
    });
  }

  loadSubactividades(): void {
    this.subactividadService.getAll().subscribe({
      next: (data) => this.subactividades.set(data),
      error: (err) => console.error('Error loading subactividades:', err)
    });
  }

  loadTiposEvidencia(): void {
    this.catalogosService.getTiposEvidencia().subscribe({
      next: (data) => this.tiposEvidencia.set(data),
      error: (err) => console.error('Error loading tipos evidencia:', err)
    });
  }

  loadActividades(): void {
    this.actividadesService.list().subscribe({
      next: (data) => this.actividades.set(data),
      error: (err) => console.error('Error loading actividades:', err)
    });
  }

  loadEvidencia(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    
    // Limpiar URL anterior si existe
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    this.evidenciaService.getById(id).subscribe({
      next: (data) => {
        this.form.patchValue({
          idProyecto: data.idProyecto || null,
          idActividad: data.idActividad || null,
          idSubactividad: data.idSubactividad || null,
          idTipoEvidencia: data.idTipoEvidencia || '',
          fechaEvidencia: data.fechaEvidencia ? data.fechaEvidencia.split('T')[0] : '',
          seleccionadaParaReporte: data.seleccionadaParaReporte || false,
          descripcion: data.descripcion || '',
          tipo: data.tipo || ''
        });
        if (data.rutaArchivo && this.isImage(data.rutaArchivo)) {
          // Construir URL de la imagen basándose en rutaArchivo
          this.buildImageUrl(data.rutaArchivo, data.idEvidencia);
        } else {
          this.previewUrl.set(null);
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error loading evidencia:', err);
        this.error.set('Error al cargar la evidencia');
        this.loading.set(false);
      }
    });
  }

  buildImageUrl(rutaArchivo: string, idEvidencia: number): void {
    // Verificar si rutaArchivo es una URL completa
    if (this.isValidUrl(rutaArchivo)) {
      // Si es una URL completa, usarla directamente
      this.previewUrl.set(this.sanitizer.bypassSecurityTrustUrl(rutaArchivo));
      this.loading.set(false);
      return;
    }

    // Si no es una URL completa, construir URLs posibles
    const baseUrl = this.evidenciaService.getBaseUrl();
    let imageUrl: string;

    // Opción 1: Si rutaArchivo comienza con /, usar directamente con baseUrl
    if (rutaArchivo.startsWith('/')) {
      imageUrl = `${baseUrl}${rutaArchivo}`;
    }
    // Opción 2: Si rutaArchivo parece ser una ruta relativa, construir URL completa
    else if (rutaArchivo.includes('/') || rutaArchivo.includes('\\')) {
      // Es una ruta con directorios
      const normalizedPath = rutaArchivo.replace(/\\/g, '/');
      imageUrl = `${baseUrl}/${normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath}`;
    }
    // Opción 3: Si solo es el nombre del archivo, intentar con diferentes rutas comunes
    else {
      // Solo el nombre del archivo, intentar rutas comunes
      imageUrl = `${baseUrl}/uploads/evidencias/${rutaArchivo}`;
    }

    // Establecer la URL construida
    this.previewUrl.set(this.sanitizer.bypassSecurityTrustUrl(imageUrl));
    this.loading.set(false);
  }

  isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  ngOnDestroy(): void {
    // Limpiar object URL cuando el componente se destruya
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  isImage(rutaArchivo?: string): boolean {
    if (!rutaArchivo) return false;
    const extension = rutaArchivo.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFile.set(file);

      // Crear preview si es imagen
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            // Usar string directamente para la vista previa de archivos seleccionados
            // Esto sobrescribe cualquier previewUrl anterior (incluyendo SafeUrl de evidencias existentes)
            this.previewUrl.set(result);
          }
        };
        reader.onerror = () => {
          console.error('Error al leer el archivo');
          this.previewUrl.set(null);
        };
        reader.readAsDataURL(file);
      } else {
        // Si no es imagen, limpiar la vista previa pero mantener el archivo seleccionado
        this.previewUrl.set(null);
      }
    } else {
      // Si no hay archivo seleccionado, limpiar el archivo seleccionado
      this.selectedFile.set(null);
      // Si estamos en modo edición, mantener la vista previa de la imagen existente
      // Si no, limpiar la vista previa
      if (!this.isEditMode() || !this.evidenciaId()) {
        this.previewUrl.set(null);
      }
    }
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      // Normalizar y validar idTipoEvidencia como número
      const rawTipo = this.form.value.idTipoEvidencia;
      const idTipoEvidencia =
        rawTipo === '' || rawTipo === null || rawTipo === undefined
          ? undefined
          : Number(rawTipo);

      if (idTipoEvidencia === undefined || Number.isNaN(idTipoEvidencia)) {
        this.loading.set(false);
        this.error.set('Debe seleccionar un tipo de evidencia válido.');
        this.form.get('idTipoEvidencia')?.markAsTouched();
        return;
      }

      const data: EvidenciaCreate = {
        idProyecto: this.form.value.idProyecto || undefined,
        idActividad: this.form.value.idActividad || undefined,
        idSubactividad: this.form.value.idSubactividad || undefined,
        idTipoEvidencia,
        fechaEvidencia: this.form.value.fechaEvidencia || undefined,
        seleccionadaParaReporte: this.form.value.seleccionadaParaReporte || false,
        descripcion: this.form.value.descripcion || undefined,
        tipo: this.form.value.tipo || undefined
      };

      const file = this.selectedFile();
      
      if (this.isEditMode()) {
        // Modo edición: usar update (PUT) con o sin archivo
        this.evidenciaService.update(this.evidenciaId()!, data, file || undefined).subscribe({
          next: () => {
            this.router.navigate(['/evidencias']);
          },
          error: (err: any) => {
            console.error('Error saving evidencia:', err);
            const errorMessage = err.error?.message || 'Error al guardar la evidencia';
            this.error.set(errorMessage);
            this.loading.set(false);
          }
        });
      } else {
        // Modo creación: requiere archivo
        if (!file) {
          this.error.set('Debe seleccionar un archivo para guardar la evidencia');
          this.loading.set(false);
          return;
        }
        
        // Crear nueva evidencia con archivo
        this.evidenciaService.upload(file, data).subscribe({
          next: () => {
            this.router.navigate(['/evidencias']);
          },
          error: (err: any) => {
            console.error('Error saving evidencia:', err);
            const errorMessage = err.error?.message || 'Error al guardar la evidencia';
            this.error.set(errorMessage);
            this.loading.set(false);
          }
        });
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  get idTipoEvidencia() { return this.form.get('idTipoEvidencia'); }

  getPreviewUrl(): string | SafeUrl | null {
    return this.previewUrl();
  }
}

