import { Component, inject, OnInit, signal, ChangeDetectorRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import JSZip from 'jszip';
import { ActividadesService } from '../../core/services/actividades.service';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import { IndicadorService } from '../../core/services/indicador.service';
import { ActividadResponsableService, type ActividadResponsableCreate, type ActividadResponsableUpdate } from '../../core/services/actividad-responsable.service';
import { EdicionService } from '../../core/services/edicion.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { PersonasService } from '../../core/services/personas.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import type { Usuario } from '../../core/models/usuario';
import { EvidenciaService } from '../../core/services/evidencia.service';
import { ImageStorageService } from '../../core/services/image-storage.service';
import { ParticipacionService } from '../../core/services/participacion.service';
import { ReportesService } from '../../core/services/reportes.service';
import { AlertService } from '../../core/services/alert.service';
import type { Evidencia } from '../../core/models/evidencia';
import type { Actividad } from '../../core/models/actividad';
import type { ActividadResponsable } from '../../core/models/actividad-responsable';
import type { ActividadIndicador } from '../../core/models/indicador';
import type { Subactividad } from '../../core/models/subactividad';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import type { ActividadMensualInst } from '../../core/models/actividad-mensual-inst';
import type { Indicador } from '../../core/models/indicador';
import type { Edicion } from '../../core/models/edicion';
import type { Docente } from '../../core/models/docente';
import type { Estudiante } from '../../core/models/estudiante';
import type { Administrativo } from '../../core/models/administrativo';
import type { Participacion } from '../../core/models/participacion';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-actividad-detail',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, IconComponent, ...BrnButtonImports],
  templateUrl: './actividad-detail.component.html',
})
export class ActividadDetailComponent implements OnInit {
  private actividadesService = inject(ActividadesService);
  private actividadAnualService = inject(ActividadAnualService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private indicadorService = inject(IndicadorService);
  private responsableService = inject(ActividadResponsableService);
  private edicionService = inject(EdicionService);
  private catalogosService = inject(CatalogosService);
  private personasService = inject(PersonasService);
  private usuariosService = inject(UsuariosService);
  private evidenciaService = inject(EvidenciaService);
  private imageStorageService = inject(ImageStorageService);
  private participacionService = inject(ParticipacionService);
  private reportesService = inject(ReportesService);
  private alertService = inject(AlertService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  actividad = signal<Actividad | null>(null);
  responsables = signal<ActividadResponsable[]>([]);
  indicadores = signal<ActividadIndicador[]>([]);
  subactividades = signal<Subactividad[]>([]);
  departamentos = signal<any[]>([]);
  actividadesAnuales = signal<ActividadAnual[]>([]);
  actividadesMensuales = signal<ActividadMensualInst[]>([]);
  indicadoresList = signal<Indicador[]>([]);
  ediciones = signal<Edicion[]>([]);
  evidencias = signal<Evidencia[]>([]);
  evidenciasLoading = signal(false);
  evidenciasError = signal<string | null>(null);
  evidenciasImageUrls = signal<Map<number, string[]>>(new Map());
  evidenciasOfficeFiles = signal<Map<number, Array<{fileName: string, mimeType: string, fileSize: number, fileIndex: number}>>>(new Map());
  
  // Vista de evidencia dentro de actividad
  evidenciaDetalle = signal<Evidencia | null>(null);
  evidenciaDetalleLoading = signal(false);
  evidenciaDetalleError = signal<string | null>(null);
  evidenciaDetalleImageUrls = signal<string[]>([]);
  evidenciaDetalleCurrentImageIndex = signal<number>(0);
  evidenciaDetalleImageError = signal(false);
  mostrarEvidenciaDetalle = signal(false);
  private evidenciaDetalleObjectUrls: string[] = [];
  todosLosDepartamentos = signal<any[]>([]);
  categoriasActividad = signal<any[]>([]);
  tiposProtagonista = signal<any[]>([]);
  tiposResponsable = signal<any[]>([]);
  tiposEvidencia = signal<any[]>([]);
  capacidadesInstaladas = signal<any[]>([]);
  capacidadInstaladaCache = signal<Map<number, string>>(new Map());
  estadosActividad = signal<any[]>([]);
  editandoEstado = signal(false);
  guardandoEstado = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  activeTab = signal<'info' | 'departamentos' | 'responsables' | 'indicadores' | 'subactividades' | 'actividades-anuales' | 'evidencias' | 'participantes'>('info');
  
  // Formulario para crear indicador
  formIndicador!: FormGroup;
  mostrarFormIndicador = signal(false);
  loadingIndicador = signal(false);
  errorIndicador = signal<string | null>(null);
  
  // Formulario para asignar responsable
  formResponsable!: FormGroup;
  formEditarResponsable!: FormGroup;
  mostrarFormResponsable = signal(false);
  responsableEditando = signal<number | null>(null); // ID del responsable que se está editando
  loadingResponsable = signal(false);
  errorResponsable = signal<string | null>(null);
  tipoPersonaSeleccionado = signal<'docente' | 'estudiante' | 'administrativo' | null>(null);
  // Mapa para guardar el tipo de persona original cuando se crea un responsable
  // Clave: idActividadResponsable, Valor: 'docente' | 'estudiante' | 'administrativo'
  tipoPersonaPorResponsable = new Map<number, 'docente' | 'estudiante' | 'administrativo'>();
  
  // Métodos helper para obtener personas disponibles
  getPersonasDisponiblesPorTipo(tipo: 'docente' | 'estudiante' | 'administrativo'): any[] {
    if (tipo === 'docente') {
      return this.docentes();
    } else if (tipo === 'estudiante') {
      return this.estudiantes();
    } else {
      return this.administrativos();
    }
  }
  
  // Listas de personas
  docentes = signal<Docente[]>([]);
  estudiantes = signal<Estudiante[]>([]);
  administrativos = signal<Administrativo[]>([]);
  usuarios = signal<Usuario[]>([]);
  loadingPersonas = signal(false);

  // Signals para controlar el estado de las secciones (ocultar/mostrar)
  seccionPlanificacionExpandida = signal(true);
  seccionInformacionExpandida = signal(true);
  seccionResponsablesExpandida = signal(true);

  ngOnInit(): void {
    this.initializeFormIndicador();
    this.initializeFormResponsable();
    this.initializeFormEditarResponsable();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadActividad(+id);
      this.loadIndicadoresList();
      this.loadDepartamentos();
      
      // Verificar si hay un query param 'tab' para establecer el tab automáticamente
      const tabParam = this.route.snapshot.queryParams['tab'];
      if (tabParam && this.isValidTab(tabParam)) {
        this.setTab(tabParam as any);
        // Si se está regresando a la pestaña de evidencias, recargar evidencias
        if (tabParam === 'evidencias' && id) {
          this.loadEvidencias(+id);
        }
      }
      
      // Suscribirse a cambios en query params para recargar evidencias cuando se regresa
      this.route.queryParams.subscribe(params => {
        if (params['tab'] === 'evidencias' && id) {
          // Recargar evidencias cuando se regresa a la pestaña de evidencias
          this.loadEvidencias(+id);
        }
      });
      this.loadCategoriasActividad();
    this.loadTiposProtagonista();
    this.loadTiposResponsable();
    this.loadTiposEvidencia();
      this.loadCapacidadesInstaladas();
      this.loadEstadosActividad();
      // Cargar todas las personas para poder enriquecer los responsables
      this.loadTodasLasPersonas();
      // Las evidencias se cargan automáticamente en loadActividad
    }
  }

  loadDepartamentos(): void {
    this.catalogosService.getDepartamentos().subscribe({
      next: (data) => {
        this.todosLosDepartamentos.set(data);
      },
      error: (err) => {
        console.error('Error loading departamentos:', err);
      }
    });
  }

  getNombreDepartamento(departamentoId?: number): string {
    if (!departamentoId) return 'Sin asignar';
    const dept = this.todosLosDepartamentos().find(d => d.id === departamentoId);
    return dept?.nombre || `ID: ${departamentoId}`;
  }

  loadCategoriasActividad(): void {
    this.catalogosService.getCategoriasActividad().subscribe({
      next: (data) => {
        this.categoriasActividad.set(data);
      },
      error: (err) => {
        console.error('Error loading categorias actividad:', err);
      }
    });
  }

  loadTiposProtagonista(): void {
    this.catalogosService.getTiposProtagonista().subscribe({
      next: (data) => {
        this.tiposProtagonista.set(data.filter(t => t.activo !== false));
      },
      error: (err) => {
        console.error('Error loading tipos protagonista:', err);
      }
    });
  }

  loadTiposEvidencia(): void {
    this.catalogosService.getTiposEvidencia().subscribe({
      next: (data) => {
        this.tiposEvidencia.set(data || []);
      },
      error: (err) => {
        console.error('Error loading tipos evidencia:', err);
        this.tiposEvidencia.set([]);
      }
    });
  }

  loadCapacidadesInstaladas(): void {
    this.catalogosService.getCapacidadesInstaladas().subscribe({
      next: (data) => {
        this.capacidadesInstaladas.set(data || []);
      },
      error: (err) => {
        console.error('Error loading capacidades instaladas:', err);
        this.capacidadesInstaladas.set([]);
      }
    });
  }

  loadEstadosActividad(): void {
    this.catalogosService.getEstadosActividad().subscribe({
      next: (data) => {
        this.estadosActividad.set(data || []);
      },
      error: (err) => {
        console.error('Error loading estados actividad:', err);
        this.estadosActividad.set([]);
      }
    });
  }

  getIdCapacidadInstalada(): number | undefined {
    const actividad = this.actividad();
    if (!actividad) return undefined;
    const actividadData = actividad as any;
    
    // Buscar en diferentes formatos - incluyendo todas las variaciones posibles
    const allKeys = Object.keys(actividadData);
    const capacidadKeys = allKeys.filter(k => 
      k.toLowerCase().includes('capacidad') || 
      k.toLowerCase().includes('local') ||
      k.toLowerCase().includes('instalada')
    );
    
    let id = actividad.idCapacidadInstalada 
      ?? actividadData.IdCapacidadInstalada 
      ?? actividadData.idCapacidadInstalada
      ?? actividadData.IdCapacidad
      ?? actividadData.idCapacidad
      ?? actividadData.CapacidadInstaladaId
      ?? actividadData.capacidadInstaladaId
      ?? actividadData.IdInstalacion
      ?? actividadData.id_instalacion
      ?? actividadData.idInstalacion;
    
    // Si viene como objeto relacionado, extraer el ID
    if (!id && actividadData.CapacidadInstalada) {
      const capacidadObj = actividadData.CapacidadInstalada;
      id = capacidadObj.IdCapacidadInstalada ?? capacidadObj.idCapacidadInstalada 
        ?? capacidadObj.Id ?? capacidadObj.id
        ?? capacidadObj.IdInstalacion ?? capacidadObj.id_instalacion ?? capacidadObj.idInstalacion;
      if (id) {
        console.log('✅ ID encontrado en objeto CapacidadInstalada:', id);
      }
    }
    
    if (!id && actividadData.capacidadInstalada) {
      const capacidadObj = actividadData.capacidadInstalada;
      id = capacidadObj.IdCapacidadInstalada ?? capacidadObj.idCapacidadInstalada 
        ?? capacidadObj.Id ?? capacidadObj.id
        ?? capacidadObj.IdInstalacion ?? capacidadObj.id_instalacion ?? capacidadObj.idInstalacion;
      if (id) {
        console.log('✅ ID encontrado en objeto capacidadInstalada:', id);
      }
    }
    
    // Si no se encontró, buscar en todas las claves relacionadas
    if (!id && capacidadKeys.length > 0) {
      for (const key of capacidadKeys) {
        const value = actividadData[key];
        if (value !== null && value !== undefined) {
          if (typeof value === 'number') {
            id = value;
            console.log('✅ ID encontrado en clave numérica:', key, 'valor:', value);
            break;
          } else if (typeof value === 'object' && value !== null) {
            // Si es un objeto, intentar extraer el ID
            const objId = value.IdCapacidadInstalada ?? value.idCapacidadInstalada 
              ?? value.Id ?? value.id;
            if (objId) {
              id = objId;
              console.log('✅ ID encontrado en objeto de clave:', key, 'valor:', objId);
              break;
            }
          }
        }
      }
    }
    
    const valoresCapacidad = capacidadKeys.reduce((acc, k) => { acc[k] = actividadData[k]; return acc; }, {} as any);
    
    console.log('🔍 getIdCapacidadInstalada:', {
      id,
      idCapacidadInstalada: actividad.idCapacidadInstalada,
      IdCapacidadInstalada: actividadData.IdCapacidadInstalada,
      capacidadKeys,
      valoresCapacidad,
      detalleValores: capacidadKeys.map(k => ({ clave: k, valor: actividadData[k], tipo: typeof actividadData[k] })),
      capacidadesCargadas: this.capacidadesInstaladas().length
    });
    
    // Si el ID es null o undefined, retornar undefined
    return (id !== null && id !== undefined) ? id : undefined;
  }

  getNombreCapacidadInstalada(id?: number): string {
    if (!id) return 'Sin local asignado';
    const capacidades = this.capacidadesInstaladas();
    const cache = this.capacidadInstaladaCache();
    
    // Verificar cache primero
    if (cache.has(id)) {
      return cache.get(id) || `ID: ${id}`;
    }
    
    // Buscar en la lista cargada
    let capacidad = capacidades.find(c => {
      const cId = c.id || c.idCapacidadInstalada || c.Id || c.IdCapacidadInstalada 
        || c.id_instalacion || c.IdInstalacion || c.idInstalacion;
      return Number(cId) === Number(id);
    });
    
    if (capacidad) {
      const nombre = capacidad.nombre || capacidad.Nombre || capacidad.nombreCapacidadInstalada 
        || capacidad.nombreInstalacion || capacidad.NombreInstalacion || `ID: ${id}`;
      // Guardar en cache después del renderizado para evitar error NG0600
      setTimeout(() => {
        const currentCache = this.capacidadInstaladaCache();
        const newCache = new Map(currentCache);
        newCache.set(id, nombre);
        this.capacidadInstaladaCache.set(newCache);
      }, 0);
      return nombre;
    }
    
    // Si no se encuentra en la lista, cargarlo desde el endpoint
    console.log('🔍 Capacidad no encontrada en lista, cargando desde endpoint para ID:', id);
    this.catalogosService.getCapacidadInstaladaById(id).subscribe({
      next: (data) => {
        if (data) {
          const nombre = data.nombre || data.nombreInstalacion || data.NombreInstalacion || data.Nombre || '';
          // Guardar en cache después del renderizado para evitar error NG0600
          setTimeout(() => {
            const currentCache = this.capacidadInstaladaCache();
            const newCache = new Map(currentCache);
            newCache.set(id, nombre || `ID: ${id}`);
            this.capacidadInstaladaCache.set(newCache);
            
            // Agregar a la lista para futuras búsquedas
            const capacidadData = {
              id: data.id || data.idCapacidadInstalada || data.IdCapacidadInstalada 
                || data.id_instalacion || data.IdInstalacion || data.idInstalacion || id,
              nombre: nombre || `ID: ${id}`
            };
            const capacidadesActuales = this.capacidadesInstaladas();
            if (!capacidadesActuales.find(c => {
              const cId = c.id || c.idCapacidadInstalada || c.id_instalacion;
              return Number(cId) === Number(capacidadData.id);
            })) {
              this.capacidadesInstaladas.set([...capacidadesActuales, capacidadData]);
            }
            this.cdr.detectChanges();
          }, 0);
        }
      },
      error: (err) => {
        console.error('Error cargando capacidad instalada por ID:', err);
        // Guardar error en cache después del renderizado para evitar error NG0600
        setTimeout(() => {
          const currentCache = this.capacidadInstaladaCache();
          const newCache = new Map(currentCache);
          newCache.set(id, `ID: ${id}`);
          this.capacidadInstaladaCache.set(newCache);
        }, 0);
      }
    });
    
    // Retornar placeholder mientras se carga
    return 'Cargando...';
  }

  getNombreResponsable(resp: ActividadResponsable): string {
    // Buscar nombre en todos los campos posibles según el tipo de responsable
    // Prioridad según los campos que vienen del backend en /api/actividad-responsable/actividad/{id}
    return resp.nombrePersona || 
           resp.nombreUsuario ||      // Para usuarios
           resp.nombreDocente ||      // Para docentes
           resp.nombreAdmin ||        // Para administrativos
           resp.nombreEstudiante ||   // Para estudiantes
           resp.nombreResponsableExterno || // Para responsables externos
           `Responsable ${resp.idActividadResponsable}`;
  }

  getCantidadTotalParticipantesProtagonistas(): number {
    const actividad = this.actividad();
    if (!actividad) return 0;
    const actividadData = actividad as any;
    const valor = actividadData.cantidadTotalParticipantesProtagonistas ?? actividadData.CantidadTotalParticipantesProtagonistas;
    return valor !== undefined && valor !== null ? valor : 0;
  }

  getNombresTiposActividad(): string {
    const actividad = this.actividad();
    if (!actividad || !actividad.idTipoActividad) return 'Sin asignar';
    
    const ids = Array.isArray(actividad.idTipoActividad) 
      ? actividad.idTipoActividad 
      : [actividad.idTipoActividad];
    
    if (ids.length === 0) return 'Sin asignar';
    
    const nombres = ids.map(id => {
      const tipo = this.categoriasActividad().find(t => (t.idCategoriaActividad || t.id) === id);
      return tipo?.nombre || `ID: ${id}`;
    }).filter(n => n);
    
    return nombres.length > 0 ? nombres.join(', ') : 'Sin asignar';
  }

  getNombresProtagonistas(): string {
    const actividad = this.actividad();
    if (!actividad || !actividad.idTipoProtagonista) return 'Sin asignar';
    
    const ids = Array.isArray(actividad.idTipoProtagonista) 
      ? actividad.idTipoProtagonista 
      : [actividad.idTipoProtagonista];
    
    if (ids.length === 0) return 'Sin asignar';
    
    const nombres = ids.map(id => {
      const tipo = this.tiposProtagonista().find(t => t.id === id);
      return tipo?.nombre || `ID: ${id}`;
    }).filter(n => n);
    
    return nombres.length > 0 ? nombres.join(', ') : 'Sin asignar';
  }

  // Métodos helper para obtener arrays de datos para mostrar como chips
  getTiposActividadArray(): any[] {
    const actividad = this.actividad();
    if (!actividad || !actividad.idTipoActividad) return [];
    
    const ids = Array.isArray(actividad.idTipoActividad) 
      ? actividad.idTipoActividad 
      : [actividad.idTipoActividad];
    
    return ids.map(id => {
      const tipo = this.categoriasActividad().find(t => (t.idCategoriaActividad || t.id) === id);
      return tipo || { id, nombre: `ID: ${id}` };
    }).filter(t => t);
  }

  getProtagonistasArray(): any[] {
    const actividad = this.actividad();
    if (!actividad) return [];
    
    const actividadData = actividad as any;
    let ids: number[] = [];
    
    // Buscar en diferentes formatos
    // Formato 1: idTiposProtagonistas (array, plural) - formato preferido
    if (actividadData.idTiposProtagonistas && Array.isArray(actividadData.idTiposProtagonistas)) {
      ids = actividadData.idTiposProtagonistas.filter((id: any) => id != null && id > 0);
    }
    // Formato 2: IdTiposProtagonistas (array, PascalCase)
    else if (actividadData.IdTiposProtagonistas && Array.isArray(actividadData.IdTiposProtagonistas)) {
      ids = actividadData.IdTiposProtagonistas.filter((id: any) => id != null && id > 0);
    }
    // Formato 3: idTipoProtagonista (single o array, legacy)
    else if (actividad.idTipoProtagonista) {
      ids = Array.isArray(actividad.idTipoProtagonista) 
        ? actividad.idTipoProtagonista.filter((id: any) => id != null && id > 0)
        : [actividad.idTipoProtagonista].filter((id: any) => id != null && id > 0);
    }
    // Formato 4: IdTipoProtagonista (single, PascalCase, legacy)
    else if (actividadData.IdTipoProtagonista) {
      ids = [actividadData.IdTipoProtagonista].filter((id: any) => id != null && id > 0);
    }
    
    if (ids.length === 0) return [];
    
    return ids.map(id => {
      const tipo = this.tiposProtagonista().find(t => (t.id || t.idTipoProtagonista) === id);
      return tipo || { id, nombre: `ID: ${id}` };
    }).filter(t => t);
  }

  getDepartamentosResponsablesArray(): any[] {
    const actividad = this.actividad();
    if (!actividad) return [];
    
    const deptos: any[] = [];
    const actividadData = actividad as any;
    const idsDepartamentosSet = new Set<number>();
    
    // Agregar departamento principal si existe
    if (actividad.departamentoId && actividad.nombreDepartamento) {
      const deptId = Number(actividad.departamentoId);
      if (deptId > 0 && !idsDepartamentosSet.has(deptId)) {
        idsDepartamentosSet.add(deptId);
        deptos.push({
          id: deptId,
          nombre: actividad.nombreDepartamento
        });
      }
    }
    
    // Buscar departamentos responsables en diferentes formatos
    // IMPORTANTE: Verificar TODOS los formatos, no solo el primero (usar if en lugar de else if)
    
    // Formato 1: idDepartamentosResponsables (array)
    if (actividadData.idDepartamentosResponsables && Array.isArray(actividadData.idDepartamentosResponsables)) {
      actividadData.idDepartamentosResponsables.forEach((id: any) => {
        const numId = Number(id);
        if (numId > 0 && !idsDepartamentosSet.has(numId)) {
          idsDepartamentosSet.add(numId);
        }
      });
    }
    
    // Formato 2: IdDepartamentosResponsables (array, PascalCase)
    if (actividadData.IdDepartamentosResponsables && Array.isArray(actividadData.IdDepartamentosResponsables)) {
      actividadData.IdDepartamentosResponsables.forEach((id: any) => {
        const numId = Number(id);
        if (numId > 0 && !idsDepartamentosSet.has(numId)) {
          idsDepartamentosSet.add(numId);
        }
      });
    }
    
    // Formato 3: departamentoResponsableId (single o array)
    if (actividad.departamentoResponsableId) {
      const ids = Array.isArray(actividad.departamentoResponsableId) 
        ? actividad.departamentoResponsableId
        : [actividad.departamentoResponsableId];
      ids.forEach((id: any) => {
        const numId = Number(id);
        if (numId > 0 && !idsDepartamentosSet.has(numId)) {
          idsDepartamentosSet.add(numId);
        }
      });
    }
    
    // Formato 4: nombreDepartamentoResponsable (si hay nombre pero no ID, buscar por nombre)
    if (actividadData.nombreDepartamentoResponsable) {
      const nombres = Array.isArray(actividadData.nombreDepartamentoResponsable)
        ? actividadData.nombreDepartamentoResponsable
        : [actividadData.nombreDepartamentoResponsable];
      
      nombres.forEach((nombre: string) => {
        if (nombre && nombre.trim()) {
          const dept = this.todosLosDepartamentos().find(d => 
            d.nombre?.toLowerCase() === nombre.toLowerCase() || 
            d.Nombre?.toLowerCase() === nombre.toLowerCase()
          );
          if (dept) {
            const deptId = Number(dept.id || dept.idDepartamento);
            if (deptId > 0 && !idsDepartamentosSet.has(deptId)) {
              idsDepartamentosSet.add(deptId);
            }
          }
        }
      });
    }
    
    // Mapear todos los IDs encontrados a departamentos
    idsDepartamentosSet.forEach(id => {
      const dept = this.todosLosDepartamentos().find(d => {
        const dId = Number(d.id || d.idDepartamento);
        return dId === id;
      });
      if (dept) {
        const deptId = Number(dept.id || dept.idDepartamento);
        if (!deptos.find(d => Number(d.id) === deptId)) {
          deptos.push({
            id: deptId,
            nombre: dept.nombre || dept.Nombre
          });
        }
      }
    });
    
    // También usar los departamentos cargados directamente desde el servicio
    if (this.departamentos().length > 0) {
      this.departamentos().forEach(dept => {
        const deptId = Number(dept.id || dept.idDepartamento);
        if (deptId > 0 && !deptos.find(d => Number(d.id) === deptId)) {
          deptos.push({
            id: deptId,
            nombre: dept.nombre || dept.Nombre
          });
        }
      });
    }
    
    console.log('📋 Departamentos responsables encontrados:', deptos);
    return deptos;
  }

  getTiposEvidenciaArray(): any[] {
    const actividad = this.actividad();
    if (!actividad) return [];
    
    const actividadData = actividad as any;
    const allKeys = Object.keys(actividadData);
    const evidenciaKeys = allKeys.filter(k => 
      k.toLowerCase().includes('evidencia') || 
      k.toLowerCase().includes('tipo') ||
      (k.toLowerCase().includes('id') && k.toLowerCase().includes('evidencia'))
    );
    
    // Buscar en diferentes formatos - incluyendo todas las posibles variaciones
    let idTipoEvidencias = actividadData.idTipoEvidencias 
      || actividadData.IdTipoEvidencias 
      || actividad.idTipoEvidencias
      || actividadData.IdTipoEvidencia
      || actividadData.idTipoEvidencia;
    
    // Si no se encontró, buscar en todas las claves relacionadas
    if (!idTipoEvidencias && evidenciaKeys.length > 0) {
      for (const key of evidenciaKeys) {
        const value = actividadData[key];
        if (value !== null && value !== undefined) {
          if (Array.isArray(value) && value.length > 0) {
            idTipoEvidencias = value;
            break;
          } else if (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) {
            idTipoEvidencias = value;
            break;
          }
        }
      }
    }
    
    if (!idTipoEvidencias) return [];
    
    const ids = Array.isArray(idTipoEvidencias) 
      ? idTipoEvidencias 
      : [idTipoEvidencias];
    
    return ids.map((id: number, index: number) => {
      const tipo = this.tiposEvidencia().find(t => {
        const tId = t.idTipoEvidencia || t.id || t.IdTipoEvidencia || t.Id;
        return Number(tId) === Number(id);
      });
      const tipoObj = tipo || { id, nombre: `ID: ${id}` };
      // Asegurar que siempre tenga un id único para el track
      // Usar el ID numérico si está disponible y no es vacío, de lo contrario usar el índice
      const uniqueId = (tipoObj.idTipoEvidencia && tipoObj.idTipoEvidencia !== '' && tipoObj.idTipoEvidencia != null) 
        ? tipoObj.idTipoEvidencia 
        : ((tipoObj.id && tipoObj.id !== '' && tipoObj.id != null) 
          ? tipoObj.id 
          : (id && id > 0 ? id : `evidencia-${index}`));
      tipoObj.id = uniqueId;
      tipoObj.idTipoEvidencia = uniqueId;
      // Agregar un índice único para el track (siempre numérico)
      tipoObj._trackIndex = index;
      return tipoObj;
    }).filter((t: any) => t);
  }

  // Función trackBy para tipos de evidencia
  trackByTipoEvidencia(index: number, tipo: any): any {
    return tipo._trackIndex ?? tipo.idTipoEvidencia ?? tipo.id ?? index;
  }

  // Función trackBy para estados
  trackByEstado(index: number, estado: any): any {
    return estado.idEstadoActividad ?? estado.id ?? index;
  }

  // Función trackBy para departamentos
  trackByDepartamento(index: number, dept: any): any {
    return dept.id ?? dept.idDepartamento ?? index;
  }

  // Función trackBy para evidencias
  trackByEvidencia(index: number, evidencia: any): any {
    return evidencia.idEvidencia ?? evidencia.id ?? index;
  }

  // Función trackBy genérica para personas
  trackByPersona(index: number, persona: any): any {
    return persona.id ?? index;
  }

  getActividadesAnualesSeleccionadas(): ActividadAnual[] {
    const actividad = this.actividad();
    if (!actividad) return [];
    
    // PRIMERO: Si la actividad ya tiene el array completo mapeado, usarlo directamente
    if (actividad.actividadesAnuales && Array.isArray(actividad.actividadesAnuales) && actividad.actividadesAnuales.length > 0) {
      console.log(`✅ [getActividadesAnualesSeleccionadas] Usando actividades anuales del objeto actividad: ${actividad.actividadesAnuales.length}`);
      return actividad.actividadesAnuales;
    }
    
    // FALLBACK: Buscar por IDs en el signal (método anterior)
    const actividadData = actividad as any;
    let ids: number[] = [];
    
    // Buscar en diferentes formatos
    if (actividad.idActividadAnual) {
      ids = Array.isArray(actividad.idActividadAnual) 
        ? actividad.idActividadAnual 
        : [actividad.idActividadAnual];
    } else if (actividadData.idActividadesAnuales && Array.isArray(actividadData.idActividadesAnuales)) {
      ids = actividadData.idActividadesAnuales;
    } else if (actividadData.IdActividadesAnuales && Array.isArray(actividadData.IdActividadesAnuales)) {
      ids = actividadData.IdActividadesAnuales;
    }
    
    if (ids.length === 0) return [];
    
    const actividadesCargadas = this.actividadesAnuales();
    const actividadesEncontradas = actividadesCargadas.filter(a => 
      a.idActividadAnual && ids.includes(a.idActividadAnual)
    );
    
    console.log('🔍 Actividades Anuales (fallback):', {
      idsBuscados: ids,
      actividadesCargadas: actividadesCargadas.length,
      actividadesEncontradas: actividadesEncontradas.length,
      encontradas: actividadesEncontradas.map(a => ({ id: a.idActividadAnual, nombre: a.nombre }))
    });
    
    return actividadesEncontradas;
  }

  getActividadesMensualesSeleccionadas(): ActividadMensualInst[] {
    const actividad = this.actividad();
    if (!actividad) return [];
    
    // PRIMERO: Si la actividad ya tiene el array completo mapeado, usarlo directamente
    if (actividad.actividadesMensualesInst && Array.isArray(actividad.actividadesMensualesInst) && actividad.actividadesMensualesInst.length > 0) {
      console.log(`✅ [getActividadesMensualesSeleccionadas] Usando actividades mensuales del objeto actividad: ${actividad.actividadesMensualesInst.length}`);
      return actividad.actividadesMensualesInst;
    }
    
    // FALLBACK: Buscar por IDs en el signal (método anterior)
    const actividadData = actividad as any;
    let ids: number[] = [];
    
    // Buscar en diferentes formatos
    if (actividad.idActividadMensualInst) {
      ids = Array.isArray(actividad.idActividadMensualInst) 
        ? actividad.idActividadMensualInst 
        : [actividad.idActividadMensualInst];
    } else if (actividadData.idActividadesMensualesInst && Array.isArray(actividadData.idActividadesMensualesInst)) {
      ids = actividadData.idActividadesMensualesInst;
    } else if (actividadData.IdActividadesMensualesInst && Array.isArray(actividadData.IdActividadesMensualesInst)) {
      ids = actividadData.IdActividadesMensualesInst;
    }
    
    if (ids.length === 0) return [];
    
    const actividadesCargadas = this.actividadesMensuales();
    const actividadesEncontradas = actividadesCargadas.filter(m => 
      m.idActividadMensualInst && ids.includes(m.idActividadMensualInst)
    );
    
    console.log('🔍 Actividades Mensuales (fallback):', {
      idsBuscados: ids,
      actividadesCargadas: actividadesCargadas.length,
      actividadesEncontradas: actividadesEncontradas.length,
      encontradas: actividadesEncontradas.map(m => ({ id: m.idActividadMensualInst, nombre: m.nombre }))
    });
    
    return actividadesEncontradas;
  }

  loadTiposResponsable(): void {
    // Intentar obtener tipos de responsable desde el catálogo
    // Si no existe el endpoint, simplemente no cargar nada
    this.catalogosService.getTiposResponsable().subscribe({
      next: (data) => {
        this.tiposResponsable.set(data || []);
      },
      error: (err) => {
        // Si el endpoint no existe, simplemente no cargar nada
        console.warn('⚠️ No se pudo cargar tipos de responsable (endpoint puede no existir):', err);
        this.tiposResponsable.set([]);
      }
    });
  }

  getNombreTipoResponsable(idTipoResponsable?: number): string {
    if (!idTipoResponsable) return 'Sin tipo asignado';
    const tipo = this.tiposResponsable().find(t => 
      t.id === idTipoResponsable || 
      t.idTipoResponsable === idTipoResponsable ||
      t.IdTipoResponsable === idTipoResponsable
    );
    return tipo?.nombre || tipo?.Nombre || `Tipo ID: ${idTipoResponsable}`;
  }

  initializeFormIndicador(): void {
    this.formIndicador = this.fb.group({
      codigo: ['', [Validators.required, Validators.minLength(1)]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      anio: [null, [Validators.min(2000), Validators.max(2100)]],
      meta: [null, [Validators.min(0)]],
      activo: [true]
    });
  }

  async loadEvidencias(actividadId: number): Promise<void> {
    this.evidenciasLoading.set(true);
    this.evidenciasError.set(null);
    
    // Obtener todas las evidencias y filtrar por actividad
    this.evidenciaService.getAll().subscribe({
      next: async (data) => {
        // Filtrar evidencias por idActividad Y que NO tengan idSubactividad
        // Esto asegura que las evidencias de la actividad no se muestren en subactividades
        const evidenciasFiltradas = data.filter(e => 
          e.idActividad === actividadId && 
          (!e.idSubactividad || e.idSubactividad === null || e.idSubactividad === undefined)
        );
        console.log('📎 Evidencias filtradas para actividad:', {
          totalEvidencias: data.length,
          filtradas: evidenciasFiltradas.length,
          actividadId: actividadId,
          evidenciasConSubactividad: data.filter(e => e.idActividad === actividadId && e.idSubactividad).length
        });
        this.evidencias.set(evidenciasFiltradas);
        
        // Cargar imágenes y archivos Office desde IndexedDB para cada evidencia
        const imageUrlsMap = new Map<number, string[]>();
        const officeFilesMap = new Map<number, Array<{fileName: string, mimeType: string, fileSize: number, fileIndex: number}>>();
        
        for (const evidencia of evidenciasFiltradas) {
          const evidenciaId = evidencia.idEvidencia || evidencia.id;
          if (evidenciaId) {
            // Cargar imágenes
            const images = await this.imageStorageService.getAllImages(evidenciaId);
            if (images.length > 0) {
              imageUrlsMap.set(evidenciaId, images);
            }
            
            // Cargar archivos Office
            const officeFiles = await this.imageStorageService.getAllOfficeFiles(evidenciaId);
            if (officeFiles.length > 0) {
              officeFilesMap.set(evidenciaId, officeFiles);
            }
          }
        }
        this.evidenciasImageUrls.set(imageUrlsMap);
        this.evidenciasOfficeFiles.set(officeFilesMap);
        
        this.evidenciasLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading evidencias:', err);
        this.evidenciasError.set('Error al cargar las evidencias');
        this.evidenciasLoading.set(false);
      }
    });
  }

  getEvidenciaImageUrl(evidenciaId: number): string | null {
    const urls = this.evidenciasImageUrls().get(evidenciaId);
    return urls && urls.length > 0 ? urls[0] : null;
  }

  getEvidenciaOfficeFiles(evidenciaId: number): Array<{fileName: string, mimeType: string, fileSize: number, fileIndex: number}> {
    return this.evidenciasOfficeFiles().get(evidenciaId) || [];
  }

  hasEvidenciaFiles(evidenciaId: number): boolean {
    const hasImages = (this.evidenciasImageUrls().get(evidenciaId)?.length ?? 0) > 0;
    const hasOfficeFiles = (this.evidenciasOfficeFiles().get(evidenciaId)?.length ?? 0) > 0;
    return hasImages || hasOfficeFiles;
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

  async downloadOfficeFile(evidenciaId: number, fileIndex: number): Promise<void> {
    try {
      const fileBlob = await this.imageStorageService.getOfficeFileBlob(evidenciaId, fileIndex);
      if (!fileBlob) {
        alert('No se pudo obtener el archivo');
        return;
      }

      const officeFiles = this.evidenciasOfficeFiles().get(evidenciaId);
      const file = officeFiles?.find(f => f.fileIndex === fileIndex);
      const fileName = file?.fileName || `archivo_${fileIndex}`;

      const url = URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando archivo:', error);
      alert('Error al descargar el archivo');
    }
  }

  async downloadEvidenciaZip(evidencia: Evidencia): Promise<void> {
    const evidenciaId = evidencia.idEvidencia || evidencia.id;
    if (!evidenciaId) {
      alert('No se puede descargar: ID de evidencia inválido');
      return;
    }

    try {
      console.log('📦 Iniciando creación de archivo ZIP...');
      const zip = new JSZip();
      
      // Obtener todas las imágenes
      const images = this.evidenciasImageUrls().get(evidenciaId) || [];
      console.log(`📸 Agregando ${images.length} imagen(es) al ZIP...`);
      
      for (let i = 0; i < images.length; i++) {
        const imageBlob = await this.imageStorageService.getImageBlob(evidenciaId, i);
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
      const officeFiles = this.evidenciasOfficeFiles().get(evidenciaId) || [];
      console.log(`📄 Agregando ${officeFiles.length} archivo(s) Office al ZIP...`);
      
      for (const file of officeFiles) {
        const fileBlob = await this.imageStorageService.getOfficeFileBlob(evidenciaId, file.fileIndex);
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
      let nombreActividad = this.actividad()?.nombreActividad || this.actividad()?.nombre || 'Actividad';
      let fechaActividad = '';
      
      if (this.actividad()) {
        const actividad = this.actividad()!;
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
      
      // Obtener nombre de la evidencia
      const nombreEvidencia = evidencia.descripcion || evidencia.nombreTipoEvidencia || `Evidencia_${evidenciaId}`;
      
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

  navigateToCrearEvidencia(): void {
    const actividad = this.actividad();
    if (!actividad || !actividad.id) return;
    
    // Obtener los tipos de evidencia de la actividad
    const tiposEvidencia = actividad.idTipoEvidencias || [];
    console.log('🚀 Navegando a crear evidencia. Actividad:', actividad.id, 'Tipos de evidencia:', tiposEvidencia);
    
    // Construir query params incluyendo returnUrl para regresar al detalle de actividad
    const queryParams: any = {
      actividadId: actividad.id,
      returnUrl: `/actividades/${actividad.id}?tab=evidencias` // Regresar al detalle de actividad en la pestaña de evidencias
    };
    
    // Si hay tipos de evidencia, pasarlos como query param
    if (tiposEvidencia.length > 0) {
      queryParams.tiposEvidencia = tiposEvidencia.join(',');
      console.log('📤 Query params con tipos:', queryParams);
    } else {
      console.warn('⚠️ La actividad no tiene tipos de evidencia definidos');
    }
    
    this.router.navigate(['/evidencias/nueva'], { queryParams });
  }

  navigateToEvidenciaDetail(evidenciaId: number): void {
    // En lugar de redirigir, cargar la evidencia y mostrarla dentro de la vista
    this.loadEvidenciaDetalle(evidenciaId);
  }
  
  async loadEvidenciaDetalle(evidenciaId: number): Promise<void> {
    this.evidenciaDetalleLoading.set(true);
    this.evidenciaDetalleError.set(null);
    this.evidenciaDetalleImageError.set(false);
    this.mostrarEvidenciaDetalle.set(true);
    
    // Limpiar URLs anteriores
    this.evidenciaDetalleObjectUrls.forEach(url => URL.revokeObjectURL(url));
    this.evidenciaDetalleObjectUrls = [];
    
    this.evidenciaService.getById(evidenciaId).subscribe({
      next: async (data) => {
        this.evidenciaDetalle.set(data);
        
        // Cargar todas las imágenes desde almacenamiento local del frontend (IndexedDB)
        const storedImages = await this.imageStorageService.getAllImages(data.idEvidencia);
        console.log(`📸 Cargadas ${storedImages.length} imagen(es) para evidencia ${data.idEvidencia}`);
        
        if (storedImages.length > 0) {
          this.evidenciaDetalleImageUrls.set(storedImages);
          this.evidenciaDetalleCurrentImageIndex.set(0);
          this.evidenciaDetalleImageError.set(false);
          console.log('✅ Imágenes cargadas correctamente, mostrando primera imagen');
        } else {
          this.evidenciaDetalleImageUrls.set([]);
          this.evidenciaDetalleCurrentImageIndex.set(0);
          console.log('⚠️ No se encontraron imágenes almacenadas');
        }
        this.evidenciaDetalleLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading evidencia:', err);
        this.evidenciaDetalleError.set('Error al cargar la evidencia');
        this.evidenciaDetalleLoading.set(false);
      }
    });
  }
  
  cerrarEvidenciaDetalle(): void {
    this.mostrarEvidenciaDetalle.set(false);
    this.evidenciaDetalle.set(null);
    // Limpiar object URLs
    this.evidenciaDetalleObjectUrls.forEach(url => URL.revokeObjectURL(url));
    this.evidenciaDetalleObjectUrls = [];
    this.evidenciaDetalleImageUrls.set([]);
    this.evidenciaDetalleCurrentImageIndex.set(0);
  }
  
  getEvidenciaDetalleCurrentImageUrl(): string | null {
    const urls = this.evidenciaDetalleImageUrls();
    const index = this.evidenciaDetalleCurrentImageIndex();
    return urls.length > 0 && index >= 0 && index < urls.length ? urls[index] : null;
  }
  
  get evidenciaDetalleTotalImages(): number {
    return this.evidenciaDetalleImageUrls().length;
  }
  
  get evidenciaDetalleCurrentImageNumber(): number {
    return this.evidenciaDetalleCurrentImageIndex() + 1;
  }
  
  evidenciaDetalleCanGoPrevious(): boolean {
    return this.evidenciaDetalleCurrentImageIndex() > 0;
  }
  
  evidenciaDetalleCanGoNext(): boolean {
    return this.evidenciaDetalleCurrentImageIndex() < this.evidenciaDetalleTotalImages - 1;
  }
  
  evidenciaDetallePreviousImage(): void {
    if (this.evidenciaDetalleCanGoPrevious()) {
      this.evidenciaDetalleCurrentImageIndex.set(this.evidenciaDetalleCurrentImageIndex() - 1);
    }
  }
  
  evidenciaDetalleNextImage(): void {
    if (this.evidenciaDetalleCanGoNext()) {
      this.evidenciaDetalleCurrentImageIndex.set(this.evidenciaDetalleCurrentImageIndex() + 1);
    }
  }
  
  onEvidenciaDetalleImageError(event: Event): void {
    console.error('❌ Error cargando imagen:', event);
    this.evidenciaDetalleImageError.set(true);
  }
  
  async downloadEvidenciaDetalleFile(): Promise<void> {
    const evidencia = this.evidenciaDetalle();
    if (!evidencia) return;
    
    const urls = this.evidenciaDetalleImageUrls();
    if (urls.length === 0) {
      alert('No hay archivos disponibles para descargar');
      return;
    }
    
    try {
      const currentUrl = this.getEvidenciaDetalleCurrentImageUrl();
      if (currentUrl) {
        const link = document.createElement('a');
        link.href = currentUrl;
        link.download = `evidencia-${evidencia.idEvidencia}-${this.evidenciaDetalleCurrentImageIndex() + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error descargando archivo:', error);
      alert('Error al descargar el archivo');
    }
  }
  
  navigateToEditEvidencia(): void {
    const id = this.evidenciaDetalle()?.idEvidencia;
    const actividad = this.actividad();
    if (id) {
      if (actividad?.id) {
        // Si viene del detalle de actividad, incluir returnUrl para regresar
        this.router.navigate(['/evidencias', id, 'editar'], {
          queryParams: { returnUrl: `/actividades/${actividad.id}?tab=evidencias` }
        });
      } else {
        this.router.navigate(['/evidencias', id, 'editar']);
      }
    }
  }
  
  onDeleteEvidencia(): void {
    const id = this.evidenciaDetalle()?.idEvidencia;
    if (id && confirm('¿Está seguro de que desea eliminar esta evidencia?')) {
      this.evidenciaService.delete(id).subscribe({
        next: () => {
          this.cerrarEvidenciaDetalle();
          // Recargar evidencias
          const actividadId = this.actividad()?.id;
          if (actividadId) {
            this.loadEvidencias(actividadId);
          }
        },
        error: (err) => {
          console.error('Error deleting evidencia:', err);
          this.evidenciaDetalleError.set('Error al eliminar la evidencia');
        }
      });
    }
  }

  loadActividad(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.actividadesService.get(id).subscribe({
      next: (data) => {
        const dataAny = data as any;
        const allKeys = Object.keys(dataAny);
        const keysWithCapacidad = allKeys.filter(k => k.toLowerCase().includes('capacidad') || k.toLowerCase().includes('local'));
        
        console.log('🔍 CAPACIDAD INSTALADA - Datos de actividad:', {
          id: data.id,
          idCapacidadInstalada: data.idCapacidadInstalada,
          keysWithCapacidad,
          valoresCapacidad: keysWithCapacidad.reduce((acc, k) => { acc[k] = dataAny[k]; return acc; }, {} as any)
        });
        this.actividad.set(data);
        
        // Usar el endpoint dedicado GET /api/actividad-responsable/actividad/{idActividad}
        // Este endpoint gestiona todos los campos necesarios según la documentación del backend
        this.loadResponsables(id);
        
        // Cargar evidencias de la actividad
        this.loadEvidencias(id);
        
        // Subactividades
        if (data.subactividades && Array.isArray(data.subactividades)) {
          this.subactividades.set(data.subactividades);
        }
        
        // Indicadores - crear array desde los datos del indicador asociado
        // Solo crear si idIndicador existe y no es null
        if (data.idIndicador !== null && data.idIndicador !== undefined && Number(data.idIndicador) > 0) {
          const indicadorData: ActividadIndicador = {
            idActividadIndicador: 0, // No tenemos este ID, usar 0 como placeholder
            idActividad: data.id,
            idIndicador: data.idIndicador,
            nombreIndicador: data.nombreIndicador || data.nombreIndicadorAsociado || '',
            codigoIndicador: data.codigoIndicadorAsociado || data.codigoIndicador || '',
            metaAnual: data.metaIndicador,
            metaPeriodo: undefined,
            metaAlcanzada: data.metaAlcanzada,
            porcentajeCumplimiento: data.metaCumplimiento,
            valoracionCualitativa: data.valoracionIndicadorEstrategico,
            brechas: data.brechaEstrategica,
            evidenciaResumen: undefined
          };
          this.indicadores.set([indicadorData]);
          
          // Expandir automáticamente la sección de planificación si hay un indicador
          // Esto aplica tanto para actividades planificadas como no planificadas
          this.seccionPlanificacionExpandida.set(true);
          console.log('✅ Sección de planificación expandida automáticamente porque hay indicador:', data.idIndicador);
        } else {
          // Si no hay indicador o es null, limpiar los indicadores
          console.log('📊 No hay indicador o es null, limpiando indicadores...');
          this.indicadores.set([]);
          // No expandir la sección si no hay indicador (a menos que sea planificada)
          if (!data.esPlanificada) {
            this.seccionPlanificacionExpandida.set(false);
          }
        }
        
        // Usar las actividades anuales y mensuales que vienen directamente en la respuesta del GET
        // El servicio de actividades ya las mapea correctamente
        console.log(`🔍 [ActividadDetail] Verificando actividades anuales y mensuales en data:`, {
          tieneActividadesAnuales: !!(data.actividadesAnuales && Array.isArray(data.actividadesAnuales)),
          cantidadAnuales: data.actividadesAnuales?.length || 0,
          tieneActividadesMensualesInst: !!(data.actividadesMensualesInst && Array.isArray(data.actividadesMensualesInst)),
          cantidadMensuales: data.actividadesMensualesInst?.length || 0,
          keys: Object.keys(data).filter(k => k.toLowerCase().includes('anual') || k.toLowerCase().includes('mensual')),
          muestraActividadesAnuales: data.actividadesAnuales ? JSON.stringify(data.actividadesAnuales.slice(0, 1)) : 'no existe',
          muestraActividadesMensualesInst: data.actividadesMensualesInst ? JSON.stringify(data.actividadesMensualesInst.slice(0, 1)) : 'no existe'
        });
        
        // PRIMERO: Intentar usar los datos mapeados del servicio
        // El servicio ya mapeó actividadesAnuales y actividadesMensualesInst desde la respuesta del backend
        console.log(`🔍 [ActividadDetail] Verificando data después del mapeo:`, {
          tieneActividadesAnuales: !!(data.actividadesAnuales && Array.isArray(data.actividadesAnuales)),
          cantidadAnuales: data.actividadesAnuales?.length || 0,
          tieneActividadesMensualesInst: !!(data.actividadesMensualesInst && Array.isArray(data.actividadesMensualesInst)),
          cantidadMensuales: data.actividadesMensualesInst?.length || 0,
          tipoAnuales: typeof data.actividadesAnuales,
          tipoMensuales: typeof data.actividadesMensualesInst
        });
        
        if (data.actividadesAnuales && Array.isArray(data.actividadesAnuales) && data.actividadesAnuales.length > 0) {
          console.log(`✅ [ActividadDetail] Usando actividades anuales mapeadas del servicio: ${data.actividadesAnuales.length} actividades`);
          console.log(`📋 [ActividadDetail] Primera actividad anual mapeada:`, JSON.stringify(data.actividadesAnuales[0], null, 2));
          this.actividadesAnuales.set(data.actividadesAnuales);
        } else {
          console.log(`⚠️ [ActividadDetail] No se encontraron actividades anuales mapeadas en data.actividadesAnuales`);
          console.log(`🔍 [ActividadDetail] data.actividadesAnuales =`, data.actividadesAnuales);
          // Si no vienen en la respuesta, intentar cargar por IDs como fallback
          const tieneActividadesAnuales = data.idActividadAnual || 
            (dataAny.idActividadesAnuales && Array.isArray(dataAny.idActividadesAnuales) && dataAny.idActividadesAnuales.length > 0) ||
            (dataAny.IdActividadesAnuales && Array.isArray(dataAny.IdActividadesAnuales) && dataAny.IdActividadesAnuales.length > 0);
          if (tieneActividadesAnuales) {
            console.log(`⚠️ [ActividadDetail] Usando fallback por IDs para actividades anuales`);
            this.loadActividadesAnuales();
          } else {
            console.log(`⚠️ [ActividadDetail] No hay IDs de actividades anuales, estableciendo array vacío`);
            this.actividadesAnuales.set([]);
          }
        }
        
        // PRIMERO: Intentar usar los datos mapeados del servicio
        if (data.actividadesMensualesInst && Array.isArray(data.actividadesMensualesInst) && data.actividadesMensualesInst.length > 0) {
          console.log(`✅ [ActividadDetail] Usando actividades mensuales mapeadas del servicio: ${data.actividadesMensualesInst.length} actividades`);
          console.log(`📋 [ActividadDetail] Primera actividad mensual mapeada:`, JSON.stringify(data.actividadesMensualesInst[0], null, 2));
          this.actividadesMensuales.set(data.actividadesMensualesInst);
        } else {
          console.log(`⚠️ [ActividadDetail] No se encontraron actividades mensuales mapeadas en data.actividadesMensualesInst`);
          console.log(`🔍 [ActividadDetail] data.actividadesMensualesInst =`, data.actividadesMensualesInst);
          // Si no vienen en la respuesta y ya cargamos actividades anuales, las mensuales se cargarán automáticamente
          // Si no hay actividades anuales, limpiar las mensuales
          if (this.actividadesAnuales().length === 0) {
            console.log(`⚠️ [ActividadDetail] No hay actividades anuales, estableciendo actividades mensuales vacías`);
            this.actividadesMensuales.set([]);
          }
        }
        
        // Departamentos - crear array desde los datos del departamento
        const departamentosData: any[] = [];
        
        // Agregar departamento principal si existe
        if (data.departamentoId && data.nombreDepartamento) {
          departamentosData.push({
            id: data.departamentoId,
            nombre: data.nombreDepartamento
          });
        }
        
        // Buscar departamentos responsables en diferentes formatos
        // Formato 1: idDepartamentosResponsables (array)
        if (dataAny.idDepartamentosResponsables && Array.isArray(dataAny.idDepartamentosResponsables)) {
          dataAny.idDepartamentosResponsables.forEach((id: number) => {
            if (id && id > 0) {
              const dept = this.todosLosDepartamentos().find(d => d.id === id || d.idDepartamento === id);
              if (dept && !departamentosData.find(d => d.id === dept.id || d.id === dept.idDepartamento)) {
                departamentosData.push({
                  id: dept.id || dept.idDepartamento,
                  nombre: dept.nombre || dept.Nombre
                });
              }
            }
          });
        }
        // Formato 2: departamentoResponsableId (single o array)
        else if (data.departamentoResponsableId) {
          const ids = Array.isArray(data.departamentoResponsableId) 
            ? data.departamentoResponsableId 
            : [data.departamentoResponsableId];
          
          ids.forEach(id => {
            if (id && id > 0) {
              const dept = this.todosLosDepartamentos().find(d => d.id === id || d.idDepartamento === id);
              if (dept && !departamentosData.find(d => d.id === dept.id || d.id === dept.idDepartamento)) {
                departamentosData.push({
                  id: dept.id || dept.idDepartamento,
                  nombre: dept.nombre || dept.Nombre
                });
              } else if (data.nombreDepartamentoResponsable && !departamentosData.find(d => d.id === id)) {
                // Si no se encuentra en la lista pero hay nombre, usar el nombre
                const nombres = Array.isArray(data.nombreDepartamentoResponsable)
                  ? data.nombreDepartamentoResponsable
                  : [data.nombreDepartamentoResponsable];
                const nombre = nombres.find((n: string, idx: number) => idx < ids.length && ids[idx] === id) || nombres[0];
                if (nombre) {
                  departamentosData.push({
                    id: id,
                    nombre: nombre
                  });
                }
              }
            }
          });
        }
        // Formato 3: nombreDepartamentoResponsable (si hay nombre pero no ID)
        else if (data.nombreDepartamentoResponsable) {
          const nombres = Array.isArray(data.nombreDepartamentoResponsable)
            ? data.nombreDepartamentoResponsable
            : [data.nombreDepartamentoResponsable];
          
          nombres.forEach((nombre: string) => {
            const dept = this.todosLosDepartamentos().find(d => 
              d.nombre?.toLowerCase() === nombre.toLowerCase() || 
              d.Nombre?.toLowerCase() === nombre.toLowerCase()
            );
            if (dept && !departamentosData.find(d => d.id === dept.id || d.id === dept.idDepartamento)) {
              departamentosData.push({
                id: dept.id || dept.idDepartamento,
                nombre: dept.nombre || dept.Nombre
              });
            } else if (!departamentosData.find(d => d.nombre === nombre)) {
              // Si no se encuentra, agregar con el nombre proporcionado
              departamentosData.push({
                id: 0, // ID desconocido
                nombre: nombre
              });
            }
          });
        }
        
        this.departamentos.set(departamentosData);
        
        // Ediciones
        if (data.ediciones && Array.isArray(data.ediciones)) {
          this.ediciones.set(data.ediciones);
        }
        
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading actividad:', err);
        console.error('Error details:', err.error);
        console.error('Error status:', err.status);
        
        let errorMessage = 'Error al cargar la actividad';
        
        if (err.status === 500) {
          const errorText = typeof err.error === 'string' ? err.error : (err.error?.details || JSON.stringify(err.error || {}));
          
          if (errorText.includes('Invalid column name')) {
            // Extraer las columnas problemáticas del mensaje de error
            const columnMatches = errorText.match(/Invalid column name '([^']+)'/g);
            const problematicColumns: string[] = [];
            
            if (columnMatches) {
              columnMatches.forEach((match: string) => {
                const columnName = match.match(/'([^']+)'/)?.[1];
                if (columnName && !problematicColumns.includes(columnName)) {
                  problematicColumns.push(columnName);
                }
              });
            }
            
            let columnsList = '';
            if (problematicColumns.length > 0) {
              columnsList = '\n\nColumnas problemáticas:\n' + problematicColumns.map(col => `• ${col}`).join('\n');
            }
            
            errorMessage = '❌ Error del servidor: El backend está intentando acceder a columnas que no existen en la base de datos.' +
                          columnsList +
                          '\n\nPor favor, contacta al administrador del backend para corregir el problema.\n' +
                          'El backend necesita actualizar su código para eliminar las referencias a estas columnas.';
          } else {
            errorMessage = 'Error interno del servidor al cargar la actividad.\n\n' +
                          'Por favor, intenta nuevamente o contacta al administrador.';
          }
        } else if (err.status === 404) {
          errorMessage = 'La actividad no fue encontrada.';
        } else if (err.error?.message) {
          errorMessage = `Error: ${err.error.message}`;
        }
        
        this.error.set(errorMessage);
        this.loading.set(false);
      }
    });
  }

  loadResponsables(id: number): void {
    // Siempre usar el endpoint dedicado /api/actividad-responsable/actividad/{id}
    // para obtener los responsables desde la tabla actividad-responsable
    console.log(`📋 [ActividadDetail] Cargando responsables para actividad ID: ${id}`);
    console.log(`📋 [ActividadDetail] Endpoint: /api/actividad-responsable/actividad/${id}`);
    
    // Verificar que el ID de la actividad actual coincide
    const actividadActual = this.actividad();
    if (actividadActual) {
      console.log(`📋 [ActividadDetail] Actividad actual ID: ${actividadActual.id || actividadActual.idActividad}`);
      console.log(`📋 [ActividadDetail] Actividad actual nombre: ${actividadActual.nombreActividad || actividadActual.nombre}`);
    }
    
    this.responsableService.getByActividad(id).subscribe({
      next: (data) => {
        this.procesarResponsables(data, id);
      },
      error: (err) => {
        console.error('❌ Error loading responsables desde /api/actividad-responsable:', err);
        console.error('❌ Error status:', err.status);
        console.error('❌ Error details:', err.error);
        // Si el endpoint dedicado falla, intentar con el método alternativo
        console.log('⚠️ Intentando fallback para cargar responsables...');
        this.actividadesService.getResponsables(id).subscribe({
          next: (data) => {
            console.log('⚠️ Usando fallback para cargar responsables');
            this.procesarResponsables(data, id);
          },
          error: (fallbackErr) => {
            console.error('❌ Error en fallback de responsables:', fallbackErr);
            this.responsables.set([]);
          }
        });
      }
    });
  }

  /**
   * Procesa y enriquece los responsables (usado tanto desde GET /api/actividades/{id} como desde /api/actividad-responsable/actividad/{id})
   */
  procesarResponsables(data: ActividadResponsable[], id: number): void {
    console.log(`📥 [ActividadDetail] Procesando ${data.length} responsables para actividad ${id}`);
    console.log(`📥 [ActividadDetail] Datos RAW del backend:`, JSON.stringify(data, null, 2));
    
    // Enriquecer los responsables con nombres de personas si no vienen del backend
    const responsablesEnriquecidos = data.map(resp => {
          console.log(`🔍 [ActividadDetail] Procesando responsable ${resp.idActividadResponsable}:`, {
            idActividad: resp.idActividad,
            idUsuario: resp.idUsuario,
            idDocente: resp.idDocente,
            idAdmin: resp.idAdmin,
            idEstudiante: resp.idEstudiante,
            idResponsableExterno: resp.idResponsableExterno,
            idRolResponsable: resp.idRolResponsable,
            nombrePersona: resp.nombrePersona,
            nombreUsuario: resp.nombreUsuario,
            nombreDocente: resp.nombreDocente,
            nombreAdmin: resp.nombreAdmin,
            nombreEstudiante: resp.nombreEstudiante,
            nombreResponsableExterno: resp.nombreResponsableExterno,
            rolResponsable: resp.rolResponsable,
            nombreRolResponsable: resp.nombreRolResponsable,
            cargo: resp.cargo
          });
          
          // Log específico para verificar el rol
          console.log(`🎯 [ActividadDetail] Rol del responsable ${resp.idActividadResponsable}:`, {
            rolResponsable: resp.rolResponsable,
            nombreRolResponsable: resp.nombreRolResponsable,
            idRolResponsable: resp.idRolResponsable,
            rolCalculado: this.getRolResponsable(resp)
          });
          
          // Verificar que el responsable pertenezca a la actividad correcta
          if (resp.idActividad !== id) {
            console.error(`❌ [ActividadDetail] ERROR: Responsable ${resp.idActividadResponsable} pertenece a actividad ${resp.idActividad}, no a ${id}`);
          }
          
          // PRIMERO: Usar el nombre que viene del backend si está disponible y es válido
          // Solo enriquecer si el nombre del backend no está disponible o es inválido
          let nombreEncontrado = false;
          let tipoPersonaEncontrado: 'docente' | 'estudiante' | 'administrativo' | null = null;
          
          // Verificar si el backend ya proporcionó un nombre válido
          const nombreDelBackend = resp.nombrePersona || resp.nombreUsuario || resp.nombreDocente || resp.nombreAdmin || resp.nombreEstudiante || resp.nombreResponsableExterno;
          const esNombreValido = nombreDelBackend && 
                                 !nombreDelBackend.toLowerCase().includes('administrador sistema') &&
                                 !nombreDelBackend.toLowerCase().includes('admin sistema') &&
                                 nombreDelBackend.toLowerCase() !== 'administrador';
          
          if (esNombreValido) {
            // El backend ya proporcionó un nombre válido, usarlo
            resp.nombrePersona = nombreDelBackend;
            nombreEncontrado = true;
            console.log(`✅ [ActividadDetail] Usando nombre del backend para responsable ${resp.idActividadResponsable}: ${nombreDelBackend}`);
          }
          
          // SOLO enriquecer si no encontramos un nombre válido del backend
          if (!nombreEncontrado) {
            // Primero intentar con idDocente si existe
            if (resp.idDocente && resp.idDocente > 0) {
              const docente = this.docentes().find(d => d.id === resp.idDocente);
              if (docente && docente.nombreCompleto) {
                resp.nombrePersona = docente.nombreCompleto;
                resp.nombreDocente = docente.nombreCompleto;
                resp.idDocente = resp.idDocente; // Preservar el ID
                nombreEncontrado = true;
                tipoPersonaEncontrado = 'docente';
                console.log(`✅ Enriquecido responsable ${resp.idActividadResponsable} con nombre de docente: ${docente.nombreCompleto}`);
              }
            }
            
            // Si no se encontró, intentar con idAdmin
            if (!nombreEncontrado && resp.idAdmin && resp.idAdmin > 0) {
              const admin = this.administrativos().find(a => a.id === resp.idAdmin);
              if (admin && admin.nombreCompleto) {
                resp.nombrePersona = admin.nombreCompleto;
                resp.nombreAdmin = admin.nombreCompleto;
                resp.idAdmin = resp.idAdmin; // Preservar el ID
                nombreEncontrado = true;
                tipoPersonaEncontrado = 'administrativo';
                console.log(`✅ Enriquecido responsable ${resp.idActividadResponsable} con nombre de admin: ${admin.nombreCompleto}`);
              }
            }
            
            // Si no se encontró, intentar con idEstudiante si existe
            if (!nombreEncontrado && resp.idEstudiante && resp.idEstudiante > 0) {
              const estudiante = this.estudiantes().find(e => e.id === resp.idEstudiante);
              if (estudiante && estudiante.nombreCompleto) {
                resp.nombrePersona = estudiante.nombreCompleto;
                resp.nombreEstudiante = estudiante.nombreCompleto;
                resp.idEstudiante = resp.idEstudiante; // Preservar el ID
                nombreEncontrado = true;
                tipoPersonaEncontrado = 'estudiante';
                console.log(`✅ Enriquecido responsable ${resp.idActividadResponsable} con nombre de estudiante: ${estudiante.nombreCompleto}`);
              }
            }
            
            // Si no se encontró y hay idResponsableExterno, usar el nombre del backend
            // (los responsables externos no están en las listas de personas)
            if (!nombreEncontrado && resp.idResponsableExterno && resp.idResponsableExterno > 0) {
              if (resp.nombreResponsableExterno) {
                resp.nombrePersona = resp.nombreResponsableExterno;
                nombreEncontrado = true;
                console.log(`✅ Usando nombre de responsable externo para responsable ${resp.idActividadResponsable}: ${resp.nombreResponsableExterno}`);
              }
            }
            
            // Si no se encontró y hay idUsuario, buscar en todas las listas
            // porque el backend usa IdUsuario para todos los tipos de personas
            // IMPORTANTE: El backend devuelve idUsuario pero no idDocente/idAdmin, así que debemos inferirlos
            if (!nombreEncontrado && resp.idUsuario && resp.idUsuario > 0) {
              const idUsuarioOriginal = resp.idUsuario; // Guardar el valor original para logs
              
              // Verificar si tenemos el tipo de persona guardado cuando se creó este responsable
              const tipoPersonaOriginal = this.tipoPersonaPorResponsable.get(resp.idActividadResponsable);
              
              console.log(`🔍 Buscando persona con idUsuario=${idUsuarioOriginal} en las listas cargadas...`);
              console.log(`  - Tipo de persona original (guardado): ${tipoPersonaOriginal || 'desconocido'}`);
              console.log(`  - Docentes cargados: ${this.docentes().length}`);
              console.log(`  - Administrativos cargados: ${this.administrativos().length}`);
              console.log(`  - Estudiantes cargados: ${this.estudiantes().length}`);
              
              // Estrategia de búsqueda:
              // 1. Si tenemos el tipo original guardado, buscar primero en esa lista
              // 2. Si no, buscar en todas las listas con prioridad: docentes > administrativos > estudiantes
              // 3. Si el ID existe en múltiples listas, dar prioridad a docentes sobre estudiantes
              
              // Buscar en todas las listas para ver en cuáles existe el ID
              const docenteEncontrado = this.docentes().find(d => d.id === idUsuarioOriginal);
              const adminEncontrado = this.administrativos().find(a => a.id === idUsuarioOriginal);
              const estudianteEncontrado = this.estudiantes().find(e => e.id === idUsuarioOriginal);
              
              console.log(`🔍 Resultados de búsqueda para idUsuario=${idUsuarioOriginal}:`, {
                encontradoEnDocentes: !!docenteEncontrado,
                encontradoEnAdministrativos: !!adminEncontrado,
                encontradoEnEstudiantes: !!estudianteEncontrado
              });
              
              // Si tenemos el tipo original guardado, usarlo con prioridad
              if (tipoPersonaOriginal === 'docente' && docenteEncontrado && docenteEncontrado.nombreCompleto) {
                resp.nombrePersona = docenteEncontrado.nombreCompleto;
                resp.nombreDocente = docenteEncontrado.nombreCompleto;
                resp.idDocente = idUsuarioOriginal;
                resp.idUsuario = undefined;
                nombreEncontrado = true;
                tipoPersonaEncontrado = 'docente';
                console.log(`✅ Enriquecido responsable ${resp.idActividadResponsable} con nombre de docente (tipo guardado, idUsuario=${idUsuarioOriginal} -> idDocente=${resp.idDocente}): ${docenteEncontrado.nombreCompleto}`);
              } else if (tipoPersonaOriginal === 'administrativo' && adminEncontrado && adminEncontrado.nombreCompleto) {
                resp.nombrePersona = adminEncontrado.nombreCompleto;
                resp.nombreAdmin = adminEncontrado.nombreCompleto;
                resp.idAdmin = idUsuarioOriginal;
                resp.idUsuario = undefined;
                nombreEncontrado = true;
                tipoPersonaEncontrado = 'administrativo';
                console.log(`✅ Enriquecido responsable ${resp.idActividadResponsable} con nombre de admin (tipo guardado, idUsuario=${idUsuarioOriginal} -> idAdmin=${resp.idAdmin}): ${adminEncontrado.nombreCompleto}`);
              } else if (tipoPersonaOriginal === 'estudiante' && estudianteEncontrado && estudianteEncontrado.nombreCompleto) {
                resp.nombrePersona = estudianteEncontrado.nombreCompleto;
                resp.nombreUsuario = estudianteEncontrado.nombreCompleto;
                nombreEncontrado = true;
                tipoPersonaEncontrado = 'estudiante';
                console.log(`✅ Enriquecido responsable ${resp.idActividadResponsable} con nombre de estudiante (tipo guardado, idUsuario=${idUsuarioOriginal}): ${estudianteEncontrado.nombreCompleto}`);
              }
              
              // Si no encontramos usando el tipo guardado, buscar en todas las listas con prioridad
              if (!nombreEncontrado) {
                // Prioridad: docentes > administrativos > estudiantes
                // Si el ID existe en docentes, asumir que es docente (incluso si también existe en estudiantes)
                if (docenteEncontrado && docenteEncontrado.nombreCompleto) {
                  resp.nombrePersona = docenteEncontrado.nombreCompleto;
                  resp.nombreDocente = docenteEncontrado.nombreCompleto;
                  resp.idDocente = idUsuarioOriginal;
                  resp.idUsuario = undefined;
                  nombreEncontrado = true;
                  tipoPersonaEncontrado = 'docente';
                  // Guardar el tipo inferido para futuras recargas
                  this.tipoPersonaPorResponsable.set(resp.idActividadResponsable, 'docente');
                  console.log(`✅ Enriquecido responsable ${resp.idActividadResponsable} con nombre de docente (inferido, idUsuario=${idUsuarioOriginal} -> idDocente=${resp.idDocente}): ${docenteEncontrado.nombreCompleto}`);
                } else if (adminEncontrado && adminEncontrado.nombreCompleto) {
                  resp.nombrePersona = adminEncontrado.nombreCompleto;
                  resp.nombreAdmin = adminEncontrado.nombreCompleto;
                  resp.idAdmin = idUsuarioOriginal;
                  resp.idUsuario = undefined;
                  nombreEncontrado = true;
                  tipoPersonaEncontrado = 'administrativo';
                  // Guardar el tipo inferido para futuras recargas
                  this.tipoPersonaPorResponsable.set(resp.idActividadResponsable, 'administrativo');
                  console.log(`✅ Enriquecido responsable ${resp.idActividadResponsable} con nombre de admin (inferido, idUsuario=${idUsuarioOriginal} -> idAdmin=${resp.idAdmin}): ${adminEncontrado.nombreCompleto}`);
                } else if (estudianteEncontrado && estudianteEncontrado.nombreCompleto) {
                  resp.nombrePersona = estudianteEncontrado.nombreCompleto;
                  resp.nombreUsuario = estudianteEncontrado.nombreCompleto;
                  nombreEncontrado = true;
                  tipoPersonaEncontrado = 'estudiante';
                  // Guardar el tipo inferido para futuras recargas
                  this.tipoPersonaPorResponsable.set(resp.idActividadResponsable, 'estudiante');
                  console.log(`✅ Enriquecido responsable ${resp.idActividadResponsable} con nombre de estudiante (inferido, idUsuario=${idUsuarioOriginal}): ${estudianteEncontrado.nombreCompleto}`);
                } else {
                  console.warn(`⚠️ No se encontró persona con idUsuario=${idUsuarioOriginal} en ninguna lista (docentes, administrativos, estudiantes)`);
                }
              }
            }
          }
          
          // Si el nombre actual es "Administrador Sistema" o similar, limpiarlo
          const nombreActual = resp.nombrePersona || resp.nombreUsuario || resp.nombreAdmin || resp.nombreDocente || resp.nombreEstudiante || resp.nombreResponsableExterno || '';
          if (nombreActual && (
            nombreActual.toLowerCase().includes('administrador sistema') ||
            nombreActual.toLowerCase().includes('admin sistema') ||
            nombreActual.toLowerCase() === 'administrador'
          )) {
            // Si encontramos un nombre válido, usarlo; si no, limpiar
            if (nombreEncontrado) {
              // Ya se asignó el nombre correcto arriba
            } else {
              resp.nombrePersona = undefined;
              resp.nombreUsuario = undefined;
              resp.nombreAdmin = undefined;
              resp.nombreDocente = undefined;
              resp.nombreEstudiante = undefined;
            }
          }
          
          // Si aún no se encontró, registrar para debugging
          if (!nombreEncontrado) {
            console.warn(`⚠️ [ActividadDetail] Responsable ${resp.idActividadResponsable} no se pudo enriquecer. IDs:`, {
              idActividad: resp.idActividad,
              idDocente: resp.idDocente,
              idAdmin: resp.idAdmin,
              idUsuario: resp.idUsuario,
              idEstudiante: resp.idEstudiante,
              idResponsableExterno: resp.idResponsableExterno,
              nombrePersona: resp.nombrePersona,
              nombreUsuario: resp.nombreUsuario,
              nombreDocente: resp.nombreDocente,
              nombreAdmin: resp.nombreAdmin,
              nombreEstudiante: resp.nombreEstudiante,
              nombreResponsableExterno: resp.nombreResponsableExterno,
              nombreDepartamento: resp.nombreDepartamento,
              docentesCargados: this.docentes().length,
              administrativosCargados: this.administrativos().length,
              estudiantesCargados: this.estudiantes().length
            });
          } else {
            console.log(`✅ [ActividadDetail] Responsable ${resp.idActividadResponsable} procesado exitosamente. Nombre final: ${resp.nombrePersona || resp.nombreUsuario || resp.nombreDocente || resp.nombreAdmin || resp.nombreEstudiante || resp.nombreResponsableExterno}`);
          }
          
          return resp;
        });
        
        // Filtrar responsables: solo mostrar aquellos que tienen personas reales asignadas
        // Excluir "Administrador Sistema" y otros usuarios del sistema
        const responsablesFiltrados = responsablesEnriquecidos.filter((resp): resp is ActividadResponsable => {
          if (!resp) return false;
          const nombre = resp.nombrePersona || resp.nombreDocente || resp.nombreAdmin || resp.nombreUsuario || resp.nombreEstudiante || resp.nombreResponsableExterno || '';
          // Excluir si el nombre es "Administrador Sistema" o similar
          const esUsuarioSistema = nombre.toLowerCase().includes('administrador sistema') || 
                                   nombre.toLowerCase().includes('admin sistema') ||
                                   nombre.toLowerCase() === 'administrador';
          
          // Incluir si:
          // 1. Tiene un nombre válido que no sea usuario del sistema
          // 2. Tiene un departamento asignado (sin persona)
          // 3. Tiene un ID de persona válido (idDocente, idAdmin, idEstudiante, idResponsableExterno, o idUsuario > 0) aunque no tenga nombre aún
          //    (esto permite mostrar responsables recién creados mientras se enriquecen)
          const tieneIdPersonaValido = Boolean(
            (resp.idDocente && resp.idDocente > 0) || 
            (resp.idAdmin && resp.idAdmin > 0) || 
            (resp.idEstudiante && resp.idEstudiante > 0) ||
            (resp.idResponsableExterno && resp.idResponsableExterno > 0) ||
            (resp.idUsuario && resp.idUsuario > 0)
          );
          
          return !esUsuarioSistema && (
            nombre.trim() !== '' || 
            (resp.nombreDepartamento && resp.nombreDepartamento.trim() !== '') ||
            tieneIdPersonaValido
          );
        });
        
        console.log(`📊 Responsables filtrados: ${responsablesFiltrados.length} de ${responsablesEnriquecidos.length}`);
        console.log('📋 Responsables antes del filtro:', responsablesEnriquecidos.map(r => r ? {
          id: r.idActividadResponsable,
          idDocente: r.idDocente,
          idAdmin: r.idAdmin,
          idUsuario: r.idUsuario,
          idEstudiante: r.idEstudiante,
          idResponsableExterno: r.idResponsableExterno,
          idRolResponsable: r.idRolResponsable,
          nombrePersona: r.nombrePersona,
          nombreDocente: r.nombreDocente,
          nombreAdmin: r.nombreAdmin,
          nombreUsuario: r.nombreUsuario,
          nombreEstudiante: r.nombreEstudiante,
          nombreResponsableExterno: r.nombreResponsableExterno,
          rolResponsable: r.rolResponsable
        } : null).filter(r => r !== null));
        console.log('📋 Responsables después del filtro:', responsablesFiltrados.map(r => ({
          id: r.idActividadResponsable,
          idDocente: r.idDocente,
          idAdmin: r.idAdmin,
          idUsuario: r.idUsuario,
          idEstudiante: r.idEstudiante,
          idResponsableExterno: r.idResponsableExterno,
          idRolResponsable: r.idRolResponsable,
          nombrePersona: r.nombrePersona,
          nombreDocente: r.nombreDocente,
          nombreAdmin: r.nombreAdmin,
          nombreUsuario: r.nombreUsuario,
          nombreEstudiante: r.nombreEstudiante,
          nombreResponsableExterno: r.nombreResponsableExterno,
          rolResponsable: r.rolResponsable
        })));
    this.responsables.set(responsablesFiltrados);
    console.log(`✅ [ActividadDetail] Responsables procesados: ${data.length} responsables originales, ${responsablesFiltrados.length} después del filtro`);
    if (data.length > 0) {
      console.log('📋 [ActividadDetail] Datos de responsables originales:', data);
      console.log('📋 [ActividadDetail] IDs de actividad de los responsables:', data.map(r => r.idActividad));
      console.log('📋 [ActividadDetail] Verificando que todos los responsables pertenezcan a la actividad:', id);
      const responsablesIncorrectos = data.filter(r => r.idActividad !== id);
      if (responsablesIncorrectos.length > 0) {
        console.error(`❌ [ActividadDetail] ADVERTENCIA: Se encontraron ${responsablesIncorrectos.length} responsables que NO pertenecen a la actividad ${id}:`, responsablesIncorrectos);
      }
    } else {
      console.warn(`⚠️ [ActividadDetail] No se encontraron responsables para la actividad ${id}`);
    }
  }

  // Estos métodos ya no son necesarios ya que los datos vienen en el objeto Actividad
  // Se mantienen como métodos privados por si se necesitan como fallback
  private loadIndicadores(id: number): void {
    this.actividadesService.getIndicadores(id).subscribe({
      next: (data) => {
        this.indicadores.set(data);
        this.loadActividadesAnuales();
      },
      error: (err) => console.error('Error loading indicadores:', err)
    });
  }

  private loadSubactividades(id: number): void {
    this.actividadesService.getSubactividades(id).subscribe({
      next: (data) => this.subactividades.set(data),
      error: (err) => console.error('Error loading subactividades:', err)
    });
  }

  private loadDepartamentosDeActividad(id: number): void {
    this.actividadesService.getDepartamentos(id).subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : (data.data || []);
        this.departamentos.set(items);
      },
      error: (err) => console.error('Error loading departamentos:', err)
    });
  }

  navigateToEdit(): void {
    const actividad = this.actividad();
    if (actividad?.id) {
      // Navegar a la ruta correcta según el tipo de actividad
      if (actividad.esPlanificada === true) {
        this.router.navigate(['/actividades-planificadas', actividad.id, 'editar']);
      } else if (actividad.esPlanificada === false) {
        this.router.navigate(['/actividades-no-planificadas', actividad.id, 'editar']);
      } else {
        // Si no se puede determinar, navegar a la vista de detalle
        this.router.navigate(['/actividades', actividad.id]);
      }
    }
  }

  onEstadoChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    const idEstadoActividad = value && value !== '' ? Number(value) : null;
    this.actualizarEstadoActividad(idEstadoActividad);
  }

  actualizarEstadoActividad(idEstadoActividad: number | null): void {
    const actividad = this.actividad();
    if (!actividad?.id) {
      alert('No se puede actualizar el estado: actividad no encontrada');
      return;
    }

    this.guardandoEstado.set(true);
    this.error.set(null);

    // El backend requiere NombreActividad como campo obligatorio
    // Incluimos el nombre actual de la actividad junto con el nuevo estado
    const updateData: any = {
      nombreActividad: actividad.nombreActividad || actividad.nombre || '',
      idEstadoActividad: idEstadoActividad || undefined
    };

    this.actividadesService.update(actividad.id, updateData).subscribe({
      next: (success) => {
        if (success) {
          // Recargar la actividad para obtener los datos actualizados
          this.loadActividad(actividad.id!);
          this.editandoEstado.set(false);
          console.log('✅ Estado de actividad actualizado correctamente');
        } else {
          alert('Error al actualizar el estado de la actividad');
        }
        this.guardandoEstado.set(false);
      },
      error: (err: any) => {
        console.error('Error updating estado actividad:', err);
        this.guardandoEstado.set(false);
        let errorMessage = 'Error al actualizar el estado de la actividad';
        if (err.error?.message) {
          errorMessage = err.error.message;
        }
        alert(errorMessage);
      }
    });
  }

  onDelete(): void {
    const id = this.actividad()?.id;
    if (id && confirm('¿Está seguro de que desea eliminar esta actividad?')) {
      this.loading.set(true);
      this.error.set(null);
      this.actividadesService.delete(id).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/actividades']);
        },
        error: (err: any) => {
          console.error('Error deleting actividad:', err);
          this.loading.set(false);
          
          // Extraer el mensaje de error del backend
          let errorMessage = 'Error al eliminar la actividad';
          
          if (err.error) {
            // El error puede venir como string o como objeto
            const errorText = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
            
            // Buscar el mensaje específico del backend
            if (errorText.includes('No se puede eliminar una actividad que tiene subactividades asociadas')) {
              errorMessage = 'No se puede eliminar esta actividad porque tiene subactividades asociadas. Por favor, elimine primero las subactividades.';
            } else if (errorText.includes('subactividades')) {
              errorMessage = 'No se puede eliminar esta actividad porque tiene relaciones con otros registros (subactividades, evidencias, etc.).';
            } else if (err.error.message) {
              errorMessage = err.error.message;
            } else if (err.error.title) {
              errorMessage = err.error.title;
            }
          } else if (err.message) {
            errorMessage = err.message;
          }
          
          this.error.set(errorMessage);
        }
      });
    }
  }

  navigateToSubactividad(id: number): void {
    this.router.navigate(['/subactividades', id]);
  }

  navigateToIndicador(id: number): void {
    this.router.navigate(['/indicadores', id]);
  }

  loadIndicadoresList(): void {
    this.indicadorService.getAll().subscribe({
      next: (data) => this.indicadoresList.set(data),
      error: (err) => console.error('Error loading indicadores list:', err)
    });
  }

  toggleFormIndicador(): void {
    this.mostrarFormIndicador.set(!this.mostrarFormIndicador());
    if (!this.mostrarFormIndicador()) {
      this.formIndicador.reset();
      this.errorIndicador.set(null);
    }
  }

  onSubmitIndicador(): void {
    if (this.formIndicador.valid) {
      this.loadingIndicador.set(true);
      this.errorIndicador.set(null);

      const formValue = this.formIndicador.value;
      const indicadorData = {
        codigo: formValue.codigo.trim(),
        nombre: formValue.nombre.trim(),
        descripcion: formValue.descripcion?.trim() || undefined,
        anio: formValue.anio ? Number(formValue.anio) : undefined,
        meta: formValue.meta !== null && formValue.meta !== undefined ? Number(formValue.meta) : undefined,
        activo: formValue.activo ?? true
      };

      this.indicadorService.create(indicadorData).subscribe({
        next: (nuevoIndicador) => {
          console.log('✅ Indicador creado:', nuevoIndicador);
          // Recargar la actividad para obtener los datos actualizados
          const actividadId = this.actividad()?.id;
          if (actividadId) {
            this.loadActividad(actividadId);
            this.loadIndicadoresList();
          }
          // Cerrar el formulario
          this.toggleFormIndicador();
          this.loadingIndicador.set(false);
        },
        error: (err) => {
          console.error('❌ Error creando indicador:', err);
          let errorMessage = 'Error al crear el indicador';
          
          if (err.error) {
            if (err.error.errors) {
              const validationErrors = err.error.errors;
              const errorMessages = Object.keys(validationErrors).map(key => {
                const messages = Array.isArray(validationErrors[key]) 
                  ? validationErrors[key].join(', ') 
                  : validationErrors[key];
                return `${key}: ${messages}`;
              });
              errorMessage = `Errores de validación:\n${errorMessages.join('\n')}`;
            } else if (err.error.message) {
              errorMessage = err.error.message;
            } else if (typeof err.error === 'string') {
              errorMessage = err.error;
            }
          } else if (err.message) {
            errorMessage = err.message;
          }
          
          this.errorIndicador.set(errorMessage);
          this.loadingIndicador.set(false);
        }
      });
    } else {
      this.formIndicador.markAllAsTouched();
    }
  }

  loadActividadesAnuales(): void {
    const actividad = this.actividad();
    if (!actividad) {
      this.actividadesAnuales.set([]);
      this.actividadesMensuales.set([]);
      return;
    }

    // Cargar actividades anuales seleccionadas por ID
    if (actividad.idActividadAnual) {
      // Manejar array o número único
      const idsActividadesAnuales = Array.isArray(actividad.idActividadAnual) 
        ? actividad.idActividadAnual 
        : [actividad.idActividadAnual];
      
      // Filtrar valores válidos y eliminar duplicados
      const idsUnicos = [...new Set(idsActividadesAnuales.filter(id => id !== null && id !== undefined && id > 0))];
      
      if (idsUnicos.length > 0) {
        console.log('🔄 Cargando actividades anuales por IDs:', idsUnicos);
        
        // Cargar solo las actividades anuales seleccionadas por ID
        const requests = idsUnicos.map(id => 
          this.actividadAnualService.getById(id)
        );
        
        Promise.all(requests.map(req => firstValueFrom(req))).then(actividadesAnuales => {
          const actividadesValidas = actividadesAnuales.filter(a => a !== null && a !== undefined);
          console.log('✅ Actividades anuales cargadas:', actividadesValidas.length);
          this.actividadesAnuales.set(actividadesValidas);
          
          // Cargar actividades mensuales relacionadas
          // Priorizar búsqueda por ID de actividad anual (más confiable)
          const requestsMensualesPorId = actividadesValidas
            .filter(a => a.idActividadAnual)
            .map(a => this.actividadMensualInstService.getByActividadAnual(a.idActividadAnual!));
          
          // Solo usar búsqueda por nombre si no hay IDs disponibles y el nombre es razonable
          const actividadesSinId = actividadesValidas.filter(a => !a.idActividadAnual);
          const requestsMensualesPorNombre = actividadesSinId
            .filter(a => {
              const nombre = a.nombre || a.nombreIndicador || '';
              // Solo buscar por nombre si el nombre existe, no está vacío y no es demasiado largo
              return nombre.trim().length > 0 && nombre.length <= 200;
            })
            .map(a => {
              const nombre = a.nombre || a.nombreIndicador || '';
              return this.actividadMensualInstService.getByNombreActividadAnual(nombre);
            });
          
          // Combinar ambas estrategias (priorizar por ID)
          const todasLasRequestsMensuales = [...requestsMensualesPorId, ...requestsMensualesPorNombre];
          
          if (todasLasRequestsMensuales.length > 0) {
            Promise.all(todasLasRequestsMensuales.map(req => firstValueFrom(req))).then(arraysMensuales => {
              // Eliminar duplicados de actividades mensuales
              const todasMensuales = arraysMensuales.flat();
              const mensualesUnicos = todasMensuales.filter((mensual, index, self) => 
                index === self.findIndex(m => 
                  m.idActividadMensualInst === mensual.idActividadMensualInst
                )
              );
              console.log('✅ Actividades mensuales cargadas:', mensualesUnicos.length);
              this.actividadesMensuales.set(mensualesUnicos);
            }).catch(err => {
              console.warn('⚠️ Error al cargar algunas actividades mensuales (esto no es crítico):', err);
              // Intentar cargar solo las que se pudieron obtener por ID
              if (requestsMensualesPorId.length > 0) {
                Promise.all(requestsMensualesPorId.map(req => firstValueFrom(req))).then(arraysPorId => {
                  const todasPorId = arraysPorId.flat();
                  const mensualesUnicosPorId = todasPorId.filter((mensual, index, self) => 
                    index === self.findIndex(m => 
                      m.idActividadMensualInst === mensual.idActividadMensualInst
                    )
                  );
                  console.log('✅ Actividades mensuales cargadas (solo por ID):', mensualesUnicosPorId.length);
                  this.actividadesMensuales.set(mensualesUnicosPorId);
                }).catch(errId => {
                  console.error('Error loading actividades mensuales por ID:', errId);
                  this.actividadesMensuales.set([]);
                });
              } else {
                this.actividadesMensuales.set([]);
              }
            });
          } else {
            this.actividadesMensuales.set([]);
          }
        }).catch(err => {
          console.error('Error loading actividades anuales:', err);
          this.actividadesAnuales.set([]);
          this.actividadesMensuales.set([]);
        });
      } else {
        this.actividadesAnuales.set([]);
        this.actividadesMensuales.set([]);
      }
    } else {
      // Si no hay actividad anual asociada, no cargar nada
      this.actividadesAnuales.set([]);
      this.actividadesMensuales.set([]);
    }

    // También cargar actividades mensuales seleccionadas directamente por ID
    if (actividad.idActividadMensualInst) {
      const idsMensuales = Array.isArray(actividad.idActividadMensualInst) 
        ? actividad.idActividadMensualInst 
        : [actividad.idActividadMensualInst];
      
      const idsMensualesUnicos = [...new Set(idsMensuales.filter(id => id !== null && id !== undefined && id > 0))];
      
      if (idsMensualesUnicos.length > 0) {
        console.log('🔄 Cargando actividades mensuales por IDs:', idsMensualesUnicos);
        
        const requestsMensuales = idsMensualesUnicos.map(id => 
          firstValueFrom(this.actividadMensualInstService.getById(id))
        );
        
        Promise.all(requestsMensuales).then(actividadesMensuales => {
          const mensualesValidas = actividadesMensuales.filter(m => m !== null && m !== undefined);
          
          // Combinar con las actividades mensuales ya cargadas (si hay)
          const mensualesActuales = this.actividadesMensuales();
          const idsActuales = new Set(mensualesActuales.map(m => m.idActividadMensualInst));
          const nuevasMensuales = mensualesValidas.filter(m => !idsActuales.has(m.idActividadMensualInst));
          
          if (nuevasMensuales.length > 0) {
            console.log('✅ Actividades mensuales adicionales cargadas:', nuevasMensuales.length);
            this.actividadesMensuales.set([...mensualesActuales, ...nuevasMensuales]);
          }
        }).catch(err => {
          console.error('Error loading actividades mensuales por ID:', err);
        });
      }
    }
  }

  setTab(tab: 'info' | 'departamentos' | 'responsables' | 'indicadores' | 'subactividades' | 'actividades-anuales' | 'evidencias' | 'participantes'): void {
    this.activeTab.set(tab);
    // Cargar estadísticas cuando se cambia al tab
    if (tab === 'participantes') {
      this.loadEstadisticasParticipantes();
    }
    // Actualizar la URL con el query param del tab
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private isValidTab(tab: string): boolean {
    const validTabs = ['info', 'departamentos', 'responsables', 'indicadores', 'subactividades', 'actividades-anuales', 'evidencias', 'participantes'];
    return validTabs.includes(tab);
  }

  getActividadesMensualesPorAnual(idActividadAnual: number): ActividadMensualInst[] {
    // Filtrar y eliminar duplicados
    const mensuales = this.actividadesMensuales().filter(m => m.idActividadAnual === idActividadAnual);
    return mensuales.filter((mensual, index, self) => 
      index === self.findIndex(m => 
        m.idActividadMensualInst === mensual.idActividadMensualInst
      )
    );
  }

  tieneActividadesMensuales(idActividadAnual: number): boolean {
    return this.getActividadesMensualesPorAnual(idActividadAnual).length > 0;
  }
  
  initializeFormResponsable(): void {
    // Pre-llenar idActividad automáticamente si está disponible
    const idActividad = this.actividad()?.id || null;
    
    this.formResponsable = this.fb.group({
      docentes: this.fb.array([]), // Array de docentes
      estudiantes: this.fb.array([]), // Array de estudiantes
      administrativos: this.fb.array([]), // Array de administrativos
      fechaAsignacion: [new Date().toISOString().split('T')[0]] // Fecha por defecto para todos
    });
    
    // Cargar todas las personas al inicializar
    this.loadTodasLasPersonas();
  }
  
  // Métodos para manejar FormArrays
  get docentesArray(): FormArray {
    return this.formResponsable.get('docentes') as FormArray;
  }
  
  get estudiantesArray(): FormArray {
    return this.formResponsable.get('estudiantes') as FormArray;
  }
  
  get administrativosArray(): FormArray {
    return this.formResponsable.get('administrativos') as FormArray;
  }
  
  // Crear un FormGroup para una persona
  crearPersonaFormGroup(tipo: 'docente' | 'estudiante' | 'administrativo'): FormGroup {
    return this.fb.group({
      idPersona: [null, Validators.required],
      rolResponsable: ['']
    });
  }
  
  // Agregar una persona al array correspondiente
  agregarPersona(tipo: 'docente' | 'estudiante' | 'administrativo'): void {
    const array = tipo === 'docente' ? this.docentesArray : 
                  tipo === 'estudiante' ? this.estudiantesArray : 
                  this.administrativosArray;
    array.push(this.crearPersonaFormGroup(tipo));
  }
  
  // Eliminar una persona del array
  eliminarPersona(tipo: 'docente' | 'estudiante' | 'administrativo', index: number): void {
    const array = tipo === 'docente' ? this.docentesArray : 
                  tipo === 'estudiante' ? this.estudiantesArray : 
                  this.administrativosArray;
    array.removeAt(index);
  }
  
  // Obtener el array de personas según el tipo
  getPersonasArray(tipo: 'docente' | 'estudiante' | 'administrativo'): FormArray {
    return tipo === 'docente' ? this.docentesArray : 
           tipo === 'estudiante' ? this.estudiantesArray : 
           this.administrativosArray;
  }
  
  initializeFormEditarResponsable(): void {
    this.formEditarResponsable = this.fb.group({
      tipoPersonaEditar: [null], // 'docente', 'estudiante', 'administrativo' o null
      idPersonaEditando: [null], // ID del docente, estudiante o administrativo
      nombreAdmin: [''], // Nombre del administrador del sistema (editable)
      // NOTA: El backend actual NO acepta rolResponsable ni rolResponsableDetalle en Update
      // El método UpdateAsync del backend no actualiza estos campos
      rolResponsable: [''] // Campo opcional (no se envía al backend)
    });
    
    // Suscribirse a cambios en el tipo de persona para cargar la lista correspondiente
    this.formEditarResponsable.get('tipoPersonaEditar')?.valueChanges.subscribe(tipo => {
      this.formEditarResponsable.patchValue({ idPersonaEditando: null }); // Limpiar selección anterior
      if (tipo) {
        this.loadPersonasPorTipo(tipo); // Reutilizar la carga de personas
      }
    });
    
    // Limpiar campos cuando cambia el tipo de persona
    this.formEditarResponsable.get('tipoPersonaEditar')?.valueChanges.subscribe(tipo => {
      // Limpiar todos los campos de nombre
      this.formEditarResponsable.patchValue({
        nombreDocente: '',
        nombreUsuario: '',
        nombreAdmin: ''
      }, { emitEvent: false });
    });
  }
  
  iniciarEdicionResponsable(responsable: ActividadResponsable): void {
    this.responsableEditando.set(responsable.idActividadResponsable);
    
    // Determinar el tipo de persona basado en los IDs disponibles
    let tipoPersona: 'docente' | 'estudiante' | 'administrativo' | null = null;
    let idPersona: number | null = null;
    
    if (responsable.idDocente) {
      tipoPersona = 'docente';
      idPersona = responsable.idDocente;
    } else if (responsable.idUsuario) {
      // Si hay idUsuario, puede ser estudiante o administrativo
      // Intentar determinar por el nombre o asumir estudiante
      if (responsable.nombreAdmin || responsable.nombreUsuario?.includes('Admin')) {
        tipoPersona = 'administrativo';
      } else {
        tipoPersona = 'estudiante';
      }
      idPersona = responsable.idUsuario;
    } else if (responsable.idAdmin) {
      tipoPersona = 'administrativo';
      idPersona = responsable.idAdmin;
    }
    
    // Primero establecer el tipo de persona y cargar las listas
    // Luego establecer los valores del formulario después de que las listas se carguen
    if (tipoPersona) {
      // Cargar las personas del tipo correspondiente
      this.loadPersonasPorTipo(tipoPersona);
      
      // Esperar a que se carguen las personas antes de establecer el valor
      // Usar setTimeout para asegurar que el dropdown se actualice después de la carga
      setTimeout(() => {
        this.formEditarResponsable.patchValue({
          tipoPersonaEditar: tipoPersona,
          idPersonaEditando: idPersona,
          nombreAdmin: responsable.nombreAdmin || responsable.nombreUsuario || responsable.nombrePersona || '',
          rolResponsable: responsable.rolResponsable || ''
        }, { emitEvent: false }); // No emitir eventos para evitar loops
      }, 100);
    } else {
      // Si no hay tipo de persona, establecer los valores directamente
      this.formEditarResponsable.patchValue({
        tipoPersonaEditar: tipoPersona,
        idPersonaEditando: idPersona,
        nombreAdmin: responsable.nombreAdmin || responsable.nombreUsuario || responsable.nombrePersona || '',
        rolResponsable: responsable.rolResponsable || ''
      }, { emitEvent: false });
    }
    
    console.log('📝 Iniciando edición de responsable:', responsable);
    console.log('📝 Tipo de persona detectado:', tipoPersona);
    console.log('📝 ID de persona:', idPersona);
  }
  
  cancelarEdicionResponsable(): void {
    this.responsableEditando.set(null);
    this.formEditarResponsable.reset();
  }
  
  onUpdateResponsable(idResponsable: number): void {
    if (this.formEditarResponsable.valid) {
      this.loadingResponsable.set(true);
      this.errorResponsable.set(null);
      
      const formValue = this.formEditarResponsable.value;
      const tipoPersona = formValue.tipoPersonaEditar;
      const idPersona = formValue.idPersonaEditando;
      
      // Obtener el responsable actual para mantener los IDs necesarios
      const responsableActual = this.responsables().find(r => r.idActividadResponsable === idResponsable);
      
      if (!responsableActual) {
        this.loadingResponsable.set(false);
        this.errorResponsable.set('No se encontró el responsable a actualizar.');
        console.error('❌ No se encontró el responsable con ID:', idResponsable);
        return;
      }
      
      // El backend requiere idActividad e idTipoResponsable siempre
      if (!responsableActual.idActividad || !responsableActual.idTipoResponsable) {
        this.loadingResponsable.set(false);
        this.errorResponsable.set('El responsable no tiene los datos necesarios para actualizar.');
        console.error('❌ Responsable sin idActividad o idTipoResponsable:', responsableActual);
        return;
      }
      
      // NOTA: El backend actual NO acepta rolResponsable ni rolResponsableDetalle en Update
      // El método UpdateAsync del backend no actualiza estos campos
      const updateData: ActividadResponsableUpdate = {
        idActividad: responsableActual.idActividad, // REQUERIDO por el backend
        idTipoResponsable: responsableActual.idTipoResponsable, // REQUERIDO por el backend
        idDocente: undefined, // Reset IDs
        idUsuario: undefined,
        idAdmin: undefined
      };
      
      // Asignar el ID correspondiente según el tipo de persona seleccionado
      // IMPORTANTE: Validar que idPersona sea un número válido mayor que 0
      const idPersonaNum = idPersona ? Number(idPersona) : 0;
      
      if (tipoPersona === 'docente' && idPersonaNum > 0) {
        updateData.idDocente = idPersonaNum;
      } else if (tipoPersona === 'estudiante' && idPersonaNum > 0) {
        updateData.idUsuario = idPersonaNum;
      } else if (tipoPersona === 'administrativo' && idPersonaNum > 0) {
        updateData.idAdmin = idPersonaNum;
      } else if (!tipoPersona || !idPersonaNum || idPersonaNum === 0) {
        // Si no se seleccionó una nueva persona válida, mantener la persona actual
        if (responsableActual.idDocente && responsableActual.idDocente > 0) {
          updateData.idDocente = responsableActual.idDocente;
        } else if (responsableActual.idUsuario && responsableActual.idUsuario > 0) {
          updateData.idUsuario = responsableActual.idUsuario;
        } else if (responsableActual.idAdmin && responsableActual.idAdmin > 0) {
          updateData.idAdmin = responsableActual.idAdmin;
        }
      }
      
      console.log('📤 Actualizando responsable:', updateData);
      console.log('📤 ID Responsable:', idResponsable);
      console.log('📤 Responsable actual:', responsableActual);
      
      this.responsableService.update(idResponsable, updateData).subscribe({
        next: () => {
          this.loadingResponsable.set(false);
          this.responsableEditando.set(null);
          this.formEditarResponsable.reset();
          // Recargar responsables
          this.loadResponsables(this.actividad()!.id!);
        },
        error: (err) => {
          this.loadingResponsable.set(false);
          let errorMessage = 'Error al actualizar el responsable.';
          if (err.error?.message) {
            errorMessage = err.error.message;
          } else if (err.error?.errors) {
            const errors = Object.values(err.error.errors).flat();
            errorMessage = errors.join('\n');
          }
          // Mostrar más detalles del error en la consola
          console.error('❌ Error updating responsable:', err);
          console.error('❌ Error status:', err.status);
          console.error('❌ Error body:', err.error);
          if (err.error?.errors) {
            console.error('❌ Validation errors:', err.error.errors);
          }
          this.errorResponsable.set(errorMessage);
        }
      });
    } else {
      this.formEditarResponsable.markAllAsTouched();
    }
  }
  
  getTipoPersonaEditar(): 'docente' | 'estudiante' | 'administrativo' | null {
    return this.formEditarResponsable.get('tipoPersonaEditar')?.value || null;
  }
  
  loadPersonasPorTipo(tipo: 'docente' | 'estudiante' | 'administrativo'): void {
    this.loadingPersonas.set(true);
    
    if (tipo === 'docente') {
      // Si ya están cargados, no volver a cargar
      if (this.docentes().length > 0) {
        this.loadingPersonas.set(false);
        return;
      }
      this.personasService.listDocentes().subscribe({
        next: (data) => {
          this.docentes.set(data);
          this.loadingPersonas.set(false);
        },
        error: (err) => {
          console.error('Error loading docentes:', err);
          this.docentes.set([]);
          this.loadingPersonas.set(false);
        }
      });
    } else if (tipo === 'estudiante') {
      // Si ya están cargados, no volver a cargar
      if (this.estudiantes().length > 0) {
        this.loadingPersonas.set(false);
        return;
      }
      this.personasService.listEstudiantes().subscribe({
        next: (data) => {
          this.estudiantes.set(data);
          this.loadingPersonas.set(false);
        },
        error: (err) => {
          console.error('Error loading estudiantes:', err);
          this.estudiantes.set([]);
          this.loadingPersonas.set(false);
        }
      });
    } else if (tipo === 'administrativo') {
      // Si ya están cargados, no volver a cargar
      if (this.administrativos().length > 0) {
        this.loadingPersonas.set(false);
        return;
      }
      this.personasService.listAdministrativos().subscribe({
        next: (data) => {
          this.administrativos.set(data);
          this.loadingPersonas.set(false);
        },
        error: (err) => {
          console.error('Error loading administrativos:', err);
          this.administrativos.set([]);
          this.loadingPersonas.set(false);
        }
      });
    }
  }
  
  // Cargar todas las personas al iniciar para poder enriquecer los responsables
  loadTodasLasPersonas(): void {
    // Cargar usuarios del sistema para obtener sus roles (rolNombre)
    this.usuariosService.getAll().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        console.log(`✅ [ActividadDetail] Cargados ${usuarios.length} usuarios`);
      },
      error: (err) => {
        console.error('Error loading usuarios:', err);
        this.usuarios.set([]);
      }
    });
    
    // Cargar docentes, estudiantes y administrativos en paralelo
    this.personasService.listDocentes().subscribe({
      next: (data) => this.docentes.set(data),
      error: (err) => {
        console.error('Error loading docentes:', err);
        this.docentes.set([]);
      }
    });
    
    this.personasService.listEstudiantes().subscribe({
      next: (data) => this.estudiantes.set(data),
      error: (err) => {
        console.error('Error loading estudiantes:', err);
        this.estudiantes.set([]);
      }
    });
    
    this.personasService.listAdministrativos().subscribe({
      next: (data) => this.administrativos.set(data),
      error: (err) => {
        console.error('Error loading administrativos:', err);
        this.administrativos.set([]);
      }
    });
  }
  
  toggleFormResponsable(): void {
    this.mostrarFormResponsable.set(!this.mostrarFormResponsable());
    if (!this.mostrarFormResponsable()) {
      // Limpiar todos los arrays
      while (this.docentesArray.length > 0) {
        this.docentesArray.removeAt(0);
      }
      while (this.estudiantesArray.length > 0) {
        this.estudiantesArray.removeAt(0);
      }
      while (this.administrativosArray.length > 0) {
        this.administrativosArray.removeAt(0);
      }
      this.formResponsable.reset({
        fechaAsignacion: new Date().toISOString().split('T')[0]
      });
      this.tipoPersonaSeleccionado.set(null);
      this.errorResponsable.set(null);
    }
  }
  
  onSubmitResponsable(): void {
    if (!this.actividad()?.id) {
      this.errorResponsable.set('No se puede asignar responsable: actividad no encontrada.');
      return;
    }
    
    const formValue = this.formResponsable.value;
    const fechaAsignacion = formValue.fechaAsignacion || new Date().toISOString().split('T')[0];
    
    // Recolectar todos los responsables a crear
    const responsablesACrear: ActividadResponsableCreate[] = [];
    
    // Procesar docentes
    this.docentesArray.controls.forEach((control, index) => {
      const docenteData = control.value;
      const idPersonaNum = docenteData.idPersona ? Number(docenteData.idPersona) : 0;
      const rolResponsable = docenteData.rolResponsable?.trim() || undefined;
      
      if (idPersonaNum > 0) {
        responsablesACrear.push({
          idActividad: this.actividad()!.id!,
          idTipoResponsable: 1,
          idDocente: idPersonaNum,
          fechaAsignacion: fechaAsignacion,
          rolResponsable: rolResponsable
        });
        console.log(`📝 Docente a crear: idDocente=${idPersonaNum}, rolResponsable=${rolResponsable}`);
      }
    });
    
    // Procesar estudiantes
    this.estudiantesArray.controls.forEach((control, index) => {
      const estudianteData = control.value;
      const idPersonaNum = estudianteData.idPersona ? Number(estudianteData.idPersona) : 0;
      const rolResponsable = estudianteData.rolResponsable?.trim() || undefined;
      
      if (idPersonaNum > 0) {
        responsablesACrear.push({
          idActividad: this.actividad()!.id!,
          idTipoResponsable: 1,
          idUsuario: idPersonaNum,
          fechaAsignacion: fechaAsignacion,
          rolResponsable: rolResponsable
        });
        console.log(`📝 Estudiante a crear: idUsuario=${idPersonaNum}, rolResponsable=${rolResponsable}`);
      }
    });
    
    // Procesar administrativos
    this.administrativosArray.controls.forEach((control, index) => {
      const adminData = control.value;
      const idPersonaNum = adminData.idPersona ? Number(adminData.idPersona) : 0;
      const rolResponsable = adminData.rolResponsable?.trim() || undefined;
      
      if (idPersonaNum > 0) {
        responsablesACrear.push({
          idActividad: this.actividad()!.id!,
          idTipoResponsable: 1,
          idAdmin: idPersonaNum,
          fechaAsignacion: fechaAsignacion,
          rolResponsable: rolResponsable
        });
        console.log(`📝 Administrativo a crear: idAdmin=${idPersonaNum}, rolResponsable=${rolResponsable}`);
      }
    });
    
    // Validar que haya al menos un responsable válido
    if (responsablesACrear.length === 0) {
      this.errorResponsable.set('Debe agregar al menos una persona válida como responsable.');
      this.formResponsable.markAllAsTouched();
      return;
    }
    
    // Validar que todos los controles requeridos estén completos
    let hayErrores = false;
    this.docentesArray.controls.forEach(control => {
      if (control.get('idPersona')?.invalid) {
        control.get('idPersona')?.markAsTouched();
        hayErrores = true;
      }
    });
    this.estudiantesArray.controls.forEach(control => {
      if (control.get('idPersona')?.invalid) {
        control.get('idPersona')?.markAsTouched();
        hayErrores = true;
      }
    });
    this.administrativosArray.controls.forEach(control => {
      if (control.get('idPersona')?.invalid) {
        control.get('idPersona')?.markAsTouched();
        hayErrores = true;
      }
    });
    
    if (hayErrores) {
      this.errorResponsable.set('Por favor complete todos los campos requeridos.');
      return;
    }
    
    // Crear todos los responsables
    this.loadingResponsable.set(true);
    this.errorResponsable.set(null);
    
    // Crear un mapa para guardar el tipo de persona original
    const tipoPersonaMap = new Map<number, 'docente' | 'estudiante' | 'administrativo'>();
    
    // Crear responsables en paralelo, guardando el tipo de persona
    const requests = responsablesACrear.map((data, index) => {
      // Determinar el tipo de persona basándose en qué campo tiene valor
      let tipoPersona: 'docente' | 'estudiante' | 'administrativo' = 'estudiante';
      if (data.idDocente) {
        tipoPersona = 'docente';
      } else if (data.idAdmin) {
        tipoPersona = 'administrativo';
      } else if (data.idUsuario) {
        tipoPersona = 'estudiante';
      }
      
      // Guardar el tipo de persona para usar después del enriquecimiento
      // Usaremos el índice temporalmente hasta que tengamos el idActividadResponsable
      const request = this.responsableService.create(data);
      
      // Después de crear, guardar el tipo en el mapa usando el idActividadResponsable
      return request.pipe(
        map(resp => {
          if (resp.idActividadResponsable) {
            tipoPersonaMap.set(resp.idActividadResponsable, tipoPersona);
            this.tipoPersonaPorResponsable.set(resp.idActividadResponsable, tipoPersona);
          }
          return resp;
        })
      );
    });
    
    // Usar forkJoin para ejecutar todas las peticiones en paralelo
    forkJoin(requests).subscribe({
      next: (responsablesCreados) => {
        console.log('✅ Responsables creados:', responsablesCreados);
        console.log('📊 Total de responsables creados:', responsablesCreados.length);
        responsablesCreados.forEach((resp, index) => {
          const tipoPersona = tipoPersonaMap.get(resp.idActividadResponsable) || 'desconocido';
          console.log(`  - Responsable ${index + 1} (${tipoPersona}):`, {
            id: resp.idActividadResponsable,
            idActividad: resp.idActividad,
            idUsuario: resp.idUsuario,
            idDocente: resp.idDocente,
            idAdmin: resp.idAdmin,
            nombrePersona: resp.nombrePersona,
            nombreDocente: resp.nombreDocente,
            nombreAdmin: resp.nombreAdmin,
            nombreUsuario: resp.nombreUsuario,
            tipoPersonaOriginal: tipoPersona
          });
        });
        this.loadingResponsable.set(false);
        // Limpiar el formulario
        this.formResponsable.reset({
          fechaAsignacion: new Date().toISOString().split('T')[0]
        });
        // Limpiar los arrays
        while (this.docentesArray.length > 0) {
          this.docentesArray.removeAt(0);
        }
        while (this.estudiantesArray.length > 0) {
          this.estudiantesArray.removeAt(0);
        }
        while (this.administrativosArray.length > 0) {
          this.administrativosArray.removeAt(0);
        }
        this.errorResponsable.set(null);
        // Ocultar el formulario
        this.mostrarFormResponsable.set(false);
        // Esperar un momento para que el backend procese y luego recargar responsables
        setTimeout(() => {
          console.log('🔄 Recargando responsables después de crear...');
          this.loadResponsables(this.actividad()!.id!);
        }, 500);
      },
      error: (err) => {
        this.loadingResponsable.set(false);
        let errorMessage = 'Error al asignar los responsables.';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.errors) {
          const errors = Object.values(err.error.errors).flat();
          errorMessage = errors.join('\n');
        }
        this.errorResponsable.set(errorMessage);
        console.error('Error creating responsables:', err);
      }
    });
  }
  
  onDeleteResponsable(id: number): void {
    if (confirm('¿Está seguro de que desea eliminar este responsable?')) {
      this.responsableService.delete(id).subscribe({
        next: () => {
          // Recargar responsables
          if (this.actividad()?.id) {
            this.loadResponsables(this.actividad()!.id!);
          }
        },
        error: (err) => {
          console.error('Error deleting responsable:', err);
          let errorMessage = 'Error al eliminar el responsable.';
          if (err.error?.message) {
            errorMessage = err.error.message;
          }
          alert(errorMessage);
        }
      });
    }
  }
  
  getPersonasDisponibles(): any[] {
    const tipo = this.tipoPersonaSeleccionado();
    if (tipo === 'docente') {
      return this.docentes();
    } else if (tipo === 'estudiante') {
      return this.estudiantes();
    } else if (tipo === 'administrativo') {
      return this.administrativos();
    }
    return [];
  }
  
  getPersonasDisponiblesEditar(): any[] {
    const tipo = this.getTipoPersonaEditar();
    if (tipo === 'docente') {
      return this.docentes();
    } else if (tipo === 'estudiante') {
      return this.estudiantes();
    } else if (tipo === 'administrativo') {
      return this.administrativos();
    }
    return [];
  }
  
  getNombrePersona(persona: any): string {
    return persona.nombreCompleto || persona.nombre || 'Sin nombre';
  }

  // ========== PARTICIPANTES ==========
  estadisticasParticipantes = signal<any>(null);
  loadingParticipantes = signal(false);
  errorParticipantes = signal<string | null>(null);
  loadingImportarParticipantes = signal(false);
  importFileParticipantes = signal<File | null>(null);
  anioParticipantes = signal<number>(new Date().getFullYear());

  loadEstadisticasParticipantes(): void {
    if (!this.actividad()?.id) return;
    
    this.loadingParticipantes.set(true);
    this.errorParticipantes.set(null);
    
    // Usar año actual por defecto si no se especifica
    const anio = this.anioParticipantes() || new Date().getFullYear();
    
    this.participacionService.getEstadisticas({
      idActividad: this.actividad()!.id,
      anio: anio
    }).subscribe({
      next: (data) => {
        console.log('✅ Estadísticas recibidas:', data);
        
        // Obtener metaAlcanzada, metaCumplimiento y metaIndicador de la actividad si están disponibles
        const actividad = this.actividad();
        const metaAlcanzadaActividad = actividad?.metaAlcanzada;
        const metaCumplimientoActividad = actividad?.metaCumplimiento;
        const metaIndicadorActividad = actividad?.metaIndicador; // Meta del indicador (número entero)
        
        // Si no hay metaAlcanzada en la actividad, usar el total de participantes como meta alcanzada
        const metaAlcanzada = metaAlcanzadaActividad !== undefined && metaAlcanzadaActividad !== null 
          ? metaAlcanzadaActividad 
          : (data?.total?.total || 0);
        
        // La meta de cumplimiento viene del indicador (metaIndicador) - es un número entero
        const metaIndicador = metaIndicadorActividad !== undefined && metaIndicadorActividad !== null 
          ? Math.round(metaIndicadorActividad) // Asegurar que sea entero
          : null;
        
        // Transformar los datos anidados a la estructura plana esperada por el template
        const estadisticasTransformadas = {
          totalParticipantes: data?.total?.total || 0,
          totalMasculino: data?.total?.masculino || 0,
          totalFemenino: data?.total?.femenino || 0,
          totalEstudiantes: data?.estudiantes?.total || 0,
          totalDocentes: data?.docentes?.total || 0,
          totalAdministrativos: data?.administrativos?.total || 0,
          metaAlcanzada: metaAlcanzada,
          metaIndicador: metaIndicador, // Meta del indicador (número entero)
          metaCumplimiento: metaCumplimientoActividad !== undefined && metaCumplimientoActividad !== null 
            ? metaCumplimientoActividad 
            : (metaIndicador && metaAlcanzada > 0 ? (metaAlcanzada / metaIndicador * 100) : null),
          // Mantener también los datos originales por si se necesitan
          estudiantes: data?.estudiantes,
          docentes: data?.docentes,
          administrativos: data?.administrativos,
          total: data?.total
        };
        console.log('📊 Estadísticas transformadas:', estadisticasTransformadas);
        console.log('📊 Valor antes de set:', this.estadisticasParticipantes());
        
        // Primero establecer loading a false, luego actualizar los datos
        // Esto asegura que el template evalúe la condición correctamente
        this.loadingParticipantes.set(false);
        
        // Actualizar el signal con los datos transformados
        this.estadisticasParticipantes.set(estadisticasTransformadas);
        
        console.log('📊 Valor después de set:', this.estadisticasParticipantes());
        console.log('📊 Signal value check:', !!this.estadisticasParticipantes());
        console.log('📊 totalParticipantes:', this.estadisticasParticipantes()?.totalParticipantes);
        console.log('📊 loadingParticipantes:', this.loadingParticipantes());
      },
      error: (err) => {
        console.error('❌ Error loading estadísticas:', err);
        console.error('❌ Error completo:', JSON.stringify(err, null, 2));
        this.errorParticipantes.set('Error al cargar las estadísticas');
        this.loadingParticipantes.set(false);
      }
    });
  }

  navigateToParticipaciones(): void {
    if (!this.actividad()?.id) return;
    // Navegar a la vista de Participaciones con filtro por actividad
    this.router.navigate(['/participaciones'], {
      queryParams: { idActividad: this.actividad()!.id }
    });
  }


  onFileSelectedParticipantes(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.importFileParticipantes.set(file);
    }
  }

  removeFileParticipantes(): void {
    this.importFileParticipantes.set(null);
  }

  importarParticipantesDesdeExcel(): void {
    if (!this.importFileParticipantes() || !this.actividad()?.id) {
      this.alertService.warning('Archivo requerido', 'Por favor selecciona un archivo Excel');
      return;
    }

    // Validar tipo de archivo antes de enviar
    const file = this.importFileParticipantes()!;
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      this.alertService.error('Archivo inválido', 'Por favor selecciona un archivo Excel (.xlsx o .xls)');
      this.importFileParticipantes.set(null);
      return;
    }

    this.loadingImportarParticipantes.set(true);
    
    // Usar año actual por defecto si no se especifica
    const anio = this.anioParticipantes() || new Date().getFullYear();
    
    this.reportesService.importarParticipantesPorActividad(
      this.actividad()!.id,
      file,
      anio
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Participantes importados:', response);
        
        // Construir mensaje con los datos de la respuesta
        let mensaje = '';
        const data = response.data || response;
        
        // Validar si realmente se procesaron datos
        const totalProcesados = data.totalProcesados ?? 0;
        const totalCreados = data.totalCreados ?? 0;
        const totalActualizados = data.totalActualizados ?? 0;
        const totalOmitidos = data.totalOmitidos ?? 0;
        const totalErrores = data.totalErrores ?? 0;
        
        // Si no se procesó nada y no hay errores, el archivo probablemente no tenía datos válidos
        if (totalProcesados === 0 && totalCreados === 0 && totalActualizados === 0 && totalErrores === 0) {
          this.alertService.warning(
            'Formato inválido', 
            'El archivo Excel no contiene datos válidos de participantes o no se pudo procesar. Por favor verifica que el archivo tenga el formato correcto y contenga datos.'
          );
          this.loadingImportarParticipantes.set(false);
          // No limpiar el archivo para permitir revisar y volver a intentar
          return;
        }
        
        // Si hay datos procesados, mostrar resumen
        if (totalProcesados > 0 || totalCreados > 0 || totalActualizados > 0) {
          mensaje = '<div style="text-align: left;">';
          
          // Mensaje principal más claro y bonito
          if (totalCreados > 0 && totalActualizados === 0) {
            mensaje += `<strong style="color: #10b981;">✓ Se importaron correctamente ${totalCreados} participante${totalCreados > 1 ? 's' : ''}</strong><br><br>`;
          } else if (totalActualizados > 0 && totalCreados === 0) {
            mensaje += `<strong style="color: #10b981;">✓ Se actualizaron correctamente ${totalActualizados} participante${totalActualizados > 1 ? 's' : ''}</strong><br><br>`;
          } else if (totalCreados > 0 && totalActualizados > 0) {
            mensaje += `<strong style="color: #10b981;">✓ Importación completada exitosamente</strong><br><br>`;
          } else {
            mensaje += `<strong style="color: #10b981;">✓ Procesamiento completado</strong><br><br>`;
          }
          
          // Detalles del resumen
          if (data.totalProcesados !== undefined && totalProcesados > 0) {
            mensaje += `📊 Total procesados: <strong>${totalProcesados}</strong><br>`;
          }
          if (data.totalCreados !== undefined && totalCreados > 0) {
            mensaje += `➕ Nuevos agregados: <strong style="color: #10b981;">${totalCreados}</strong><br>`;
          }
          if (data.totalActualizados !== undefined && totalActualizados > 0) {
            mensaje += `🔄 Actualizados: <strong style="color: #3b82f6;">${totalActualizados}</strong><br>`;
          }
          if (totalOmitidos > 0) {
            mensaje += `⏭️ Omitidos: <strong style="color: #f59e0b;">${totalOmitidos}</strong><br>`;
          }
          if (totalErrores > 0) {
            mensaje += `❌ Errores: <strong style="color: #ef4444;">${totalErrores}</strong><br>`;
          }
          if (data.mensaje) {
            mensaje += `<br><em>${data.mensaje}</em>`;
          }
          mensaje += '</div>';
          
          // Mostrar alerta de éxito
          this.alertService.success('¡Importación exitosa!', mensaje, {
            html: true
          });
          
          // Limpiar el archivo después de importación exitosa
          this.importFileParticipantes.set(null);
        } else if (data.mensaje) {
          // Si hay un mensaje pero no datos procesados, mostrar advertencia
          this.alertService.warning('Sin resultados', data.mensaje);
        } else {
          // Caso por defecto
          this.alertService.warning(
            'Formato inválido', 
            'No se procesaron participantes del archivo. Verifica que el archivo tenga el formato correcto.'
          );
        }
        
        this.loadingImportarParticipantes.set(false);
        
        // Recargar estadísticas solo si se procesaron datos
        if (totalProcesados > 0 || totalCreados > 0 || totalActualizados > 0) {
          this.loadEstadisticasParticipantes();
        }
      },
      error: (err: any) => {
        console.error('❌ Error importando participantes:', err);
        let errorMessage = 'Error al importar participantes';
        let isFormatError = false;
        
        // Detectar errores de formato
        if (err.error) {
          if (err.error.message) {
            errorMessage = err.error.message;
            // Detectar errores comunes de formato
            const errorLower = errorMessage.toLowerCase();
            isFormatError = errorLower.includes('formato') || 
                           errorLower.includes('formato inválido') || 
                           errorLower.includes('invalid format') ||
                           errorLower.includes('no se pudo leer') ||
                           errorLower.includes('no se puede procesar') ||
                           errorLower.includes('columna') ||
                           errorLower.includes('encabezado');
          } else if (err.error.error) {
            errorMessage = err.error.error;
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        // Mostrar alerta apropiada según el tipo de error
        if (isFormatError) {
          this.alertService.error(
            'Formato inválido', 
            `${errorMessage}\n\nPor favor revisa el formato del archivo Excel y asegúrate de que tenga las columnas correctas.`
          );
        } else {
          this.alertService.error('Error en la importación', errorMessage);
        }
        
        this.loadingImportarParticipantes.set(false);
        // No limpiar el archivo en caso de error para permitir revisar y corregir
      }
    });
  }

  // Métodos para toggle de secciones
  toggleSeccionPlanificacion(): void {
    const nuevoEstado = !this.seccionPlanificacionExpandida();
    this.seccionPlanificacionExpandida.set(nuevoEstado);
    // Si se expande la sección de planificación, ocultar las otras
    if (nuevoEstado) {
      this.seccionInformacionExpandida.set(false);
      this.seccionResponsablesExpandida.set(false);
    }
  }

  toggleSeccionInformacion(): void {
    const nuevoEstado = !this.seccionInformacionExpandida();
    this.seccionInformacionExpandida.set(nuevoEstado);
    // Si se expande la sección de información, ocultar las otras
    if (nuevoEstado) {
      this.seccionPlanificacionExpandida.set(false);
      this.seccionResponsablesExpandida.set(false);
    }
  }

  toggleSeccionResponsables(): void {
    const nuevoEstado = !this.seccionResponsablesExpandida();
    this.seccionResponsablesExpandida.set(nuevoEstado);
    // Si se expande la sección de responsables, ocultar las otras
    if (nuevoEstado) {
      this.seccionPlanificacionExpandida.set(false);
      this.seccionInformacionExpandida.set(false);
    }
  }

  // Función para convertir hora de 24h a formato 12h AM/PM
  convertir24hA12h(hora24h: string | null | undefined): string {
    if (!hora24h || !hora24h.includes(':')) return hora24h || 'Sin hora';
    
    const [horas, minutos] = hora24h.split(':');
    const horasNum = parseInt(horas, 10);
    
    if (isNaN(horasNum)) return hora24h;
    
    let horas12 = horasNum;
    const ampm = horasNum >= 12 ? 'PM' : 'AM';
    
    if (horasNum === 0) {
      horas12 = 12;
    } else if (horasNum > 12) {
      horas12 = horasNum - 12;
    }
    
    return `${horas12.toString().padStart(2, '0')}:${minutos} ${ampm}`;
  }

  // Función para obtener el rol del responsable (rol en la actividad: Coordinador, Evaluador, Organizador, etc.)
  // Usa directamente los campos que vienen del backend en la respuesta de /api/actividad-responsable/actividad/{id}
  getRolResponsable(resp: ActividadResponsable): string {
    // Usar rolResponsable o nombreRolResponsable que vienen directamente del backend
    return resp.rolResponsable || resp.nombreRolResponsable || 'Sin rol asignado';
  }

  // Función para obtener un identificador único del responsable
  private getIdentificadorUnico(resp: ActividadResponsable): string {
    // Crear un identificador único basado en el tipo de responsable
    if (resp.idUsuario) {
      return `usuario_${resp.idUsuario}`;
    }
    if (resp.idDocente) {
      return `docente_${resp.idDocente}`;
    }
    if (resp.idAdmin) {
      return `admin_${resp.idAdmin}`;
    }
    if (resp.idEstudiante) {
      return `estudiante_${resp.idEstudiante}`;
    }
    if (resp.idResponsableExterno) {
      return `externo_${resp.idResponsableExterno}`;
    }
    // Si no hay identificador, usar el idActividadResponsable como fallback
    return `actividad_responsable_${resp.idActividadResponsable}`;
  }

  // Función para eliminar duplicados de responsables
  private eliminarDuplicados(responsables: ActividadResponsable[]): ActividadResponsable[] {
    const responsablesUnicos = new Map<string, ActividadResponsable>();
    
    responsables.forEach(resp => {
      const identificador = this.getIdentificadorUnico(resp);
      const rol = this.getRolResponsable(resp);
      const tieneRolValido = rol !== 'Sin rol asignado' && rol !== null && rol !== undefined && rol.trim() !== '';
      
      // Si ya existe un responsable con este identificador
      if (responsablesUnicos.has(identificador)) {
        const existente = responsablesUnicos.get(identificador)!;
        const rolExistente = this.getRolResponsable(existente);
        const existenteTieneRolValido = rolExistente !== 'Sin rol asignado' && rolExistente !== null && rolExistente !== undefined && rolExistente.trim() !== '';
        
        // Priorizar el que tiene un rol válido
        if (tieneRolValido && !existenteTieneRolValido) {
          // El nuevo tiene rol válido y el existente no, reemplazar
          responsablesUnicos.set(identificador, resp);
        } else if (!tieneRolValido && existenteTieneRolValido) {
          // El existente tiene rol válido y el nuevo no, mantener el existente
          // No hacer nada
        } else {
          // Ambos tienen rol válido o ambos no tienen, mantener el primero (o el que tenga el idActividadResponsable más alto)
          if (resp.idActividadResponsable > existente.idActividadResponsable) {
            responsablesUnicos.set(identificador, resp);
          }
        }
      } else {
        // Primera vez que vemos este responsable, agregarlo
        responsablesUnicos.set(identificador, resp);
      }
    });
    
    return Array.from(responsablesUnicos.values());
  }

  // Función para agrupar responsables por rol
  getResponsablesAgrupadosPorRol(): { rol: string; responsables: ActividadResponsable[] }[] {
    const responsables = this.responsables();
    
    // Primero eliminar duplicados
    const responsablesUnicos = this.eliminarDuplicados(responsables);
    
    console.log('🔍 [getResponsablesAgrupadosPorRol] Total responsables originales:', responsables.length);
    console.log('🔍 [getResponsablesAgrupadosPorRol] Total responsables únicos después de eliminar duplicados:', responsablesUnicos.length);
    
    // Luego agrupar por rol
    const agrupados = new Map<string, ActividadResponsable[]>();
    
    responsablesUnicos.forEach(resp => {
      const rol = this.getRolResponsable(resp);
      if (!agrupados.has(rol)) {
        agrupados.set(rol, []);
      }
      agrupados.get(rol)!.push(resp);
    });
    
    // Filtrar el grupo "Sin rol asignado" si hay otros grupos con roles válidos
    const grupos = Array.from(agrupados.entries()).map(([rol, responsables]) => ({
      rol,
      responsables
    }));
    
    // Si hay grupos con roles válidos, eliminar el grupo "Sin rol asignado"
    const tieneRolesValidos = grupos.some(g => g.rol !== 'Sin rol asignado');
    if (tieneRolesValidos) {
      return grupos.filter(g => g.rol !== 'Sin rol asignado');
    }
    
    return grupos;
  }

  // Función para obtener el cargo del responsable
  // Usa directamente el campo 'cargo' que viene del backend
  // Para usuarios: cargo contiene el rol del sistema (ej: "Director General del CUR-Carazo")
  // Para docentes, estudiantes, administrativos, externos: cargo contiene su tipo o cargo específico
  getCargoResponsable(resp: ActividadResponsable): string {
    // Prioridad 1: Usar el campo 'cargo' que viene directamente del backend
    // Este campo ya contiene el cargo/rol correcto según el tipo de responsable
    if (resp.cargo) {
      return resp.cargo;
    }
    
    // Prioridad 2: Si es responsable externo, usar su cargo específico
    if (resp.cargoResponsableExterno) {
      return resp.cargoResponsableExterno;
    }
    
    // Prioridad 3: Si tiene tipo de responsable, usarlo como fallback
    if (resp.nombreTipoResponsable) {
      return resp.nombreTipoResponsable;
    }
    
    // Si no hay nada, mostrar mensaje por defecto
    return 'Sin cargo asignado';
  }

}

