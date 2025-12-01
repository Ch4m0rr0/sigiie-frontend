import { Component, inject, OnInit, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ActividadesService } from '../../core/services/actividades.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { IndicadorService } from '../../core/services/indicador.service';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import { ActividadResponsableService, type ActividadResponsableCreate } from '../../core/services/actividad-responsable.service';
import { PersonasService } from '../../core/services/personas.service';
import type { Actividad } from '../../core/models/actividad';
import type { Indicador } from '../../core/models/indicador';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import type { ActividadMensualInst } from '../../core/models/actividad-mensual-inst';
import type { Docente } from '../../core/models/docente';
import type { Estudiante } from '../../core/models/estudiante';
import type { Administrativo } from '../../core/models/administrativo';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-list-actividades',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, IconComponent, ...BrnButtonImports],
  templateUrl: './actividades.component.html',
})
export class ListActividadesComponent implements OnInit {
  private actividadesService = inject(ActividadesService);
  private catalogosService = inject(CatalogosService);
  private indicadorService = inject(IndicadorService);
  private actividadAnualService = inject(ActividadAnualService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private responsableService = inject(ActividadResponsableService);
  private personasService = inject(PersonasService);
  private router = inject(Router);
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

  // Catálogos para el formulario de actividad
  departamentos = signal<any[]>([]);
  tiposIniciativa = signal<any[]>([]);
  estadosActividad = signal<any[]>([]);
  tiposActividad = signal<any[]>([]);
  tiposDocumento = signal<any[]>([]);
  tiposProtagonista = signal<any[]>([]);
  capacidadesInstaladas = signal<any[]>([]);

  // Filtros
  filtroActivo = signal<boolean | null>(null);
  filtroActividadAnual = signal<number | null>(null);
  filtroActividadMensualInst = signal<number | null>(null);

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
  tipoActividadSeleccionado = signal<'anual' | 'no-planificada' | null>(null);
  mostrarFormNuevaActividad = signal(false);
  mostrarDropdownIndicadorForm = signal(false);
  mostrarDropdownTipoActividad = signal(false);
  mostrarDropdownActividadAnual = signal(true); // Controla si se muestra el dropdown de actividades anuales
  mostrarDropdownActividadMensual = signal(true); // Controla si se muestra el dropdown de actividades mensuales
  mostrarDropdownDepartamentoResponsable = signal(true); // Controla si se muestra el dropdown de departamentos responsables
  mostrarDropdownTipoActividadSelect = signal(true); // Controla si se muestra el dropdown de tipos de actividad
  mostrarDropdownProtagonista = signal(true); // Controla si se muestra el dropdown de protagonistas
  loadingNuevaActividad = signal(false);
  errorNuevaActividad = signal<string | null>(null);
  private cargandoRelaciones = false; // Flag para evitar loops infinitos

  // Formulario de responsables
  formResponsable!: FormGroup;
  docentes = signal<Docente[]>([]);
  estudiantes = signal<Estudiante[]>([]);
  administrativos = signal<Administrativo[]>([]);
  loadingResponsables = signal(false);

  ngOnInit(): void {
    this.initializeFormIndicador();
    this.initializeFormImportarAnio();
    this.initializeFormNuevaActividad();
    this.initializeFormResponsable();
    // Cargar todos los datos en paralelo para mejorar el rendimiento
    this.loadAllDataInParallel();
  }

  /**
   * Carga todos los datos necesarios en paralelo usando forkJoin
   * Esto reduce significativamente el tiempo de carga
   * Si alguna llamada falla, las demás continúan ejecutándose
   */
  loadAllDataInParallel(): void {
    this.loading.set(true);
    
    // Helper para manejar errores individuales sin detener las demás llamadas
    const handleError = (error: any, defaultValue: any[] = []) => {
      console.error('Error en carga paralela:', error);
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
        catchError(err => handleError(err, []))
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
        this.estadosActividad.set(results.catalogos.estadosActividad);
        this.tiposActividad.set(results.catalogos.tiposActividad);
        this.tiposDocumento.set(results.catalogos.tiposDocumento);
        this.tiposProtagonista.set(results.catalogos.tiposProtagonista);
        this.capacidadesInstaladas.set(results.catalogos.capacidadesInstaladas);
        
        // Asignar datos principales
        this.actividadesAnuales.set(results.datos.actividadesAnuales);
        this.actividadesMensualesInst.set(results.datos.actividadesMensualesInst);
        this.indicadores.set(results.datos.indicadores);
        
        // Ahora cargar actividades (puede ser más lento, así que lo hacemos después)
        this.loadActividades();
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
      next: (data) => this.estadosActividad.set(data),
      error: (err) => console.error('Error loading estados actividad:', err)
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
      idIndicador: [null, Validators.required], // Obligatorio para actividad no planificada
      idActividadAnual: [[]], // Array para múltiples selecciones (opcional)
      idActividadMensualInst: [[]], // Array para múltiples selecciones (opcional)
      
      // Campos principales
      nombreActividad: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      objetivo: [''],
      
      // Fechas
      fechaInicio: [''],
      fechaFin: [''],
      horaRealizacion: [''],
      anio: [''], // No cargar automáticamente el año
      
      // Tipos y categorías
      idEstadoActividad: [null],
      idTipoActividad: [[]], // Array para múltiples selecciones
      idTipoProtagonista: [[]], // Array para múltiples selecciones
      departamentoResponsableId: [[]], // Array para múltiples selecciones
      
      // Ubicación y modalidad
      modalidad: [''],
      idCapacidadInstalada: [null],
      
      // Participantes
      cantidadParticipantesProyectados: [null, Validators.required], // Obligatorio
      cantidadParticipantesEstudiantesProyectados: [null], // Campo local, no obligatorio
      
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
  }


  loadActividadesAnuales(): void {
    this.actividadAnualService.getAll().subscribe({
      next: (data) => this.actividadesAnuales.set(data),
      error: (err) => console.error('Error loading actividades anuales:', err)
    });
  }

  loadActividadesMensualesInst(): void {
    this.actividadMensualInstService.getAll().subscribe({
      next: (data) => this.actividadesMensualesInst.set(data),
      error: (err) => console.error('Error loading actividades mensuales institucionales:', err)
    });
  }

  loadActividades(): void {
    this.loading.set(true);
    this.error.set(null);

    // Usar GetAllAsync() - sin filtros del backend, filtramos en el cliente
    this.actividadesService.getAll().subscribe({
      next: (data) => {
        // Aplicar filtros del lado del cliente
        let filtered = data;
        
        if (this.filtroActivo() !== null) {
          filtered = filtered.filter(a => a.activo === this.filtroActivo()!);
        }
        
        // Filtrar por actividad mensual institucional
        if (this.filtroActividadMensualInst()) {
          filtered = filtered.filter(a => a.idActividadMensualInst === this.filtroActividadMensualInst()!);
        }
        
        // Filtrar por actividad anual (a través de actividad mensual institucional)
        if (this.filtroActividadAnual()) {
          // Crear un mapa de idActividadMensualInst -> idActividadAnual
          const mensualesInst = this.actividadesMensualesInst();
          const mensualesPorAnual = mensualesInst
            .filter(m => m.idActividadAnual === this.filtroActividadAnual()!)
            .map(m => m.idActividadMensualInst);
          
          filtered = filtered.filter(a => 
            a.idActividadMensualInst && mensualesPorAnual.includes(a.idActividadMensualInst)
          );
        }
        
        console.log('✅ Actividades cargadas:', filtered.length);
        this.actividades.set(filtered);
        this.loading.set(false);
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
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.mostrarDropdownActividad.set(false);
      this.mostrarDropdownIndicadorForm.set(false);
      this.mostrarDropdownIndicadorSeleccionado.set(false);
      this.mostrarDropdownTipoActividad.set(false);
    }
  }

  toggleDropdownActividad(): void {
    // Verificar que haya un indicador seleccionado
    if (!this.indicadorSeleccionado()) {
      this.errorNuevaActividad.set('Por favor, seleccione un indicador antes de crear una nueva actividad.');
      return;
    }
    
    // Si hay indicador seleccionado, mostrar el dropdown de tipo de actividad
    this.mostrarDropdownTipoActividad.set(!this.mostrarDropdownTipoActividad());
    this.mostrarDropdownActividad.set(false);
  }

  toggleDropdownIndicadorSeleccionado(): void {
    this.mostrarDropdownIndicadorSeleccionado.set(!this.mostrarDropdownIndicadorSeleccionado());
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

  seleccionarTipoActividad(tipo: 'anual' | 'no-planificada'): void {
    // Verificar que haya un indicador seleccionado
    if (!this.indicadorSeleccionado()) {
      this.errorNuevaActividad.set('Por favor, seleccione un indicador antes de crear una nueva actividad.');
      this.mostrarDropdownTipoActividad.set(false);
      return;
    }

    this.tipoActividadSeleccionado.set(tipo);
    this.mostrarDropdownTipoActividad.set(false);
    this.mostrarFormNuevaActividad.set(true);
    this.errorNuevaActividad.set(null);
    
    // Reiniciar el formulario
    this.initializeFormNuevaActividad();
    
    // Asegurarse de que las listas filtradas estén vacías inicialmente
    this.actividadesAnualesFiltradas.set([]);
    this.actividadesMensualesFiltradas.set([]);
    
    // Establecer el indicador seleccionado automáticamente
    const indicadorId = this.indicadorSeleccionado();
    this.formNuevaActividad.patchValue({ idIndicador: indicadorId }, { emitEvent: false });
    
    // Cargar las actividades anuales del indicador seleccionado
    if (indicadorId) {
      this.cargarActividadesPorIndicador(indicadorId);
    }
    
    // Ningún campo es requerido - todos son opcionales y se cargan automáticamente
    this.formNuevaActividad.get('idIndicador')?.clearValidators();
    this.formNuevaActividad.get('idActividadAnual')?.clearValidators();
    this.formNuevaActividad.get('idActividadMensualInst')?.clearValidators();
    
    this.formNuevaActividad.updateValueAndValidity();
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
  
  // ========== MÉTODOS PARA FORMULARIO DE RESPONSABLES ==========
  
  initializeFormResponsable(): void {
    this.formResponsable = this.fb.group({
      docentes: this.fb.array([]),
      estudiantes: this.fb.array([]),
      administrativos: this.fb.array([]),
      fechaAsignacion: [new Date().toISOString().split('T')[0]]
    });
    
    // Cargar todas las personas al inicializar
    this.loadTodasLasPersonas();
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
  
  crearPersonaFormGroup(tipo: 'docente' | 'estudiante' | 'administrativo'): FormGroup {
    return this.fb.group({
      idPersona: [null, Validators.required],
      rolResponsable: ['']
    });
  }
  
  agregarPersona(tipo: 'docente' | 'estudiante' | 'administrativo'): void {
    const array = tipo === 'docente' ? this.docentesArray : 
                  tipo === 'estudiante' ? this.estudiantesArray : 
                  this.administrativosArray;
    array.push(this.crearPersonaFormGroup(tipo));
  }
  
  eliminarPersona(tipo: 'docente' | 'estudiante' | 'administrativo', index: number): void {
    const array = tipo === 'docente' ? this.docentesArray : 
                  tipo === 'estudiante' ? this.estudiantesArray : 
                  this.administrativosArray;
    array.removeAt(index);
  }
  
  getPersonasDisponiblesPorTipo(tipo: 'docente' | 'estudiante' | 'administrativo'): any[] {
    if (tipo === 'docente') {
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
  
  resetFormResponsable(): void {
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
    this.formNuevaActividad.patchValue({ idIndicador });
    this.mostrarDropdownIndicadorForm.set(false);
    // El valueChanges del formulario se encargará de cargar las actividades relacionadas
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
        const actividadData: any = {
          nombreActividad: formValue.nombreActividad || '',
          descripcion: formValue.descripcion || null,
          objetivo: formValue.objetivo || null,
          departamentoResponsableId: Array.isArray(formValue.departamentoResponsableId) && formValue.departamentoResponsableId.length > 0 ? formValue.departamentoResponsableId[0] : (formValue.departamentoResponsableId || null),
          fechaInicio: formValue.fechaInicio || null,
          fechaFin: formValue.fechaFin || null,
          horaRealizacion: formValue.horaRealizacion ? (() => {
            // El input type="time" ya devuelve formato 24h (HH:mm)
            // Solo necesitamos agregar los segundos si no los tiene
            const hora = formValue.horaRealizacion.trim();
            if (hora.includes(':') && hora.split(':').length === 2) {
              return `${hora}:00`; // Agregar segundos para formato HH:mm:ss
            }
            return hora.includes(':') ? hora : null;
          })() : null,
          anio: formValue.anio ? String(formValue.anio) : String(new Date().getFullYear()),
          modalidad: formValue.modalidad || null,
          idCapacidadInstalada: formValue.idCapacidadInstalada || null,
          idEstadoActividad: formValue.idEstadoActividad || null,
          idTipoActividad: Array.isArray(formValue.idTipoActividad) && formValue.idTipoActividad.length > 0 ? formValue.idTipoActividad : (formValue.idTipoActividad || null),
          idTipoProtagonista: Array.isArray(formValue.idTipoProtagonista) && formValue.idTipoProtagonista.length > 0 ? formValue.idTipoProtagonista[0] : (formValue.idTipoProtagonista || null),
          cantidadParticipantesProyectados: formValue.cantidadParticipantesProyectados ? Number(formValue.cantidadParticipantesProyectados) : null,
          cantidadParticipantesEstudiantesProyectados: formValue.cantidadParticipantesEstudiantesProyectados ? Number(formValue.cantidadParticipantesEstudiantesProyectados) : null,
          esPlanificada: tipo === 'anual', // true para actividad planificada, false para no planificada
          idIndicador: indicadorId,
          idActividadAnual: Array.isArray(actividadAnualId) && actividadAnualId.length > 0 ? actividadAnualId[0] : (actividadAnualId || null),
          idActividadMensualInst: Array.isArray(actividadMensualId) && actividadMensualId.length > 0 ? actividadMensualId[0] : (actividadMensualId || null)
        };

        // Limpiar campos null/undefined/empty
        Object.keys(actividadData).forEach(key => {
          if (actividadData[key] === '' || actividadData[key] === undefined) {
            actividadData[key] = null;
          }
        });

        this.actividadesService.create(actividadData).subscribe({
          next: (actividad) => {
            // Crear responsables si hay alguno en el formulario
            if (actividad.id) {
              this.crearResponsablesParaActividad(actividad.id);
            }
            
            this.loadingNuevaActividad.set(false);
            this.cerrarFormNuevaActividad();
            this.loadActividades(); // Recargar la lista
            this.errorNuevaActividad.set(null);
          },
          error: (err) => {
            this.loadingNuevaActividad.set(false);
            let errorMessage = 'Error al crear la actividad.';
            if (err.error?.message) {
              errorMessage = err.error.message;
            } else if (err.error?.errors) {
              const errors = Object.values(err.error.errors).flat();
              errorMessage = errors.join('\n');
            } else if (err.message) {
              errorMessage = err.message;
            }
            this.errorNuevaActividad.set(errorMessage);
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

  crearNuevaActividadAnual(): void {
    const indicadorId = this.formNuevaActividad.get('idIndicador')?.value || this.indicadorSeleccionado();
    if (!indicadorId) {
      this.errorNuevaActividad.set('Por favor, seleccione un indicador antes de crear una nueva actividad anual.');
      return;
    }
    
    // Navegar a crear actividad anual con el indicador seleccionado
    this.router.navigate(['/actividades-anuales/nueva'], {
      queryParams: { idIndicador: indicadorId }
    });
  }


  onFiltroChange(): void {
    this.loadActividades();
  }

  clearFilters(): void {
    this.filtroActivo.set(null);
    this.filtroActividadAnual.set(null);
    this.filtroActividadMensualInst.set(null);
    this.error.set(null);
    this.showRetryButton = false;
    this.loadActividades();
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

  hasActividadesSeleccionadas(): boolean {
    const idActividadAnual = this.formNuevaActividad.get('idActividadAnual')?.value || [];
    const idActividadMensual = this.formNuevaActividad.get('idActividadMensualInst')?.value || [];
    
    const actividadesAnuales = Array.isArray(idActividadAnual) ? idActividadAnual : (idActividadAnual ? [idActividadAnual] : []);
    const actividadesMensuales = Array.isArray(idActividadMensual) ? idActividadMensual : (idActividadMensual ? [idActividadMensual] : []);
    
    return actividadesAnuales.length > 0 || actividadesMensuales.length > 0;
  }

  shouldShowCamposAdicionales(): boolean {
    const tieneIndicador = !!(this.formNuevaActividad.get('idIndicador')?.value || this.indicadorSeleccionado());
    const esNoPlanificada = this.tipoActividadSeleccionado() === 'no-planificada';
    const esPlanificada = this.tipoActividadSeleccionado() === 'anual';
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
