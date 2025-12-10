import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EvidenciaService } from '../../core/services/evidencia.service';
import { ImageStorageService } from '../../core/services/image-storage.service';
import { ActividadesService } from '../../core/services/actividades.service';
import type { Evidencia } from '../../core/models/evidencia';
import type { Actividad } from '../../core/models/actividad';
import { IconComponent } from '../../shared/icon/icon.component';
import { SkeletonCardComponent } from '../../shared/skeleton/skeleton-card.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import JSZip from 'jszip';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-evidencia-detail',
  imports: [CommonModule, RouterModule, IconComponent, SkeletonCardComponent, ...BrnButtonImports],
  templateUrl: './evidencia-detail.component.html',
})
export class EvidenciaDetailComponent implements OnInit, OnDestroy {
  private evidenciaService = inject(EvidenciaService);
  private imageStorageService = inject(ImageStorageService);
  private actividadesService = inject(ActividadesService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  evidencia = signal<Evidencia | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  imageUrls = signal<string[]>([]);
  currentImageIndex = signal<number>(0);
  imageError = signal(false);
  officeFiles = signal<Array<{fileName: string, mimeType: string, fileSize: number, fileIndex: number}>>([]);
  nombreActividad = signal<string | null>(null);
  private objectUrls: string[] = [];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadEvidencia(+id);
    }
  }

  loadEvidencia(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.imageError.set(false);
    
    // Limpiar URLs anteriores
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
    this.objectUrls = [];

    this.evidenciaService.getById(id).subscribe({
      next: async (data) => {
        this.evidencia.set(data);
        
        // Cargar el nombre de la actividad si existe
        if (data.idActividad) {
          try {
            const actividad = await firstValueFrom(this.actividadesService.getById(data.idActividad));
            if (actividad) {
              const nombre = actividad.nombreActividad || actividad.nombre || data.nombreActividad || null;
              this.nombreActividad.set(nombre);
            } else {
              // Si no se puede cargar, usar el nombre de la evidencia si está disponible
              this.nombreActividad.set(data.nombreActividad || null);
            }
          } catch (err) {
            console.warn('⚠️ No se pudo cargar la actividad:', err);
            // Usar el nombre de la evidencia si está disponible
            this.nombreActividad.set(data.nombreActividad || null);
          }
        } else {
          // Si no hay idActividad, usar el nombre de la evidencia si está disponible
          this.nombreActividad.set(data.nombreActividad || null);
        }
        
        // Cargar todas las imágenes desde almacenamiento local del frontend (IndexedDB)
        const storedImages = await this.imageStorageService.getAllImages(data.idEvidencia);
        console.log(`📸 Cargadas ${storedImages.length} imagen(es) para evidencia ${data.idEvidencia}`);
        
        if (storedImages.length > 0) {
          // Las imágenes están almacenadas como base64, guardarlas directamente
          this.imageUrls.set(storedImages);
          this.currentImageIndex.set(0);
          this.imageError.set(false);
          console.log('✅ Imágenes cargadas correctamente, mostrando primera imagen');
        } else {
          // No hay imágenes almacenadas localmente
          this.imageUrls.set([]);
          this.currentImageIndex.set(0);
          console.log('⚠️ No se encontraron imágenes almacenadas');
        }
        
        // Cargar todos los archivos Office desde IndexedDB
        const storedOfficeFiles = await this.imageStorageService.getAllOfficeFiles(data.idEvidencia);
        console.log(`📄 Cargados ${storedOfficeFiles.length} archivo(s) Office para evidencia ${data.idEvidencia}`);
        this.officeFiles.set(storedOfficeFiles);
        
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

  navigateToEdit(): void {
    const id = this.evidencia()?.idEvidencia;
    if (id) {
      this.router.navigate(['/evidencias', id, 'editar']);
    }
  }

  onDelete(): void {
    const id = this.evidencia()?.idEvidencia;
    if (id && confirm('¿Está seguro de que desea eliminar esta evidencia?')) {
      this.evidenciaService.delete(id).subscribe({
        next: () => this.router.navigate(['/evidencias']),
        error: (err) => {
          console.error('Error deleting evidencia:', err);
          this.error.set('Error al eliminar la evidencia');
        }
      });
    }
  }


  isImage(rutaArchivo?: string): boolean {
    if (!rutaArchivo) return false;
    const extension = rutaArchivo.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '');
  }

  onImageError(event: Event): void {
    console.error('❌ Error cargando imagen:', event);
    this.imageError.set(true);
  }

  async downloadFile(): Promise<void> {
    const evidencia = this.evidencia();
    if (!evidencia) {
      alert('No se puede descargar: Sin evidencia');
      return;
    }

    try {
      console.log('📦 Iniciando creación de archivo ZIP...');
      const zip = new JSZip();
      
      // Obtener todas las imágenes
      const images = this.imageUrls();
      console.log(`📸 Agregando ${images.length} imagen(es) al ZIP...`);
      
      for (let i = 0; i < images.length; i++) {
        const imageBlob = await this.imageStorageService.getImageBlob(evidencia.idEvidencia, i);
        if (imageBlob) {
          // Determinar la extensión del archivo basado en el tipo MIME
          const mimeType = imageBlob.type || 'image/jpeg';
          let extension = 'jpg';
          if (mimeType.includes('png')) extension = 'png';
          else if (mimeType.includes('gif')) extension = 'gif';
          else if (mimeType.includes('webp')) extension = 'webp';
          
          const fileName = images.length > 1 
            ? `imagen_${i + 1}.${extension}`
            : `imagen.${extension}`;
          
          zip.file(fileName, imageBlob);
          console.log(`✅ Imagen ${i + 1} agregada: ${fileName}`);
        }
      }
      
      // Obtener todos los archivos Office
      const officeFiles = this.officeFiles();
      console.log(`📄 Agregando ${officeFiles.length} archivo(s) Office al ZIP...`);
      
      for (const file of officeFiles) {
        const fileBlob = await this.imageStorageService.getOfficeFileBlob(evidencia.idEvidencia, file.fileIndex);
        if (fileBlob) {
          zip.file(file.fileName, fileBlob);
          console.log(`✅ Archivo Office agregado: ${file.fileName}`);
        }
      }
      
      // Verificar que hay al menos un archivo en el ZIP
      const fileCount = images.length + officeFiles.length;
      if (fileCount === 0) {
        alert('No hay archivos para descargar');
        return;
      }
      
      // Generar el archivo ZIP
      console.log('📦 Generando archivo ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Obtener información de la actividad para el nombre del archivo
      let nombreActividad = evidencia.nombreActividad || 'Actividad';
      let fechaActividad = '';
      
      if (evidencia.idActividad) {
        try {
          const actividad = await firstValueFrom(this.actividadesService.getById(evidencia.idActividad));
          if (actividad) {
            nombreActividad = actividad.nombreActividad || actividad.nombre || nombreActividad;
            // Obtener la fecha de la actividad (fechaInicio o fechaCreacion)
            const fecha = actividad.fechaInicio || actividad.fechaCreacion;
            if (fecha) {
              // Formatear la fecha como DD-MM-YYYY
              const fechaObj = new Date(fecha);
              if (!isNaN(fechaObj.getTime())) {
                const dia = String(fechaObj.getDate()).padStart(2, '0');
                const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
                const anio = fechaObj.getFullYear();
                fechaActividad = `${dia}-${mes}-${anio}`;
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ No se pudo cargar la actividad para el nombre del archivo:', err);
        }
      }
      
      // Obtener nombre de la evidencia
      const nombreEvidencia = evidencia.descripcion || evidencia.nombreTipoEvidencia || `Evidencia_${evidencia.idEvidencia}`;
      
      // Limpiar nombres para que sean válidos como nombres de archivo
      const limpiarNombre = (nombre: string): string => {
        return nombre
          .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remover caracteres especiales
          .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
          .substring(0, 50); // Limitar longitud
      };
      
      // Construir el nombre del archivo: Actividad + Evidencia + Fecha
      const partesNombre: string[] = [];
      partesNombre.push(limpiarNombre(nombreActividad));
      partesNombre.push(limpiarNombre(nombreEvidencia));
      if (fechaActividad) {
        partesNombre.push(fechaActividad);
      }
      
      const zipFileName = `${partesNombre.join('_')}.zip`;
      
      // Descargar el ZIP
      const blobUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = zipFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      
      console.log(`✅ Archivo ZIP descargado: ${zipFileName} (${images.length} imagen(es) + ${officeFiles.length} archivo(s) Office)`);
    } catch (error) {
      console.error('❌ Error al crear el archivo ZIP:', error);
      alert('Error al crear el archivo ZIP. Por favor, intente nuevamente.');
    }
  }

  previousImage(): void {
    const currentIndex = this.currentImageIndex();
    if (currentIndex > 0) {
      this.currentImageIndex.set(currentIndex - 1);
      this.imageError.set(false);
    }
  }

  nextImage(): void {
    const currentIndex = this.currentImageIndex();
    const totalImages = this.imageUrls().length;
    if (currentIndex < totalImages - 1) {
      this.currentImageIndex.set(currentIndex + 1);
      this.imageError.set(false);
    }
  }

  getCurrentImageUrl(): SafeUrl | null {
    const urls = this.imageUrls();
    const index = this.currentImageIndex();
    if (urls[index]) {
      // Sanitizar la URL base64 antes de usarla
      return this.sanitizer.bypassSecurityTrustUrl(urls[index]);
    }
    return null;
  }

  get totalImages(): number {
    return this.imageUrls().length;
  }

  get currentImageNumber(): number {
    return this.currentImageIndex() + 1;
  }

  canGoPrevious(): boolean {
    return this.currentImageIndex() > 0;
  }

  canGoNext(): boolean {
    return this.currentImageIndex() < this.imageUrls().length - 1;
  }

  async downloadOfficeFile(fileIndex: number): Promise<void> {
    const evidencia = this.evidencia();
    if (!evidencia) {
      alert('No se puede descargar: Sin evidencia');
      return;
    }

    try {
      const blob = await this.imageStorageService.getOfficeFileBlob(evidencia.idEvidencia, fileIndex);
      if (!blob) {
        alert('No se puede descargar: Archivo no encontrado');
        return;
      }

      const officeFiles = this.officeFiles();
      const file = officeFiles.find(f => f.fileIndex === fileIndex);
      const fileName = file?.fileName || `archivo_${fileIndex}`;

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      
      console.log(`✅ Archivo Office descargado: ${fileName}`);
    } catch (error) {
      console.error('Error al descargar archivo Office:', error);
      alert('Error al descargar el archivo');
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.includes('word') || mimeType.includes('document')) return 'description';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'table_chart';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'slideshow';
    if (mimeType.includes('pdf')) return 'picture_as_pdf';
    return 'insert_drive_file';
  }
}

