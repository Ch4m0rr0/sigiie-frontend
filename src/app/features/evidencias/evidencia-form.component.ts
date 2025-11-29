import { Component, inject, OnInit, signal } from '@angular/core';
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
import { environment } from '../../../environments/environment';

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
export class EvidenciaFormComponent implements OnInit {
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
        if (data.rutaArchivo) {
          // El backend devuelve una ruta relativa como "/storage/evidencias/archivo.ext"
          // Necesitamos usar la URL completa del backend porque el proxy solo maneja /api
          const backendBase = this.getBackendBaseUrl();
          const url = `${backendBase}${data.rutaArchivo}`;
          this.previewUrl.set(this.sanitizer.bypassSecurityTrustUrl(url));
        } else {
          this.previewUrl.set(null);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading evidencia:', err);
        this.error.set('Error al cargar la evidencia');
        this.loading.set(false);
      }
    });
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
          this.previewUrl.set(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
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
      
      if (file) {
        // Upload con archivo
        this.evidenciaService.upload(file, data).subscribe({
          next: () => {
            this.router.navigate(['/evidencias']);
          },
          error: (err) => {
            console.error('Error saving evidencia:', err);
            this.error.set('Error al guardar la evidencia');
            this.loading.set(false);
          }
        });
      } else {
        // Sin archivo
        if (!this.isEditMode()) {
          // El backend requiere al menos un archivo para crear evidencia nueva
          this.error.set('Debe seleccionar un archivo para guardar la evidencia');
          this.loading.set(false);
          return;
        }

        // Sin archivo en modo edición: solo actualizar metadatos
        if (this.isEditMode()) {
          this.evidenciaService.update(this.evidenciaId()!, data).subscribe({
            next: () => {
              this.router.navigate(['/evidencias']);
            },
            error: (err: any) => {
              console.error('Error saving evidencia:', err);
              this.error.set('Error al guardar la evidencia');
              this.loading.set(false);
            }
          });
        } else {
          this.evidenciaService.create(data).subscribe({
            next: () => {
              this.router.navigate(['/evidencias']);
            },
            error: (err: any) => {
              console.error('Error saving evidencia:', err);
              this.error.set('Error al guardar la evidencia');
              this.loading.set(false);
            }
          });
        }
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  get idTipoEvidencia() { return this.form.get('idTipoEvidencia'); }

  /**
   * Obtiene la URL base del backend desde environment.apiUrl
   * Si apiUrl es absoluta (https://...), extrae la base URL
   * Si apiUrl es relativa (/api), usa window.location.origin
   */
  private getBackendBaseUrl(): string {
    const apiUrl = environment.apiUrl;
    // Si apiUrl es absoluta (contiene http:// o https://), extraer la base URL
    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
      try {
        const url = new URL(apiUrl);
        return `${url.protocol}//${url.host}`;
      } catch {
        // Si falla el parsing, usar window.location.origin como fallback
        return window.location.origin;
      }
    }
    // Si apiUrl es relativa, usar window.location.origin
    return window.location.origin;
  }
}

