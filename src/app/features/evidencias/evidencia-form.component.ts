import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EvidenciaService } from '../../core/services/evidencia.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { ActividadesService } from '../../core/services/actividades.service';
import { ImageStorageService } from '../../core/services/image-storage.service';
import type { EvidenciaCreate } from '../../core/models/evidencia';
import type { Subactividad } from '../../core/models/subactividad';
import type { TipoEvidencia } from '../../core/models/catalogos-nuevos';
import type { Actividad } from '../../core/models/actividad';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';
import { MultiSelectDropdownComponent } from '../../shared/multi-select-dropdown/multi-select-dropdown.component';

@Component({
  standalone: true,
  selector: 'app-evidencia-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports,
    MultiSelectDropdownComponent
  ],
  templateUrl: './evidencia-form.component.html',
})
export class EvidenciaFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private evidenciaService = inject(EvidenciaService);
  private subactividadService = inject(SubactividadService);
  private catalogosService = inject(CatalogosService);
  private actividadesService = inject(ActividadesService);
  private imageStorageService = inject(ImageStorageService);
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
  selectedFiles = signal<File[]>([]);
  previewUrls = signal<string[]>([]);
  currentImageIndex = signal<number>(0);
  private objectUrls: string[] = [];

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

  selectedTiposEvidencia = signal<number[]>([]);

  initializeForm(): void {
    this.form = this.fb.group({
      idProyecto: [null],
      idActividad: [null],
      idSubactividad: [null],
      idTipoEvidencia: [null], // Ya no se usa directamente, se maneja con selectedTiposEvidencia
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
    
    // Limpiar URLs anteriores
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
    this.objectUrls = [];

    this.evidenciaService.getById(id).subscribe({
      next: async (data) => {
        this.form.patchValue({
          idProyecto: data.idProyecto || null,
          idActividad: data.idActividad || null,
          idSubactividad: data.idSubactividad || null,
          idTipoEvidencia: null, // Ya no se usa directamente
          fechaEvidencia: data.fechaEvidencia ? data.fechaEvidencia.split('T')[0] : '',
          seleccionadaParaReporte: data.seleccionadaParaReporte || false,
          descripcion: data.descripcion || '',
          tipo: data.tipo || ''
        });
        
        // Cargar el tipo de evidencia existente en el selector múltiple
        if (data.idTipoEvidencia) {
          this.selectedTiposEvidencia.set([data.idTipoEvidencia]);
        } else {
          this.selectedTiposEvidencia.set([]);
        }
        
        // Cargar todas las imágenes desde almacenamiento local del frontend (IndexedDB)
        const storedImages = await this.imageStorageService.getAllImages(data.idEvidencia);
        if (storedImages.length > 0) {
          this.previewUrls.set(storedImages);
          this.currentImageIndex.set(0);
        } else {
          this.previewUrls.set([]);
          this.currentImageIndex.set(0);
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

  ngOnDestroy(): void {
    // Limpiar object URLs cuando el componente se destruya
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
    this.objectUrls = [];
  }

  isImage(rutaArchivo?: string): boolean {
    if (!rutaArchivo) return false;
    const extension = rutaArchivo.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files).filter(file => file.type.startsWith('image/'));
      
      if (files.length === 0) {
        this.error.set('Por favor seleccione al menos una imagen');
        return;
      }

      // Agregar los nuevos archivos a la lista existente
      const currentFiles = this.selectedFiles();
      const newFiles = [...currentFiles, ...files];
      this.selectedFiles.set(newFiles);

      // Leer todas las imágenes y crear previews
      const newPreviews: string[] = [];
      let loadedCount = 0;

      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            newPreviews.push(result);
            loadedCount++;
            
            // Cuando todas las imágenes estén cargadas, actualizar los previews
            if (loadedCount === files.length) {
              const currentPreviews = this.previewUrls();
              this.previewUrls.set([...currentPreviews, ...newPreviews]);
              // Si es la primera imagen, mostrar la primera
              if (this.previewUrls().length === newPreviews.length) {
                this.currentImageIndex.set(0);
              }
            }
          }
        };
        reader.onerror = () => {
          console.error('Error al leer el archivo:', file.name);
        };
        reader.readAsDataURL(file);
      });
    } else {
      // Si no hay archivos seleccionados y estamos en modo edición, cargar desde almacenamiento
      if (this.isEditMode() && this.evidenciaId()) {
        this.loadStoredImages(this.evidenciaId()!);
      } else {
        this.selectedFiles.set([]);
        this.previewUrls.set([]);
        this.currentImageIndex.set(0);
      }
    }
  }

  private async loadStoredImages(evidenciaId: number): Promise<void> {
    const storedImages = await this.imageStorageService.getAllImages(evidenciaId);
    if (storedImages.length > 0) {
      this.previewUrls.set(storedImages);
      this.currentImageIndex.set(0);
    } else {
      this.previewUrls.set([]);
      this.currentImageIndex.set(0);
    }
  }

  removeImage(index: number): void {
    const files = this.selectedFiles();
    const previews = this.previewUrls();
    
    // Si estamos en modo edición, solo podemos remover imágenes que aún no se han guardado
    // Por simplicidad, permitimos remover cualquier imagen
    files.splice(index, 1);
    previews.splice(index, 1);
    
    this.selectedFiles.set([...files]);
    this.previewUrls.set([...previews]);
    
    // Ajustar el índice actual si es necesario
    if (this.currentImageIndex() >= previews.length) {
      this.currentImageIndex.set(Math.max(0, previews.length - 1));
    }
  }

  previousImage(): void {
    const currentIndex = this.currentImageIndex();
    if (currentIndex > 0) {
      this.currentImageIndex.set(currentIndex - 1);
    }
  }

  nextImage(): void {
    const currentIndex = this.currentImageIndex();
    const totalImages = this.previewUrls().length;
    if (currentIndex < totalImages - 1) {
      this.currentImageIndex.set(currentIndex + 1);
    }
  }

  getCurrentPreviewUrl(): string | null {
    const previews = this.previewUrls();
    const index = this.currentImageIndex();
    return previews[index] || null;
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      // Validar que se haya seleccionado al menos un tipo de evidencia
      const tiposSeleccionados = this.selectedTiposEvidencia();
      if (tiposSeleccionados.length === 0) {
        this.loading.set(false);
        this.error.set('Debe seleccionar al menos un tipo de evidencia.');
        return;
      }

      const files = this.selectedFiles();
      
      // Preparar datos base (sin idTipoEvidencia, se agregará por cada tipo)
      const baseData: Omit<EvidenciaCreate, 'idTipoEvidencia'> = {
        idProyecto: this.form.value.idProyecto || undefined,
        idActividad: this.form.value.idActividad || undefined,
        idSubactividad: this.form.value.idSubactividad || undefined,
        fechaEvidencia: this.form.value.fechaEvidencia || undefined,
        seleccionadaParaReporte: this.form.value.seleccionadaParaReporte || false,
        descripcion: this.form.value.descripcion || undefined,
        tipo: this.form.value.tipo || undefined
      };

      if (this.isEditMode()) {
        // Modo edición: solo actualizar con el primer tipo seleccionado
        // (el backend no soporta múltiples tipos en una sola evidencia)
        const data: EvidenciaCreate = {
          ...baseData,
          idTipoEvidencia: tiposSeleccionados[0]!
        };
        
        // Usar el primer archivo si hay archivos nuevos, o undefined
        const fileToUpload = files.length > 0 ? files[0] : undefined;
        
        this.evidenciaService.update(this.evidenciaId()!, data, fileToUpload || undefined).subscribe({
          next: async () => {
            // Guardar todas las imágenes nuevas en IndexedDB
            if (files.length > 0) {
              try {
                // Primero eliminar todas las imágenes existentes
                await this.imageStorageService.deleteImage(this.evidenciaId()!);
                
                // Guardar todas las nuevas imágenes
                for (let i = 0; i < files.length; i++) {
                  await this.imageStorageService.saveImage(this.evidenciaId()!, files[i], i);
                }
                console.log(`✅ ${files.length} imagen(es) guardada(s) en almacenamiento local`);
              } catch (error) {
                console.error('❌ Error al guardar imágenes:', error);
              }
            }
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
        // Modo creación: requiere al menos una imagen
        if (files.length === 0) {
          this.error.set('Debe seleccionar al menos una imagen para guardar la evidencia');
          this.loading.set(false);
          return;
        }
        
        // Crear una evidencia por cada tipo seleccionado
        // El backend solo acepta un tipo por evidencia, así que creamos múltiples evidencias
        this.createMultipleEvidencias(tiposSeleccionados, baseData, files);
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  get idTipoEvidencia() { return this.form.get('idTipoEvidencia'); }

  getTiposEvidenciaOptions() {
    return this.tiposEvidencia().map(tipo => ({
      id: tipo.idTipoEvidencia,
      label: tipo.nombre
    }));
  }

  get totalImages(): number {
    return this.previewUrls().length;
  }

  get currentImageNumber(): number {
    return this.currentImageIndex() + 1;
  }

  canGoPrevious(): boolean {
    return this.currentImageIndex() > 0;
  }

  canGoNext(): boolean {
    return this.currentImageIndex() < this.previewUrls().length - 1;
  }

  private createMultipleEvidencias(
    tiposIds: number[], 
    baseData: Omit<EvidenciaCreate, 'idTipoEvidencia'>, 
    files: File[]
  ): void {
    // Crear evidencias secuencialmente
    let completed = 0;
    let firstEvidenciaId: number | null = null;
    const total = tiposIds.length;
    const filesPerEvidencia = Math.ceil(files.length / total); // Distribuir archivos entre evidencias

    tiposIds.forEach((tipoId, tipoIndex) => {
      const data: EvidenciaCreate = {
        ...baseData,
        idTipoEvidencia: tipoId
      };

      // Usar el primer archivo para crear la evidencia en el backend
      const fileToUpload = files[0];

      this.evidenciaService.upload(fileToUpload, data).subscribe({
        next: async (evidenciaCreada) => {
          if (tipoIndex === 0) {
            firstEvidenciaId = evidenciaCreada.idEvidencia;
          }

          // Guardar todas las imágenes para esta evidencia
          // Si hay múltiples tipos, guardamos todas las imágenes en la primera evidencia
          // Si solo hay un tipo, guardamos todas las imágenes en esa evidencia
          if (tipoIndex === 0 || total === 1) {
            try {
              // Guardar todas las imágenes en IndexedDB
              for (let i = 0; i < files.length; i++) {
                await this.imageStorageService.saveImage(evidenciaCreada.idEvidencia, files[i], i);
              }
              console.log(`✅ Evidencia ${tipoIndex + 1}/${total} creada con ${files.length} imagen(es) guardada(s)`);
            } catch (error) {
              console.error('❌ Error al guardar imágenes:', error);
            }
          } else {
            console.log(`✅ Evidencia ${tipoIndex + 1}/${total} creada`);
          }

          completed++;
          if (completed === total) {
            // Todas las evidencias fueron creadas
            this.router.navigate(['/evidencias']);
          }
        },
        error: (err: any) => {
          console.error(`Error creando evidencia ${tipoIndex + 1}/${total}:`, err);
          const errorMessage = err.error?.message || `Error al crear la evidencia ${tipoIndex + 1}`;
          this.error.set(errorMessage);
          this.loading.set(false);
        }
      });
    });
  }
}

