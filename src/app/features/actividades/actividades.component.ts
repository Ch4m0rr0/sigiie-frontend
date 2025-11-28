import { Component, inject, OnInit, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ActividadesService } from '../../core/services/actividades.service';
import { PlanificacionService } from '../../core/services/planificacion.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { IndicadorService } from '../../core/services/indicador.service';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import type { Actividad } from '../../core/models/actividad';
import type { Planificacion } from '../../core/models/planificacion';
import type { NivelActividad } from '../../core/models/catalogos-nuevos';
import type { Indicador } from '../../core/models/indicador';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import type { ActividadMensualInst } from '../../core/models/actividad-mensual-inst';
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
  private planificacionService = inject(PlanificacionService);
  private catalogosService = inject(CatalogosService);
  private indicadorService = inject(IndicadorService);
  private actividadAnualService = inject(ActividadAnualService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private elementRef = inject(ElementRef);

  actividades = signal<Actividad[]>([]);
  planificaciones = signal<Planificacion[]>([]);
  nivelesActividad = signal<NivelActividad[]>([]);
  indicadores = signal<Indicador[]>([]);
  actividadesAnuales = signal<ActividadAnual[]>([]);
  actividadesMensualesInst = signal<ActividadMensualInst[]>([]);
  actividadesAnualesFiltradas = signal<ActividadAnual[]>([]);
  actividadesMensualesFiltradas = signal<ActividadMensualInst[]>([]);
  mostrarDropdownActividad = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  // Catálogos para el formulario de actividad
  departamentos = signal<any[]>([]);
  tiposIniciativa = signal<any[]>([]);
  estadosActividad = signal<any[]>([]);
  tiposActividad = signal<any[]>([]);
  areasConocimiento = signal<any[]>([]);
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
  loadingNuevaActividad = signal(false);
  errorNuevaActividad = signal<string | null>(null);
  private cargandoRelaciones = false; // Flag para evitar loops infinitos

  ngOnInit(): void {
    this.initializeFormIndicador();
    this.initializeFormImportarAnio();
    this.initializeFormNuevaActividad();
    this.loadActividadesAnuales();
    this.loadActividadesMensualesInst();
    this.loadActividades();
    this.loadIndicadores();
    this.loadCatalogosParaActividad();
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

    this.catalogosService.getAreasConocimiento().subscribe({
      next: (data) => this.areasConocimiento.set(data),
      error: (err) => console.error('Error loading areas conocimiento:', err)
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

    this.catalogosService.getNivelesActividad().subscribe({
      next: (data) => this.nivelesActividad.set(data),
      error: (err) => console.error('Error loading niveles actividad:', err)
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
    
    this.formNuevaActividad = this.fb.group({
      // Campos básicos de relación
      idIndicador: [null],
      idActividadAnual: [null],
      idActividadMensualInst: [null],
      
      // Campos principales
      nombreActividad: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      objetivo: [''],
      
      // Departamentos
      departamentoResponsableId: [null],
      
      // Fechas
      fechaInicio: [''],
      fechaFin: [''],
      fechaEvento: [''],
      horaRealizacion: [''],
      anio: [currentYear],
      
      // Tipos y categorías
      idTipoIniciativa: [null],
      idEstadoActividad: [null],
      idTipoActividad: [null],
      idArea: [null],
      idTipoDocumento: [null],
      idTipoProtagonista: [null],
      idNivel: [null],
      
      // Ubicación y modalidad
      modalidad: [''],
      idCapacidadInstalada: [null],
      codigoActividad: [''],
      
      // Participantes
      cantidadMaximaParticipantesEstudiantes: [null],
      cantidadParticipantesProyectados: [null],
      
      // Metas y valoraciones
      metaAlcanzada: [null],
      metaCumplimiento: [null],
      valoracionIndicadorEstrategico: [''],
      brechaEstrategica: [''],
      tipoResumenAccion: ['']
    });
    
    // Suscribirse a cambios en el indicador
    this.formNuevaActividad.get('idIndicador')?.valueChanges.subscribe(idIndicador => {
      if (this.cargandoRelaciones) return; // Evitar loops
      
      if (idIndicador) {
        // Limpiar primero las actividades anuales para evitar mostrar actividades de otros indicadores
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.formNuevaActividad.patchValue({
          idActividadAnual: null,
          idActividadMensualInst: null
        }, { emitEvent: false });
        
        // Cargar solo las actividades anuales del indicador seleccionado
        this.cargarActividadesPorIndicador(idIndicador);
      } else {
        // Si se deselecciona el indicador, limpiar los campos relacionados
        this.cargandoRelaciones = true;
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.formNuevaActividad.patchValue({
          idActividadAnual: null,
          idActividadMensualInst: null
        }, { emitEvent: false });
        this.cargandoRelaciones = false;
      }
    });
    
    // Suscribirse a cambios en la actividad anual
    this.formNuevaActividad.get('idActividadAnual')?.valueChanges.subscribe(idActividadAnual => {
      if (this.cargandoRelaciones) return; // Evitar loops
      
      if (idActividadAnual) {
        this.cargarDatosPorActividadAnual(idActividadAnual);
      } else {
        // Si se deselecciona la actividad anual, limpiar los campos relacionados
        this.cargandoRelaciones = true;
        this.actividadesMensualesFiltradas.set([]);
        this.actividadesAnualesFiltradas.set([]);
        this.formNuevaActividad.patchValue({ 
          idActividadMensualInst: null,
          idIndicador: null
        }, { emitEvent: false });
        this.cargandoRelaciones = false;
      }
    });
    
    // Suscribirse a cambios en la actividad mensual
    this.formNuevaActividad.get('idActividadMensualInst')?.valueChanges.subscribe(idActividadMensualInst => {
      if (this.cargandoRelaciones) return; // Evitar loops
      
      if (idActividadMensualInst) {
        this.cargarDatosPorActividadMensual(idActividadMensualInst);
      } else {
        // Si se deselecciona la actividad mensual, limpiar los campos relacionados
        this.cargandoRelaciones = true;
        this.actividadesMensualesFiltradas.set([]);
        this.formNuevaActividad.patchValue({ 
          idActividadAnual: null,
          idIndicador: null
        }, { emitEvent: false });
        this.actividadesAnualesFiltradas.set([]);
        this.cargandoRelaciones = false;
      }
    });
  }

  loadPlanificaciones(): void {
    this.planificacionService.getAll().subscribe({
      next: (data) => this.planificaciones.set(data),
      error: (err) => console.error('Error loading planificaciones:', err)
    });
  }

  loadNivelesActividad(): void {
    this.catalogosService.getNivelesActividad().subscribe({
      next: (data) => this.nivelesActividad.set(data),
      error: (err) => console.error('Error loading niveles actividad:', err)
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
        
        let errorMessage = 'Error al cargar las actividades.';
        
        if (err.status === 500) {
          errorMessage = 'Error interno del servidor. Por favor, contacta al administrador o intenta más tarde.';
        } else if (err.status === 401) {
          errorMessage = 'No estás autenticado. Por favor, inicia sesión nuevamente.';
        } else if (err.status === 403) {
          errorMessage = 'No tienes permisos para ver las actividades.';
        } else if (err.status === 404) {
          errorMessage = 'El servicio de actividades no está disponible.';
        } else if (err.status === 0) {
          errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
        } else if (err.error?.message) {
          errorMessage = `Error: ${err.error.message}`;
        }
        
        this.error.set(errorMessage);
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
  }

  toggleDropdownIndicadorForm(): void {
    this.mostrarDropdownIndicadorForm.set(!this.mostrarDropdownIndicadorForm());
  }

  seleccionarIndicadorForm(idIndicador: number | null): void {
    this.formNuevaActividad.patchValue({ idIndicador });
    this.mostrarDropdownIndicadorForm.set(false);
    // El valueChanges del formulario se encargará de cargar las actividades relacionadas
  }

  cargarActividadesPorIndicador(idIndicador: number): void {
    if (this.cargandoRelaciones) return; // Evitar loops
    
    this.cargandoRelaciones = true;
    
    // Limpiar primero para evitar mostrar actividades de otros indicadores
    this.actividadesAnualesFiltradas.set([]);
    this.actividadesMensualesFiltradas.set([]);
    this.formNuevaActividad.patchValue({ 
      idActividadAnual: null,
      idActividadMensualInst: null 
    }, { emitEvent: false });
    
    // Cargar actividades anuales relacionadas al indicador
    this.actividadAnualService.getByIndicador(idIndicador).subscribe({
      next: (actividadesAnuales) => {
        // Solo establecer las actividades anuales del indicador seleccionado
        const actividadesFiltradas = (actividadesAnuales || []).filter(a => a.idIndicador === idIndicador);
        this.actividadesAnualesFiltradas.set(actividadesFiltradas);
        
        if (actividadesFiltradas.length > 0) {
          // Auto-seleccionar la primera actividad anual
          const primeraAnual = actividadesFiltradas[0];
          this.formNuevaActividad.patchValue({ idActividadAnual: primeraAnual.idActividadAnual }, { emitEvent: false });
          
          // Cargar actividades mensuales relacionadas a la actividad anual
          if (primeraAnual.idActividadAnual) {
            this.cargarActividadesMensualesPorAnual(primeraAnual.idActividadAnual);
          } else {
            this.cargandoRelaciones = false;
          }
        } else {
          // Si no hay actividades anuales, limpiar la selección y las mensuales
          this.actividadesMensualesFiltradas.set([]);
          this.cargandoRelaciones = false;
        }
      },
      error: (err) => {
        console.error('Error cargando actividades anuales:', err);
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.formNuevaActividad.patchValue({ 
          idActividadAnual: null,
          idActividadMensualInst: null 
        }, { emitEvent: false });
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
          if (actividadMensual.idActividadAnual && actividadAnualActual !== actividadMensual.idActividadAnual) {
            this.formNuevaActividad.patchValue({ idActividadAnual: actividadMensual.idActividadAnual }, { emitEvent: false });
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
    // Limpiar primero las actividades mensuales para evitar mostrar actividades de otras anuales
    this.actividadesMensualesFiltradas.set([]);
    this.formNuevaActividad.patchValue({ idActividadMensualInst: null }, { emitEvent: false });
    
    this.actividadMensualInstService.getByActividadAnual(idActividadAnual).subscribe({
      next: (actividadesMensuales) => {
        // Solo establecer las actividades mensuales relacionadas a la actividad anual seleccionada
        const actividadesFiltradas = (actividadesMensuales || []).filter(m => m.idActividadAnual === idActividadAnual);
        this.actividadesMensualesFiltradas.set(actividadesFiltradas);
        
        if (actividadesFiltradas.length > 0) {
          // Auto-seleccionar la primera actividad mensual
          const primeraMensual = actividadesFiltradas[0];
          this.formNuevaActividad.patchValue({ idActividadMensualInst: primeraMensual.idActividadMensualInst }, { emitEvent: false });
        }
        
        this.cargandoRelaciones = false;
      },
      error: (err) => {
        console.error('Error cargando actividades mensuales:', err);
        this.actividadesMensualesFiltradas.set([]);
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
      const actividadAnualId = formValue.idActividadAnual;
      const actividadMensualId = formValue.idActividadMensualInst;

      // Si se han seleccionado actividad anual y mensual, crear la actividad directamente
      if (actividadAnualId && actividadMensualId) {
        const actividadData: any = {
          nombreActividad: formValue.nombreActividad || '',
          descripcion: formValue.descripcion || null,
          objetivo: formValue.objetivo || null,
          departamentoResponsableId: formValue.departamentoResponsableId || null,
          fechaInicio: formValue.fechaInicio || null,
          fechaFin: formValue.fechaFin || null,
          fechaEvento: formValue.fechaEvento || null,
          horaRealizacion: formValue.horaRealizacion ? `${formValue.horaRealizacion}:00` : null,
          anio: formValue.anio ? Number(formValue.anio) : new Date().getFullYear(),
          modalidad: formValue.modalidad || null,
          idCapacidadInstalada: formValue.idCapacidadInstalada || null,
          codigoActividad: formValue.codigoActividad || null,
          idTipoIniciativa: formValue.idTipoIniciativa || null,
          idEstadoActividad: formValue.idEstadoActividad || null,
          idTipoActividad: formValue.idTipoActividad || null,
          idArea: formValue.idArea || null,
          idTipoDocumento: formValue.idTipoDocumento || null,
          idTipoProtagonista: formValue.idTipoProtagonista || null,
          idNivel: formValue.idNivel || null,
          cantidadMaximaParticipantesEstudiantes: formValue.cantidadMaximaParticipantesEstudiantes ? Number(formValue.cantidadMaximaParticipantesEstudiantes) : null,
          cantidadParticipantesProyectados: formValue.cantidadParticipantesProyectados ? Number(formValue.cantidadParticipantesProyectados) : null,
          metaAlcanzada: formValue.metaAlcanzada ? Number(formValue.metaAlcanzada) : null,
          metaCumplimiento: formValue.metaCumplimiento ? Number(formValue.metaCumplimiento) : null,
          valoracionIndicadorEstrategico: formValue.valoracionIndicadorEstrategico || null,
          brechaEstrategica: formValue.brechaEstrategica || null,
          tipoResumenAccion: formValue.tipoResumenAccion || null,
          esPlanificada: true,
          idIndicador: indicadorId || null,
          idActividadAnual: actividadAnualId,
          idActividadMensualInst: actividadMensualId
        };

        // Limpiar campos null/undefined/empty
        Object.keys(actividadData).forEach(key => {
          if (actividadData[key] === '' || actividadData[key] === undefined) {
            actividadData[key] = null;
          }
        });

        this.actividadesService.create(actividadData).subscribe({
          next: (actividad) => {
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
        return;
      }

      // Si no se han seleccionado ambas, mantener el comportamiento anterior (navegar)
      if (tipo === 'anual') {
        // Para actividad anual, navegar a crear actividad anual
        if (actividadMensualId) {
          this.router.navigate(['/actividades-mensuales/nueva'], {
            queryParams: { 
              idIndicador: indicadorId,
              idActividadAnual: actividadAnualId,
              idActividadMensualInst: actividadMensualId
            }
          });
        } else if (actividadAnualId) {
          // Si solo tiene actividad anual, navegar a crear actividad anual
          this.router.navigate(['/actividades-anuales/nueva'], {
            queryParams: { 
              idIndicador: indicadorId,
              idActividadAnual: actividadAnualId
            }
          });
        } else {
          // Si solo tiene indicador, navegar a crear actividad anual
          this.router.navigate(['/actividades-anuales/nueva'], {
            queryParams: { idIndicador: indicadorId }
          });
        }
      } else {
        // Para actividad no planificada, navegar a crear actividad normal
        const queryParams: any = {};
        if (indicadorId) queryParams.idIndicador = indicadorId;
        if (actividadAnualId) queryParams.idActividadAnual = actividadAnualId;
        if (actividadMensualId) queryParams.idActividadMensualInst = actividadMensualId;

        this.router.navigate(['/actividades/nueva'], { queryParams });
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
}
