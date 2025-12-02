import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActividadesService } from '../../core/services/actividades.service';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import { IndicadorService } from '../../core/services/indicador.service';
import { ActividadResponsableService, type ActividadResponsableCreate, type ActividadResponsableUpdate } from '../../core/services/actividad-responsable.service';
import { EdicionService } from '../../core/services/edicion.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { PersonasService } from '../../core/services/personas.service';
import { EvidenciaService } from '../../core/services/evidencia.service';
import { ImageStorageService } from '../../core/services/image-storage.service';
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
  private evidenciaService = inject(EvidenciaService);
  private imageStorageService = inject(ImageStorageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

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
  todosLosDepartamentos = signal<any[]>([]);
  categoriasActividad = signal<any[]>([]);
  tiposProtagonista = signal<any[]>([]);
  tiposResponsable = signal<any[]>([]);
  capacidadesInstaladas = signal<any[]>([]);
  estadosActividad = signal<any[]>([]);
  editandoEstado = signal(false);
  guardandoEstado = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  activeTab = signal<'info' | 'departamentos' | 'responsables' | 'indicadores' | 'subactividades' | 'actividades-anuales' | 'evidencias'>('info');
  
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
  loadingPersonas = signal(false);

  ngOnInit(): void {
    this.initializeFormIndicador();
    this.initializeFormResponsable();
    this.initializeFormEditarResponsable();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadActividad(+id);
      this.loadIndicadoresList();
      this.loadDepartamentos();
      this.loadCategoriasActividad();
    this.loadTiposProtagonista();
    this.loadTiposResponsable();
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

  getNombreCapacidadInstalada(id?: number): string {
    if (!id) return 'Sin local asignado';
    const capacidad = this.capacidadesInstaladas().find(c => c.id === id);
    return capacidad?.nombre || `ID: ${id}`;
  }

  getCantidadTotalParticipantesProtagonistas(): number {
    const actividad = this.actividad();
    if (!actividad) return 0;
    return (actividad as any).cantidadTotalParticipantesProtagonistas || 0;
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
    if (!actividad || !actividad.idTipoProtagonista) return [];
    
    const ids = Array.isArray(actividad.idTipoProtagonista) 
      ? actividad.idTipoProtagonista 
      : [actividad.idTipoProtagonista];
    
    return ids.map(id => {
      const tipo = this.tiposProtagonista().find(t => (t.id || t.idTipoProtagonista) === id);
      return tipo || { id, nombre: `ID: ${id}` };
    }).filter(t => t);
  }

  getDepartamentosResponsablesArray(): any[] {
    const actividad = this.actividad();
    if (!actividad) return [];
    
    const deptos: any[] = [];
    
    // Agregar departamento principal si existe
    if (actividad.departamentoId && actividad.nombreDepartamento) {
      deptos.push({
        id: actividad.departamentoId,
        nombre: actividad.nombreDepartamento
      });
    }
    
    // Agregar departamentos responsables si existen
    if (actividad.departamentoResponsableId) {
      const ids = Array.isArray(actividad.departamentoResponsableId) 
        ? actividad.departamentoResponsableId 
        : [actividad.departamentoResponsableId];
      
      ids.forEach(id => {
        const dept = this.todosLosDepartamentos().find(d => d.id === id);
        if (dept && !deptos.find(d => d.id === id)) {
          deptos.push(dept);
        }
      });
    }
    
    return deptos;
  }

  getActividadesAnualesSeleccionadas(): ActividadAnual[] {
    const actividad = this.actividad();
    if (!actividad || !actividad.idActividadAnual) return [];
    
    const ids = Array.isArray(actividad.idActividadAnual) 
      ? actividad.idActividadAnual 
      : [actividad.idActividadAnual];
    
    return this.actividadesAnuales().filter(a => 
      a.idActividadAnual && ids.includes(a.idActividadAnual)
    );
  }

  getActividadesMensualesSeleccionadas(): ActividadMensualInst[] {
    const actividad = this.actividad();
    if (!actividad || !actividad.idActividadMensualInst) return [];
    
    const ids = Array.isArray(actividad.idActividadMensualInst) 
      ? actividad.idActividadMensualInst 
      : [actividad.idActividadMensualInst];
    
    return this.actividadesMensuales().filter(m => 
      m.idActividadMensualInst && ids.includes(m.idActividadMensualInst)
    );
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
        // Filtrar evidencias por idActividad
        const evidenciasFiltradas = data.filter(e => e.idActividad === actividadId);
        this.evidencias.set(evidenciasFiltradas);
        
        // Cargar imágenes desde IndexedDB para cada evidencia
        const imageUrlsMap = new Map<number, string[]>();
        for (const evidencia of evidenciasFiltradas) {
          const evidenciaId = evidencia.idEvidencia || evidencia.id;
          if (evidenciaId) {
            const images = await this.imageStorageService.getAllImages(evidenciaId);
            if (images.length > 0) {
              imageUrlsMap.set(evidenciaId, images);
            }
          }
        }
        this.evidenciasImageUrls.set(imageUrlsMap);
        
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

  navigateToCrearEvidencia(): void {
    const actividad = this.actividad();
    if (!actividad || !actividad.id) return;
    
    // Obtener los tipos de evidencia de la actividad
    const tiposEvidencia = actividad.idTipoEvidencias || [];
    
    // Construir query params
    const queryParams: any = {
      actividadId: actividad.id
    };
    
    // Si hay tipos de evidencia, pasarlos como query param
    if (tiposEvidencia.length > 0) {
      queryParams.tiposEvidencia = tiposEvidencia.join(',');
    }
    
    this.router.navigate(['/evidencias/nueva'], { queryParams });
  }

  navigateToEvidenciaDetail(evidenciaId: number): void {
    this.router.navigate(['/evidencias', evidenciaId]);
  }

  loadActividad(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.actividadesService.get(id).subscribe({
      next: (data) => {
        this.actividad.set(data);
        
        // Siempre cargar responsables desde el endpoint dedicado /api/actividad-responsable
        // para asegurar que se obtengan todos los datos de la tabla actividad-responsable
        this.loadResponsables(id);
        
        // Cargar evidencias de la actividad
        this.loadEvidencias(id);
        
        // Subactividades
        if (data.subactividades && Array.isArray(data.subactividades)) {
          this.subactividades.set(data.subactividades);
        }
        
        // Indicadores - crear array desde los datos del indicador asociado
        if (data.idIndicador) {
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
          
          // Cargar actividades anuales relacionadas
          this.loadActividadesAnuales();
        }
        
        // Departamentos - crear array desde los datos del departamento
        const departamentosData: any[] = [];
        if (data.departamentoId && data.nombreDepartamento) {
          departamentosData.push({
            id: data.departamentoId,
            nombre: data.nombreDepartamento
          });
        }
        if (data.departamentoResponsableId && data.nombreDepartamentoResponsable) {
          departamentosData.push({
            id: data.departamentoResponsableId,
            nombre: data.nombreDepartamentoResponsable
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
        this.error.set('Error al cargar la actividad');
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
        console.log(`📥 [ActividadDetail] Datos RAW del backend para actividad ${id}:`, JSON.stringify(data, null, 2));
        
        // Enriquecer los responsables con nombres de personas si no vienen del backend
        const responsablesEnriquecidos = data.map(resp => {
          console.log(`🔍 [ActividadDetail] Procesando responsable ${resp.idActividadResponsable}:`, {
            idActividad: resp.idActividad,
            idUsuario: resp.idUsuario,
            idDocente: resp.idDocente,
            idAdmin: resp.idAdmin,
            nombrePersona: resp.nombrePersona,
            nombreUsuario: resp.nombreUsuario,
            nombreDocente: resp.nombreDocente,
            nombreAdmin: resp.nombreAdmin
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
          const nombreDelBackend = resp.nombrePersona || resp.nombreUsuario || resp.nombreDocente || resp.nombreAdmin;
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
          const nombreActual = resp.nombrePersona || resp.nombreUsuario || resp.nombreAdmin || resp.nombreDocente || '';
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
            }
          }
          
          // Si aún no se encontró, registrar para debugging
          if (!nombreEncontrado) {
            console.warn(`⚠️ [ActividadDetail] Responsable ${resp.idActividadResponsable} no se pudo enriquecer. IDs:`, {
              idActividad: resp.idActividad,
              idDocente: resp.idDocente,
              idAdmin: resp.idAdmin,
              idUsuario: resp.idUsuario,
              nombrePersona: resp.nombrePersona,
              nombreUsuario: resp.nombreUsuario,
              nombreDocente: resp.nombreDocente,
              nombreAdmin: resp.nombreAdmin,
              nombreDepartamento: resp.nombreDepartamento,
              docentesCargados: this.docentes().length,
              administrativosCargados: this.administrativos().length,
              estudiantesCargados: this.estudiantes().length
            });
          } else {
            console.log(`✅ [ActividadDetail] Responsable ${resp.idActividadResponsable} procesado exitosamente. Nombre final: ${resp.nombrePersona || resp.nombreUsuario || resp.nombreDocente || resp.nombreAdmin}`);
          }
          
          return resp;
        });
        
        // Filtrar responsables: solo mostrar aquellos que tienen personas reales asignadas
        // Excluir "Administrador Sistema" y otros usuarios del sistema
        const responsablesFiltrados = responsablesEnriquecidos.filter((resp): resp is ActividadResponsable => {
          if (!resp) return false;
          const nombre = resp.nombrePersona || resp.nombreDocente || resp.nombreAdmin || resp.nombreUsuario || '';
          // Excluir si el nombre es "Administrador Sistema" o similar
          const esUsuarioSistema = nombre.toLowerCase().includes('administrador sistema') || 
                                   nombre.toLowerCase().includes('admin sistema') ||
                                   nombre.toLowerCase() === 'administrador';
          
          // Incluir si:
          // 1. Tiene un nombre válido que no sea usuario del sistema
          // 2. Tiene un departamento asignado (sin persona)
          // 3. Tiene un ID de persona válido (idDocente, idAdmin, o idUsuario > 0) aunque no tenga nombre aún
          //    (esto permite mostrar responsables recién creados mientras se enriquecen)
          const tieneIdPersonaValido = Boolean(
            (resp.idDocente && resp.idDocente > 0) || 
            (resp.idAdmin && resp.idAdmin > 0) || 
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
          nombrePersona: r.nombrePersona,
          nombreDocente: r.nombreDocente,
          nombreAdmin: r.nombreAdmin,
          nombreUsuario: r.nombreUsuario,
          rolResponsable: r.rolResponsable
        } : null).filter(r => r !== null));
        console.log('📋 Responsables después del filtro:', responsablesFiltrados.map(r => ({
          id: r.idActividadResponsable,
          idDocente: r.idDocente,
          idAdmin: r.idAdmin,
          idUsuario: r.idUsuario,
          nombrePersona: r.nombrePersona,
          nombreDocente: r.nombreDocente,
          nombreAdmin: r.nombreAdmin,
          nombreUsuario: r.nombreUsuario,
          rolResponsable: r.rolResponsable
        })));
        this.responsables.set(responsablesFiltrados);
        console.log(`✅ [ActividadDetail] Responsables cargados desde /api/actividad-responsable/actividad/${id}: ${data.length} responsables`);
        console.log(`✅ [ActividadDetail] Responsables filtrados: ${responsablesFiltrados.length} responsables`);
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
            this.responsables.set(data);
          },
          error: (fallbackErr) => {
            console.error('❌ Error en fallback de responsables:', fallbackErr);
            this.responsables.set([]);
          }
        });
      }
    });
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

    // Si hay una actividad anual asociada, cargarla
    if (actividad.idActividadAnual) {
      // Manejar array o número único
      const idsActividadesAnuales = Array.isArray(actividad.idActividadAnual) 
        ? actividad.idActividadAnual 
        : [actividad.idActividadAnual];
      
      if (idsActividadesAnuales.length > 0) {
        // Cargar todas las actividades anuales
        const requests = idsActividadesAnuales.map(id => 
          this.actividadAnualService.getById(id)
        );
        
        Promise.all(requests.map(req => firstValueFrom(req))).then(actividadesAnuales => {
          const actividadesValidas = actividadesAnuales.filter(a => a !== null && a !== undefined);
          this.actividadesAnuales.set(actividadesValidas);
          
          // Cargar actividades mensuales relacionadas a todas las actividades anuales
          const requestsMensuales = actividadesValidas
            .filter(a => a.idActividadAnual)
            .map(a => this.actividadMensualInstService.getByActividadAnual(a.idActividadAnual!));
          
          if (requestsMensuales.length > 0) {
            Promise.all(requestsMensuales.map(req => firstValueFrom(req))).then(arraysMensuales => {
              const todasMensuales = arraysMensuales.flat();
              this.actividadesMensuales.set(todasMensuales);
            }).catch(err => {
              console.error('Error loading actividades mensuales:', err);
              this.actividadesMensuales.set([]);
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
      // Si no hay actividad anual asociada, intentar cargar desde indicadores
      const indicadores = this.indicadores();
      if (indicadores.length === 0) {
        this.actividadesAnuales.set([]);
        this.actividadesMensuales.set([]);
        return;
      }

      // Obtener IDs únicos de indicadores
      const indicadorIds = [...new Set(indicadores.map(ind => ind.idIndicador).filter(id => id !== undefined && id !== null))];
      
      if (indicadorIds.length === 0) {
        this.actividadesAnuales.set([]);
        this.actividadesMensuales.set([]);
        return;
      }

      // Cargar actividades anuales para cada indicador
      const actividadesAnualesPromises = indicadorIds.map(idIndicador => 
        firstValueFrom(this.actividadAnualService.getByIndicador(idIndicador))
      );

      Promise.all(actividadesAnualesPromises).then(results => {
        const todasActividadesAnuales = results.flat().filter(item => item !== null && item !== undefined);
        this.actividadesAnuales.set(todasActividadesAnuales);

        // Cargar actividades mensuales para cada actividad anual
        const actividadesMensualesPromises = todasActividadesAnuales.map(anual => 
          anual.idActividadAnual 
            ? firstValueFrom(this.actividadMensualInstService.getByActividadAnual(anual.idActividadAnual))
            : Promise.resolve([])
        );

        Promise.all(actividadesMensualesPromises).then(mensualesResults => {
          const todasActividadesMensuales = mensualesResults.flat().filter(item => item !== null && item !== undefined);
          this.actividadesMensuales.set(todasActividadesMensuales);
        }).catch(err => {
          console.error('Error loading actividades mensuales:', err);
        });
      }).catch(err => {
        console.error('Error loading actividades anuales:', err);
      });
    }
  }

  setTab(tab: 'info' | 'departamentos' | 'responsables' | 'indicadores' | 'subactividades' | 'actividades-anuales' | 'evidencias'): void {
    this.activeTab.set(tab);
  }

  getActividadesMensualesPorAnual(idActividadAnual: number): ActividadMensualInst[] {
    return this.actividadesMensuales().filter(m => m.idActividadAnual === idActividadAnual);
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
}

