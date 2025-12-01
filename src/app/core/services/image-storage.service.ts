import { Injectable } from '@angular/core';

/**
 * Servicio para gestionar imágenes en el frontend usando IndexedDB
 * IndexedDB puede manejar archivos grandes (cientos de MB) a diferencia de localStorage
 */
@Injectable({ providedIn: 'root' })
export class ImageStorageService {
  private readonly DB_NAME = 'evidencias_images_db';
  private readonly STORE_NAME = 'images';
  private readonly DB_VERSION = 2;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initDB();
  }

  /**
   * Inicializa la base de datos IndexedDB
   */
  private initDB(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Error al abrir IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion || 0;
        
        if (oldVersion < 2) {
          // Migrar de versión 1 a 2: eliminar el store antiguo y crear uno nuevo con clave compuesta
          if (db.objectStoreNames.contains(this.STORE_NAME)) {
            db.deleteObjectStore(this.STORE_NAME);
          }
        }
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: ['evidenciaId', 'imageIndex'] });
          store.createIndex('evidenciaId', 'evidenciaId', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Asegura que la base de datos esté inicializada
   */
  private async ensureDB(): Promise<IDBDatabase> {
    await this.initDB();
    if (!this.db) {
      throw new Error('No se pudo inicializar IndexedDB');
    }
    return this.db;
  }

  /**
   * Guarda una imagen en IndexedDB como Blob
   * @param evidenciaId ID de la evidencia
   * @param file Archivo de imagen
   * @param imageIndex Índice de la imagen (0 para la primera, 1 para la segunda, etc.)
   * @returns Promise que resuelve con la URL base64 de la imagen (para preview)
   */
  saveImage(evidenciaId: number, file: File, imageIndex: number = 0): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('El archivo no es una imagen'));
        return;
      }

      try {
        const db = await this.ensureDB();
        
        // Leer el archivo como base64 para el preview inmediato
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          if (!base64) {
            reject(new Error('Error al leer el archivo'));
            return;
          }

          try {
            // Leer el archivo como ArrayBuffer para guardarlo en IndexedDB
            const arrayBufferReader = new FileReader();
            arrayBufferReader.onload = async (e) => {
              const arrayBuffer = e.target?.result as ArrayBuffer;
              if (!arrayBuffer) {
                reject(new Error('Error al leer el archivo como ArrayBuffer'));
                return;
              }

              try {
                const store = db.transaction([this.STORE_NAME], 'readwrite').objectStore(this.STORE_NAME);
                const data = {
                  evidenciaId: evidenciaId,
                  imageIndex: imageIndex,
                  arrayBuffer: arrayBuffer, // Guardar como ArrayBuffer
                  mimeType: file.type,
                  fileName: file.name,
                  base64: base64 // También guardar base64 para acceso rápido
                };
                
                const putRequest = store.put(data);
                putRequest.onsuccess = () => {
                  resolve(base64);
                };
                putRequest.onerror = () => {
                  console.error('Error al guardar en IndexedDB:', putRequest.error);
                  reject(new Error('Error al guardar en IndexedDB'));
                };
              } catch (error) {
                reject(error);
              }
            };
            arrayBufferReader.onerror = () => {
              reject(new Error('Error al leer el archivo como ArrayBuffer'));
            };
            arrayBufferReader.readAsArrayBuffer(file);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => {
          reject(new Error('Error al leer el archivo'));
        };
        reader.readAsDataURL(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Obtiene una imagen desde IndexedDB
   * @param evidenciaId ID de la evidencia
   * @param imageIndex Índice de la imagen (0 para la primera, por defecto)
   * @returns Promise que resuelve con la URL base64 de la imagen o null si no existe
   */
  async getImage(evidenciaId: number, imageIndex: number = 0): Promise<string | null> {
    try {
      const db = await this.ensureDB();
      const store = db.transaction([this.STORE_NAME], 'readonly').objectStore(this.STORE_NAME);
      
      return new Promise((resolve) => {
        const request = store.get([evidenciaId, imageIndex]);
        request.onsuccess = () => {
          const result = request.result;
          if (result && result.base64) {
            resolve(result.base64);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => {
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Error al obtener imagen:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las imágenes de una evidencia
   * @param evidenciaId ID de la evidencia
   * @returns Promise que resuelve con un array de URLs base64 de las imágenes
   */
  async getAllImages(evidenciaId: number): Promise<string[]> {
    try {
      const db = await this.ensureDB();
      const store = db.transaction([this.STORE_NAME], 'readonly').objectStore(this.STORE_NAME);
      const index = store.index('evidenciaId');
      
      return new Promise((resolve) => {
        const request = index.getAll(evidenciaId);
        request.onsuccess = () => {
          const results = request.result || [];
          // Ordenar por imageIndex y extraer base64
          const images = results
            .sort((a, b) => (a.imageIndex || 0) - (b.imageIndex || 0))
            .map(item => item.base64)
            .filter(base64 => base64 != null);
          resolve(images);
        };
        request.onerror = () => {
          resolve([]);
        };
      });
    } catch (error) {
      console.error('Error al obtener todas las imágenes:', error);
      return [];
    }
  }

  /**
   * Obtiene el número de imágenes almacenadas para una evidencia
   * @param evidenciaId ID de la evidencia
   * @returns Promise que resuelve con el número de imágenes
   */
  async getImageCount(evidenciaId: number): Promise<number> {
    try {
      const db = await this.ensureDB();
      const store = db.transaction([this.STORE_NAME], 'readonly').objectStore(this.STORE_NAME);
      const index = store.index('evidenciaId');
      
      return new Promise((resolve) => {
        const request = index.count(evidenciaId);
        request.onsuccess = () => {
          resolve(request.result || 0);
        };
        request.onerror = () => {
          resolve(0);
        };
      });
    } catch (error) {
      console.error('Error al contar imágenes:', error);
      return 0;
    }
  }

  /**
   * Obtiene el Blob de una imagen desde IndexedDB
   * @param evidenciaId ID de la evidencia
   * @param imageIndex Índice de la imagen (0 para la primera, por defecto)
   * @returns Promise que resuelve con el Blob o null si no existe
   */
  async getImageBlob(evidenciaId: number, imageIndex: number = 0): Promise<Blob | null> {
    try {
      const db = await this.ensureDB();
      const store = db.transaction([this.STORE_NAME], 'readonly').objectStore(this.STORE_NAME);
      
      return new Promise((resolve) => {
        const request = store.get([evidenciaId, imageIndex]);
        request.onsuccess = () => {
          const result = request.result;
          if (result && result.arrayBuffer) {
            // Convertir ArrayBuffer a Blob
            const blob = new Blob([result.arrayBuffer], { type: result.mimeType || 'image/png' });
            resolve(blob);
          } else if (result && result.base64) {
            // Si no hay arrayBuffer pero hay base64, convertir base64 a Blob
            const blob = this.base64ToBlob(result.base64, result.fileName || 'evidencia');
            resolve(blob);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => {
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Error al obtener blob:', error);
      return null;
    }
  }

  /**
   * Elimina una imagen de IndexedDB
   * @param evidenciaId ID de la evidencia
   * @param imageIndex Índice de la imagen a eliminar (opcional, si no se especifica elimina todas)
   */
  async deleteImage(evidenciaId: number, imageIndex?: number): Promise<void> {
    try {
      const db = await this.ensureDB();
      const store = db.transaction([this.STORE_NAME], 'readwrite').objectStore(this.STORE_NAME);
      
      if (imageIndex !== undefined) {
        // Eliminar una imagen específica
        store.delete([evidenciaId, imageIndex]);
      } else {
        // Eliminar todas las imágenes de la evidencia
        const index = store.index('evidenciaId');
        const request = index.openKeyCursor(IDBKeyRange.only(evidenciaId));
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
      }
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
    }
  }

  /**
   * Verifica si existe una imagen para una evidencia
   * @param evidenciaId ID de la evidencia
   * @param imageIndex Índice de la imagen (0 para la primera, por defecto)
   * @returns Promise que resuelve con true si existe la imagen
   */
  async hasImage(evidenciaId: number, imageIndex: number = 0): Promise<boolean> {
    const image = await this.getImage(evidenciaId, imageIndex);
    return image !== null;
  }

  /**
   * Convierte una URL base64 a Blob para descarga
   * @param base64Url URL base64 de la imagen
   * @param fileName Nombre del archivo
   * @returns Blob de la imagen
   */
  base64ToBlob(base64Url: string, fileName: string): Blob {
    // Extraer el tipo MIME y los datos base64
    const parts = base64Url.split(',');
    const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const base64Data = parts[1];
    
    // Convertir base64 a bytes
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Descarga una imagen desde IndexedDB
   * @param evidenciaId ID de la evidencia
   * @param fileName Nombre del archivo para descargar
   * @param imageIndex Índice de la imagen a descargar (0 para la primera, por defecto)
   */
  async downloadImage(evidenciaId: number, fileName: string, imageIndex: number = 0): Promise<void> {
    try {
      // Intentar obtener el Blob directamente (más eficiente)
      let blob = await this.getImageBlob(evidenciaId, imageIndex);
      
      // Si no hay blob, intentar obtener base64 y convertir
      if (!blob) {
        const base64 = await this.getImage(evidenciaId, imageIndex);
        if (!base64) {
          throw new Error('No se encontró la imagen');
        }
        blob = this.base64ToBlob(base64, fileName);
      }

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error('Error al descargar imagen:', error);
      throw error;
    }
  }

  /**
   * Descarga una imagen desde base64 (método de compatibilidad)
   * @param base64Url URL base64 de la imagen
   * @param fileName Nombre del archivo para descargar
   */
  downloadImageFromBase64(base64Url: string, fileName: string): void {
    const blob = this.base64ToBlob(base64Url, fileName);
    const blobUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 100);
  }

  /**
   * Limpia todas las imágenes almacenadas (útil para limpieza)
   */
  async clearAllImages(): Promise<void> {
    try {
      const db = await this.ensureDB();
      const store = db.transaction([this.STORE_NAME], 'readwrite').objectStore(this.STORE_NAME);
      store.clear();
    } catch (error) {
      console.error('Error al limpiar imágenes:', error);
    }
  }
}

