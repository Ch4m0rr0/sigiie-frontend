import { Component, inject, OnInit, AfterViewInit, signal, computed, effect, HostListener, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { ActividadesService } from '../../core/services/actividades.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { IndicadorService } from '../../core/services/indicador.service';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import { ActividadResponsableService, type ActividadResponsableCreate } from '../../core/services/actividad-responsable.service';
import { PersonasService } from '../../core/services/personas.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import type { Actividad } from '../../core/models/actividad';
import type { Indicador } from '../../core/models/indicador';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import type { ActividadMensualInst } from '../../core/models/actividad-mensual-inst';
import type { Docente } from '../../core/models/docente';
import type { Estudiante } from '../../core/models/estudiante';
import type { Administrativo } from '../../core/models/administrativo';
import type { Usuario } from '../../core/models/usuario';
import { IconComponent } from '../../shared/icon/icon.component';
import { CalendarModule, CalendarUtils, CalendarDateFormatter, CalendarA11y, CalendarEventTitleFormatter, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { es } from 'date-fns/locale';
import { format, startOfWeek, addDays, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { EvidenciaFormComponent } from '../evidencias/evidencia-form.component';

// Formateador personalizado para usar locale español
class CustomCalendarDateFormatter extends CalendarDateFormatter {
  override monthViewColumnHeader({ date, locale }: { date: Date; locale: string }): string {
    // Formatear los días de la semana en español
    return format(date, 'EEE', { locale: es });
  }

  override monthViewTitle({ date, locale }: { date: Date; locale: string }): string {
    // Formatear el título del mes en español
    return format(date, 'MMMM yyyy', { locale: es });
  }

  override weekViewColumnHeader({ date, locale }: { date: Date; locale: string }): string {
    return format(date, 'EEE', { locale: es });
  }

  override dayViewHour({ date, locale }: { date: Date; locale: string }): string {
    return format(date, 'HH:mm', { locale: es });
  }

  override dayViewTitle({ date, locale }: { date: Date; locale: string }): string {
    return format(date, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es });
  }

  override weekViewTitle({ date, locale }: { date: Date; locale: string }): string {
    return format(date, 'Semana del d \'de\' MMMM', { locale: es });
  }
}

// Formateador personalizado para títulos de eventos que muestra el código de manera prominente
class CustomCalendarEventTitleFormatter extends CalendarEventTitleFormatter {
  override month(event: CalendarEvent): string {
    // Retornar el título completo que ya incluye el código al inicio
    // El código aparece primero en el formato: "CODIGO - Nombre Actividad"
    return event.title;
  }
}

@Component({
  standalone: true,
  selector: 'app-list-actividades',
  imports: [
    CommonModule, 
    RouterModule, 
    ReactiveFormsModule, 
    IconComponent, 
    CalendarModule,
    EvidenciaFormComponent
  ],
  providers: [
    CalendarUtils,
    {
      provide: CalendarDateFormatter,
      useClass: CustomCalendarDateFormatter,
    },
    CalendarA11y,
    {
      provide: CalendarEventTitleFormatter,
      useClass: CustomCalendarEventTitleFormatter,
    },
    {
      provide: DateAdapter,
      useFactory: adapterFactory,
    },
  ],
  templateUrl: './actividades.component.html',
})
export class ListActividadesComponent implements OnInit, AfterViewInit, OnDestroy {
  private actividadesService = inject(ActividadesService);
  private catalogosService = inject(CatalogosService);
  private indicadorService = inject(IndicadorService);
  private actividadAnualService = inject(ActividadAnualService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private responsableService = inject(ActividadResponsableService);
  private personasService = inject(PersonasService);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private elementRef = inject(ElementRef);

  actividades = signal<Actividad[]>([]);
  indicadores = signal<Indicador[]>([]);
  actividadesAnuales = signal<ActividadAnual[]>([]);
  actividadesMensualesInst = signal<ActividadMensualInst[]>([]);
  actividadesAnualesFiltradas = signal<ActividadAnual[]>([]);
  actividadesMensualesFiltradas = signal<ActividadMensualInst[]>([]);
  mostrarDropdownActividad = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  showRetryButton = false;
  private cargandoActividades = false; // Flag para evitar llamadas múltiples simultáneas

  // Arrays para selector de hora en formato 12 horas
  horas12: string[] = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  minutos: string[] = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  
  // Modo de vista: 'cards' | 'lista' | 'calendario'
  modoVista = signal<'cards' | 'lista' | 'calendario'>('lista');
  
  // Calendario
  viewDate: Date = new Date();
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  locale: string = 'es';
  
  eventosCalendario = signal<CalendarEvent[]>([]);

  constructor() {
    // Efecto para actualizar badges cuando cambien los eventos o el modo de vista
    effect(() => {
      const modo = this.modoVista();
      const eventos = this.eventosCalendario();
      
      console.log('🔄 Effect ejecutado - Modo:', modo, 'Eventos:', eventos.length);
      
      // Solo ejecutar si estamos en vista de calendario y hay eventos
      if (modo === 'calendario' && eventos.length > 0) {
        console.log('✅ Condiciones cumplidas, ejecutando agregarBadgesCodigo...');
        // Esperar a que el DOM se actualice
        setTimeout(() => {
          console.log('⏰ Timeout ejecutado, buscando celdas...');
          const dayCells = this.obtenerCeldasCalendario();
          console.log('📅 Celdas encontradas:', dayCells?.length || 0);
          if (dayCells && dayCells.length > 0) {
            this.agregarBadgesCodigoEnCeldas(dayCells);
          } else {
            console.log('⚠️ No se encontraron celdas, intentando de nuevo...');
            // Intentar de nuevo después de más tiempo
            setTimeout(() => {
              const retryCells = this.obtenerCeldasCalendario();
              if (retryCells && retryCells.length > 0) {
                console.log('✅ Celdas encontradas en reintento');
                this.agregarBadgesCodigoEnCeldas(retryCells);
              } else {
                console.log('❌ No se encontraron celdas después del reintento');
              }
            }, 500);
          }
        }, 600);
      }
    });
  }

  // Catálogos para el formulario de actividad
  departamentos = signal<any[]>([]);
  tiposIniciativa = signal<any[]>([]);
  estadosActividad = signal<any[]>([]);
  
  // Estados filtrados para creación (excluye Suspendido, Cancelado y Finalizado)
  estadosActividadParaCreacion = computed(() => {
    // Siempre filtrar en el formulario principal ya que es solo para creación
    return this.estadosActividad().filter(estado => {
      const nombre = estado.nombre?.toLowerCase() || '';
      return !nombre.includes('suspendido') && 
             !nombre.includes('suspendida') &&
             !nombre.includes('cancelado') && 
             !nombre.includes('cancelada') &&
             !nombre.includes('finalizado') &&
             !nombre.includes('finalizada');
    });
  });
  tiposActividad = signal<any[]>([]);
  tiposDocumento = signal<any[]>([]);
  tiposProtagonista = signal<any[]>([]);
  tiposEvidencia = signal<any[]>([]); // Tipos de evidencia
  capacidadesInstaladas = signal<any[]>([]);

  // Filtros
  filtroEstadoActividad = signal<number | null>(null);
  filtroActividadAnual = signal<number[]>([]);
  filtroActividadMensualInst = signal<number[]>([]);
  terminoBusqueda = signal<string>('');
  terminoBusquedaAnual = signal<string>('');
  mostrarDropdownFiltroAnual = signal(false);
  terminoBusquedaMensual = signal<string>('');
  mostrarDropdownFiltroMensual = signal(false);
  terminoBusquedaEstado = signal<string>('');
  mostrarDropdownFiltroEstado = signal(false);

  // Actividades anuales disponibles según filtro de mensuales
  actividadesAnualesDisponibles = computed(() => {
    const filtroMensuales = this.filtroActividadMensualInst();
    if (filtroMensuales.length === 0) {
      return this.actividadesAnuales();
    }
    // Obtener las actividades anuales asociadas a las mensuales seleccionadas
    const idsAnuales = new Set<number>();
    filtroMensuales.forEach(idMensual => {
      const mensual = this.actividadesMensualesInst().find(m => m.idActividadMensualInst === idMensual);
      if (mensual?.idActividadAnual) {
        idsAnuales.add(mensual.idActividadAnual);
      }
    });
    return this.actividadesAnuales().filter(a => idsAnuales.has(a.idActividadAnual));
  });

  // Actividades anuales filtradas por búsqueda
  actividadesAnualesFiltradasBusqueda = computed(() => {
    const termino = this.terminoBusquedaAnual().toLowerCase().trim();
    const disponibles = this.actividadesAnualesDisponibles();
    if (!termino) {
      return disponibles;
    }
    return disponibles.filter(anual => {
      const nombre = (anual.nombre || anual.nombreIndicador || '').toLowerCase();
      const anio = (anual.anio || '').toString();
      const codigoIndicador = (anual.codigoIndicador || '').toLowerCase();
      return nombre.includes(termino) || anio.includes(termino) || codigoIndicador.includes(termino);
    });
  });

  // Actividades mensuales disponibles según filtro de anuales
  actividadesMensualesDisponibles = computed(() => {
    const filtroAnuales = this.filtroActividadAnual();
    if (filtroAnuales.length === 0) {
      return this.actividadesMensualesInst();
    }
    // Filtrar solo las mensuales asociadas a las anuales seleccionadas
    return this.actividadesMensualesInst().filter(m => 
      m.idActividadAnual && filtroAnuales.includes(m.idActividadAnual)
    );
  });

  // Actividades mensuales filtradas por búsqueda
  actividadesMensualesFiltradasBusqueda = computed(() => {
    const termino = this.terminoBusquedaMensual().toLowerCase().trim();
    const disponibles = this.actividadesMensualesDisponibles();
    if (!termino) {
      return disponibles;
    }
    return disponibles.filter(mensual => {
      const nombre = (mensual.nombre || '').toLowerCase();
      const nombreMes = (mensual.nombreMes || '').toLowerCase();
      const mes = (mensual.mes || '').toString();
      
      // Buscar código del indicador desde la actividad anual relacionada
      let codigoIndicador = '';
      if (mensual.idActividadAnual) {
        const anual = this.actividadesAnuales().find(a => a.idActividadAnual === mensual.idActividadAnual);
        if (anual) {
          codigoIndicador = (anual.codigoIndicador || '').toLowerCase();
        }
      }
      
      return nombre.includes(termino) || 
             nombreMes.includes(termino) || 
             mes.includes(termino) || 
             codigoIndicador.includes(termino);
    });
  });

  // Actividades filtradas por búsqueda
  actividadesFiltradas = computed(() => {
    const termino = this.terminoBusqueda().toLowerCase().trim();
    if (!termino) {
      return this.actividades();
    }
    return this.actividades().filter(actividad => {
      const nombre = (actividad.nombreActividad || actividad.nombre || '').toLowerCase();
      const codigo = (actividad.codigoActividad || '').toLowerCase();
      return nombre.includes(termino) || codigo.includes(termino);
    });
  });

  // Formulario para crear indicador
  formIndicador!: FormGroup;
  mostrarFormIndicador = signal(false);
  loadingIndicador = signal(false);
  errorIndicador = signal<string | null>(null);

  // Formulario para importar desde año
  formImportarAnio!: FormGroup;
  mostrarFormImportarAnio = signal(false);
  loadingImportarAnio = signal(false);
  errorImportarAnio = signal<string | null>(null);

  // Importar desde Excel
  mostrarFormImportarExcel = signal(false);
  loadingImportarExcel = signal(false);
  errorImportarExcel = signal<string | null>(null);
  archivoExcel: File | null = null;

  // Indicador seleccionado globalmente
  indicadorSeleccionado = signal<number | null>(null);
  mostrarDropdownIndicadorSeleccionado = signal(false);

  // Formulario para nueva actividad
  formNuevaActividad!: FormGroup;
  tipoActividadSeleccionado = signal<'anual' | 'mensual' | 'planificada' | 'no-planificada' | null>(null);
  mostrarFormNuevaActividad = signal(false);
  mostrarDropdownIndicadorForm = signal(false);
  mostrarDropdownTipoActividad = signal(false);
  mostrarDropdownActividadAnual = signal(true); // Controla si se muestra el dropdown de actividades anuales
  mostrarDropdownActividadMensual = signal(true); // Controla si se muestra el dropdown de actividades mensuales
  mostrarDropdownDepartamentoResponsable = signal(true); // Controla si se muestra el dropdown de departamentos responsables
  mostrarDropdownTipoActividadSelect = signal(true); // Controla si se muestra el dropdown de tipos de actividad
  mostrarDropdownProtagonista = signal(true); // Controla si se muestra el dropdown de protagonistas
  mostrarDropdownTipoEvidencia = signal(true); // Controla si se muestra el dropdown de tipos de evidencia
  loadingNuevaActividad = signal(false);
  errorNuevaActividad = signal<string | null>(null);
  successNuevaActividad = signal<{ id: number; nombre: string; esPlanificada?: boolean } | null>(null);
  private cargandoRelaciones = false; // Flag para evitar loops infinitos

  // Formulario de responsables
  formResponsable!: FormGroup;
  docentes = signal<Docente[]>([]);
  estudiantes = signal<Estudiante[]>([]);
  administrativos = signal<Administrativo[]>([]);
  usuarios = signal<Usuario[]>([]);
  rolesResponsable = signal<any[]>([]); // Roles de responsable (Coordinador, Logística, Organizador, etc.)
  loadingResponsables = signal(false);
  
  // Tipos de responsables seleccionados
  tiposResponsableSeleccionados = signal<string[]>([]); // ['usuario', 'docente', 'estudiante', 'administrativo', 'externo']

  // Modal de evidencia
  showEvidenciaModal = signal(false);
  actividadParaEvidencia = signal<Actividad | null>(null);
  
  // Modal de edición de tipos de evidencia
  showEditarTiposEvidenciaModal = signal(false);
  tiposEvidenciaSeleccionadosParaEditar = signal<number[]>([]);
  guardandoTiposEvidencia = signal(false);
  
  // Signal computado para los tipos de evidencia de la actividad
  tiposEvidenciaDeActividad = computed(() => {
    const actividad = this.actividadParaEvidencia();
    if (!actividad) {
      return null;
    }
    
    const tipos: any = actividad.idTipoEvidencias;
    
    // Si es undefined o null, retornar null
    if (tipos === undefined || tipos === null) {
      return null;
    }
    
    // Si es un string, intentar parsearlo primero
    if (typeof tipos === 'string' && tipos.trim() !== '') {
      try {
        const parsed = JSON.parse(tipos);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const tiposNumeros = parsed.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
          return tiposNumeros;
        }
      } catch (e) {
        console.warn('⚠️ Error parseando tipos de evidencia desde string:', e);
      }
    }
    
    // Si es un array y tiene elementos
    if (Array.isArray(tipos) && tipos.length > 0) {
      // Asegurarse de que todos los valores sean números
      const tiposNumeros = tipos.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
      return tiposNumeros;
    }
    
    // Si es un número único, convertirlo a array
    if (typeof tipos === 'number' && tipos > 0) {
      return [tipos];
    }
    
    return null;
  });

  ngOnInit(): void {
    this.initializeFormIndicador();
    this.initializeFormImportarAnio();
    this.initializeFormNuevaActividad();
    this.initializeFormResponsable();
    
    // Verificar si hay query params para recargar datos
    const queryParams = this.route.snapshot.queryParams;
    const necesitaRecargar = queryParams['recargar'] === 'true';
    
    if (necesitaRecargar) {
      console.log('🔄 Recargando datos después de crear actividad mensual...');
      
      // Si hay un ID de actividad mensual creada, filtrar por ella
      if (queryParams['actividadMensualCreada']) {
        const idActividadMensual = Number(queryParams['actividadMensualCreada']);
        if (!isNaN(idActividadMensual)) {
          console.log('📊 Filtrando por actividad mensual creada:', idActividadMensual);
          this.filtroActividadMensualInst.set([idActividadMensual]);
        }
      }
      
      // Limpiar query params inmediatamente para evitar recargas múltiples
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true
      });
      
      // Cargar datos con recarga específica
      this.loadAllDataInParallel(true);
    } else {
      // Cargar todos los datos en paralelo normalmente
      this.loadAllDataInParallel(false);
    }
  }

  /**
   * Carga todos los datos necesarios en paralelo usando forkJoin
   * Esto reduce significativamente el tiempo de carga
   * Si alguna llamada falla, las demás continúan ejecutándose
   * @param recargarActividades Si es true, recarga las actividades después de cargar los datos
   */
  loadAllDataInParallel(recargarActividades: boolean = false): void {
    this.loading.set(true);
    
    // Helper para manejar errores individuales sin detener las demás llamadas
    const handleError = (error: any, defaultValue: any[] = [], errorMessage: string = '') => {
      console.error(`❌ Error en carga paralela${errorMessage ? ': ' + errorMessage : ''}:`, error);
      if (error?.error) {
        console.error('❌ Detalles del error:', JSON.stringify(error.error, null, 2));
      }
      if (error?.message) {
        console.error('❌ Mensaje de error:', error.message);
      }
      return of(defaultValue);
    };
    
    // Cargar catálogos en paralelo con manejo de errores individual
    const catalogos$ = forkJoin({
      departamentos: this.catalogosService.getDepartamentos().pipe(
        catchError(err => handleError(err, []))
      ),
      tiposIniciativa: this.catalogosService.getTiposIniciativa().pipe(
        catchError(err => handleError(err, []))
      ),
      estadosActividad: this.catalogosService.getEstadosActividad().pipe(
        catchError(err => {
          console.error('❌ Error al cargar estados de actividad:', err);
          return handleError(err, [], 'estados de actividad');
        })
      ),
      tiposActividad: this.catalogosService.getCategoriasActividad().pipe(
        catchError(err => handleError(err, []))
      ),
      tiposDocumento: this.catalogosService.getTiposDocumento().pipe(
        catchError(err => handleError(err, []))
      ),
      tiposProtagonista: this.catalogosService.getTiposProtagonista().pipe(
        catchError(err => handleError(err, []))
      ),
      tiposEvidencia: this.catalogosService.getTiposEvidencia().pipe(
        catchError(err => handleError(err, []))
      ),
      capacidadesInstaladas: this.catalogosService.getCapacidadesInstaladas().pipe(
        catchError(err => handleError(err, []))
      )
    });

    // Cargar datos principales en paralelo con manejo de errores individual
    const datos$ = forkJoin({
      actividadesAnuales: this.actividadAnualService.getAll().pipe(
        catchError(err => handleError(err, []))
      ),
      actividadesMensualesInst: this.actividadMensualInstService.getAll().pipe(
        catchError(err => handleError(err, []))
      ),
      indicadores: this.indicadorService.getAll().pipe(
        catchError(err => handleError(err, []))
      )
    });

    // Ejecutar ambas operaciones en paralelo
    forkJoin({
      catalogos: catalogos$,
      datos: datos$
    }).subscribe({
      next: (results) => {
        // Asignar catálogos
        this.departamentos.set(results.catalogos.departamentos);
        this.tiposIniciativa.set(results.catalogos.tiposIniciativa);
        const estados = results.catalogos.estadosActividad || [];
        console.log('📋 Estados de actividad cargados:', estados.length, 'estados');
        console.log('📋 Datos completos de estados:', JSON.stringify(estados, null, 2));
        if (estados.length > 0) {
          console.log('📋 Lista de estados:', estados.map((e: any) => ({
            id: e.idEstadoActividad || e.id,
            nombre: e.nombre,
            color: (e as any).color || 'sin color'
          })));
        } else {
          console.warn('⚠️ No se cargaron estados de actividad o el array está vacío');
          console.warn('⚠️ Respuesta completa de catalogos:', results.catalogos);
        }
        this.estadosActividad.set(estados);
        console.log('✅ Signal estadosActividad actualizado con', this.estadosActividad().length, 'estados');
        this.tiposActividad.set(results.catalogos.tiposActividad);
        
        // Establecer estado por defecto después de cargar los catálogos
        this.establecerEstadoActividadPorDefecto();
        this.tiposDocumento.set(results.catalogos.tiposDocumento);
        this.tiposProtagonista.set(results.catalogos.tiposProtagonista);
        this.tiposEvidencia.set(results.catalogos.tiposEvidencia);
        this.capacidadesInstaladas.set(results.catalogos.capacidadesInstaladas);
        
        // Asignar datos principales
        this.actividadesAnuales.set(results.datos.actividadesAnuales);
        this.actividadesMensualesInst.set(results.datos.actividadesMensualesInst);
        this.indicadores.set(results.datos.indicadores);
        
        // Actualizar actividades mensuales filtradas después de cargar los datos
        this.actualizarActividadesMensualesFiltradas();
        
        // Cargar actividades solo si se solicita explícitamente o si no hay recarga pendiente
        if (recargarActividades || !this.cargandoActividades) {
          // Usar setTimeout para evitar llamadas simultáneas
          setTimeout(() => {
            this.loadActividades();
          }, 100);
        }
      },
      error: (err) => {
        console.error('Error crítico en carga paralela:', err);
        this.loading.set(false);
        // Intentar cargar datos individualmente como fallback
        this.loadActividadesAnuales();
        this.loadActividadesMensualesInst();
    this.loadIndicadores();
        this.loadCatalogosParaActividad();
        this.loadActividades();
      }
    });
  }

  loadCatalogosParaActividad(): void {
    this.catalogosService.getDepartamentos().subscribe({
      next: (data) => this.departamentos.set(data),
      error: (err) => console.error('Error loading departamentos:', err)
    });

    this.catalogosService.getTiposIniciativa().subscribe({
      next: (data) => this.tiposIniciativa.set(data),
      error: (err) => console.error('Error loading tipos iniciativa:', err)
    });

    this.catalogosService.getEstadosActividad().subscribe({
      next: (data) => {
        console.log('📋 Estados de actividad recargados:', data?.length || 0, 'estados');
        if (data && data.length > 0) {
          console.log('📋 Lista de estados:', data.map((e: any) => ({
            id: e.idEstadoActividad || e.id,
            nombre: e.nombre,
            color: (e as any).color || 'sin color'
          })));
        } else {
          console.warn('⚠️ No se recargaron estados de actividad o el array está vacío');
        }
        this.estadosActividad.set(data || []);
        // Establecer estado por defecto si el formulario existe y no tiene estado seleccionado
        this.establecerEstadoActividadPorDefecto();
      },
      error: (err) => {
        console.error('❌ Error loading estados actividad:', err);
        if (err?.error) {
          console.error('❌ Detalles del error:', JSON.stringify(err.error, null, 2));
        }
        if (err?.message) {
          console.error('❌ Mensaje de error:', err.message);
        }
        if (err?.status) {
          console.error('❌ Status del error:', err.status);
        }
        if (err?.statusText) {
          console.error('❌ Status text:', err.statusText);
        }
        this.estadosActividad.set([]);
      }
    });

    this.catalogosService.getCategoriasActividad().subscribe({
      next: (data) => this.tiposActividad.set(data),
      error: (err) => console.error('Error loading tipos actividad:', err)
    });


    this.catalogosService.getTiposDocumento().subscribe({
      next: (data) => this.tiposDocumento.set(data),
      error: (err) => console.error('Error loading tipos documento:', err)
    });

    this.catalogosService.getTiposProtagonista().subscribe({
      next: (data) => this.tiposProtagonista.set(data),
      error: (err) => console.error('Error loading tipos protagonista:', err)
    });

    this.catalogosService.getCapacidadesInstaladas().subscribe({
      next: (data) => this.capacidadesInstaladas.set(data),
      error: (err) => console.error('Error loading capacidades instaladas:', err)
    });

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

  initializeFormImportarAnio(): void {
    const currentYear = new Date().getFullYear();
    this.formImportarAnio = this.fb.group({
      anioOrigen: [currentYear - 1, [Validators.required, Validators.min(2000), Validators.max(2100)]],
      anioDestino: [currentYear, [Validators.required, Validators.min(2000), Validators.max(2100)]],
      actualizarExistentes: [true]
    });
  }

  // Validador personalizado para comparar fechas
  fechaFinValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.parent) {
      return null;
    }
    
    const fechaInicio = control.parent.get('fechaInicio')?.value;
    const fechaFin = control.value;
    
    if (!fechaInicio || !fechaFin) {
      return null; // Si alguna fecha está vacía, no validar (validación opcional)
    }
    
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    // Comparar solo las fechas (sin horas)
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    
    if (fin < inicio) {
      return { fechaFinAnterior: true };
    }
    
    return null;
  }

  initializeFormNuevaActividad(): void {
    this.cargandoRelaciones = false; // Resetear flag
    const currentYear = new Date().getFullYear();
    
    // Limpiar las listas filtradas al inicializar
    this.actividadesAnualesFiltradas.set([]);
    this.actividadesMensualesFiltradas.set([]);
    
    // Resetear la visibilidad de los dropdowns
    this.mostrarDropdownActividadAnual.set(true);
    this.mostrarDropdownActividadMensual.set(true);
    this.mostrarDropdownDepartamentoResponsable.set(true);
    this.mostrarDropdownTipoActividadSelect.set(true);
    this.mostrarDropdownProtagonista.set(true);
    
    this.formNuevaActividad = this.fb.group({
      // Campos básicos de relación
      idIndicador: [null], // Opcional - no requiere validación
      idActividadAnual: [[]], // Array para múltiples selecciones (opcional)
      idActividadMensualInst: [[]], // Array para múltiples selecciones (opcional)
      
      // Campos principales
      nombreActividad: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      objetivo: [''],
      
      // Fechas
      fechaInicio: [''],
      fechaFin: ['', [this.fechaFinValidator.bind(this)]],
      horaRealizacion: [''], // Campo oculto que se actualiza desde los selects
      horaRealizacionHora: [''],
      horaRealizacionMinuto: [''],
      horaRealizacionAmPm: [''],
      anio: [''], // No cargar automáticamente el año
      
      // Tipos y categorías
      idEstadoActividad: [null],
      idTipoActividad: [[]], // Array para múltiples selecciones (no se envía según ejemplos)
      idTipoProtagonista: [null], // Único según el JSON del backend
      departamentoResponsableId: [null], // Único según el JSON del backend
      
      // Ubicación y modalidad
      modalidad: [''],
      idCapacidadInstalada: [null],
      
      // Participantes
      cantidadParticipantesProyectados: [null, Validators.required], // Obligatorio
      cantidadParticipantesEstudiantesProyectados: [null], // Campo local, no obligatorio
      cantidadTotalParticipantesProtagonistas: [null], // Total de participantes protagonistas
      
      // Tipos de evidencia
      idTipoEvidencias: [[]], // Array de IDs de tipos de evidencias requeridas
      
      // Tipo de actividad
      esPlanificada: [true], // Por defecto planificada
      
      // Estado activo - siempre true por defecto
      activo: [true]
      
    });
    
    // Suscribirse a cambios en fechaInicio para revalidar fechaFin
    this.formNuevaActividad.get('fechaInicio')?.valueChanges.subscribe(() => {
      this.formNuevaActividad.get('fechaFin')?.updateValueAndValidity();
    });

    // Sincronizar selectores de hora con el campo horaRealizacion
    this.formNuevaActividad.get('horaRealizacionHora')?.valueChanges.subscribe(() => {
      this.actualizarHoraRealizacion();
    });
    this.formNuevaActividad.get('horaRealizacionMinuto')?.valueChanges.subscribe(() => {
      this.actualizarHoraRealizacion();
    });
    this.formNuevaActividad.get('horaRealizacionAmPm')?.valueChanges.subscribe(() => {
      this.actualizarHoraRealizacion();
    });

    // Suscribirse a cambios en el indicador
    this.formNuevaActividad.get('idIndicador')?.valueChanges.subscribe(idIndicador => {
      if (this.cargandoRelaciones) return; // Evitar loops
      
      if (idIndicador) {
        // Solo cargar las actividades disponibles, pero NO seleccionarlas automáticamente
        this.cargarActividadesPorIndicador(idIndicador, false); // false = no auto-seleccionar
      } else {
        // Si se elimina el indicador, limpiar todo
        this.formNuevaActividad.patchValue({
          idActividadAnual: [],
          idActividadMensualInst: []
        }, { emitEvent: false });
        
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
      }
    });
    
    // Suscribirse a cambios en la actividad anual
    this.formNuevaActividad.get('idActividadAnual')?.valueChanges.subscribe(idActividadAnual => {
      if (this.cargandoRelaciones) return; // Evitar loops
      
      // Manejar array de actividades anuales
      const actividadesAnuales = Array.isArray(idActividadAnual) ? idActividadAnual : (idActividadAnual ? [idActividadAnual] : []);
      
      if (actividadesAnuales.length > 0) {
        // Cargar actividades mensuales para todas las actividades anuales seleccionadas
        const requests = actividadesAnuales
          .filter(id => id)
          .map(id => this.actividadMensualInstService.getByActividadAnual(id));
        
        if (requests.length > 0) {
          Promise.all(requests.map(req => firstValueFrom(req))).then(arraysMensuales => {
            const todasMensuales = arraysMensuales.flat();
            // Agregar a la lista existente sin duplicados
            const actuales = this.actividadesMensualesFiltradas();
            const idsActuales = new Set(actuales.map(m => m.idActividadMensualInst));
            const nuevas = todasMensuales.filter(m => !idsActuales.has(m.idActividadMensualInst));
            this.actividadesMensualesFiltradas.set([...actuales, ...nuevas]);
          }).catch(err => {
            console.error('Error loading actividades mensuales:', err);
    });
  }
      }
      // No limpiar el indicador si se deseleccionan las actividades anuales
    });
    
    // Suscribirse a cambios en la actividad mensual (ahora es un array)
    this.formNuevaActividad.get('idActividadMensualInst')?.valueChanges.subscribe(idActividadMensualInst => {
      if (this.cargandoRelaciones) return; // Evitar loops
      
      // Manejar array de actividades mensuales
      const actividadesMensuales = Array.isArray(idActividadMensualInst) ? idActividadMensualInst : (idActividadMensualInst ? [idActividadMensualInst] : []);
      
      if (actividadesMensuales.length > 0) {
        // Cargar datos de la primera actividad mensual seleccionada (solo para obtener información)
        this.cargarDatosPorActividadMensual(actividadesMensuales[0]);
      }
      // No limpiar el indicador si se deseleccionan las actividades mensuales
    });
    
    // Establecer estado por defecto si los catálogos ya están cargados
    if (this.estadosActividad().length > 0) {
      this.establecerEstadoActividadPorDefecto();
    }
  }

  /**
   * Establece el estado de actividad por defecto (Planificada o En Curso)
   * si el formulario no tiene un estado seleccionado
   */
  establecerEstadoActividadPorDefecto(): void {
    if (!this.formNuevaActividad) return;
    
    const estadoActual = this.formNuevaActividad.get('idEstadoActividad')?.value;
    if (estadoActual) return; // Ya tiene un estado seleccionado
    
    const estados = this.estadosActividadParaCreacion(); // Usar estados filtrados para creación
    if (estados.length === 0) return;
    
    // Buscar "Planificada" primero, luego "En Curso", luego el primero disponible
    const estadoPlanificada = estados.find(e => 
      e.nombre?.toLowerCase().includes('planificada') || 
      e.nombre?.toLowerCase().includes('planificad')
    );
    
    const estadoEnCurso = estados.find(e => 
      e.nombre?.toLowerCase().includes('en curso') || 
      e.nombre?.toLowerCase().includes('en_curso') ||
      e.nombre?.toLowerCase().includes('curso')
    );
    
    const estadoPorDefecto = estadoPlanificada || estadoEnCurso || estados[0];
    
    if (estadoPorDefecto) {
      const idEstado = estadoPorDefecto.idEstadoActividad || estadoPorDefecto.id;
      this.formNuevaActividad.patchValue({ idEstadoActividad: idEstado }, { emitEvent: false });
      console.log('✅ Estado de actividad por defecto establecido:', estadoPorDefecto.nombre);
    }
  }

  loadActividadesAnuales(): void {
    this.actividadAnualService.getAll().subscribe({
      next: (data) => this.actividadesAnuales.set(data),
      error: (err) => console.error('Error loading actividades anuales:', err)
    });
  }

  loadActividadesMensualesInst(): void {
    console.log('🔄 Cargando actividades mensuales institucionales...');
    this.actividadMensualInstService.getAll().subscribe({
      next: (data) => {
        console.log('✅ Actividades mensuales cargadas:', data.length);
        console.log('📋 Actividades mensuales:', data.map(m => ({
          id: m.idActividadMensualInst,
          nombre: m.nombre,
          mes: m.mes,
          idActividadAnual: m.idActividadAnual
        })));
        this.actividadesMensualesInst.set(data);
        
        // Actualizar las actividades mensuales filtradas si hay un filtro activo
        this.actualizarActividadesMensualesFiltradas();
      },
      error: (err) => {
        console.error('❌ Error loading actividades mensuales institucionales:', err);
        this.actividadesMensualesInst.set([]);
      }
    });
  }
  
  actualizarActividadesMensualesFiltradas(): void {
    const indicadorId = this.indicadorSeleccionado();
    const todasMensuales = this.actividadesMensualesInst();
    
    if (indicadorId) {
      // Filtrar por indicador a través de actividades anuales
      const actividadesAnualesDelIndicador = this.actividadesAnuales()
        .filter(a => a.idIndicador === indicadorId)
        .map(a => a.idActividadAnual);
      
      const mensualesFiltradas = todasMensuales.filter(m => 
        actividadesAnualesDelIndicador.includes(m.idActividadAnual)
      );
      
      console.log('📊 Actividades mensuales filtradas por indicador:', mensualesFiltradas.length);
      this.actividadesMensualesFiltradas.set(mensualesFiltradas);
    } else {
      this.actividadesMensualesFiltradas.set(todasMensuales);
    }
  }

  loadActividades(): void {
    // Evitar llamadas múltiples simultáneas
    if (this.cargandoActividades) {
      console.warn('⚠️ loadActividades ya está en ejecución, ignorando llamada duplicada');
      return;
    }
    
    this.cargandoActividades = true;
    this.loading.set(true);
    this.error.set(null);
    
    console.log('🔄 Cargando actividades...');
    console.log('📊 Filtros activos:', {
      estadoActividad: this.filtroEstadoActividad(),
      actividadAnual: this.filtroActividadAnual(),
      actividadMensualInst: this.filtroActividadMensualInst()
    });

    // Usar GetAllAsync() - sin filtros del backend, filtramos en el cliente
    this.actividadesService.getAll().subscribe({
      next: (data) => {
        // Aplicar filtros del lado del cliente
        let filtered = data;
        
        // Filtrar por estado de actividad (del catálogo)
        if (this.filtroEstadoActividad() !== null) {
          filtered = filtered.filter(a => a.idEstadoActividad === this.filtroEstadoActividad()!);
        }
        
        // Filtrar por actividad mensual institucional (múltiples selecciones)
        if (this.filtroActividadMensualInst().length > 0) {
          const filtroIds = this.filtroActividadMensualInst();
          filtered = filtered.filter(a => {
            if (!a.idActividadMensualInst) return false;
            if (Array.isArray(a.idActividadMensualInst)) {
              return a.idActividadMensualInst.some(id => filtroIds.includes(id));
            }
            return filtroIds.includes(a.idActividadMensualInst);
          });
        }
        
        // Filtrar por actividad anual (múltiples selecciones)
        if (this.filtroActividadAnual().length > 0) {
          const filtroIdsAnuales = this.filtroActividadAnual();
          // Obtener todas las mensuales asociadas a las anuales seleccionadas
          const mensualesInst = this.actividadesMensualesInst();
          const idsMensualesInst = mensualesInst
            .filter(m => m.idActividadAnual && filtroIdsAnuales.includes(m.idActividadAnual))
            .map(m => m.idActividadMensualInst);
          
          filtered = filtered.filter(a => {
            if (!a.idActividadMensualInst) return false;
            if (Array.isArray(a.idActividadMensualInst)) {
              // Si es un array, verificar si alguno de los IDs está en idsMensualesInst
              return a.idActividadMensualInst.some(id => idsMensualesInst.includes(id));
            }
            // Si es un solo número, verificar si está en idsMensualesInst
            return idsMensualesInst.includes(a.idActividadMensualInst);
          });
        }
        
        console.log('✅ Actividades cargadas:', filtered.length, 'de', data.length, 'totales');
        if (filtered.length === 0 && data.length > 0) {
          console.warn('⚠️ No hay actividades que coincidan con los filtros aplicados');
        }
        this.actividades.set(filtered);
        this.actualizarEventosCalendario(filtered);
        this.loading.set(false);
        this.cargandoActividades = false;
      },
      error: (err) => {
        console.error('❌ Error loading actividades:', err);
        if (err.error) {
          console.error('❌ Error details:', JSON.stringify(err.error, null, 2));
        }
        
        let errorMessage = 'Error al cargar las actividades.';
        let showRetryButton = false;
        
        if (err.status === 500) {
          // Verificar si es un timeout de base de datos
          const errorText = typeof err.error === 'string' ? err.error : JSON.stringify(err.error || {});
          
          if (errorText.includes('Execution Timeout Expired') || 
              errorText.includes('timeout') || 
              errorText.includes('The timeout period elapsed') ||
              errorText.includes('SqlException')) {
            errorMessage = '⏱️ **Timeout de Base de Datos**\n\n' +
                          'La consulta está tardando demasiado tiempo. Esto puede deberse a:\n\n' +
                          '• **Demasiados registros**: Hay muchas actividades en la base de datos\n' +
                          '• **Consulta no optimizada**: El backend necesita optimizar la consulta SQL\n' +
                          '• **Problemas de rendimiento**: El servidor de base de datos está sobrecargado\n\n' +
                          '**Soluciones recomendadas:**\n' +
                          '1. Usa los filtros (Actividad Anual o Mensual) para reducir la cantidad de datos\n' +
                          '2. Intenta nuevamente en unos momentos\n' +
                          '3. Contacta al administrador para optimizar la consulta en el backend\n\n' +
                          '**Nota**: El problema está en el backend, no en el frontend.';
            showRetryButton = true;
          } else {
          errorMessage = 'Error interno del servidor. Por favor, contacta al administrador o intenta más tarde.';
            if (err.error && typeof err.error === 'string' && err.error.length < 200) {
              errorMessage += `\n\nDetalles: ${err.error.substring(0, 200)}`;
            }
            showRetryButton = true;
          }
        } else if (err.status === 401) {
          errorMessage = 'No estás autenticado. Por favor, inicia sesión nuevamente.';
        } else if (err.status === 403) {
          errorMessage = 'No tienes permisos para ver las actividades.';
        } else if (err.status === 404) {
          errorMessage = 'El servicio de actividades no está disponible.';
        } else if (err.status === 0) {
          errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
          showRetryButton = true;
        } else if (err.error?.message) {
          errorMessage = `Error: ${err.error.message}`;
          showRetryButton = true;
        }
        
        this.error.set(errorMessage);
        this.showRetryButton = showRetryButton;
        this.loading.set(false);
        this.cargandoActividades = false;
      }
    });
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/actividades', id]);
  }

  loadIndicadores(): void {
    this.indicadorService.getAll().subscribe({
      next: (data) => {
        this.indicadores.set(data);
      },
      error: (err) => {
        console.error('Error loading indicadores:', err);
        // El servicio ya maneja el error y retorna un array vacío
        // pero podemos mostrar un mensaje si es necesario
        if (err.status === 500) {
          console.warn('⚠️ Error 500 del servidor al cargar indicadores. Verifica la base de datos.');
        }
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Verificar si el clic fue dentro de algún dropdown
    const isInsideDropdown = target.closest('.dropdown-indicador') || 
                            target.closest('.dropdown-actividad') ||
                            target.closest('[class*="dropdown"]');
    
    // Verificar si el clic fue en el botón que abre el dropdown
    const isDropdownButton = target.closest('button[type="button"]')?.getAttribute('title')?.includes('indicador') ||
                            target.closest('button[type="button"]')?.textContent?.includes('Nueva Actividad');
    
    // Verificar si el clic fue dentro del dropdown de filtro anual, mensual o estado
    const isInsideFiltroAnual = target.closest('[data-dropdown-filtro-anual]');
    const isInsideFiltroMensual = target.closest('[data-dropdown-filtro-mensual]');
    const isInsideFiltroEstado = target.closest('[data-dropdown-filtro-estado]');
    
    // Solo cerrar si el clic fue fuera del componente y fuera de los dropdowns
    if (!this.elementRef.nativeElement.contains(target) && !isInsideDropdown && !isDropdownButton && !isInsideFiltroAnual && !isInsideFiltroMensual && !isInsideFiltroEstado) {
      this.mostrarDropdownActividad.set(false);
      this.mostrarDropdownIndicadorForm.set(false);
      this.mostrarDropdownIndicadorSeleccionado.set(false);
      this.mostrarDropdownTipoActividad.set(false);
      this.mostrarDropdownFiltroAnual.set(false);
      this.mostrarDropdownFiltroMensual.set(false);
      this.mostrarDropdownFiltroEstado.set(false);
    }
  }

  toggleDropdownActividad(): void {
    // Mostrar el dropdown de tipo de actividad sin requerir indicador
    this.mostrarDropdownTipoActividad.set(!this.mostrarDropdownTipoActividad());
    this.mostrarDropdownActividad.set(false);
  }

  toggleDropdownIndicadorSeleccionado(): void {
    this.mostrarDropdownIndicadorSeleccionado.set(!this.mostrarDropdownIndicadorSeleccionado());
  }

  getDropdownRightPosition(): number {
    if (typeof window === 'undefined') return 0;
    const button = this.elementRef.nativeElement.querySelector('.dropdown-indicador button');
    if (!button) return 0;
    const rect = button.getBoundingClientRect();
    return window.innerWidth - rect.right;
  }

  getDropdownTopPosition(): number {
    if (typeof window === 'undefined') return 0;
    const button = this.elementRef.nativeElement.querySelector('.dropdown-indicador button');
    if (!button) return 0;
    const rect = button.getBoundingClientRect();
    return rect.bottom + window.scrollY + 4; // 4px de margen
  }

  getDropdownActividadRightPosition(): number {
    if (typeof window === 'undefined') return 0;
    const button = this.elementRef.nativeElement.querySelector('.dropdown-actividad button');
    if (!button) return 0;
    const rect = button.getBoundingClientRect();
    return window.innerWidth - rect.right;
  }

  getDropdownActividadTopPosition(): number {
    if (typeof window === 'undefined') return 0;
    const button = this.elementRef.nativeElement.querySelector('.dropdown-actividad button');
    if (!button) return 0;
    const rect = button.getBoundingClientRect();
    return rect.bottom + window.scrollY + 4; // 4px de margen
  }

  seleccionarIndicadorGlobal(idIndicador: number | null): void {
    this.indicadorSeleccionado.set(idIndicador);
    this.mostrarDropdownIndicadorSeleccionado.set(false);
    // Si hay un formulario de nueva actividad abierto, actualizar el indicador y cargar actividades
    if (this.mostrarFormNuevaActividad()) {
      // Limpiar primero las actividades anuales filtradas para evitar mostrar actividades de otros indicadores
      this.actividadesAnualesFiltradas.set([]);
      this.actividadesMensualesFiltradas.set([]);
      this.formNuevaActividad.patchValue({
        idActividadAnual: null,
        idActividadMensualInst: null,
        idIndicador: idIndicador
      }, { emitEvent: false });
      
      // Cargar las actividades del nuevo indicador
      if (idIndicador) {
        this.cargarActividadesPorIndicador(idIndicador);
      }
    }
  }

  getIndicadorSeleccionadoNombre(): string {
    const id = this.indicadorSeleccionado();
    if (!id) return 'Seleccione un indicador...';
    const indicador = this.indicadores().find(ind => ind.idIndicador === id);
    return indicador ? indicador.codigo : 'Seleccione un indicador...';
  }

  seleccionarTipoActividad(tipo: 'anual' | 'mensual' | 'planificada' | 'no-planificada'): void {
    this.mostrarDropdownTipoActividad.set(false);
    
    // Si es anual o mensual, navegar a la ruta correspondiente
    if (tipo === 'anual') {
      const indicadorId = this.indicadorSeleccionado();
      if (indicadorId) {
        this.router.navigate(['/actividades-anuales/nueva'], {
          queryParams: { idIndicador: indicadorId }
        });
      } else {
        this.router.navigate(['/actividades-anuales/nueva']);
      }
      return;
    }
    
    if (tipo === 'mensual') {
      const indicadorId = this.indicadorSeleccionado();
      if (indicadorId) {
        this.router.navigate(['/actividades-mensuales/nueva'], {
          queryParams: { idIndicador: indicadorId }
        });
      } else {
        this.router.navigate(['/actividades-mensuales/nueva']);
      }
      return;
    }
    
    // Para planificada y no-planificada, navegar a las rutas correspondientes
    if (tipo === 'planificada') {
      const indicadorId = this.indicadorSeleccionado();
      if (indicadorId) {
        this.router.navigate(['/actividades-planificadas/nueva'], {
          queryParams: { idIndicador: indicadorId }
        });
      } else {
        this.router.navigate(['/actividades-planificadas/nueva']);
      }
      return;
    }
    
    if (tipo === 'no-planificada') {
      const indicadorId = this.indicadorSeleccionado();
      if (indicadorId) {
        this.router.navigate(['/actividades-no-planificadas/nueva'], {
          queryParams: { idIndicador: indicadorId }
        });
      } else {
        this.router.navigate(['/actividades-no-planificadas/nueva']);
      }
      return;
    }
  }

  cerrarFormNuevaActividad(): void {
    this.mostrarFormNuevaActividad.set(false);
    this.tipoActividadSeleccionado.set(null);
    this.initializeFormNuevaActividad();
    this.errorNuevaActividad.set(null);
    this.mostrarDropdownIndicadorForm.set(false);
    // Limpiar formulario de responsables
    this.resetFormResponsable();
  }

  verActividadCreada(): void {
    const actividad = this.successNuevaActividad();
    if (actividad) {
      this.router.navigate(['/actividades', actividad.id]);
      this.successNuevaActividad.set(null);
    }
  }

  editarActividadCreada(): void {
    const actividad = this.successNuevaActividad();
    if (actividad) {
      // Navegar a la ruta correcta según el tipo de actividad
      if (actividad.esPlanificada === true) {
        this.router.navigate(['/actividades-planificadas', actividad.id, 'editar']);
      } else if (actividad.esPlanificada === false) {
        this.router.navigate(['/actividades-no-planificadas', actividad.id, 'editar']);
      } else {
        // Si no se puede determinar, navegar a la vista de detalle
        this.router.navigate(['/actividades', actividad.id]);
      }
      this.successNuevaActividad.set(null);
    }
  }

  cerrarNotificacionExito(): void {
    this.successNuevaActividad.set(null);
  }
  
  // ========== MÉTODOS PARA FORMULARIO DE RESPONSABLES ==========
  
  initializeFormResponsable(): void {
    this.formResponsable = this.fb.group({
      usuarios: this.fb.array([]), // Array para usuarios
      docentes: this.fb.array([]),
      estudiantes: this.fb.array([]),
      administrativos: this.fb.array([]),
      responsablesExternos: this.fb.array([]) // Array para responsables externos
    });
    
    // Cargar todas las personas al inicializar
    this.loadTodasLasPersonas();
  }
  
  get usuariosArray(): FormArray {
    return this.formResponsable.get('usuarios') as FormArray;
  }
  
  get docentesArray(): FormArray {
    return this.formResponsable.get('docentes') as FormArray;
  }
  
  get estudiantesArray(): FormArray {
    return this.formResponsable.get('estudiantes') as FormArray;
  }
  
  get administrativosArray(): FormArray {
    return this.formResponsable.get('administrativos') as FormArray;
  }
  
  get responsablesExternosArray(): FormArray {
    return this.formResponsable.get('responsablesExternos') as FormArray;
  }
  
  crearUsuarioFormGroup(): FormGroup {
    return this.fb.group({
      idUsuario: [null, Validators.required] // Para usuarios NO se envía idRolResponsable según los ejemplos
    });
  }

  crearPersonaFormGroup(tipo: 'docente' | 'estudiante' | 'administrativo'): FormGroup {
    // Para estudiantes, idRolResponsable es obligatorio según los ejemplos del backend
    const idRolResponsableValidators = tipo === 'estudiante' ? [Validators.required] : [];
    
    return this.fb.group({
      idPersona: [null, Validators.required],
      idRolResponsable: [null, idRolResponsableValidators] // ID del rol responsable (obligatorio para estudiantes)
    });
  }
  
  // Crear FormGroup para responsable externo
  crearResponsableExternoFormGroup(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required]],
      institucion: ['', [Validators.required]],
      cargo: [''],
      telefono: [''],
      correo: [''],
      idRolResponsable: [null, Validators.required] // Obligatorio para responsables externos
    });
  }
  
  agregarPersona(tipo: 'usuario' | 'docente' | 'estudiante' | 'administrativo'): void {
    if (tipo === 'usuario') {
      this.usuariosArray.push(this.crearUsuarioFormGroup());
    } else {
      const array = tipo === 'docente' ? this.docentesArray : 
                    tipo === 'estudiante' ? this.estudiantesArray : 
                    this.administrativosArray;
      array.push(this.crearPersonaFormGroup(tipo));
    }
  }
  
  eliminarPersona(tipo: 'usuario' | 'docente' | 'estudiante' | 'administrativo', index: number): void {
    if (tipo === 'usuario') {
      this.usuariosArray.removeAt(index);
    } else {
      const array = tipo === 'docente' ? this.docentesArray : 
                    tipo === 'estudiante' ? this.estudiantesArray : 
                    this.administrativosArray;
      array.removeAt(index);
    }
  }
  
  agregarResponsableExterno(): void {
    this.responsablesExternosArray.push(this.crearResponsableExternoFormGroup());
  }
  
  eliminarResponsableExterno(index: number): void {
    this.responsablesExternosArray.removeAt(index);
  }
  
  getPersonasDisponiblesPorTipo(tipo: 'usuario' | 'docente' | 'estudiante' | 'administrativo'): any[] {
    if (tipo === 'usuario') {
      return this.usuarios();
    } else if (tipo === 'docente') {
      return this.docentes();
    } else if (tipo === 'estudiante') {
      return this.estudiantes();
    } else {
      return this.administrativos();
    }
  }
  
  getNombrePersona(persona: any): string {
    return persona.nombreCompleto || persona.nombre || 'Sin nombre';
  }
  
  loadTodasLasPersonas(): void {
    // Cargar usuarios
    this.usuariosService.getAll().subscribe({
      next: (data) => this.usuarios.set(data),
      error: (err) => {
        console.error('Error loading usuarios:', err);
        this.usuarios.set([]);
      }
    });
    
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
    
    // Cargar roles de responsable para el formulario
    this.catalogosService.getRolesResponsable().subscribe({
      next: (data) => this.rolesResponsable.set(data || []),
      error: (err) => {
        console.warn('⚠️ No se pudo cargar roles de responsable:', err);
        this.rolesResponsable.set([]);
      }
    });
  }
  
  resetFormResponsable(): void {
    while (this.usuariosArray.length > 0) {
      this.usuariosArray.removeAt(0);
    }
    while (this.docentesArray.length > 0) {
      this.docentesArray.removeAt(0);
    }
    while (this.estudiantesArray.length > 0) {
      this.estudiantesArray.removeAt(0);
    }
    while (this.administrativosArray.length > 0) {
      this.administrativosArray.removeAt(0);
    }
    while (this.responsablesExternosArray.length > 0) {
      this.responsablesExternosArray.removeAt(0);
    }
    // Limpiar tipos seleccionados
    this.tiposResponsableSeleccionados.set([]);
    this.formResponsable.reset();
  }
  
  crearResponsablesParaActividadNueva(idActividad: number, responsables: any[]): void {
    // Crear responsables usando el endpoint /api/actividad-responsable
    // después de que la actividad ha sido creada exitosamente
    const fechaAsignacion = new Date().toISOString().split('T')[0];
    const responsablesACrear: ActividadResponsableCreate[] = [];
    
    responsables.forEach((r) => {
      // Para usuarios: usar idUsuario
      if (r.idUsuario !== undefined && r.idUsuario !== null && Number(r.idUsuario) > 0) {
        responsablesACrear.push({
          idActividad: idActividad,
          idTipoResponsable: 1, // Valor por defecto, ajustar según necesidad
          idUsuario: Number(r.idUsuario),
          fechaAsignacion: fechaAsignacion
        });
      }
      // Para docentes: usar idDocente
      else if (r.idDocente !== undefined && r.idDocente !== null && Number(r.idDocente) > 0) {
        responsablesACrear.push({
          idActividad: idActividad,
          idTipoResponsable: 1,
          idDocente: Number(r.idDocente),
          fechaAsignacion: fechaAsignacion
        });
      }
      // Para estudiantes: usar idEstudiante (convertir a idUsuario ya que el servicio no acepta idEstudiante)
      else if (r.idEstudiante !== undefined && r.idEstudiante !== null && Number(r.idEstudiante) > 0) {
        responsablesACrear.push({
          idActividad: idActividad,
          idTipoResponsable: 1,
          idUsuario: Number(r.idEstudiante), // El servicio convierte idDocente/idAdmin a idUsuario, usar idUsuario para estudiantes también
          fechaAsignacion: fechaAsignacion
        });
      }
      // Para administrativos: usar idAdmin
      else if (r.idAdmin !== undefined && r.idAdmin !== null && Number(r.idAdmin) > 0) {
        responsablesACrear.push({
          idActividad: idActividad,
          idTipoResponsable: 1,
          idAdmin: Number(r.idAdmin),
          fechaAsignacion: fechaAsignacion
        });
      }
      // Para responsables externos: el servicio actual no los soporta directamente
      // Se necesitaría un endpoint diferente o actualizar el servicio
      else if (r.responsableExterno) {
        console.warn('⚠️ Responsables externos no se pueden crear con el servicio actual. Se necesita un endpoint específico.');
      }
    });
    
    // Crear responsables en paralelo
    if (responsablesACrear.length > 0) {
      console.log(`📋 Creando ${responsablesACrear.length} responsables para actividad ${idActividad}...`);
      const requests = responsablesACrear.map(data => this.responsableService.create(data));
      
      forkJoin(requests).subscribe({
        next: (responsablesCreados) => {
          console.log(`✅ ${responsablesCreados.length} responsables creados exitosamente para actividad ${idActividad}`);
        },
        error: (err) => {
          console.error(`❌ Error creando responsables para actividad ${idActividad}:`, err);
          // No mostrar error al usuario ya que la actividad ya fue creada
          // Los responsables se pueden agregar manualmente después
        }
      });
    } else {
      console.warn(`⚠️ No hay responsables válidos para crear para actividad ${idActividad}`);
    }
  }

  crearResponsablesParaActividad(idActividad: number): void {
    const formValue = this.formResponsable.value;
    const fechaAsignacion = formValue.fechaAsignacion || new Date().toISOString().split('T')[0];
    
    // Recolectar todos los responsables a crear
    const responsablesACrear: ActividadResponsableCreate[] = [];
    
    // Procesar docentes
    this.docentesArray.controls.forEach((control) => {
      const docenteData = control.value;
      const idPersonaNum = docenteData.idPersona ? Number(docenteData.idPersona) : 0;
      const rolResponsable = docenteData.rolResponsable?.trim() || undefined;
      
      if (idPersonaNum > 0) {
        responsablesACrear.push({
          idActividad: idActividad,
          idTipoResponsable: 1,
          idDocente: idPersonaNum,
          fechaAsignacion: fechaAsignacion,
          rolResponsable: rolResponsable
        });
      }
    });
    
    // Procesar estudiantes
    this.estudiantesArray.controls.forEach((control) => {
      const estudianteData = control.value;
      const idPersonaNum = estudianteData.idPersona ? Number(estudianteData.idPersona) : 0;
      const rolResponsable = estudianteData.rolResponsable?.trim() || undefined;
      
      if (idPersonaNum > 0) {
        responsablesACrear.push({
          idActividad: idActividad,
          idTipoResponsable: 1,
          idUsuario: idPersonaNum,
          fechaAsignacion: fechaAsignacion,
          rolResponsable: rolResponsable
        });
      }
    });
    
    // Procesar administrativos
    this.administrativosArray.controls.forEach((control) => {
      const adminData = control.value;
      const idPersonaNum = adminData.idPersona ? Number(adminData.idPersona) : 0;
      const rolResponsable = adminData.rolResponsable?.trim() || undefined;
      
      if (idPersonaNum > 0) {
        responsablesACrear.push({
          idActividad: idActividad,
          idTipoResponsable: 1,
          idAdmin: idPersonaNum,
          fechaAsignacion: fechaAsignacion,
          rolResponsable: rolResponsable
        });
      }
    });
    
    // Si hay responsables para crear, crearlos en paralelo
    if (responsablesACrear.length > 0) {
      this.loadingResponsables.set(true);
      const requests = responsablesACrear.map(data => this.responsableService.create(data));
      
      forkJoin(requests).subscribe({
        next: () => {
          this.loadingResponsables.set(false);
          console.log('✅ Responsables creados exitosamente');
        },
        error: (err) => {
          this.loadingResponsables.set(false);
          console.error('❌ Error creando responsables:', err);
          // No mostrar error al usuario ya que la actividad ya fue creada
        }
      });
    }
  }

  toggleDropdownIndicadorForm(): void {
    this.mostrarDropdownIndicadorForm.set(!this.mostrarDropdownIndicadorForm());
  }

  seleccionarIndicadorForm(idIndicador: number | null): void {
    this.formNuevaActividad.patchValue({ idIndicador }, { emitEvent: false });
    this.mostrarDropdownIndicadorForm.set(false);
    
    // Cargar las actividades relacionadas si se selecciona un indicador
    if (idIndicador) {
      this.cargarActividadesPorIndicador(idIndicador);
    } else {
      // Limpiar las actividades si no hay indicador seleccionado
      this.actividadesAnualesFiltradas.set([]);
      this.actividadesMensualesFiltradas.set([]);
      this.formNuevaActividad.patchValue({
        idActividadAnual: [],
        idActividadMensualInst: []
      }, { emitEvent: false });
    }
  }

  cargarActividadesPorIndicador(idIndicador: number, autoSeleccionar: boolean = false): void {
    if (this.cargandoRelaciones) return; // Evitar loops
    
    this.cargandoRelaciones = true;
    
    // Limpiar primero para evitar mostrar actividades de otros indicadores
    this.actividadesAnualesFiltradas.set([]);
    this.actividadesMensualesFiltradas.set([]);
    
    // Siempre limpiar las selecciones cuando cambia el indicador
    // para que solo se muestren las actividades del indicador seleccionado
    this.formNuevaActividad.patchValue({ 
      idActividadAnual: [],
      idActividadMensualInst: [] 
    }, { emitEvent: false });
    
    // Mostrar los dropdowns nuevamente
    this.mostrarDropdownActividadAnual.set(true);
    this.mostrarDropdownActividadMensual.set(true);
    
    // Cargar actividades anuales relacionadas al indicador
    this.actividadAnualService.getByIndicador(idIndicador).subscribe({
      next: (actividadesAnuales) => {
        // Solo establecer las actividades anuales del indicador seleccionado
        const actividadesFiltradas = (actividadesAnuales || []).filter(a => a.idIndicador === idIndicador);
        this.actividadesAnualesFiltradas.set(actividadesFiltradas);
        
        // Cargar actividades mensuales para todas las actividades anuales disponibles
        if (actividadesFiltradas.length > 0) {
          const requests = actividadesFiltradas
            .filter(a => a.idActividadAnual)
            .map(a => this.actividadMensualInstService.getByActividadAnual(a.idActividadAnual!));
          
          if (requests.length > 0) {
            Promise.all(requests.map(req => firstValueFrom(req))).then(arraysMensuales => {
              const todasMensuales = arraysMensuales.flat();
              this.actividadesMensualesFiltradas.set(todasMensuales);
              this.cargandoRelaciones = false;
            }).catch(err => {
              console.error('Error loading actividades mensuales:', err);
              this.actividadesMensualesFiltradas.set([]);
              this.cargandoRelaciones = false;
            });
          } else {
            this.actividadesMensualesFiltradas.set([]);
            this.cargandoRelaciones = false;
          }
        } else {
          // Si no hay actividades anuales, limpiar las mensuales
          this.actividadesMensualesFiltradas.set([]);
          this.cargandoRelaciones = false;
        }
      },
      error: (err) => {
        console.error('Error cargando actividades anuales:', err);
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.cargandoRelaciones = false;
      }
    });
  }

  cargarDatosPorActividadAnual(idActividadAnual: number): void {
    this.cargandoRelaciones = true;
    
    // Obtener la actividad anual completa para obtener el indicador
    this.actividadAnualService.getById(idActividadAnual).subscribe({
      next: (actividadAnual) => {
        if (actividadAnual) {
          const indicadorActual = this.formNuevaActividad.get('idIndicador')?.value;
          
          // Cargar el indicador relacionado si no está ya seleccionado
          if (actividadAnual.idIndicador && indicadorActual !== actividadAnual.idIndicador) {
            this.formNuevaActividad.patchValue({ idIndicador: actividadAnual.idIndicador }, { emitEvent: false });
            
            // Cargar todas las actividades anuales de ese indicador
            this.actividadAnualService.getByIndicador(actividadAnual.idIndicador).subscribe({
              next: (actividadesAnuales) => {
                this.actividadesAnualesFiltradas.set(actividadesAnuales || []);
                this.cargandoRelaciones = false;
              },
              error: (err) => {
                console.error('Error cargando actividades anuales:', err);
                this.cargandoRelaciones = false;
              }
      });
          } else {
            this.cargandoRelaciones = false;
          }
          
          // Cargar actividades mensuales relacionadas
          this.cargarActividadesMensualesPorAnual(idActividadAnual);
        } else {
          this.cargandoRelaciones = false;
        }
      },
      error: (err) => {
        console.error('Error cargando actividad anual:', err);
        this.cargandoRelaciones = false;
      }
    });
  }

  cargarDatosPorActividadMensual(idActividadMensualInst: number): void {
    this.cargandoRelaciones = true;
    
    // Obtener la actividad mensual completa para obtener la actividad anual
    this.actividadMensualInstService.getById(idActividadMensualInst).subscribe({
      next: (actividadMensual) => {
        if (actividadMensual) {
          const actividadAnualActual = this.formNuevaActividad.get('idActividadAnual')?.value;
          const indicadorActual = this.formNuevaActividad.get('idIndicador')?.value;
          
          // Cargar la actividad anual relacionada si no está ya seleccionada
          if (actividadMensual.idActividadAnual) {
            const currentValue = Array.isArray(actividadAnualActual) ? actividadAnualActual : (actividadAnualActual ? [actividadAnualActual] : []);
            if (!currentValue.includes(actividadMensual.idActividadAnual)) {
              this.formNuevaActividad.patchValue({ idActividadAnual: [...currentValue, actividadMensual.idActividadAnual] }, { emitEvent: false });
            }
          }
          
          // Cargar el indicador relacionado
          let idIndicador: number | null = null;
          if (actividadMensual.actividadAnual?.idIndicador) {
            idIndicador = actividadMensual.actividadAnual.idIndicador;
          } else if (actividadMensual.idActividadAnual) {
            // Si no viene en la relación, obtenerlo de la actividad anual
            this.actividadAnualService.getById(actividadMensual.idActividadAnual).subscribe({
              next: (actividadAnual) => {
                if (actividadAnual?.idIndicador) {
                  idIndicador = actividadAnual.idIndicador;
                  if (indicadorActual !== idIndicador) {
                    this.formNuevaActividad.patchValue({ idIndicador: idIndicador }, { emitEvent: false });
                    
                    // Cargar todas las actividades anuales de ese indicador
                    this.actividadAnualService.getByIndicador(idIndicador).subscribe({
                      next: (actividadesAnuales) => {
                        this.actividadesAnualesFiltradas.set(actividadesAnuales || []);
                        this.cargandoRelaciones = false;
                      },
                      error: (err) => {
                        console.error('Error cargando actividades anuales:', err);
                        this.cargandoRelaciones = false;
                      }
                    });
                  } else {
                    this.cargandoRelaciones = false;
                  }
                } else {
                  this.cargandoRelaciones = false;
                }
              },
              error: (err) => {
                console.error('Error obteniendo actividad anual:', err);
                this.cargandoRelaciones = false;
              }
            });
            return; // Salir temprano ya que la carga asíncrona continuará
          }
          
          if (idIndicador && indicadorActual !== idIndicador) {
            this.formNuevaActividad.patchValue({ idIndicador: idIndicador }, { emitEvent: false });
            
            // Cargar todas las actividades anuales de ese indicador
            this.actividadAnualService.getByIndicador(idIndicador).subscribe({
              next: (actividadesAnuales) => {
                this.actividadesAnualesFiltradas.set(actividadesAnuales || []);
                this.cargandoRelaciones = false;
              },
              error: (err) => {
                console.error('Error cargando actividades anuales:', err);
                this.cargandoRelaciones = false;
              }
            });
          } else {
            this.cargandoRelaciones = false;
          }
          
          // Cargar todas las actividades mensuales de la misma actividad anual
          const idActividadAnualParaCargar = actividadMensual.idActividadAnual || actividadAnualActual;
          if (idActividadAnualParaCargar) {
            this.cargarActividadesMensualesPorAnual(idActividadAnualParaCargar);
          }
        } else {
          this.cargandoRelaciones = false;
        }
      },
      error: (err) => {
        console.error('Error cargando actividad mensual:', err);
        this.cargandoRelaciones = false;
      }
    });
  }

  cargarActividadesMensualesPorAnual(idActividadAnual: number): void {
    // NO limpiar las actividades mensuales existentes - agregar a la lista
    this.actividadMensualInstService.getByActividadAnual(idActividadAnual).subscribe({
      next: (actividadesMensuales) => {
        // Solo establecer las actividades mensuales relacionadas a la actividad anual seleccionada
        const actividadesFiltradas = (actividadesMensuales || []).filter(m => m.idActividadAnual === idActividadAnual);
        
        // Agregar a la lista existente sin duplicados
        const actuales = this.actividadesMensualesFiltradas();
        const idsActuales = new Set(actuales.map(m => m.idActividadMensualInst));
        const nuevas = actividadesFiltradas.filter(m => !idsActuales.has(m.idActividadMensualInst));
        this.actividadesMensualesFiltradas.set([...actuales, ...nuevas]);
        
        this.cargandoRelaciones = false;
      },
      error: (err) => {
        console.error('Error cargando actividades mensuales:', err);
        this.cargandoRelaciones = false;
      }
    });
  }

  getIndicadorFormNombre(): string {
    // Primero intentar obtener del formulario, luego del indicador seleccionado globalmente
    const id = this.formNuevaActividad.get('idIndicador')?.value || this.indicadorSeleccionado();
    if (!id) return 'Seleccione un indicador...';
    const indicador = this.indicadores().find(ind => ind.idIndicador === id);
    return indicador ? `${indicador.codigo} - ${indicador.nombre}` : 'Seleccione un indicador...';
  }

  onSubmitNuevaActividad(): void {
    // Validar que al menos un tipo de responsable esté seleccionado
    if (!this.tieneAlMenosUnResponsable()) {
      this.errorNuevaActividad.set('Debe seleccionar al menos un tipo de responsable.');
      this.formNuevaActividad.markAllAsTouched();
      return;
    }
    
    // Validar que los responsables seleccionados estén completos
    if (!this.tieneResponsablesCompletos()) {
      this.errorNuevaActividad.set('Debe completar la información de todos los responsables seleccionados.');
      this.formNuevaActividad.markAllAsTouched();
      return;
    }
    
    if (this.formNuevaActividad.valid) {
      this.loadingNuevaActividad.set(true);
      this.errorNuevaActividad.set(null);

      const formValue = this.formNuevaActividad.value;
      const tipo = this.tipoActividadSeleccionado();
      const indicadorId = formValue.idIndicador || this.indicadorSeleccionado();
      const actividadAnualId = Array.isArray(formValue.idActividadAnual) && formValue.idActividadAnual.length > 0 
        ? formValue.idActividadAnual 
        : (formValue.idActividadAnual || null);
      const actividadMensualId = Array.isArray(formValue.idActividadMensualInst) && formValue.idActividadMensualInst.length > 0 
        ? formValue.idActividadMensualInst 
        : (formValue.idActividadMensualInst || null);

      // Para actividad planificada o no planificada: crear la actividad directamente
      // Las actividades anuales y mensuales son opcionales
      if (indicadorId) {
        // Construir responsables desde formResponsable
        // Según los ejemplos del backend:
        // - Para usuarios: NO se envía idRolResponsable (el sistema usa el rol del usuario)
        // - Para estudiantes: idRolResponsable es OBLIGATORIO
        // - Para docentes y administrativos: idRolResponsable es opcional pero recomendado
        // - NO se envía fechaAsignacion en el POST
        const responsables: any[] = [];

        // Procesar usuarios - NO se envía idRolResponsable según los ejemplos
        this.usuariosArray.controls.forEach((control) => {
          const usuarioData = control.value;
          const idUsuario = usuarioData.idUsuario ? Number(usuarioData.idUsuario) : null;
          if (idUsuario) {
            responsables.push({
              idUsuario: idUsuario
            });
          }
        });

        // Procesar docentes
        this.docentesArray.controls.forEach((control) => {
          const docenteData = control.value;
          const idPersona = docenteData.idPersona ? Number(docenteData.idPersona) : null;
          if (idPersona) {
            const responsable: any = {
              idDocente: idPersona
            };
            // idRolResponsable es opcional para docentes, pero se envía si está presente
            if (docenteData.idRolResponsable) {
              responsable.idRolResponsable = Number(docenteData.idRolResponsable);
            }
            responsables.push(responsable);
          }
        });

        // Procesar estudiantes
        this.estudiantesArray.controls.forEach((control) => {
          const estudianteData = control.value;
          const idPersona = estudianteData.idPersona ? Number(estudianteData.idPersona) : null;
          if (idPersona) {
            const responsable: any = {
              idEstudiante: idPersona
            };
            // idRolResponsable es OBLIGATORIO para estudiantes según los ejemplos
            if (estudianteData.idRolResponsable) {
              responsable.idRolResponsable = Number(estudianteData.idRolResponsable);
            }
            // Nota: Si idRolResponsable no está presente, el backend debería rechazar la petición
            responsables.push(responsable);
          }
        });

        // Procesar administrativos
        this.administrativosArray.controls.forEach((control) => {
          const adminData = control.value;
          const idPersona = adminData.idPersona ? Number(adminData.idPersona) : null;
          if (idPersona) {
            const responsable: any = {
              idAdmin: idPersona
            };
            // idRolResponsable es opcional para administrativos, pero se envía si está presente
            if (adminData.idRolResponsable) {
              responsable.idRolResponsable = Number(adminData.idRolResponsable);
            }
            responsables.push(responsable);
          }
        });
        
        // Procesar responsables externos
        this.responsablesExternosArray.controls.forEach((control) => {
          const externoData = control.value;
          // Validar que tenga nombre e institución (obligatorios según ejemplos)
          if (externoData.nombre && externoData.institucion && externoData.idRolResponsable) {
            const responsable: any = {
              responsableExterno: {
                nombre: externoData.nombre.trim(),
                institucion: externoData.institucion.trim()
              },
              idRolResponsable: Number(externoData.idRolResponsable)
            };
            // Campos opcionales del responsable externo
            if (externoData.cargo && externoData.cargo.trim()) {
              responsable.responsableExterno.cargo = externoData.cargo.trim();
            }
            if (externoData.telefono && externoData.telefono.trim()) {
              responsable.responsableExterno.telefono = externoData.telefono.trim();
            }
            if (externoData.correo && externoData.correo.trim()) {
              responsable.responsableExterno.correo = externoData.correo.trim();
            }
            responsables.push(responsable);
          }
        });

        // Construir actividadData según los ejemplos del backend
        // No enviar campos con valor 0 cuando deberían ser null o no enviarse
        const actividadData: any = {
          nombreActividad: formValue.nombreActividad || '',
          esPlanificada: formValue.esPlanificada !== undefined ? formValue.esPlanificada : (tipo === 'planificada' || tipo === 'anual'),
          activo: formValue.activo !== undefined ? formValue.activo : true // Siempre activo por defecto
        };

        // Campos opcionales - solo agregar si tienen valor
        if (formValue.descripcion) actividadData.descripcion = formValue.descripcion;
        if (formValue.objetivo) actividadData.objetivo = formValue.objetivo;
        
        // departamentoResponsableId - único según el JSON del backend
        if (formValue.departamentoResponsableId && Number(formValue.departamentoResponsableId) > 0) {
          actividadData.departamentoResponsableId = Number(formValue.departamentoResponsableId);
        }
        
        if (formValue.fechaInicio) actividadData.fechaInicio = formValue.fechaInicio;
        if (formValue.fechaFin) actividadData.fechaFin = formValue.fechaFin;
        
        // horaRealizacion - ya está en formato 24h desde actualizarHoraRealizacion, solo agregar segundos si falta
        if (formValue.horaRealizacion) {
          const hora = formValue.horaRealizacion.trim();
          if (hora.includes(':') && hora.split(':').length === 2) {
            actividadData.horaRealizacion = `${hora}:00`; // Agregar segundos para formato HH:mm:ss
          } else if (hora.includes(':')) {
            actividadData.horaRealizacion = hora;
          }
        }
        
        if (formValue.modalidad) actividadData.modalidad = formValue.modalidad;
        
        // idCapacidadInstalada - solo si es mayor a 0
        if (formValue.idCapacidadInstalada && Number(formValue.idCapacidadInstalada) > 0) {
          actividadData.idCapacidadInstalada = Number(formValue.idCapacidadInstalada);
        }
        
        // idEstadoActividad - solo si es mayor a 0
        if (formValue.idEstadoActividad && Number(formValue.idEstadoActividad) > 0) {
          actividadData.idEstadoActividad = Number(formValue.idEstadoActividad);
        }
        
        // idTipoActividad - NO se envía según los ejemplos del backend
        // Este campo no está presente en los ejemplos de POST proporcionados
        
        // idTipoProtagonista - único según el JSON del backend
        if (formValue.idTipoProtagonista && Number(formValue.idTipoProtagonista) > 0) {
          actividadData.idTipoProtagonista = Number(formValue.idTipoProtagonista);
        }
        
        // cantidadParticipantesProyectados - solo si es mayor a 0
        if (formValue.cantidadParticipantesProyectados && Number(formValue.cantidadParticipantesProyectados) > 0) {
          actividadData.cantidadParticipantesProyectados = Number(formValue.cantidadParticipantesProyectados);
        }
        
        // cantidadParticipantesEstudiantesProyectados - solo si es mayor a 0
        if (formValue.cantidadParticipantesEstudiantesProyectados && Number(formValue.cantidadParticipantesEstudiantesProyectados) > 0) {
          actividadData.cantidadParticipantesEstudiantesProyectados = Number(formValue.cantidadParticipantesEstudiantesProyectados);
        }
        
        // cantidadTotalParticipantesProtagonistas - solo si es mayor a 0
        if (formValue.cantidadTotalParticipantesProtagonistas && Number(formValue.cantidadTotalParticipantesProtagonistas) > 0) {
          actividadData.cantidadTotalParticipantesProtagonistas = Number(formValue.cantidadTotalParticipantesProtagonistas);
        }
        
        // idIndicador - solo si es mayor a 0
        if (indicadorId && Number(indicadorId) > 0) {
          actividadData.idIndicador = Number(indicadorId);
        }
        
        // idActividadAnual - solo el primero si es array, solo si es mayor a 0
        const actividadAnual = Array.isArray(actividadAnualId) && actividadAnualId.length > 0 
          ? actividadAnualId[0] 
          : (actividadAnualId || null);
        if (actividadAnual && Number(actividadAnual) > 0) {
          actividadData.idActividadAnual = Number(actividadAnual);
        }
        
        // idActividadMensualInst - solo el primero si es array, solo si es mayor a 0
        const actividadMensual = Array.isArray(actividadMensualId) && actividadMensualId.length > 0 
          ? actividadMensualId[0] 
          : (actividadMensualId || null);
        if (actividadMensual && Number(actividadMensual) > 0) {
          actividadData.idActividadMensualInst = Number(actividadMensual);
        }
        
        // idTipoEvidencias - array, solo si tiene elementos
        const tiposEvidencias = Array.isArray(formValue.idTipoEvidencias) && formValue.idTipoEvidencias.length > 0 
          ? formValue.idTipoEvidencias 
          : (formValue.idTipoEvidencias || []);
        if (tiposEvidencias && Array.isArray(tiposEvidencias) && tiposEvidencias.length > 0) {
          actividadData.idTipoEvidencias = tiposEvidencias.map(id => Number(id)).filter(id => id > 0);
        }
        
        // responsables - solo si hay responsables
        if (responsables.length > 0) {
          actividadData.responsables = responsables;
        }

        this.actividadesService.create(actividadData).subscribe({
          next: (actividad) => {
            const idActividadCreada = actividad.id || actividad.idActividad;
            console.log(`✅ Actividad creada con ID: ${idActividadCreada}`);
            console.log(`📋 Tipos de evidencia en actividad creada:`, actividad.idTipoEvidencias);
            
            // Crear responsables manualmente después de crear la actividad
            // El backend no crea los responsables automáticamente, debemos crearlos usando el endpoint /api/actividad-responsable
            if (responsables.length > 0 && idActividadCreada) {
              console.log(`📋 Creando ${responsables.length} responsables para la actividad ${idActividadCreada}...`);
              this.crearResponsablesParaActividadNueva(idActividadCreada, responsables);
            }
            
            this.loadingNuevaActividad.set(false);
            this.cerrarFormNuevaActividad();
            this.loadActividades(); // Recargar la lista
            this.errorNuevaActividad.set(null);
            
            // Mostrar mensaje de éxito con el ID de la actividad creada
            this.successNuevaActividad.set({
              id: idActividadCreada,
              nombre: actividad.nombreActividad || actividad.nombre || 'Actividad',
              esPlanificada: actividad.esPlanificada !== undefined ? actividad.esPlanificada : (tipo === 'planificada')
            });
            
            // Auto-cerrar la notificación después de 8 segundos
            setTimeout(() => {
              this.successNuevaActividad.set(null);
            }, 8000);
          },
          error: (err) => {
            this.loadingNuevaActividad.set(false);
            let errorMessage = 'No se pudo crear la actividad.';
            if (err.error?.message) {
              errorMessage = err.error.message;
            } else if (err.error?.errors) {
              const errors = Object.values(err.error.errors).flat();
              errorMessage = errors.join('\n');
            } else if (err.message) {
              errorMessage = err.message;
            }
            this.errorNuevaActividad.set(errorMessage);
            this.successNuevaActividad.set(null);
            console.error('Error creating actividad:', err);
          }
        });
      } else {
        this.errorNuevaActividad.set('Por favor, seleccione un indicador antes de crear la actividad.');
        this.loadingNuevaActividad.set(false);
      }

      this.loadingNuevaActividad.set(false);
      this.cerrarFormNuevaActividad();
    } else {
      this.formNuevaActividad.markAllAsTouched();
    }
  }


  navigateToCreate(): void {
    this.router.navigate(['/actividades/nueva']);
  }

  navigateToEvidencias(): void {
    this.router.navigate(['/evidencias']);
  }

  navigateToCrearEvidencia(actividad: Actividad): void {
    console.log('🔍 Actividad seleccionada para evidencia:', actividad);
    console.log('🔍 Tipos de evidencia de la actividad (desde lista):', actividad.idTipoEvidencias);
    console.log('🔍 Tipo de idTipoEvidencias:', typeof actividad.idTipoEvidencias, 'Es array:', Array.isArray(actividad.idTipoEvidencias));
    
    // Ahora que el backend devuelve IdTipoEvidencias en la lista, usar directamente
    // Solo hacer getById como fallback si realmente no tiene tipos (null, undefined, o array vacío)
    const tieneTiposEvidencia = actividad.idTipoEvidencias && 
                                  Array.isArray(actividad.idTipoEvidencias) && 
                                  actividad.idTipoEvidencias.length > 0;
    
    if (tieneTiposEvidencia) {
      console.log('✅ La actividad tiene tipos de evidencia en la lista, usando directamente');
      this.actividadParaEvidencia.set(actividad);
      this.showEvidenciaModal.set(true);
    } else {
      // Fallback: obtener la actividad completa con getById por si acaso
      console.log('⚠️ La actividad no tiene tipos de evidencia en la lista, obteniendo actividad completa como fallback...');
      this.actividadesService.getById(actividad.id).subscribe({
        next: (actividadCompleta) => {
          console.log('✅ Actividad completa obtenida:', actividadCompleta);
          console.log('✅ Tipos de evidencia de la actividad completa:', actividadCompleta.idTipoEvidencias);
          this.actividadParaEvidencia.set(actividadCompleta);
          this.showEvidenciaModal.set(true);
        },
        error: (err) => {
          console.error('❌ Error al obtener actividad completa:', err);
          // Usar la actividad de la lista como fallback (aunque no tenga tipos)
          console.log('⚠️ Usando actividad de la lista sin tipos de evidencia');
          this.actividadParaEvidencia.set(actividad);
          this.showEvidenciaModal.set(true);
        }
      });
    }
  }

  cerrarEvidenciaModal(): void {
    this.showEvidenciaModal.set(false);
    this.actividadParaEvidencia.set(null);
  }

  onEvidenciaCreada(): void {
    this.cerrarEvidenciaModal();
    // Recargar actividades para mostrar las nuevas evidencias
    this.loadActividades();
  }

  abrirEditarTiposEvidencia(): void {
    const actividad = this.actividadParaEvidencia();
    if (!actividad) return;
    
    // Inicializar con los tipos actuales de la actividad
    const tiposActuales = actividad.idTipoEvidencias;
    if (Array.isArray(tiposActuales) && tiposActuales.length > 0) {
      this.tiposEvidenciaSeleccionadosParaEditar.set([...tiposActuales]);
    } else {
      this.tiposEvidenciaSeleccionadosParaEditar.set([]);
    }
    
    this.showEditarTiposEvidenciaModal.set(true);
  }

  cerrarEditarTiposEvidenciaModal(): void {
    this.showEditarTiposEvidenciaModal.set(false);
    this.tiposEvidenciaSeleccionadosParaEditar.set([]);
  }

  guardarTiposEvidencia(): void {
    const actividad = this.actividadParaEvidencia();
    if (!actividad || !actividad.id) {
      console.error('❌ No hay actividad seleccionada');
      return;
    }

    const tiposSeleccionados = this.tiposEvidenciaSeleccionadosParaEditar();
    
    this.guardandoTiposEvidencia.set(true);
    
    // Actualizar solo los tipos de evidencia de la actividad
    this.actividadesService.update(actividad.id, {
      idTipoEvidencias: tiposSeleccionados
    }).subscribe({
      next: () => {
        console.log('✅ Tipos de evidencia actualizados correctamente');
        // Actualizar la actividad en el signal para que el formulario de evidencias se actualice
        const actividadActualizada = {
          ...actividad,
          idTipoEvidencias: tiposSeleccionados
        };
        this.actividadParaEvidencia.set(actividadActualizada);
        
        // También actualizar la actividad en la lista
        const actividadesActuales = this.actividades();
        const index = actividadesActuales.findIndex(a => a.id === actividad.id);
        if (index > -1) {
          actividadesActuales[index] = actividadActualizada;
          this.actividades.set([...actividadesActuales]);
        }
        
        this.cerrarEditarTiposEvidenciaModal();
        this.guardandoTiposEvidencia.set(false);
      },
      error: (err) => {
        console.error('❌ Error al actualizar tipos de evidencia:', err);
        this.guardandoTiposEvidencia.set(false);
        alert('Error al actualizar los tipos de evidencia. Por favor, intente nuevamente.');
      }
    });
  }

  toggleTipoEvidenciaParaEditar(id: number): void {
    const actuales = this.tiposEvidenciaSeleccionadosParaEditar();
    const index = actuales.indexOf(id);
    
    if (index > -1) {
      // Remover si ya está seleccionado
      this.tiposEvidenciaSeleccionadosParaEditar.set(actuales.filter(t => t !== id));
    } else {
      // Agregar si no está seleccionado
      this.tiposEvidenciaSeleccionadosParaEditar.set([...actuales, id]);
    }
  }

  isTipoEvidenciaSeleccionadoParaEditar(id: number): boolean {
    return this.tiposEvidenciaSeleccionadosParaEditar().includes(id);
  }

  crearNuevaActividadAnual(): void {
    const indicadorId = this.formNuevaActividad.get('idIndicador')?.value || this.indicadorSeleccionado();
    
    // Navegar a crear actividad anual (el indicador es opcional)
    if (indicadorId) {
      this.router.navigate(['/actividades-anuales/nueva'], {
        queryParams: { idIndicador: indicadorId }
      });
    } else {
      this.router.navigate(['/actividades-anuales/nueva']);
    }
  }


  onFiltroChange(): void {
    this.loadActividades();
  }

  clearFilters(): void {
    this.filtroEstadoActividad.set(null);
    this.filtroActividadAnual.set([]);
    this.filtroActividadMensualInst.set([]);
    this.terminoBusqueda.set('');
    this.terminoBusquedaAnual.set('');
    this.terminoBusquedaMensual.set('');
    this.error.set(null);
    this.showRetryButton = false;
    this.loadActividades();
  }

  onEstadoFiltroChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.filtroEstadoActividad.set(value === '' ? null : Number(value));
    this.onFiltroChange();
  }

  cambiarModoVista(modo: 'cards' | 'lista' | 'calendario'): void {
    this.modoVista.set(modo);
  }

  getActividadesAgrupadasPorFecha(): Array<{ fecha: string; actividades: Actividad[] }> {
    const agrupadas = new Map<string, Actividad[]>();
    
    this.actividades().forEach(actividad => {
      // Usar fechaInicio si está disponible, sino fechaCreacion
      const fecha = actividad.fechaInicio 
        ? new Date(actividad.fechaInicio).toISOString().split('T')[0]
        : actividad.fechaCreacion 
          ? new Date(actividad.fechaCreacion).toISOString().split('T')[0]
          : 'sin-fecha';
      
      if (!agrupadas.has(fecha)) {
        agrupadas.set(fecha, []);
      }
      agrupadas.get(fecha)!.push(actividad);
    });
    
    // Convertir a array y ordenar por fecha (más reciente primero)
    return Array.from(agrupadas.entries())
      .map(([fecha, actividades]) => ({ fecha, actividades }))
      .sort((a, b) => {
        if (a.fecha === 'sin-fecha') return 1;
        if (b.fecha === 'sin-fecha') return -1;
        return b.fecha.localeCompare(a.fecha);
      });
  }

  formatearFecha(fecha: string): string {
    if (fecha === 'sin-fecha') return 'Sin fecha';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  actualizarEventosCalendario(actividades: Actividad[]): void {
    const eventos: CalendarEvent[] = actividades
      .filter(actividad => actividad.fechaInicio || actividad.fechaEvento || actividad.fechaCreacion)
      .map(actividad => {
        // Determinar las fechas de inicio y fin
        let fechaInicio: Date;
        let fechaFin: Date | undefined;
        
        if (actividad.fechaInicio && actividad.fechaFin) {
          // Actividad con rango de fechas
          fechaInicio = startOfDay(new Date(actividad.fechaInicio));
          fechaFin = endOfDay(new Date(actividad.fechaFin));
          
          // Verificar que la fecha fin sea posterior a la fecha inicio
          if (fechaFin < fechaInicio) {
            // Si la fecha fin es anterior, usar solo fecha inicio
            fechaFin = undefined;
          }
        } else if (actividad.fechaInicio) {
          // Solo fecha inicio
          fechaInicio = startOfDay(new Date(actividad.fechaInicio));
        } else if (actividad.fechaEvento) {
          // Fecha evento como fallback
          fechaInicio = startOfDay(new Date(actividad.fechaEvento));
        } else {
          // Fecha creación como último recurso
          fechaInicio = startOfDay(new Date(actividad.fechaCreacion));
        }
        
        // Obtener el color del estado de la actividad
        let colorEstado = '#3B82F6'; // Color por defecto (azul)
        let nombreEstado = actividad.nombreEstadoActividad || 'Sin estado';
        
        if (actividad.idEstadoActividad) {
          const estado = this.estadosActividad().find(
            e => (e.idEstadoActividad || e.id) === actividad.idEstadoActividad
          );
          if (estado) {
            // El estado tiene un campo color que viene del backend
            colorEstado = (estado as any).color || '#3B82F6';
            nombreEstado = estado.nombre || nombreEstado;
          }
        }
        
        // Convertir color hex a RGB para crear variaciones más claras
        const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
        };
        
        const rgb = hexToRgb(colorEstado);
        const colorPrimary = colorEstado;
        // Crear un color secundario más claro (background) basado en el color del estado
        const colorSecondary = rgb 
          ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
          : '#d1fae5'; // fallback a emerald claro
        
        const color = {
          primary: colorPrimary,
          secondary: colorSecondary
        };
        
        // Crear tooltip con información detallada
        let tooltip = actividad.nombre;
        if (actividad.codigoActividad) {
          tooltip += `\nCódigo: ${actividad.codigoActividad}`;
        }
        if (actividad.descripcion) {
          tooltip += `\n\n${actividad.descripcion.substring(0, 150)}${actividad.descripcion.length > 150 ? '...' : ''}`;
        }
        if (actividad.nombreDepartamentoResponsable) {
          tooltip += `\n\nDepartamento: ${actividad.nombreDepartamentoResponsable}`;
        }
        if (actividad.horaRealizacion) {
          tooltip += `\nHora: ${actividad.horaRealizacion}`;
        }
        if (nombreEstado) {
          tooltip += `\nEstado: ${nombreEstado}`;
        }
        
        // Si hay rango de fechas, agregar información al tooltip
        if (fechaFin) {
          const diasDuracion = differenceInDays(fechaFin, fechaInicio) + 1;
          tooltip += `\nDuración: ${diasDuracion} día(s)`;
          tooltip += `\nDel ${format(fechaInicio, 'dd/MM/yyyy')} al ${format(fechaFin, 'dd/MM/yyyy')}`;
        }
        
        // Construir el título solo con el nombre (el código se mostrará como badge separado)
        let title = actividad.nombre;
        
        // Agregar información de duración si es un evento de varios días
        if (fechaFin) {
          const diasDuracion = differenceInDays(fechaFin, fechaInicio) + 1;
          if (diasDuracion > 1) {
            title = `${actividad.nombre} (${diasDuracion} días)`;
          }
        }
        
        const evento: CalendarEvent = {
          id: actividad.id,
          start: fechaInicio,
          title: title,
          color: color,
          meta: {
            actividad: actividad,
            estado: nombreEstado,
            tooltip: tooltip,
            codigoActividad: actividad.codigoActividad // Guardar código por separado para estilos
          }
        };
        
        // Si hay fecha fin, agregarla al evento para que se muestre como evento de varios días
        if (fechaFin) {
          evento.end = fechaFin;
          // Marcar como evento de todo el día para mejor visualización
          evento.allDay = true;
        }
        
        return evento;
      });
    
    this.eventosCalendario.set(eventos);
    
    // Re-attach listeners después de actualizar eventos y agregar badges de código
    // Usar timeout más largo para asegurar que el calendario se haya renderizado
    setTimeout(() => {
      this.attachEventListeners();
      this.agregarBadgesCodigo();
      this.agregarPuntosColorEstado();
      this.agregarSombreadoRangos();
    }, 500);
  }

  private obtenerCeldasCalendario(): NodeListOf<HTMLElement> | null {
    // Intentar múltiples selectores para encontrar las celdas
    let dayCells: NodeListOf<HTMLElement> | null = null;
    
    // Buscar dentro del contenedor del calendario
    const calendarContainer = this.elementRef.nativeElement.querySelector('.calendar-container');
    if (calendarContainer) {
      dayCells = calendarContainer.querySelectorAll('.cal-day-cell') as NodeListOf<HTMLElement>;
      if (dayCells && dayCells.length > 0) return dayCells;
    }
    
    // Buscar en mwl-calendar-month-view
    const monthView = this.elementRef.nativeElement.querySelector('mwl-calendar-month-view');
    if (monthView) {
      dayCells = monthView.querySelectorAll('.cal-day-cell') as NodeListOf<HTMLElement>;
      if (dayCells && dayCells.length > 0) return dayCells;
    }
    
    // Buscar en .cal-month-view
    const calMonthView = this.elementRef.nativeElement.querySelector('.cal-month-view');
    if (calMonthView) {
      dayCells = calMonthView.querySelectorAll('.cal-day-cell') as NodeListOf<HTMLElement>;
      if (dayCells && dayCells.length > 0) return dayCells;
    }
    
    // Buscar directamente en el componente
    dayCells = this.elementRef.nativeElement.querySelectorAll('.cal-day-cell') as NodeListOf<HTMLElement>;
    if (dayCells && dayCells.length > 0) return dayCells;
    
    return null;
  }

  agregarBadgesCodigo(): void {
    // Solo ejecutar si estamos en vista de calendario
    if (this.modoVista() !== 'calendario') {
      return;
    }
    
    const dayCells = this.obtenerCeldasCalendario();
    
    if (!dayCells || dayCells.length === 0) {
      // Intentar de nuevo después de un breve delay
      setTimeout(() => {
        const retryCells = this.obtenerCeldasCalendario();
        if (!retryCells || retryCells.length === 0) {
          console.log('⚠️ No se encontraron celdas del calendario después de reintento');
          return;
        }
        this.agregarBadgesCodigoEnCeldas(retryCells);
      }, 200);
      return;
    }
    
    this.agregarBadgesCodigoEnCeldas(dayCells);
  }

  private agregarBadgesCodigoEnCeldas(dayCells: NodeListOf<HTMLElement>): void {
    const eventos = this.eventosCalendario();
    
    if (eventos.length === 0) {
      console.log('⚠️ No hay eventos en el calendario');
      return;
    }
    
    let badgesAgregados = 0;
    let eventosNoEncontrados = 0;
    let eventosSinCodigo = 0;
    
    // Estrategia mejorada: iterar sobre los eventos y buscar sus elementos en el DOM
    // Primero, crear un mapa de eventos por fecha para manejar múltiples eventos en la misma fecha
    const eventosPorFecha = new Map<string, CalendarEvent[]>();
    eventos.forEach(evento => {
      const eventStart = startOfDay(evento.start);
      const eventEnd = evento.end ? startOfDay(evento.end) : eventStart;
      
      // Agregar el evento a todas las fechas de su rango
      let currentDate = new Date(eventStart);
      while (currentDate <= eventEnd) {
        const fechaKey = currentDate.toISOString().split('T')[0];
        if (!eventosPorFecha.has(fechaKey)) {
          eventosPorFecha.set(fechaKey, []);
        }
        eventosPorFecha.get(fechaKey)!.push(evento);
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }
    });
    
    eventos.forEach((evento, eventoIndex) => {
      // Obtener el código de la actividad
      const meta = evento.meta as any;
      const codigo = meta?.codigoActividad || 
                    meta?.actividad?.codigoActividad ||
                    (meta?.actividad && typeof meta.actividad === 'object' && 'codigoActividad' in meta.actividad ? meta.actividad.codigoActividad : null);
      
      if (!codigo || typeof codigo !== 'string' || codigo.trim() === '') {
        eventosSinCodigo++;
        return;
      }
      
      // Buscar la celda del calendario que corresponde a la fecha del evento
      const eventStart = startOfDay(evento.start);
      const eventEnd = evento.end ? startOfDay(evento.end) : eventStart;
      
      // Obtener el color como string
      let evColor: string | undefined;
      if (typeof evento.color === 'string') {
        evColor = evento.color;
      } else if (evento.color && typeof evento.color === 'object' && 'primary' in evento.color) {
        evColor = evento.color.primary;
      }
      
      if (!evColor) {
        eventosNoEncontrados++;
        console.log(`⚠️ Evento ${eventoIndex} (ID: ${evento.id}) sin color`);
        return;
      }
      
      // Convertir color a RGB para comparar
      const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };
      
      const rgb = hexToRgb(evColor);
      if (!rgb) {
        eventosNoEncontrados++;
        console.log(`⚠️ Evento ${eventoIndex} (ID: ${evento.id}) color inválido: ${evColor}`);
        return;
      }
      
      const expectedRgb = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      let elementosEncontrados = 0;
      
      // Buscar en todas las celdas que corresponden a este evento
      dayCells.forEach((cell: HTMLElement) => {
        const cellDate = this.obtenerFechaDeCelda(cell);
        if (!cellDate) return;
        
        const cellDateStart = startOfDay(cellDate);
        
        // Verificar si esta celda contiene el evento
        if (cellDateStart >= eventStart && cellDateStart <= eventEnd) {
          const fechaKey = cellDateStart.toISOString().split('T')[0];
          const eventosEnEstaFecha = eventosPorFecha.get(fechaKey) || [];
          
          // Obtener el índice de este evento en la lista de eventos de esta fecha
          const indiceEnFecha = eventosEnEstaFecha.findIndex(ev => ev.id === evento.id);
          
          // Buscar eventos en esta celda que coincidan con el color
          const eventosEnCelda = Array.from(cell.querySelectorAll('.cal-event')) as HTMLElement[];
          
          // Filtrar eventos que ya tienen badge de este evento específico
          const eventosSinBadge = eventosEnCelda.filter(el => {
            const dataEventId = el.getAttribute('data-event-id');
            const existingBadge = el.querySelector('.activity-code-badge-inline');
            // Si ya tiene badge Y el data-event-id coincide, ya fue procesado
            if (existingBadge && dataEventId === String(evento.id)) {
              return false; // Ya tiene badge de este evento
            }
            return true;
          });
          
          // Buscar eventos que coinciden con el color
          const eventosConMismoColor = eventosSinBadge.filter(el => {
            const computedStyle = window.getComputedStyle(el);
            const backgroundColor = computedStyle.backgroundColor;
            return backgroundColor && (backgroundColor === expectedRgb || backgroundColor.includes(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`));
          });
          
          let eventoEncontrado: HTMLElement | null = null;
          
          if (eventosConMismoColor.length === 1) {
            // Solo hay un evento con este color, debe ser este
            eventoEncontrado = eventosConMismoColor[0];
          } else if (eventosConMismoColor.length > 1) {
            // Hay múltiples eventos con el mismo color, usar el índice
            // Filtrar los que ya tienen data-event-id asignado
            const eventosSinAsignar = eventosConMismoColor.filter(el => !el.getAttribute('data-event-id'));
            
            if (indiceEnFecha >= 0 && indiceEnFecha < eventosSinAsignar.length) {
              // Usar el índice para identificar el evento correcto
              eventoEncontrado = eventosSinAsignar[indiceEnFecha];
              console.log(`🔍 Múltiples eventos con mismo color en ${fechaKey}, usando índice ${indiceEnFecha}`);
            } else if (eventosSinAsignar.length === 1) {
              // Solo hay un evento sin asignar, debe ser este
              eventoEncontrado = eventosSinAsignar[0];
            }
          } else if (eventosSinBadge.length > 0 && indiceEnFecha >= 0) {
            // No hay eventos con el color exacto, pero hay eventos sin badge
            // Usar el índice si está disponible
            const eventosSinAsignar = eventosSinBadge.filter(el => !el.getAttribute('data-event-id'));
            if (indiceEnFecha < eventosSinAsignar.length) {
              eventoEncontrado = eventosSinAsignar[indiceEnFecha];
              console.log(`⚠️ Usando índice ${indiceEnFecha} para evento en ${fechaKey} (color no coincide exactamente)`);
            }
          }
          
          if (eventoEncontrado) {
            // Verificar que no esté ya asignado a otro evento
            const dataEventId = eventoEncontrado.getAttribute('data-event-id');
            if (dataEventId && dataEventId !== String(evento.id)) {
              console.log(`⚠️ Elemento ya asignado a evento ${dataEventId}, saltando...`);
            } else {
              // Agregar badge y marcar con el ID del evento
              console.log(`✅ Evento ${eventoIndex} (ID: ${evento.id}) encontrado en fecha ${fechaKey}. Código: ${codigo}`);
              this.agregarBadgeAElemento(eventoEncontrado, codigo, evento.id);
              elementosEncontrados++;
            }
          }
        }
      });
      
      if (elementosEncontrados > 0) {
        badgesAgregados += elementosEncontrados;
        console.log(`✅ Badges agregados para evento ${eventoIndex} (ID: ${evento.id}) en ${elementosEncontrados} día(s)`);
      } else {
        eventosNoEncontrados++;
        console.log(`❌ No se encontró elemento DOM para evento ${eventoIndex} (ID: ${evento.id}, Título: ${evento.title}, Color: ${evColor})`);
      }
    });
    
    // Método alternativo: si aún hay elementos sin badge, intentar por índice
    const eventElements = this.elementRef.nativeElement.querySelectorAll('.cal-event');
    eventElements.forEach((eventEl: HTMLElement, index: number) => {
      if (!eventEl.querySelector('.activity-code-badge-inline') && index < eventos.length) {
        const evento = eventos[index];
        const meta = evento.meta as any;
        const codigo = meta?.codigoActividad || meta?.actividad?.codigoActividad;
        if (codigo) {
          console.log(`⚠️ Agregando badge por índice ${index} como último recurso. Código: ${codigo}`);
          this.agregarBadgeAElemento(eventEl, codigo, evento.id);
          badgesAgregados++;
        }
      }
    });
    
    console.log(`📊 Resumen: ${badgesAgregados} badges agregados, ${eventosNoEncontrados} eventos no encontrados, ${eventosSinCodigo} eventos sin código`);
    
    if (badgesAgregados > 0) {
      console.log(`✅ Badges de código agregados a ${badgesAgregados} eventos`);
    } else {
      console.log('⚠️ No se agregaron badges. Revisa los logs anteriores.');
    }
  }

  private agregarBadgeAElemento(eventEl: HTMLElement, codigo: string, eventoId?: string | number): void {
    // Limpiar badges anteriores
    const existingBadge = eventEl.querySelector('.activity-code-badge-inline');
    if (existingBadge) {
      existingBadge.remove();
    }
    
    // Crear badge de código al lado del evento
    const badge = document.createElement('span');
    badge.className = 'activity-code-badge-inline';
    badge.style.cssText = 'margin-left: 0.5rem; padding: 0.125rem 0.375rem; font-size: 0.625rem; font-family: monospace; font-weight: 600; background-color: rgba(255, 255, 255, 0.9); color: #334155; border-radius: 0.25rem; border: 1px solid rgba(203, 213, 225, 0.8); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); white-space: nowrap; display: inline-block; vertical-align: middle;';
    badge.textContent = codigo;
    badge.title = `Código: ${codigo}`;
    
    // Insertar el badge después del contenido del evento
    // Intentar agregarlo al lado del evento, no dentro
    const titleElement = eventEl.querySelector('.cal-event-title') as HTMLElement;
    if (titleElement) {
      // Agregar el badge después del título (dentro del mismo contenedor)
      titleElement.appendChild(badge);
    } else {
      // Si no hay elemento de título, agregar al final del evento
      eventEl.appendChild(badge);
    }
    
    // Guardar el ID del evento en el elemento para futuras búsquedas
    if (eventoId) {
      eventEl.setAttribute('data-event-id', String(eventoId));
    }
  }

  obtenerFechaDeCelda(cell: HTMLElement): Date | null {
    try {
      // Obtener el número del día
      const dayNumberEl = cell.querySelector('.cal-day-number');
      if (!dayNumberEl) return null;
      
      const dayNumber = parseInt(dayNumberEl.textContent?.trim() || '0', 10);
      if (dayNumber === 0) return null;
      
      // Obtener el mes y año del viewDate
      const viewDate = this.viewDate;
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      
      // Crear la fecha
      const fecha = new Date(year, month, dayNumber);
      return fecha;
    } catch (e) {
      return null;
    }
  }

  agregarSombreadoRangos(): void {
    // Solo ejecutar si estamos en vista de calendario
    if (this.modoVista() !== 'calendario') {
      return;
    }
    
    const dayCells = this.obtenerCeldasCalendario();
    
    if (!dayCells || dayCells.length === 0) {
      // Intentar de nuevo después de un breve delay
      setTimeout(() => {
        const retryCells = this.obtenerCeldasCalendario();
        if (retryCells && retryCells.length > 0) {
          this.agregarSombreadoRangosEnCeldas(retryCells);
        }
      }, 200);
      return;
    }
    
    this.agregarSombreadoRangosEnCeldas(dayCells);
  }

  private agregarSombreadoRangosEnCeldas(dayCells: NodeListOf<HTMLElement>): void {
    const eventos = this.eventosCalendario();
    
    dayCells.forEach((cell: HTMLElement) => {
      // Limpiar estilos anteriores
      cell.style.backgroundColor = '';
      cell.style.backgroundImage = '';
      
      // Obtener la fecha de la celda
      const cellDate = this.obtenerFechaDeCelda(cell);
      if (!cellDate) return;
      
      const cellDateStart = startOfDay(cellDate);
      
      // Buscar eventos de múltiples días que incluyan esta fecha
      const eventosMultiplesDias = eventos.filter(e => {
        if (!e.end) return false; // Solo eventos con fecha fin
        const eventStart = startOfDay(e.start);
        const eventEnd = startOfDay(e.end);
        return cellDateStart >= eventStart && cellDateStart <= eventEnd;
      });
      
      if (eventosMultiplesDias.length > 0) {
        // Obtener el color del primer evento (o combinar colores si hay múltiples)
        const primerEvento = eventosMultiplesDias[0];
        const actividad = (primerEvento.meta as any)?.actividad;
        
        if (actividad) {
          const estadoInfo = this.obtenerEstadoParaMostrar(actividad);
          const colorEstado = estadoInfo.color || '#3B82F6';
          
          // Convertir color hex a RGB para crear sombreado
          const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16)
            } : null;
          };
          
          const rgb = hexToRgb(colorEstado);
          if (rgb) {
            // Sombreado suave con opacidad baja
            const backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
            cell.style.backgroundColor = backgroundColor;
          }
        }
      }
    });
  }

  agregarPuntosColorEstado(): void {
    // Obtener todos los eventos del calendario
    const events = this.elementRef.nativeElement.querySelectorAll('.cal-event');
    const eventos = this.eventosCalendario();
    
    events.forEach((eventEl: HTMLElement) => {
      // Verificar si ya tiene el punto de color
      if (eventEl.querySelector('.estado-color-dot')) {
        return; // Ya tiene el punto, no agregarlo de nuevo
      }

      const eventTitle = eventEl.textContent?.trim() || '';
      
      // Buscar el evento que coincida con este elemento
      const evento = eventos.find(e => {
        // Comparar por título
        if (e.title === eventTitle) return true;
        
        // Comparar por nombre de actividad
        const actividad = (e.meta as any)?.actividad;
        if (actividad?.nombre === eventTitle) return true;
        
        // Verificar si el título contiene el nombre
        if (actividad?.nombre && eventTitle.includes(actividad.nombre)) return true;
        
        return false;
      });
      
      if (evento) {
        const actividad = (evento.meta as any)?.actividad;
        if (actividad) {
          // Obtener el estado y su color
          const estadoInfo = this.obtenerEstadoParaMostrar(actividad);
          const colorEstado = estadoInfo.color || '#3B82F6';
          
          // Crear el punto de color
          const punto = document.createElement('span');
          punto.className = 'estado-color-dot';
          punto.style.cssText = `
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${colorEstado};
            margin-right: 4px;
            vertical-align: middle;
            flex-shrink: 0;
          `;
          
          // Insertar el punto al inicio del contenido del evento
          if (eventEl.firstChild) {
            eventEl.insertBefore(punto, eventEl.firstChild);
          } else {
            eventEl.appendChild(punto);
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
  }

  getEstadoColor(estado: any): string {
    return estado?.color || estado?.Color || '#3B82F6';
  }

  /**
   * Obtiene los colores de fondo y texto para un badge de estado basado en el color del estado
   */
  getColoresBadgeEstado(colorEstado: string): { fondo: string; texto: string; borde: string; punto: string } {
    // Convertir color hex a RGB para crear variaciones
    const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const rgb = hexToRgb(colorEstado);
    if (rgb) {
      // Fondo con opacidad baja
      const fondo = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;
      // Texto con el color del estado pero más oscuro
      const texto = colorEstado;
      // Borde con opacidad media
      const borde = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
      // Punto con el color del estado
      const punto = colorEstado;
      return { fondo, texto, borde, punto };
    }

    // Fallback
    return {
      fondo: 'rgba(59, 130, 246, 0.1)',
      texto: '#3B82F6',
      borde: 'rgba(59, 130, 246, 0.3)',
      punto: '#3B82F6'
    };
  }

  /**
   * Obtiene el estado completo de una actividad
   */
  getEstadoDeActividad(actividad: any): any | null {
    if (actividad.nombreEstadoActividad && actividad.idEstadoActividad) {
      // Buscar el estado en la lista de estados cargados
      const estado = this.estadosActividad().find(
        e => (e.idEstadoActividad || e.id) === actividad.idEstadoActividad
      );
      return estado || null;
    } else if (actividad.idEstadoActividad) {
      // Buscar el estado en la lista de estados cargados
      const estado = this.estadosActividad().find(
        e => (e.idEstadoActividad || e.id) === actividad.idEstadoActividad
      );
      return estado || null;
    }
    return null;
  }

  /**
   * Obtiene el color del estado de una actividad
   */
  getColorEstadoActividad(actividad: any): string {
    const estado = this.getEstadoDeActividad(actividad);
    if (estado) {
      return this.getEstadoColor(estado);
    }
    return '#94a3b8'; // slate-400 como color por defecto cuando no hay estado
  }

  /**
   * Convierte un color hex a rgba con transparencia
   */
  hexToRgba(hex: string, alpha: number = 0.2): string {
    // Remover el # si existe
    hex = hex.replace('#', '');
    
    // Convertir a RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Obtiene el color de fondo con transparencia para el estado
   */
  getColorFondoEstado(actividad: any): string {
    const color = this.getColorEstadoActividad(actividad);
    return this.hexToRgba(color, 0.15);
  }

  /**
   * Obtiene el color de borde con transparencia para el estado
   */
  getColorBordeEstado(actividad: any): string {
    const color = this.getColorEstadoActividad(actividad);
    return this.hexToRgba(color, 0.4);
  }

  /**
   * Parsea una fecha en formato YYYY-MM-DD a Date sin problemas de zona horaria
   */
  private parsearFecha(fechaString: string | undefined | Date): Date | null {
    if (!fechaString) return null;
    
    // Si ya es un Date, retornarlo
    if (fechaString instanceof Date) {
      const fecha = new Date(fechaString);
      fecha.setHours(0, 0, 0, 0);
      return fecha;
    }
    
    // Parsear formato YYYY-MM-DD manualmente para evitar problemas de zona horaria
    const fechaStr = String(fechaString);
    const partes = fechaStr.split('T')[0].split('-');
    if (partes.length === 3) {
      const año = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10) - 1; // Mes es 0-indexed
      const dia = parseInt(partes[2], 10);
      
      if (!isNaN(año) && !isNaN(mes) && !isNaN(dia)) {
        const fecha = new Date(año, mes, dia);
        fecha.setHours(0, 0, 0, 0);
        return fecha;
      }
    }
    
    // Fallback a new Date si el formato no es YYYY-MM-DD
    try {
      const fecha = new Date(fechaStr);
      if (!isNaN(fecha.getTime())) {
        fecha.setHours(0, 0, 0, 0);
        return fecha;
      }
    } catch (e) {
      // Ignorar errores
    }
    
    return null;
  }

  /**
   * Calcula el estado automático de una actividad basado en sus fechas
   * Retorna el estado calculado o null si debe usar el estado manual
   */
  calcularEstadoAutomatico(actividad: Actividad): { nombre: string; id?: number } | null {
    // Si la actividad tiene un estado manual (Suspendida, Cancelada, etc.), mantenerlo
    const estadoActual = actividad.nombreEstadoActividad?.toLowerCase() || '';
    const estadosManuales = ['suspendida', 'suspendido', 'cancelada', 'cancelado'];
    
    if (estadosManuales.some(estado => estadoActual.includes(estado))) {
      return null; // Mantener el estado manual
    }

    // Obtener fechas - usar fechaInicio como referencia principal
    const fechaInicio = this.parsearFecha(actividad.fechaInicio);
    const fechaFin = this.parsearFecha(actividad.fechaFin);
    const fechaEvento = this.parsearFecha(actividad.fechaEvento);
    
    // Si no hay fechaInicio, usar fechaEvento como fallback, pero no fechaCreacion
    const fechaReferencia = fechaInicio || fechaEvento;
    
    if (!fechaReferencia) {
      return null; // Sin fecha de referencia, no calcular automáticamente
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Buscar los estados en la lista de estados disponibles
    const estados = this.estadosActividad();

    // 1. Si fechaInicio es futura → Planificada
    if (fechaReferencia > hoy) {
      const estadoPlanificada = estados.find(e => {
        const nombre = e.nombre?.toLowerCase() || '';
        return nombre.includes('planificada') || nombre.includes('planificad');
      });
      if (estadoPlanificada) {
        return {
          nombre: estadoPlanificada.nombre,
          id: estadoPlanificada.idEstadoActividad || estadoPlanificada.id
        };
      }
      return { nombre: 'Planificada' };
    }

    // 2. Si fechaInicio es hoy o pasada, verificar fechaFin
    if (fechaReferencia <= hoy) {
      // Si hay fechaFin y ya pasó → Terminada
      if (fechaFin && fechaFin < hoy) {
        const estadoTerminada = estados.find(e => {
          const nombre = e.nombre?.toLowerCase() || '';
          return nombre.includes('terminada') || nombre.includes('terminado') || 
                 nombre.includes('finalizada') || nombre.includes('finalizado') ||
                 nombre.includes('completada') || nombre.includes('completado');
        });
        if (estadoTerminada) {
          return {
            nombre: estadoTerminada.nombre,
            id: estadoTerminada.idEstadoActividad || estadoTerminada.id
          };
        }
        return { nombre: 'Terminada' };
      }

      // 3. Si fechaInicio <= hoy y (fechaFin no existe o fechaFin >= hoy) → En ejecución
      // Esto cubre: fechaInicio es hoy, o estamos dentro del rango [fechaInicio, fechaFin]
      // Ejemplo: actividad del 15 al 20, hoy es 17 → En ejecución
      const estadoEnEjecucion = estados.find(e => {
        const nombre = e.nombre?.toLowerCase() || '';
        return nombre.includes('en ejecución') || nombre.includes('en ejecucion') ||
               nombre.includes('ejecución') || nombre.includes('ejecucion') ||
               nombre.includes('en curso') || nombre.includes('en_curso') ||
               nombre.includes('curso');
      });
      if (estadoEnEjecucion) {
        return {
          nombre: estadoEnEjecucion.nombre,
          id: estadoEnEjecucion.idEstadoActividad || estadoEnEjecucion.id
        };
      }
      return { nombre: 'En ejecución' };
    }

    return null;
  }

  /**
   * Obtiene el estado a mostrar para una actividad (automático o manual)
   */
  obtenerEstadoParaMostrar(actividad: Actividad): { nombre: string; id?: number; esAutomatico: boolean; color?: string } {
    // Intentar calcular estado automático
    const estadoAutomatico = this.calcularEstadoAutomatico(actividad);
    
    if (estadoAutomatico) {
      // Buscar el color del estado automático
      let colorEstado = '#3B82F6'; // Color por defecto
      if (estadoAutomatico.id) {
        const estado = this.estadosActividad().find(
          e => (e.idEstadoActividad || e.id) === estadoAutomatico.id
        );
        if (estado) {
          colorEstado = this.getEstadoColor(estado);
        }
      }
      return { ...estadoAutomatico, esAutomatico: true, color: colorEstado };
    }

    // Si no hay estado automático, usar el estado guardado
    if (actividad.nombreEstadoActividad) {
      let colorEstado = '#3B82F6'; // Color por defecto
      if (actividad.idEstadoActividad) {
        const estado = this.estadosActividad().find(
          e => (e.idEstadoActividad || e.id) === actividad.idEstadoActividad
        );
        if (estado) {
          colorEstado = this.getEstadoColor(estado);
        }
      }
      return {
        nombre: actividad.nombreEstadoActividad,
        id: actividad.idEstadoActividad,
        esAutomatico: false,
        color: colorEstado
      };
    }

    // Buscar estado por ID
    if (actividad.idEstadoActividad) {
      const estado = this.estadosActividad().find(
        e => (e.idEstadoActividad || e.id) === actividad.idEstadoActividad
      );
      if (estado) {
        return {
          nombre: estado.nombre || estado.Nombre || 'Sin estado',
          id: actividad.idEstadoActividad,
          esAutomatico: false,
          color: this.getEstadoColor(estado)
        };
      }
    }

    return { nombre: 'Sin estado', esAutomatico: false, color: '#3B82F6' };
  }

  getTiposEvidenciaDeActividad(): number[] | null {
    const actividad = this.actividadParaEvidencia();
    if (!actividad) {
      console.warn('⚠️ No hay actividad seleccionada');
      return null;
    }
    
    console.log('🔍 getTiposEvidenciaDeActividad - Actividad completa:', actividad);
    console.log('🔍 getTiposEvidenciaDeActividad - Actividad nombre:', actividad.nombre);
    console.log('🔍 getTiposEvidenciaDeActividad - idTipoEvidencias:', actividad.idTipoEvidencias);
    console.log('🔍 getTiposEvidenciaDeActividad - Tipo de idTipoEvidencias:', typeof actividad.idTipoEvidencias);
    console.log('🔍 getTiposEvidenciaDeActividad - Es array:', Array.isArray(actividad.idTipoEvidencias));
    console.log('🔍 getTiposEvidenciaDeActividad - Es undefined:', actividad.idTipoEvidencias === undefined);
    console.log('🔍 getTiposEvidenciaDeActividad - Es null:', actividad.idTipoEvidencias === null);
    
    const tipos: any = actividad.idTipoEvidencias;
    
    // Si es undefined o null, retornar null
    if (tipos === undefined || tipos === null) {
      console.warn('⚠️ idTipoEvidencias es undefined o null');
      return null;
    }
    
    // Si es un string, intentar parsearlo primero
    if (typeof tipos === 'string' && tipos.trim() !== '') {
      try {
        const parsed = JSON.parse(tipos);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const tiposNumeros = parsed.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
          console.log('✅ Tipos de evidencia parseados desde string:', tiposNumeros);
          return tiposNumeros;
        }
      } catch (e) {
        console.warn('⚠️ Error parseando tipos de evidencia desde string:', e);
      }
    }
    
    // Si es un array y tiene elementos
    if (Array.isArray(tipos) && tipos.length > 0) {
      // Asegurarse de que todos los valores sean números
      const tiposNumeros = tipos.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
      console.log('✅ Tipos de evidencia válidos (array):', tiposNumeros);
      return tiposNumeros;
    }
    
    // Si es un número único, convertirlo a array
    if (typeof tipos === 'number' && tipos > 0) {
      console.log('✅ Tipo de evidencia único (número):', tipos);
      return [tipos];
    }
    
    console.warn('⚠️ No se encontraron tipos de evidencia válidos en la actividad');
    console.warn('⚠️ Valor recibido:', tipos, 'Tipo:', typeof tipos);
    return null;
  }

  eventoClicked({ event }: { event: CalendarEvent }): void {
    if (event.meta && event.meta.actividad) {
      this.navigateToDetail(event.meta.actividad.id);
    }
  }

  eventoHovered: CalendarEvent | null = null;
  hoverPosition = signal<{ x: number; y: number } | null>(null);
  hoverTimeout: any = null;

  ngAfterViewInit(): void {
    // Agregar listeners a los eventos del calendario después de que se rendericen
    setTimeout(() => {
      this.attachEventListeners();
      this.agregarPuntosColorEstado();
      this.agregarBadgesCodigo();
      this.agregarSombreadoRangos();
    }, 500);
  }

  attachEventListeners(): void {
    // Agregar listeners a eventos
    const eventos = document.querySelectorAll('.cal-month-view .cal-event');
    eventos.forEach((eventoEl) => {
      // Remover listeners anteriores si existen
      const nuevoEventoEl = eventoEl.cloneNode(true);
      eventoEl.parentNode?.replaceChild(nuevoEventoEl, eventoEl);
      
      nuevoEventoEl.addEventListener('mouseenter', (e: Event) => {
        const mouseEvent = e as MouseEvent;
        const target = e.target as HTMLElement;
        
        // Buscar el evento por el título del elemento
        const titulo = target.textContent?.trim();
        if (titulo) {
          const evento = this.eventosCalendario().find(ev => {
            if (ev.title === titulo) return true;
            const actividad = (ev.meta as any)?.actividad;
            if (actividad?.nombre === titulo || actividad?.nombreActividad === titulo) return true;
            if (actividad?.nombre && titulo.includes(actividad.nombre)) return true;
            return false;
          });
          if (evento) {
            this.hoverTimeout = setTimeout(() => {
              this.eventoHovered = evento;
              this.hoverPosition.set({
                x: mouseEvent.clientX,
                y: mouseEvent.clientY
              });
            }, 150); // Delay corto para mejor UX
          }
        }
      });
      
      nuevoEventoEl.addEventListener('mouseleave', () => {
        if (this.hoverTimeout) {
          clearTimeout(this.hoverTimeout);
        }
        this.eventoHovered = null;
        this.hoverPosition.set(null);
      });
      
      nuevoEventoEl.addEventListener('mousemove', (e: Event) => {
        if (this.eventoHovered) {
          const mouseEvent = e as MouseEvent;
          this.hoverPosition.set({
            x: mouseEvent.clientX,
            y: mouseEvent.clientY
          });
        }
      });
    });

    // Agregar listeners a las celdas del calendario para mostrar tooltip al hover
    const dayCells = this.elementRef.nativeElement.querySelectorAll('.cal-day-cell');
    dayCells.forEach((cell: HTMLElement) => {
      // Remover listeners anteriores
      const newCell = cell.cloneNode(true) as HTMLElement;
      cell.parentNode?.replaceChild(newCell, cell);
      
      newCell.addEventListener('mouseenter', (e: MouseEvent) => {
        const cellDate = this.obtenerFechaDeCelda(newCell);
        if (!cellDate) return;
        
        const cellDateStart = startOfDay(cellDate);
        const eventos = this.eventosCalendario();
        
        // Buscar eventos que coincidan con esta fecha
        const eventosEnEsteDia = eventos.filter(ev => {
          const eventStart = startOfDay(ev.start);
          const eventEnd = ev.end ? startOfDay(ev.end) : eventStart;
          return cellDateStart >= eventStart && cellDateStart <= eventEnd;
        });
        
        if (eventosEnEsteDia.length > 0) {
          // Mostrar tooltip con información de la primera actividad
          const primerEvento = eventosEnEsteDia[0];
          this.hoverTimeout = setTimeout(() => {
            this.eventoHovered = primerEvento;
            this.hoverPosition.set({
              x: e.clientX,
              y: e.clientY
            });
          }, 200);
        }
      });
      
      newCell.addEventListener('mouseleave', () => {
        if (this.hoverTimeout) {
          clearTimeout(this.hoverTimeout);
        }
        this.eventoHovered = null;
        this.hoverPosition.set(null);
      });
      
      newCell.addEventListener('mousemove', (e: MouseEvent) => {
        if (this.eventoHovered) {
          this.hoverPosition.set({
            x: e.clientX,
            y: e.clientY
          });
        }
      });
    });
  }

  onEventMouseLeave(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    this.eventoHovered = null;
    this.hoverPosition.set(null);
  }

  getTooltipLeft(): number {
    if (!this.hoverPosition()) return 0;
    const tooltipWidth = 320; // Ancho aproximado del tooltip
    const margin = 20;
    const x = this.hoverPosition()!.x;
    
    // Si el tooltip se saldría por la derecha, posicionarlo a la izquierda del cursor
    if (x + tooltipWidth + margin > window.innerWidth) {
      return x - tooltipWidth - margin;
    }
    return x + margin;
  }

  getTooltipTop(): number {
    if (!this.hoverPosition()) return 0;
    const tooltipHeight = 200; // Altura aproximada del tooltip
    const margin = 20;
    const y = this.hoverPosition()!.y;
    
    // Si el tooltip se saldría por abajo, posicionarlo arriba del cursor
    if (y + tooltipHeight + margin > window.innerHeight) {
      return y - tooltipHeight - margin;
    }
    return y + margin;
  }

  cambiarMes(direccion: 'anterior' | 'siguiente'): void {
    const nuevaFecha = new Date(this.viewDate);
    if (direccion === 'anterior') {
      nuevaFecha.setMonth(nuevaFecha.getMonth() - 1);
    } else {
      nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
    }
    this.viewDate = nuevaFecha;
    // Agregar puntos de color, badges y sombreado después de que el calendario se actualice
    setTimeout(() => {
      this.agregarPuntosColorEstado();
      this.agregarBadgesCodigo();
      this.agregarSombreadoRangos();
    }, 500);
  }

  irAHoy(): void {
    this.viewDate = new Date();
    // Agregar puntos de color, badges y sombreado después de que el calendario se actualice
    setTimeout(() => {
      this.agregarPuntosColorEstado();
      this.agregarBadgesCodigo();
      this.agregarSombreadoRangos();
    }, 500);
  }

  toggleFormIndicador(): void {
    this.mostrarFormIndicador.set(!this.mostrarFormIndicador());
    if (!this.mostrarFormIndicador()) {
      this.formIndicador.reset();
      this.errorIndicador.set(null);
    }
  }

  toggleFormImportarAnio(): void {
    this.mostrarFormImportarAnio.set(!this.mostrarFormImportarAnio());
    if (!this.mostrarFormImportarAnio()) {
      this.initializeFormImportarAnio();
      this.errorImportarAnio.set(null);
    }
  }

  toggleFormImportarExcel(): void {
    this.mostrarFormImportarExcel.set(!this.mostrarFormImportarExcel());
    if (!this.mostrarFormImportarExcel()) {
      this.archivoExcel = null;
      this.errorImportarExcel.set(null);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar que sea un archivo Excel
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        this.errorImportarExcel.set('Por favor, selecciona un archivo Excel (.xlsx o .xls)');
        return;
      }
      this.archivoExcel = file;
      this.errorImportarExcel.set(null);
    }
  }

  onSubmitImportarAnio(): void {
    if (this.formImportarAnio.valid) {
      this.loadingImportarAnio.set(true);
      this.errorImportarAnio.set(null);

      const formValue = this.formImportarAnio.value;
      const data = {
        anioOrigen: Number(formValue.anioOrigen),
        anioDestino: Number(formValue.anioDestino),
        actualizarExistentes: formValue.actualizarExistentes ?? true
      };

      this.indicadorService.importarDesdeAnio(data).subscribe({
        next: () => {
          console.log('✅ Indicadores importados desde año exitosamente');
          this.loadIndicadores();
          this.toggleFormImportarAnio();
          this.loadingImportarAnio.set(false);
        },
        error: (err) => {
          console.error('❌ Error importando indicadores desde año:', err);
          let errorMessage = 'Error al importar indicadores desde año';
          
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
          
          this.errorImportarAnio.set(errorMessage);
          this.loadingImportarAnio.set(false);
        }
      });
    } else {
      this.formImportarAnio.markAllAsTouched();
    }
  }

  onSubmitImportarExcel(): void {
    if (!this.archivoExcel) {
      this.errorImportarExcel.set('Por favor, selecciona un archivo Excel');
      return;
    }

    this.loadingImportarExcel.set(true);
    this.errorImportarExcel.set(null);

    this.indicadorService.importarDesdeExcel(this.archivoExcel).subscribe({
      next: () => {
        console.log('✅ Indicadores importados desde Excel exitosamente');
        this.loadIndicadores();
        this.toggleFormImportarExcel();
        this.loadingImportarExcel.set(false);
      },
      error: (err) => {
        console.error('❌ Error importando indicadores desde Excel:', err);
        let errorMessage = 'Error al importar indicadores desde Excel';
        
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
        
        this.errorImportarExcel.set(errorMessage);
        this.loadingImportarExcel.set(false);
      }
    });
  }

  descargarPlantillaExcel(): void {
    this.indicadorService.descargarPlantillaExcel().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plantilla-indicadores.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('❌ Error descargando plantilla Excel:', err);
        alert('Error al descargar la plantilla Excel');
      }
    });
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
          // Recargar la lista de indicadores
          this.loadIndicadores();
        // Auto-seleccionar el indicador recién creado
        if (nuevoIndicador && nuevoIndicador.idIndicador) {
          this.indicadorSeleccionado.set(nuevoIndicador.idIndicador);
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

  toggleProtagonista(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.formNuevaActividad.get('idTipoProtagonista')?.value || [];
    let newValue: number[];
    
    if (checked) {
      newValue = [...currentValue, id];
      // Ocultar el dropdown cuando se selecciona un protagonista
      this.mostrarDropdownProtagonista.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      // Si no hay selecciones, mostrar el dropdown nuevamente
      if (newValue.length === 0) {
        this.mostrarDropdownProtagonista.set(true);
      }
    }
    
    this.formNuevaActividad.patchValue({ idTipoProtagonista: newValue });
  }

  eliminarProtagonista(id: number): void {
    const currentValue = this.formNuevaActividad.get('idTipoProtagonista')?.value || [];
    const newValue = currentValue.filter((item: number) => item !== id);
    this.formNuevaActividad.patchValue({ idTipoProtagonista: newValue });
    
    // Si no hay selecciones, mostrar el dropdown nuevamente
    if (newValue.length === 0) {
      this.mostrarDropdownProtagonista.set(true);
    }
  }

  getProtagonistasSeleccionados(): any[] {
    const idsSeleccionados = this.formNuevaActividad.get('idTipoProtagonista')?.value || [];
    return this.tiposProtagonista().filter(tipo => idsSeleccionados.includes(tipo.id));
  }

  mostrarDropdownProtagonistaSelect(): void {
    this.mostrarDropdownProtagonista.set(true);
  }

  isProtagonistaSelected(id: number): boolean {
    const currentValue = this.formNuevaActividad.get('idTipoProtagonista')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  toggleDepartamentoResponsable(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.formNuevaActividad.get('departamentoResponsableId')?.value || [];
    let newValue: number[];
    
    if (checked) {
      newValue = [...currentValue, id];
      // Ocultar el dropdown cuando se selecciona un departamento
      this.mostrarDropdownDepartamentoResponsable.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      // Si no hay selecciones, mostrar el dropdown nuevamente
      if (newValue.length === 0) {
        this.mostrarDropdownDepartamentoResponsable.set(true);
      }
    }
    
    this.formNuevaActividad.patchValue({ departamentoResponsableId: newValue });
  }

  eliminarDepartamentoResponsable(id: number): void {
    const currentValue = this.formNuevaActividad.get('departamentoResponsableId')?.value || [];
    const newValue = currentValue.filter((item: number) => item !== id);
    this.formNuevaActividad.patchValue({ departamentoResponsableId: newValue });
    
    // Si no hay selecciones, mostrar el dropdown nuevamente
    if (newValue.length === 0) {
      this.mostrarDropdownDepartamentoResponsable.set(true);
    }
  }

  getDepartamentosResponsablesSeleccionados(): any[] {
    const idsSeleccionados = this.formNuevaActividad.get('departamentoResponsableId')?.value || [];
    return this.departamentos().filter(dept => idsSeleccionados.includes(dept.id));
  }

  mostrarDropdownDepartamentoResponsableSelect(): void {
    this.mostrarDropdownDepartamentoResponsable.set(true);
  }

  isDepartamentoResponsableSelected(id: number): boolean {
    const currentValue = this.formNuevaActividad.get('departamentoResponsableId')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  toggleActividadAnual(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.formNuevaActividad.get('idActividadAnual')?.value || [];
    let newValue: number[];
    
    if (checked) {
      // Verificar que el ID no esté ya en el array para evitar duplicados
      if (!currentValue.includes(id)) {
        newValue = [...currentValue, id];
      } else {
        // Si ya está, mantener el valor actual
        newValue = currentValue;
      }
      // Ocultar el dropdown cuando se selecciona una actividad
      this.mostrarDropdownActividadAnual.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      // Si no hay selecciones, mostrar el dropdown nuevamente
      if (newValue.length === 0) {
        this.mostrarDropdownActividadAnual.set(true);
      }
    }
    
    this.formNuevaActividad.patchValue({ idActividadAnual: newValue });
  }

  toggleFiltroActividadAnual(id: number): void {
    const current = this.filtroActividadAnual();
    if (current.includes(id)) {
      this.filtroActividadAnual.set(current.filter(i => i !== id));
    } else {
      this.filtroActividadAnual.set([...current, id]);
    }
    // Limpiar filtro de mensuales si ya no hay anuales seleccionadas
    if (this.filtroActividadAnual().length === 0) {
      this.filtroActividadMensualInst.set([]);
    } else {
      // Filtrar mensuales para que solo muestre las asociadas a las anuales seleccionadas
      const idsAnuales = this.filtroActividadAnual();
      const mensualesDisponibles = this.actividadesMensualesInst().filter(m => 
        m.idActividadAnual && idsAnuales.includes(m.idActividadAnual)
      );
      // Mantener solo las mensuales seleccionadas que aún están disponibles
      this.filtroActividadMensualInst.set(
        this.filtroActividadMensualInst().filter(id => 
          mensualesDisponibles.some(m => m.idActividadMensualInst === id)
        )
      );
    }
    this.onFiltroChange();
  }

  toggleFiltroActividadMensual(id: number): void {
    const current = this.filtroActividadMensualInst();
    if (current.includes(id)) {
      this.filtroActividadMensualInst.set(current.filter(i => i !== id));
    } else {
      this.filtroActividadMensualInst.set([...current, id]);
    }
    // Limpiar filtro de anuales si ya no hay mensuales seleccionadas
    if (this.filtroActividadMensualInst().length === 0) {
      this.filtroActividadAnual.set([]);
    } else {
      // Filtrar anuales para que solo muestre las asociadas a las mensuales seleccionadas
      const idsMensuales = this.filtroActividadMensualInst();
      const idsAnuales = new Set<number>();
      idsMensuales.forEach(idMensual => {
        const mensual = this.actividadesMensualesInst().find(m => m.idActividadMensualInst === idMensual);
        if (mensual?.idActividadAnual) {
          idsAnuales.add(mensual.idActividadAnual);
        }
      });
      // Mantener solo las anuales seleccionadas que aún están disponibles
      this.filtroActividadAnual.set(
        this.filtroActividadAnual().filter(id => idsAnuales.has(id))
      );
    }
    this.onFiltroChange();
  }

  isFiltroActividadAnualSelected(id: number): boolean {
    return this.filtroActividadAnual().includes(id);
  }

  isFiltroActividadMensualSelected(id: number): boolean {
    return this.filtroActividadMensualInst().includes(id);
  }

  getEstadoSeleccionado(): any | undefined {
    const idFiltro = this.filtroEstadoActividad();
    if (idFiltro === null) {
      return undefined;
    }
    return this.estadosActividad().find(e => (e.idEstadoActividad || e.id) === idFiltro);
  }

  getEstadosFiltrados(): any[] {
    const termino = this.terminoBusquedaEstado().toLowerCase().trim();
    if (!termino) {
      return this.estadosActividad();
    }
    return this.estadosActividad().filter(e => {
      const nombre = (e.nombre || e.Nombre || '').toLowerCase();
      return nombre.includes(termino);
    });
  }

  getCodigoIndicadorDeMensual(mensual: ActividadMensualInst): string {
    if (!mensual.idActividadAnual) {
      return '';
    }
    const anual = this.actividadesAnuales().find(a => a.idActividadAnual === mensual.idActividadAnual);
    return anual?.codigoIndicador || '';
  }

  eliminarActividadAnual(id: number): void {
    const currentValue = this.formNuevaActividad.get('idActividadAnual')?.value || [];
    const newValue = currentValue.filter((item: number) => item !== id);
    this.formNuevaActividad.patchValue({ idActividadAnual: newValue });
    
    // Si no hay selecciones, mostrar el dropdown nuevamente
    if (newValue.length === 0) {
      this.mostrarDropdownActividadAnual.set(true);
    }
  }

  getActividadesAnualesSeleccionadas(): ActividadAnual[] {
    const idsSeleccionados = this.formNuevaActividad.get('idActividadAnual')?.value || [];
    // Eliminar duplicados del array de IDs
    const idsUnicos = Array.from(new Set(idsSeleccionados));
    // Filtrar y eliminar duplicados en el resultado también
    const resultado = this.actividadesAnualesFiltradas().filter(anual => idsUnicos.includes(anual.idActividadAnual));
    // Eliminar duplicados por ID en el resultado final
    const idsVistos = new Set<number>();
    return resultado.filter(anual => {
      if (idsVistos.has(anual.idActividadAnual)) {
        return false;
      }
      idsVistos.add(anual.idActividadAnual);
      return true;
    });
  }

  mostrarDropdownAnual(): void {
    this.mostrarDropdownActividadAnual.set(true);
  }

  isActividadAnualSelected(id: number): boolean {
    const currentValue = this.formNuevaActividad.get('idActividadAnual')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  toggleActividadMensual(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.formNuevaActividad.get('idActividadMensualInst')?.value || [];
    let newValue: number[];
    
    if (checked) {
      // Verificar que el ID no esté ya en el array para evitar duplicados
      if (!currentValue.includes(id)) {
        newValue = [...currentValue, id];
      } else {
        // Si ya está, mantener el valor actual
        newValue = currentValue;
      }
      // Ocultar el dropdown cuando se selecciona una actividad
      this.mostrarDropdownActividadMensual.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      // Si no hay selecciones, mostrar el dropdown nuevamente
      if (newValue.length === 0) {
        this.mostrarDropdownActividadMensual.set(true);
      }
    }
    
    this.formNuevaActividad.patchValue({ idActividadMensualInst: newValue });
  }

  eliminarActividadMensual(id: number): void {
    const currentValue = this.formNuevaActividad.get('idActividadMensualInst')?.value || [];
    const newValue = currentValue.filter((item: number) => item !== id);
    this.formNuevaActividad.patchValue({ idActividadMensualInst: newValue });
    
    // Si no hay selecciones, mostrar el dropdown nuevamente
    if (newValue.length === 0) {
      this.mostrarDropdownActividadMensual.set(true);
    }
  }

  getActividadesMensualesSeleccionadas(): ActividadMensualInst[] {
    const idsSeleccionados = this.formNuevaActividad.get('idActividadMensualInst')?.value || [];
    // Eliminar duplicados del array de IDs
    const idsUnicos = Array.from(new Set(idsSeleccionados));
    // Filtrar y eliminar duplicados en el resultado también
    const resultado = this.actividadesMensualesFiltradas().filter(mensual => idsUnicos.includes(mensual.idActividadMensualInst));
    // Eliminar duplicados por ID en el resultado final
    const idsVistos = new Set<number>();
    return resultado.filter(mensual => {
      if (idsVistos.has(mensual.idActividadMensualInst)) {
        return false;
      }
      idsVistos.add(mensual.idActividadMensualInst);
      return true;
    });
  }

  mostrarDropdownMensual(): void {
    this.mostrarDropdownActividadMensual.set(true);
  }

  isActividadMensualSelected(id: number): boolean {
    const currentValue = this.formNuevaActividad.get('idActividadMensualInst')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  toggleTipoActividad(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.formNuevaActividad.get('idTipoActividad')?.value || [];
    let newValue: number[];
    
    if (checked) {
      newValue = [...currentValue, id];
      // Ocultar el dropdown cuando se selecciona un tipo de actividad
      this.mostrarDropdownTipoActividadSelect.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      // Si no hay selecciones, mostrar el dropdown nuevamente
      if (newValue.length === 0) {
        this.mostrarDropdownTipoActividadSelect.set(true);
      }
    }
    
    this.formNuevaActividad.patchValue({ idTipoActividad: newValue });
  }

  eliminarTipoActividad(id: number): void {
    const currentValue = this.formNuevaActividad.get('idTipoActividad')?.value || [];
    const newValue = currentValue.filter((item: number) => item !== id);
    this.formNuevaActividad.patchValue({ idTipoActividad: newValue });
    
    // Si no hay selecciones, mostrar el dropdown nuevamente
    if (newValue.length === 0) {
      this.mostrarDropdownTipoActividadSelect.set(true);
    }
  }

  getTiposActividadSeleccionados(): any[] {
    const idsSeleccionados = this.formNuevaActividad.get('idTipoActividad')?.value || [];
    return this.tiposActividad().filter(tipo => idsSeleccionados.includes(tipo.idCategoriaActividad || tipo.id));
  }

  abrirDropdownTipoActividadSelect(): void {
    this.mostrarDropdownTipoActividadSelect.set(true);
  }

  isTipoActividadSelected(id: number): boolean {
    const currentValue = this.formNuevaActividad.get('idTipoActividad')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  // Métodos para manejar tipos de evidencia
  toggleTipoEvidencia(id: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    const currentValue = this.formNuevaActividad.get('idTipoEvidencias')?.value || [];
    let newValue: number[];
    
    if (checked) {
      newValue = [...currentValue, id];
      this.mostrarDropdownTipoEvidencia.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      if (newValue.length === 0) {
        this.mostrarDropdownTipoEvidencia.set(true);
      }
    }
    
    this.formNuevaActividad.patchValue({ idTipoEvidencias: newValue });
  }

  eliminarTipoEvidencia(id: number): void {
    const currentValue = this.formNuevaActividad.get('idTipoEvidencias')?.value || [];
    const newValue = currentValue.filter((item: number) => item !== id);
    this.formNuevaActividad.patchValue({ idTipoEvidencias: newValue });
    
    if (newValue.length === 0) {
      this.mostrarDropdownTipoEvidencia.set(true);
    }
  }

  getTiposEvidenciaSeleccionados(): any[] {
    const idsSeleccionados = this.formNuevaActividad.get('idTipoEvidencias')?.value || [];
    return this.tiposEvidencia().filter(tipo => idsSeleccionados.includes(tipo.idTipoEvidencia || tipo.id));
  }

  abrirDropdownTipoEvidencia(): void {
    this.mostrarDropdownTipoEvidencia.set(true);
  }

  isTipoEvidenciaSelected(id: number): boolean {
    const currentValue = this.formNuevaActividad.get('idTipoEvidencias')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  // Métodos para manejar tipos de responsables
  toggleTipoResponsable(tipo: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    const current = this.tiposResponsableSeleccionados();
    
    if (checked) {
      this.tiposResponsableSeleccionados.set([...current, tipo]);
    } else {
      // Si se deselecciona un tipo, limpiar los responsables de ese tipo
      this.tiposResponsableSeleccionados.set(current.filter(t => t !== tipo));
      this.limpiarResponsablesPorTipo(tipo);
    }
  }

  isTipoResponsableSeleccionado(tipo: string): boolean {
    return this.tiposResponsableSeleccionados().includes(tipo);
  }

  limpiarResponsablesPorTipo(tipo: string): void {
    switch (tipo) {
      case 'usuario':
        while (this.usuariosArray.length > 0) {
          this.usuariosArray.removeAt(0);
        }
        break;
      case 'docente':
        while (this.docentesArray.length > 0) {
          this.docentesArray.removeAt(0);
        }
        break;
      case 'estudiante':
        while (this.estudiantesArray.length > 0) {
          this.estudiantesArray.removeAt(0);
        }
        break;
      case 'administrativo':
        while (this.administrativosArray.length > 0) {
          this.administrativosArray.removeAt(0);
        }
        break;
      case 'externo':
        while (this.responsablesExternosArray.length > 0) {
          this.responsablesExternosArray.removeAt(0);
        }
        break;
    }
  }

  tieneAlMenosUnResponsable(): boolean {
    return this.tiposResponsableSeleccionados().length > 0;
  }

  tieneResponsablesCompletos(): boolean {
    const tipos = this.tiposResponsableSeleccionados();
    if (tipos.length === 0) return false;

    for (const tipo of tipos) {
      switch (tipo) {
        case 'usuario':
          if (this.usuariosArray.length === 0) return false;
          for (let i = 0; i < this.usuariosArray.length; i++) {
            const control = this.usuariosArray.at(i);
            if (!control.get('idUsuario')?.value) return false;
          }
          break;
        case 'docente':
          if (this.docentesArray.length === 0) return false;
          for (let i = 0; i < this.docentesArray.length; i++) {
            const control = this.docentesArray.at(i);
            if (!control.get('idPersona')?.value) return false;
          }
          break;
        case 'estudiante':
          if (this.estudiantesArray.length === 0) return false;
          for (let i = 0; i < this.estudiantesArray.length; i++) {
            const control = this.estudiantesArray.at(i);
            if (!control.get('idPersona')?.value || !control.get('idRolResponsable')?.value) return false;
          }
          break;
        case 'administrativo':
          if (this.administrativosArray.length === 0) return false;
          for (let i = 0; i < this.administrativosArray.length; i++) {
            const control = this.administrativosArray.at(i);
            if (!control.get('idPersona')?.value) return false;
          }
          break;
        case 'externo':
          if (this.responsablesExternosArray.length === 0) return false;
          for (let i = 0; i < this.responsablesExternosArray.length; i++) {
            const control = this.responsablesExternosArray.at(i);
            if (!control.get('nombre')?.value || !control.get('institucion')?.value || !control.get('idRolResponsable')?.value) return false;
          }
          break;
      }
    }
    return true;
  }

  hasActividadesSeleccionadas(): boolean {
    const idActividadAnual = this.formNuevaActividad.get('idActividadAnual')?.value || [];
    const idActividadMensual = this.formNuevaActividad.get('idActividadMensualInst')?.value || [];
    
    const actividadesAnuales = Array.isArray(idActividadAnual) ? idActividadAnual : (idActividadAnual ? [idActividadAnual] : []);
    const actividadesMensuales = Array.isArray(idActividadMensual) ? idActividadMensual : (idActividadMensual ? [idActividadMensual] : []);
    
    return actividadesAnuales.length > 0 || actividadesMensuales.length > 0;
  }

  shouldShowCamposAdicionales(): boolean {
    const tieneIndicador = !!(this.formNuevaActividad.get('idIndicador')?.value || this.indicadorSeleccionado());
    const tipo = this.tipoActividadSeleccionado();
    const esNoPlanificada = tipo === 'no-planificada';
    const esPlanificada = tipo === 'planificada' || tipo === 'anual';
    const tieneActividadesSeleccionadas = this.hasActividadesSeleccionadas();
    
    // Mostrar campos si:
    // 1. Es actividad no planificada Y tiene indicador
    // 2. Es actividad planificada Y tiene actividades anuales o mensuales seleccionadas
    return (esNoPlanificada && tieneIndicador) || (esPlanificada && tieneActividadesSeleccionadas);
  }

  /**
   * Convierte hora de formato 12h con AM/PM a formato 24h (HH:mm)
   * Ejemplo: "02:30 PM" -> "14:30"
   */
  // Actualizar horaRealizacion desde los selectores de 12h
  actualizarHoraRealizacion(): void {
    const hora = this.formNuevaActividad.get('horaRealizacionHora')?.value;
    const minuto = this.formNuevaActividad.get('horaRealizacionMinuto')?.value;
    const amPm = this.formNuevaActividad.get('horaRealizacionAmPm')?.value;
    
    if (!hora || !minuto || !amPm) {
      this.formNuevaActividad.patchValue({ horaRealizacion: '' }, { emitEvent: false });
      return;
    }
    
    // Convertir de 12h a 24h
    let horas24 = parseInt(hora, 10);
    
    if (amPm === 'PM' && horas24 !== 12) {
      horas24 = horas24 + 12;
    } else if (amPm === 'AM' && horas24 === 12) {
      horas24 = 0;
    }
    
    const hora24h = `${horas24.toString().padStart(2, '0')}:${minuto}`;
    this.formNuevaActividad.patchValue({ horaRealizacion: hora24h }, { emitEvent: false });
  }

  // Convertir hora de 24h a 12h para los selectores
  convertir24hA12h(hora24h: string): { hora: string; minuto: string; amPm: string } | null {
    if (!hora24h || !hora24h.includes(':')) return null;
    
    const [horas, minutos] = hora24h.split(':');
    const horasNum = parseInt(horas, 10);
    
    if (isNaN(horasNum)) return null;
    
    let horas12 = horasNum;
    let amPm = 'AM';
    
    if (horasNum === 0) {
      horas12 = 12;
    } else if (horasNum === 12) {
      amPm = 'PM';
    } else if (horasNum > 12) {
      horas12 = horasNum - 12;
      amPm = 'PM';
    }
    
    return {
      hora: horas12.toString().padStart(2, '0'),
      minuto: minutos,
      amPm: amPm
    };
  }

  private convertir12hA24h(hora12h: string): string | null {
    if (!hora12h) return null;
    
    // Remover espacios y convertir a mayúsculas
    const hora = hora12h.trim().toUpperCase();
    
    // Buscar AM o PM
    const tieneAM = hora.includes('AM');
    const tienePM = hora.includes('PM');
    
    if (!tieneAM && !tienePM) {
      // Si no tiene AM/PM, asumir que ya está en formato 24h
      return hora;
    }
    
    // Extraer la parte de la hora (sin AM/PM)
    const horaSinAmPm = hora.replace(/AM|PM/g, '').trim();
    
    if (!horaSinAmPm.includes(':')) return null;
    
    const [horasStr, minutos] = horaSinAmPm.split(':');
    const horas = parseInt(horasStr, 10);
    
    if (isNaN(horas) || isNaN(parseInt(minutos, 10))) return null;
    
    let horas24 = horas;
    
    if (tienePM && horas !== 12) {
      horas24 = horas + 12;
    } else if (tieneAM && horas === 12) {
      horas24 = 0;
    }
    
    return `${horas24.toString().padStart(2, '0')}:${minutos}`;
  }

  /**
   * Crea un responsable para la actividad usando el nombre proporcionado
   */
  private crearResponsable(idActividad: number, nombreResponsable: string): void {
    // Obtener responsables existentes para verificar si ya existe uno
    this.responsableService.getByActividad(idActividad).subscribe({
      next: (responsablesExistentes) => {
        // Si ya existe un responsable, actualizarlo en lugar de crear uno nuevo
        if (responsablesExistentes && responsablesExistentes.length > 0) {
          const responsableExistente = responsablesExistentes[0];
          const updateData: any = {
            idActividad: responsableExistente.idActividad, // El backend requiere IdActividad
            idTipoResponsable: responsableExistente.idTipoResponsable || 1, // Mantener el tipo de responsable existente
            rolResponsable: nombreResponsable
          };
          this.responsableService.update(responsableExistente.idActividadResponsable, updateData).subscribe({
            next: () => {
              console.log('✅ Responsable actualizado correctamente');
              this.loadingNuevaActividad.set(false);
              this.cerrarFormNuevaActividad();
              this.loadActividades();
              this.errorNuevaActividad.set(null);
            },
            error: (err) => {
              console.error('Error actualizando responsable:', err);
              this.loadingNuevaActividad.set(false);
              this.cerrarFormNuevaActividad();
              this.loadActividades();
              this.errorNuevaActividad.set(null);
            }
          });
        } else {
          // Crear nuevo responsable
          const responsableData: ActividadResponsableCreate = {
            idActividad: idActividad,
            idTipoResponsable: 1, // Valor por defecto - debería obtenerse del catálogo
            rolResponsable: nombreResponsable,
            fechaAsignacion: new Date().toISOString().split('T')[0] // Fecha actual en formato YYYY-MM-DD
          };
          
          this.responsableService.create(responsableData).subscribe({
            next: () => {
              console.log('✅ Responsable creado correctamente');
              this.loadingNuevaActividad.set(false);
              this.cerrarFormNuevaActividad();
              this.loadActividades();
              this.errorNuevaActividad.set(null);
            },
            error: (err) => {
              console.error('Error creando responsable:', err);
              // Aún así cerrar el formulario y recargar
              this.loadingNuevaActividad.set(false);
              this.cerrarFormNuevaActividad();
              this.loadActividades();
              this.errorNuevaActividad.set(null);
            }
          });
        }
      },
      error: (err) => {
        console.warn('Error obteniendo responsables existentes, intentando crear uno nuevo:', err);
        // Si falla obtener responsables, intentar crear uno nuevo
        const responsableData: ActividadResponsableCreate = {
          idActividad: idActividad,
          idTipoResponsable: 1,
          rolResponsable: nombreResponsable,
          fechaAsignacion: new Date().toISOString().split('T')[0]
        };
        
        this.responsableService.create(responsableData).subscribe({
          next: () => {
            console.log('✅ Responsable creado correctamente');
            this.loadingNuevaActividad.set(false);
            this.cerrarFormNuevaActividad();
            this.loadActividades();
            this.errorNuevaActividad.set(null);
          },
          error: (createErr) => {
            console.error('Error creando responsable:', createErr);
            this.loadingNuevaActividad.set(false);
            this.cerrarFormNuevaActividad();
            this.loadActividades();
            this.errorNuevaActividad.set(null);
          }
        });
      }
    });
  }
}

