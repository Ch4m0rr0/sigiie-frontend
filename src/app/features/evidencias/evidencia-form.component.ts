import { Component, inject, OnInit, OnDestroy, OnChanges, SimpleChanges, signal, Input, Optional } from '@angular/core';
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
export class EvidenciaFormComponent implements OnInit, OnDestroy, OnChanges {
  // Inputs opcionales para usar el componente en modal
  @Input() @Optional() actividadIdInput?: number | null;
  @Input() @Optional() tiposEvidenciaInput?: number[] | null;
  @Input() @Optional() onClose?: () => void;
  @Input() @Optional() onSuccess?: () => void;
  @Input() @Optional() isModalMode?: boolean = false;

  private fb = inject(FormBuilder);
  private evidenciaService = inject(EvidenciaService);
  private subactividadService = inject(SubactividadService);
  private catalogosService = inject(CatalogosService);
  private actividadesService = inject(ActividadesService);
  private imageStorageService = inject(ImageStorageService);
  private route = inject(ActivatedRoute);
  router = inject(Router);
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
  selectedImages = signal<File[]>([]);
  selectedOfficeFiles = signal<File[]>([]);
  previewUrls = signal<string[]>([]);
  currentImageIndex = signal<number>(0);
  private objectUrls: string[] = [];
  
  // Helper para determinar si un archivo es imagen
  private isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }
  
  // Helper para determinar si un archivo es Office
  private isOfficeFile(file: File): boolean {
    const officeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt
      'application/pdf' // .pdf
    ];
    const officeExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf'];
    const fileName = file.name.toLowerCase();
    
    return officeTypes.includes(file.type) || 
           officeExtensions.some(ext => fileName.endsWith(ext));
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadSubactividades();
    this.loadActividades();

    // Priorizar inputs sobre query params si están disponibles
    const id = this.route.snapshot.paramMap.get('id');
    const subactividadId = this.route.snapshot.queryParamMap.get('subactividadId');
    const actividadIdParam = this.route.snapshot.queryParamMap.get('actividadId');
    
    // Usar input si está disponible, sino usar query param
    const actividadId = this.actividadIdInput !== undefined ? this.actividadIdInput : (actividadIdParam ? +actividadIdParam : null);
    
    if (id) {
      this.isEditMode.set(true);
      this.evidenciaId.set(+id);
      this.loadEvidencia(+id);
    } else {
      if (subactividadId) {
        this.form.patchValue({ idSubactividad: +subactividadId });
      }
      if (actividadId) {
        this.form.patchValue({ idActividad: actividadId });
      }
    }
    
    // Cargar tipos de evidencia después de establecer los valores del formulario
    // loadTiposEvidencia manejará los tipos permitidos desde inputs o query params
    this.loadTiposEvidencia();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambian los inputs de tipos de evidencia, actualizar el filtro
    if (changes['tiposEvidenciaInput']) {
      console.log('🔄 Input tiposEvidenciaInput cambió:', this.tiposEvidenciaInput);
      console.log('🔄 Es primera vez:', changes['tiposEvidenciaInput'].firstChange);
      // Si es la primera vez y hay tipos cargados, aplicar el filtro
      if (changes['tiposEvidenciaInput'].firstChange && this.tiposEvidencia().length > 0) {
        this.actualizarFiltroTiposEvidencia();
      } else if (!changes['tiposEvidenciaInput'].firstChange) {
        this.actualizarFiltroTiposEvidencia();
      }
    }
    
    // Si cambia el input de actividadId, también actualizar
    if (changes['actividadIdInput'] && this.tiposEvidenciaInput) {
      console.log('🔄 Input actividadIdInput cambió, actualizando filtro de tipos');
      if (this.tiposEvidencia().length > 0) {
        this.actualizarFiltroTiposEvidencia();
      }
    }
  }

  private actualizarFiltroTiposEvidencia(): void {
    const tiposPermitidos = this.tiposEvidenciaInput;
    
    if (tiposPermitidos && tiposPermitidos.length > 0) {
      console.log('✅ Actualizando filtro con tipos permitidos:', tiposPermitidos);
      this.tiposEvidenciaPermitidos.set(tiposPermitidos);
      
      // Si los tipos de evidencia ya están cargados, pre-seleccionar
      if (this.tiposEvidencia().length > 0 && !this.isEditMode() && this.selectedTiposEvidencia().length === 0) {
        this.selectedTiposEvidencia.set(tiposPermitidos);
        console.log('✅ Tipos pre-seleccionados después de actualizar filtro');
      }
    } else {
      console.log('⚠️ No hay tipos permitidos en el input, mostrando todos');
      this.tiposEvidenciaPermitidos.set(null);
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

  tiposEvidenciaPermitidos = signal<number[] | null>(null);

  loadTiposEvidencia(): void {
    // Priorizar input sobre query params
    const tiposPermitidosInput = this.tiposEvidenciaInput;
    const tiposPermitidosParam = this.route.snapshot.queryParamMap.get('tiposEvidencia');
    
    // Usar input si está disponible, sino usar query param
    let tiposPermitidos: number[] | null = null;
    if (tiposPermitidosInput && Array.isArray(tiposPermitidosInput) && tiposPermitidosInput.length > 0) {
      tiposPermitidos = tiposPermitidosInput;
      console.log('🔍 Tipos de evidencia desde input:', tiposPermitidos);
    } else if (tiposPermitidosParam) {
      tiposPermitidos = tiposPermitidosParam.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id) && id > 0);
      console.log('🔍 Tipos de evidencia desde query param:', tiposPermitidos);
    } else {
      console.log('⚠️ No se encontraron tipos de evidencia permitidos ni en input ni en query params');
    }
    
    this.catalogosService.getTiposEvidencia().subscribe({
      next: (data) => {
        console.log('📦 Todos los tipos de evidencia cargados:', data.length);
        console.log('📦 Tipos disponibles:', data.map(t => ({ id: t.idTipoEvidencia || (t as any).id, nombre: t.nombre })));
        this.tiposEvidencia.set(data);
        
        // Verificar nuevamente el input después de cargar los datos (por si se estableció después de ngOnInit)
        const tiposPermitidosFinal = this.tiposEvidenciaInput && Array.isArray(this.tiposEvidenciaInput) && this.tiposEvidenciaInput.length > 0
          ? this.tiposEvidenciaInput
          : tiposPermitidos;
        
        // Si hay tipos permitidos, filtrar y pre-seleccionar
        if (tiposPermitidosFinal && tiposPermitidosFinal.length > 0) {
          console.log('📋 Tipos de evidencia permitidos (final):', tiposPermitidosFinal);
          this.tiposEvidenciaPermitidos.set(tiposPermitidosFinal);
          
          // Pre-seleccionar automáticamente todos los tipos permitidos
          // Solo si no estamos en modo edición y no hay tipos ya seleccionados
          if (!this.isEditMode() && this.selectedTiposEvidencia().length === 0) {
            this.selectedTiposEvidencia.set(tiposPermitidosFinal);
            console.log('✅ Tipos de evidencia pre-seleccionados automáticamente:', tiposPermitidosFinal);
          }
        } else {
          console.log('⚠️ No hay tipos de evidencia permitidos, mostrando todos los tipos');
          console.log('⚠️ Input tiposEvidenciaInput:', this.tiposEvidenciaInput);
          this.tiposEvidenciaPermitidos.set(null);
        }
      },
      error: (err) => console.error('Error loading tipos evidencia:', err)
    });
  }

  getTiposEvidenciaFiltrados(): TipoEvidencia[] {
    const todos = this.tiposEvidencia();
    const permitidos = this.tiposEvidenciaPermitidos();
    
    console.log('🔍 getTiposEvidenciaFiltrados - Total tipos:', todos.length);
    console.log('🔍 getTiposEvidenciaFiltrados - Tipos permitidos:', permitidos);
    console.log('🔍 getTiposEvidenciaFiltrados - Input tiposEvidenciaInput:', this.tiposEvidenciaInput);
    
    // Si no hay tipos cargados aún, retornar array vacío
    if (todos.length === 0) {
      console.log('⚠️ Aún no se han cargado los tipos de evidencia');
      return [];
    }
    
    if (permitidos === null || permitidos.length === 0) {
      console.log('🔓 Sin filtro: mostrando todos los tipos', todos.length);
      return todos; // Si no hay filtro, mostrar todos
    }
    
    // Filtrar solo los tipos permitidos
    const filtrados = todos.filter(tipo => {
      const tipoId = tipo.idTipoEvidencia || (tipo as any).id;
      const incluido = permitidos.includes(tipoId);
      if (!incluido) {
        console.log(`❌ Tipo ${tipoId} (${tipo.nombre}) no está en la lista de permitidos`);
      }
      return incluido;
    });
    
    console.log(`🔒 Con filtro: mostrando ${filtrados.length} de ${todos.length} tipos`, filtrados.map(t => ({ id: t.idTipoEvidencia || (t as any).id, nombre: t.nombre })));
    return filtrados;
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
      const allFiles = Array.from(input.files);
      
      // Separar archivos en imágenes y archivos Office
      const imageFiles = allFiles.filter(file => this.isImageFile(file));
      const officeFiles = allFiles.filter(file => this.isOfficeFile(file));
      const invalidFiles = allFiles.filter(file => !this.isImageFile(file) && !this.isOfficeFile(file));
      
      if (invalidFiles.length > 0) {
        this.error.set(`Los siguientes archivos no son válidos: ${invalidFiles.map(f => f.name).join(', ')}. Solo se permiten imágenes y archivos Office (Word, Excel, PowerPoint, PDF).`);
      }
      
      // Agregar imágenes a la lista existente
      if (imageFiles.length > 0) {
        const currentImages = this.selectedImages();
        const newImages = [...currentImages, ...imageFiles];
        this.selectedImages.set(newImages);
        
        // Leer todas las imágenes y crear previews
        const newPreviews: string[] = [];
        let loadedCount = 0;

        imageFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) {
              newPreviews.push(result);
              loadedCount++;
              
              // Cuando todas las imágenes estén cargadas, actualizar los previews
              if (loadedCount === imageFiles.length) {
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
      }
      
      // Agregar archivos Office a la lista existente
      if (officeFiles.length > 0) {
        const currentOfficeFiles = this.selectedOfficeFiles();
        const newOfficeFiles = [...currentOfficeFiles, ...officeFiles];
        this.selectedOfficeFiles.set(newOfficeFiles);
      }
      
      // Actualizar lista combinada para compatibilidad
      const allSelectedFiles = [...this.selectedImages(), ...this.selectedOfficeFiles()];
      this.selectedFiles.set(allSelectedFiles);
      
      // Limpiar error si todo está bien
      if (invalidFiles.length === 0) {
        this.error.set(null);
      }
    } else {
      // Si no hay archivos seleccionados y estamos en modo edición, cargar desde almacenamiento
      if (this.isEditMode() && this.evidenciaId()) {
        this.loadStoredImages(this.evidenciaId()!);
      } else {
        this.selectedFiles.set([]);
        this.selectedImages.set([]);
        this.selectedOfficeFiles.set([]);
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
    const images = this.selectedImages();
    const previews = this.previewUrls();
    
    images.splice(index, 1);
    previews.splice(index, 1);
    
    this.selectedImages.set([...images]);
    this.previewUrls.set([...previews]);
    
    // Actualizar lista combinada
    const allSelectedFiles = [...this.selectedImages(), ...this.selectedOfficeFiles()];
    this.selectedFiles.set(allSelectedFiles);
    
    // Ajustar el índice actual si es necesario
    if (this.currentImageIndex() >= previews.length) {
      this.currentImageIndex.set(Math.max(0, previews.length - 1));
    }
  }
  
  removeOfficeFile(index: number): void {
    const officeFiles = this.selectedOfficeFiles();
    officeFiles.splice(index, 1);
    this.selectedOfficeFiles.set([...officeFiles]);
    
    // Actualizar lista combinada
    const allSelectedFiles = [...this.selectedImages(), ...this.selectedOfficeFiles()];
    this.selectedFiles.set(allSelectedFiles);
  }
  
  getFileIcon(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'doc':
      case 'docx':
        return 'description'; // Word
      case 'xls':
      case 'xlsx':
        return 'table_chart'; // Excel
      case 'ppt':
      case 'pptx':
        return 'slideshow'; // PowerPoint
      case 'pdf':
        return 'picture_as_pdf'; // PDF
      default:
        return 'insert_drive_file';
    }
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
            if (this.onSuccess) {
              this.onSuccess();
            } else {
              this.router.navigate(['/evidencias']);
            }
          },
          error: (err: any) => {
            console.error('Error saving evidencia:', err);
            const errorMessage = err.error?.message || 'Error al guardar la evidencia';
            this.error.set(errorMessage);
            this.loading.set(false);
          }
        });
      } else {
        // Modo creación: requiere al menos un archivo (imagen o Office)
        const images = this.selectedImages();
        const officeFiles = this.selectedOfficeFiles();
        
        if (images.length === 0 && officeFiles.length === 0) {
          this.error.set('Debe seleccionar al menos una imagen o archivo Office para guardar la evidencia');
          this.loading.set(false);
          return;
        }
        
        // Crear una evidencia por cada tipo seleccionado
        // El backend solo acepta un tipo por evidencia, así que creamos múltiples evidencias
        // Primero enviar imágenes, luego archivos Office
        this.createMultipleEvidencias(tiposSeleccionados, baseData, images, officeFiles);
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  get idTipoEvidencia() { return this.form.get('idTipoEvidencia'); }

  getTiposEvidenciaOptions() {
    // Usar los tipos filtrados si hay filtro activo
    const tipos = this.getTiposEvidenciaFiltrados();
    const options = tipos.map(tipo => ({
      id: tipo.idTipoEvidencia || (tipo as any).id,
      label: tipo.nombre
    }));
    console.log('🎯 Opciones para el dropdown:', options);
    console.log('🎯 Tipos permitidos activos:', this.tiposEvidenciaPermitidos());
    console.log('🎯 Input tiposEvidenciaInput:', this.tiposEvidenciaInput);
    console.log('🎯 Total tipos disponibles:', this.tiposEvidencia().length);
    console.log('🎯 Tipos filtrados:', tipos.length);
    return options;
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
    images: File[],
    officeFiles: File[]
  ): void {
    // Crear UNA SOLA evidencia usando el primer tipo seleccionado
    // Esta evidencia contendrá TODAS las imágenes y TODOS los archivos Office
    if (images.length === 0 && officeFiles.length === 0) {
      this.error.set('Debe seleccionar al menos una imagen o archivo Office');
      this.loading.set(false);
      return;
    }

    // Usar el primer tipo seleccionado para crear la evidencia
    const tipoId = tiposIds[0];
    if (!tipoId) {
      this.error.set('Debe seleccionar al menos un tipo de evidencia');
      this.loading.set(false);
      return;
    }

    const data: EvidenciaCreate = {
      ...baseData,
      idTipoEvidencia: tipoId
    };

    // Estrategia: Enviar la primera imagen al backend (o el primer archivo Office si no hay imágenes)
    // Guardar todas las imágenes y archivos Office restantes en IndexedDB
    const fileToUpload = images.length > 0 ? images[0] : officeFiles[0];
    
    console.log(`📤 Creando UNA evidencia (tipo ${tipoId}) con ${images.length} imagen(es) y ${officeFiles.length} archivo(s) Office`);
    
    if (!fileToUpload) {
      console.error('❌ No hay archivos para subir');
      this.error.set('Debe seleccionar al menos un archivo');
      this.loading.set(false);
      return;
    }

    // Usar upload (un solo archivo) para crear la evidencia en el backend
    this.evidenciaService.upload(fileToUpload, data).subscribe({
      next: async (evidenciaCreada) => {
        try {
          console.log(`✅ Evidencia creada con ID: ${evidenciaCreada.idEvidencia}`);
          
          // Guardar TODAS las imágenes en IndexedDB (incluyendo la primera que ya se subió al backend)
          if (images.length > 0) {
            console.log(`💾 Guardando ${images.length} imagen(es) en IndexedDB...`);
            for (let i = 0; i < images.length; i++) {
              await this.imageStorageService.saveImage(evidenciaCreada.idEvidencia, images[i], i);
            }
            console.log(`✅ ${images.length} imagen(es) guardada(s) en IndexedDB`);
          }
          
          // Guardar TODOS los archivos Office en IndexedDB
          if (officeFiles.length > 0) {
            console.log(`💾 Guardando ${officeFiles.length} archivo(s) Office en IndexedDB...`);
            for (let i = 0; i < officeFiles.length; i++) {
              await this.imageStorageService.saveOfficeFile(evidenciaCreada.idEvidencia, officeFiles[i], i);
            }
            console.log(`✅ ${officeFiles.length} archivo(s) Office guardado(s) en IndexedDB`);
          }
          
          console.log(`🎉 Evidencia única creada exitosamente: ${images.length} imagen(es) y ${officeFiles.length} archivo(s) Office`);
          
          this.loading.set(false);
          if (this.onSuccess) {
            this.onSuccess();
          } else {
            this.router.navigate(['/evidencias']);
          }
        } catch (error) {
          console.error('❌ Error al guardar archivos en IndexedDB:', error);
          this.error.set('Error al guardar los archivos de la evidencia');
          this.loading.set(false);
        }
      },
      error: (err: any) => {
        console.error(`❌ Error creando evidencia (tipo ${tipoId}):`, err);
        console.error('❌ Detalles del error:', {
          status: err.status,
          statusText: err.statusText,
          error: err.error,
          message: err.message,
          url: err.url,
          headers: err.headers
        });
        
        let errorMessage = 'Error al crear la evidencia';
        
        // Intentar extraer el mensaje de error del backend
        if (err.error) {
          if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.Message) {
            errorMessage = err.error.Message;
          } else if (err.error.errors) {
            const errors = Object.values(err.error.errors).flat();
            errorMessage = errors.join(', ');
          } else if (err.error.title) {
            errorMessage = err.error.title;
          } else if (err.error.detail) {
            errorMessage = err.error.detail;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        // Agregar información adicional si está disponible
        if (err.status) {
          errorMessage += ` (Código: ${err.status})`;
        }
        
        console.error('❌ Mensaje de error final:', errorMessage);
        this.error.set(errorMessage);
        this.loading.set(false);
      }
    });
  }
}

