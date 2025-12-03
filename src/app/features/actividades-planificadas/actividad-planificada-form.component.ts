import { Component, inject, OnInit, OnDestroy, signal, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActividadesService } from '../../core/services/actividades.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { ActividadCreate } from '../../core/models/actividad';
import type { Departamento } from '../../core/models/departamento';
import type { CategoriaActividad } from '../../core/models/categoria-actividad';
import type { EstadoActividad } from '../../core/models/estado-actividad';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import type { ActividadMensualInst } from '../../core/models/actividad-mensual-inst';
import { IndicadorService } from '../../core/services/indicador.service';
import type { Indicador } from '../../core/models/indicador';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import { ActividadResponsableService, type ActividadResponsableCreate } from '../../core/services/actividad-responsable.service';
import { PersonasService } from '../../core/services/personas.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import type { Docente } from '../../core/models/docente';
import type { Estudiante } from '../../core/models/estudiante';
import type { Administrativo } from '../../core/models/administrativo';
import type { Usuario } from '../../core/models/usuario';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';
import { AlertService } from '../../core/services/alert.service';
import { forkJoin } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-actividad-planificada-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './actividad-planificada-form.component.html',
})
export class ActividadPlanificadaFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private actividadesService = inject(ActividadesService);
  private catalogosService = inject(CatalogosService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private indicadorService = inject(IndicadorService);
  private actividadAnualService = inject(ActividadAnualService);
  private responsableService = inject(ActividadResponsableService);
  private personasService = inject(PersonasService);
  private usuariosService = inject(UsuariosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private alertService = inject(AlertService);

  form!: FormGroup;
  departamentos = signal<Departamento[]>([]);
  categoriasActividad = signal<CategoriaActividad[]>([]);
  estadosActividad = signal<EstadoActividad[]>([]);
  actividadesMensualesInst = signal<ActividadMensualInst[]>([]);
  indicadores = signal<Indicador[]>([]);
  actividadesAnuales = signal<ActividadAnual[]>([]);
  actividadesAnualesFiltradas = signal<ActividadAnual[]>([]);
  actividadesMensualesFiltradas = signal<ActividadMensualInst[]>([]);
  tiposProtagonista = signal<any[]>([]);
  capacidadesInstaladas = signal<any[]>([]);
  isEditMode = signal(false);
  actividadId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  private cargandoRelaciones = false;
  private actividadesAnualesAnteriores: number[] = [];
  private formStateKey = 'actividad-planificada-form-state';
  private formSubscription: any;
  private isCancelling = false; // Bandera para evitar guardar estado al cancelar
  mostrarDropdownAnuales = signal(true);
  mostrarDropdownMensuales = signal(true);
  mostrarDropdownActividadAnual = signal(true);
  mostrarDropdownActividadMensual = signal(true);
  mostrarDropdownTipoEvidencia = signal(true);
  mostrarDropdownDepartamentos = signal(true);
  mostrarDropdownTipoActividad = signal(true);
  mostrarDropdownProtagonista = signal(true);
  mostrarDropdownEstadoActividad = signal(true);
  mostrarDropdownModalidad = signal(true);
  mostrarDropdownLocal = signal(true);
  
  // Acordeones para secciones del formulario
  seccionPlanificacionExpandida = signal(false);
  seccionInformacionExpandida = signal(false);
  seccionResponsablesExpandida = signal(false);
  localSeleccionado = signal<any>(null);
  
  // Tipos de evidencia
  tiposEvidencia = signal<any[]>([]);
  
  // Responsables
  formResponsable!: FormGroup;
  usuarios = signal<Usuario[]>([]);
  docentes = signal<Docente[]>([]);
  estudiantes = signal<Estudiante[]>([]);
  administrativos = signal<Administrativo[]>([]);
  rolesResponsable = signal<any[]>([]);
  tiposResponsableSeleccionados = signal<string[]>([]);

  indicadorIdFromQuery = signal<number | null>(null);

  ngOnInit(): void {
    this.initializeForm();
    this.loadDepartamentos();
    this.loadCategoriasActividad();
    this.loadEstadosActividad();
    this.loadActividadesMensualesInst();
    this.loadIndicadores();
    this.loadActividadesAnuales();
    this.loadTiposProtagonista();
    this.loadCapacidadesInstaladas();
    this.loadTiposEvidencia();
    this.initializeFormResponsable();
    this.loadTodasLasPersonas();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.actividadId.set(+id);
      this.loadActividad(+id);
    }

    const idIndicador = this.route.snapshot.queryParams['idIndicador'];
    if (idIndicador) {
      this.indicadorIdFromQuery.set(+idIndicador);
    }

    // Suscribirse a cambios del formulario para guardar automáticamente (solo después de inicializar)
    if (!this.isEditMode()) {
      // Esperar a que todo esté cargado antes de restaurar
      // Usar un delay más largo para asegurar que todos los datos estén listos
      setTimeout(() => {
        this.restoreFormState();
        // Configurar auto-guardado después de restaurar
        this.setupFormAutoSave();
      }, 500);
    } else {
      this.setupFormAutoSave();
    }
  }

  ngOnDestroy(): void {
    // Guardar estado antes de destruir el componente (cuando el usuario navega)
    // Solo si no se está cancelando explícitamente
    if (!this.isEditMode() && this.form && !this.isCancelling) {
      this.saveFormState();
    }
    
    // Limpiar suscripción
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: BeforeUnloadEvent): void {
    // Guardar estado antes de cerrar la página
    if (!this.isEditMode() && this.form) {
      this.saveFormState();
    }
  }

  initializeForm(): void {
    const currentYear = new Date().getFullYear();
    this.form = this.fb.group({
      nombre: [''], // No requerido en el formulario principal, solo se usa en responsables
      nombreActividad: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      departamentoId: [null],
      departamentoResponsableId: [[]],
      fechaInicio: [''],
      fechaFin: [''],
      soporteDocumentoUrl: [null],
      idEstadoActividad: [null],
      idTipoActividad: [[]],
      modalidad: [''],
      idCapacidadInstalada: [null],
      semanaMes: [null],
      codigoActividad: [''],
      idActividadMensualInst: [[]], // Array para múltiples selecciones
      esPlanificada: [true], // Siempre true para actividades planificadas
      idIndicador: [null],
      idActividadAnual: [[]],
      objetivo: [''],
      cantidadParticipantesProyectados: [null, Validators.required],
      cantidadParticipantesEstudiantesProyectados: [null],
      cantidadTotalParticipantesProtagonistas: [null],
      idTipoEvidencias: [[]],
      anio: [String(new Date().getFullYear())],
      horaInicioPrevista: [''],
      horaRealizacion: [''],
      idTipoProtagonista: [[]],
      responsableActividad: [''],
      categoriaActividadId: [null],
      tipoUnidadId: [null],
      areaConocimientoId: [null],
      ubicacion: [''],
      activo: [true]
    });

    this.form.get('nombreActividad')?.valueChanges.subscribe(value => {
      if (value && this.form.get('nombre')?.value !== value) {
        this.form.patchValue({ nombre: value }, { emitEvent: false });
      }
    });

    this.form.get('nombre')?.valueChanges.subscribe(value => {
      if (value && this.form.get('nombreActividad')?.value !== value) {
        this.form.patchValue({ nombreActividad: value }, { emitEvent: false });
      }
    });

    // Suscripción para detectar cambios en idCapacidadInstalada y actualizar el template
    this.form.get('idCapacidadInstalada')?.valueChanges.subscribe((id) => {
      if (id !== null && id !== undefined) {
        const capacidades = this.capacidadesInstaladas();
        const local = capacidades.find(c => {
          const capacidadId = Number(c.id);
          const searchId = Number(id);
          return capacidadId === searchId;
        });
        if (local) {
          this.localSeleccionado.set(local);
        } else {
          // Si no se encuentra, intentar después de un breve delay
          setTimeout(() => {
            const localEncontrado = this.capacidadesInstaladas().find(c => Number(c.id) === Number(id));
            if (localEncontrado) {
              this.localSeleccionado.set(localEncontrado);
              this.cdr.detectChanges();
            }
          }, 100);
        }
      } else {
        this.localSeleccionado.set(null);
      }
      this.cdr.detectChanges();
    });

    this.form.get('idIndicador')?.valueChanges.subscribe(idIndicador => {
      if (this.cargandoRelaciones) return;
      
      if (idIndicador) {
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({
          idActividadAnual: [],
          idActividadMensualInst: []
        }, { emitEvent: false });
        
        this.cargarActividadesPorIndicador(idIndicador, false);
      } else {
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({
          idActividadAnual: [],
          idActividadMensualInst: []
        }, { emitEvent: false });
      }
    });

    this.form.get('idActividadAnual')?.valueChanges.subscribe(idActividadAnual => {
      if (this.cargandoRelaciones) return;
      
      const actividadesAnuales = Array.isArray(idActividadAnual) ? idActividadAnual : (idActividadAnual ? [idActividadAnual] : []);
      
      // Detectar qué actividad anual se agregó o eliminó
      const actividadesAgregadas = actividadesAnuales.filter(id => !this.actividadesAnualesAnteriores.includes(id));
      const actividadesEliminadas = this.actividadesAnualesAnteriores.filter(id => !actividadesAnuales.includes(id));
      
      // Si se agregó una actividad anual, cargar solo sus actividades mensuales
      if (actividadesAgregadas.length > 0) {
        actividadesAgregadas.forEach(idAnual => {
          this.actividadMensualInstService.getByActividadAnual(idAnual).subscribe({
            next: (actividadesMensuales) => {
              const actividadesFiltradas = (actividadesMensuales || []).filter(m => m.idActividadAnual === idAnual);
              // Agregar las nuevas actividades mensuales a la lista existente
              const mensualesActuales = this.actividadesMensualesFiltradas();
              const todasLasMensuales = [...mensualesActuales, ...actividadesFiltradas];
              // Eliminar duplicados
              const mensualesUnicas = todasLasMensuales.filter((mensual, index, self) =>
                index === self.findIndex(m => m.idActividadMensualInst === mensual.idActividadMensualInst)
              );
              this.actividadesMensualesFiltradas.set(mensualesUnicas);
            },
            error: (err) => {
              console.error('Error cargando actividades mensuales:', err);
            }
          });
        });
      }
      
      // Si se eliminó una actividad anual, eliminar sus actividades mensuales
      if (actividadesEliminadas.length > 0) {
        const mensualesActuales = this.actividadesMensualesFiltradas();
        const mensualesFiltradas = mensualesActuales.filter(m => 
          !actividadesEliminadas.includes(m.idActividadAnual)
        );
        this.actividadesMensualesFiltradas.set(mensualesFiltradas);
        
        // Limpiar selecciones de actividades mensuales que ya no están disponibles
        const idMensualesActuales = this.form.get('idActividadMensualInst')?.value || [];
        const idMensualesValidos = Array.isArray(idMensualesActuales) 
          ? idMensualesActuales.filter(id => mensualesFiltradas.find(m => m.idActividadMensualInst === id))
          : [];
        this.form.patchValue({ idActividadMensualInst: idMensualesValidos }, { emitEvent: false });
      }
      
      // Si no hay actividades anuales seleccionadas, limpiar todo
      if (actividadesAnuales.length === 0) {
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({ idActividadMensualInst: [] }, { emitEvent: false });
      }
      
      // Actualizar el valor anterior
      this.actividadesAnualesAnteriores = [...actividadesAnuales];
    });
  }

  loadDepartamentos(): void {
    this.catalogosService.getDepartamentos().subscribe({
      next: (data) => this.departamentos.set(data),
      error: (err) => console.error('Error loading departamentos:', err)
    });
  }

  loadCategoriasActividad(): void {
    this.catalogosService.getCategoriasActividad().subscribe({
      next: (data) => this.categoriasActividad.set(data),
      error: (err) => console.error('Error loading categorias actividad:', err)
    });
  }

  loadEstadosActividad(): void {
    this.catalogosService.getEstadosActividad().subscribe({
      next: (data) => this.estadosActividad.set(data),
      error: (err) => console.error('Error loading estados actividad:', err)
    });
  }

  loadActividadesMensualesInst(): void {
    this.actividadMensualInstService.getAll().subscribe({
      next: (data) => this.actividadesMensualesInst.set(data),
      error: (err) => console.error('Error loading actividades mensuales inst:', err)
    });
  }

  loadIndicadores(): void {
    this.indicadorService.getAll().subscribe({
      next: (data) => this.indicadores.set(data),
      error: (err) => console.error('Error loading indicadores:', err)
    });
  }

  loadActividadesAnuales(): void {
    this.actividadAnualService.getAll().subscribe({
      next: (data) => {
        this.actividadesAnuales.set(data);
        const idIndicador = this.form.get('idIndicador')?.value;
        if (idIndicador) {
          this.cargarActividadesPorIndicador(idIndicador);
        }
      },
      error: (err) => console.error('Error loading actividades anuales:', err)
    });
  }

  cargarActividadesPorIndicador(idIndicador: number, skipCheck: boolean = false): void {
    if (!skipCheck && this.cargandoRelaciones) return;
    
    this.cargandoRelaciones = true;
    const actividadAnualActual = skipCheck ? this.form.get('idActividadAnual')?.value : null;
    
    console.log('🔍 Cargando actividades anuales para indicador:', idIndicador, 'tipo:', typeof idIndicador);
    this.actividadAnualService.getByIndicador(idIndicador).subscribe({
      next: (actividadesAnuales) => {
        console.log('📦 Respuesta del backend - Total actividades recibidas:', actividadesAnuales?.length || 0);
        if (actividadesAnuales && actividadesAnuales.length > 0) {
          console.log('📋 Primeras 3 actividades recibidas:', actividadesAnuales.slice(0, 3).map(a => ({
            idActividadAnual: a.idActividadAnual,
            idIndicador: a.idIndicador,
            tipoIdIndicador: typeof a.idIndicador
          })));
        }
        
        // getByIndicador debería devolver solo las actividades anuales para este indicador
        // Pero si el backend no filtra, hacemos el filtro en el frontend
        const actividadesFiltradas = (actividadesAnuales || []).filter(a => {
          // Convertir ambos a número para comparar correctamente
          const idIndicadorNum = Number(idIndicador);
          const aIdIndicadorNum = Number(a.idIndicador);
          const perteneceAlIndicador = aIdIndicadorNum === idIndicadorNum;
          if (!perteneceAlIndicador && actividadesAnuales.length <= 5) {
            console.warn('⚠️ Actividad anual con idIndicador diferente:', {
              idActividadAnual: a.idActividadAnual,
              idIndicadorEsperado: idIndicadorNum,
              idIndicadorObtenido: aIdIndicadorNum,
              tipoEsperado: typeof idIndicadorNum,
              tipoObtenido: typeof aIdIndicadorNum
            });
          }
          return perteneceAlIndicador;
        });
        console.log('✅ Actividades anuales filtradas para indicador', idIndicador, ':', actividadesFiltradas.length, 'de', actividadesAnuales?.length || 0);
        this.actividadesAnualesFiltradas.set(actividadesFiltradas);
        
        if (skipCheck && actividadAnualActual) {
          const actividadesAnualesArray = Array.isArray(actividadAnualActual) ? actividadAnualActual : [actividadAnualActual];
          const actividadesValidas = actividadesAnualesArray.filter(id => 
            actividadesFiltradas.find(a => a.idActividadAnual === id)
          );
          
          if (actividadesValidas.length > 0) {
            this.form.patchValue({ idActividadAnual: actividadesValidas }, { emitEvent: false });
            this.cargarActividadesMensualesPorMultiplesAnuales(actividadesValidas, skipCheck);
          } else {
            this.form.patchValue({ idActividadAnual: [] }, { emitEvent: false });
            this.actividadesMensualesFiltradas.set([]);
            this.cargandoRelaciones = false;
            if (skipCheck) {
              this.loading.set(false);
            }
          }
        } else if (!skipCheck) {
          // Solo cargar las actividades anuales, sin seleccionarlas automáticamente
          // El usuario puede seleccionarlas manualmente
          this.actividadesMensualesFiltradas.set([]);
          this.cargandoRelaciones = false;
        } else {
          this.actividadesMensualesFiltradas.set([]);
          this.cargandoRelaciones = false;
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error cargando actividades anuales:', err);
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.cargandoRelaciones = false;
        if (skipCheck) {
          this.loading.set(false);
        }
      }
    });
  }

  cargarActividadesMensualesPorAnual(idActividadAnual: number, skipCheck: boolean = false): void {
    // Método legacy - usar cargarActividadesMensualesPorMultiplesAnuales
    this.cargarActividadesMensualesPorMultiplesAnuales([idActividadAnual], skipCheck);
  }

  cargarActividadesMensualesPorMultiplesAnuales(idActividadesAnuales: number[], skipCheck: boolean = false): void {
    if (idActividadesAnuales.length === 0) {
      this.actividadesMensualesFiltradas.set([]);
      this.form.patchValue({ idActividadMensualInst: [] }, { emitEvent: false });
      this.cargandoRelaciones = false;
      if (skipCheck) {
        this.loading.set(false);
      }
      return;
    }

    // Cargar actividades mensuales para todas las actividades anuales
    const requests = idActividadesAnuales.map(idAnual => 
      this.actividadMensualInstService.getByActividadAnual(idAnual)
    );

    // Combinar todas las peticiones usando forkJoin
    forkJoin(requests).subscribe({
      next: (results) => {
        const todasLasMensuales: ActividadMensualInst[] = [];
        results.forEach((actividadesMensuales, index) => {
          const idAnual = idActividadesAnuales[index];
          const actividadesFiltradas = (actividadesMensuales || []).filter(m => m.idActividadAnual === idAnual);
          todasLasMensuales.push(...actividadesFiltradas);
        });

        // Eliminar duplicados por idActividadMensualInst
        const mensualesUnicas = todasLasMensuales.filter((mensual, index, self) =>
          index === self.findIndex(m => m.idActividadMensualInst === mensual.idActividadMensualInst)
        );

        this.actividadesMensualesFiltradas.set(mensualesUnicas);

        if (skipCheck) {
          const actividadMensualActual = this.form.get('idActividadMensualInst')?.value;
          const actividadesMensualesArray = Array.isArray(actividadMensualActual) ? actividadMensualActual : (actividadMensualActual ? [actividadMensualActual] : []);
          const actividadesValidas = actividadesMensualesArray.filter(id => 
            mensualesUnicas.find(m => m.idActividadMensualInst === id)
          );
          if (actividadesValidas.length > 0) {
            this.form.patchValue({ idActividadMensualInst: actividadesValidas }, { emitEvent: false });
          } else {
            this.form.patchValue({ idActividadMensualInst: [] }, { emitEvent: false });
          }
        } else {
          // No seleccionar automáticamente las actividades mensuales
          // El usuario puede seleccionarlas manualmente
          this.form.patchValue({ idActividadMensualInst: [] }, { emitEvent: false });
        }

        this.cargandoRelaciones = false;
        if (skipCheck) {
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error cargando actividades mensuales:', err);
        this.actividadesMensualesFiltradas.set([]);
        this.cargandoRelaciones = false;
        if (skipCheck) {
          this.loading.set(false);
        }
      }
    });
  }


  loadTiposProtagonista(): void {
    this.catalogosService.getTiposProtagonista().subscribe({
      next: (data) => this.tiposProtagonista.set(data.filter(t => t.activo !== false)),
      error: (err) => console.error('Error loading tipos protagonista:', err)
    });
  }

  loadCapacidadesInstaladas(): void {
    this.catalogosService.getCapacidadesInstaladas().subscribe({
      next: (data) => this.capacidadesInstaladas.set(data),
      error: (err) => console.error('Error loading capacidades instaladas:', err)
    });
  }

  loadActividad(id: number): void {
    this.loading.set(true);
    this.actividadesService.get(id).subscribe({
      next: (data) => {
        let horaRealizacionFormatted = '';
        if (data.horaRealizacion) {
          horaRealizacionFormatted = this.convertir24hA12h(String(data.horaRealizacion).substring(0, 5));
        }

        const nombreActividad = data.nombreActividad || data.nombre || '';
        
        const departamentoResponsableIdArray = Array.isArray(data.departamentoResponsableId) 
          ? data.departamentoResponsableId 
          : (data.departamentoResponsableId ? [data.departamentoResponsableId] : []);
        
        const idActividadAnualArray = Array.isArray(data.idActividadAnual) 
          ? data.idActividadAnual 
          : (data.idActividadAnual ? [data.idActividadAnual] : []);
        
        const idTipoProtagonistaArray = Array.isArray(data.idTipoProtagonista) 
          ? data.idTipoProtagonista 
          : (data.idTipoProtagonista ? [data.idTipoProtagonista] : []);
        
        const idTipoActividadArray = Array.isArray(data.idTipoActividad) 
          ? data.idTipoActividad 
          : (data.idTipoActividad ? [data.idTipoActividad] : (data.categoriaActividadId ? [data.categoriaActividadId] : []));
        
        const idActividadMensualInstArray = Array.isArray(data.idActividadMensualInst) 
          ? data.idActividadMensualInst 
          : (data.idActividadMensualInst ? [data.idActividadMensualInst] : []);
        
        this.form.patchValue({
          nombre: nombreActividad,
          nombreActividad: nombreActividad,
          descripcion: data.descripcion || '',
          departamentoId: data.departamentoId || null,
          departamentoResponsableId: departamentoResponsableIdArray,
          fechaInicio: data.fechaInicio || '',
          fechaFin: data.fechaFin || '',
          idEstadoActividad: data.idEstadoActividad || null,
          idTipoActividad: idTipoActividadArray,
          modalidad: data.modalidad || '',
          idCapacidadInstalada: data.idCapacidadInstalada || null,
          semanaMes: data.semanaMes || null,
          codigoActividad: data.codigoActividad || '',
          idActividadMensualInst: idActividadMensualInstArray,
          esPlanificada: true, // Siempre true para actividades planificadas
          idIndicador: data.idIndicador || null,
          idActividadAnual: idActividadAnualArray,
          objetivo: data.objetivo || '',
          anio: data.anio ? String(data.anio) : String(new Date().getFullYear()),
          horaRealizacion: horaRealizacionFormatted,
          cantidadParticipantesProyectados: data.cantidadParticipantesProyectados || null,
          cantidadParticipantesEstudiantesProyectados: data.cantidadParticipantesEstudiantesProyectados || null,
          idTipoProtagonista: idTipoProtagonistaArray,
          responsableActividad: data.responsableActividad || '',
          categoriaActividadId: data.idTipoActividad || data.categoriaActividadId || null,
          areaConocimientoId: data.idArea || data.areaConocimientoId || null,
          ubicacion: data.ubicacion || '',
          activo: data.activo ?? true
        }, { emitEvent: false });

        // Actualizar signal del local seleccionado
        if (data.idCapacidadInstalada) {
          const local = this.capacidadesInstaladas().find(c => Number(c.id) === Number(data.idCapacidadInstalada));
          this.localSeleccionado.set(local || null);
        } else {
          this.localSeleccionado.set(null);
        }

        if (this.isEditMode()) {
          this.form.get('idIndicador')?.disable({ emitEvent: false });
        }

        if (data.idIndicador) {
          this.cargarActividadesPorIndicador(data.idIndicador, true);
        } else {
          this.actividadesAnualesFiltradas.set([]);
          this.actividadesMensualesFiltradas.set([]);
          this.cargandoRelaciones = false;
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error loading actividad:', err);
        this.error.set('Error al cargar la actividad');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    const nombreValue = this.form.get('nombreActividad')?.value || this.form.get('nombre')?.value;
    if (nombreValue && !this.form.get('nombreActividad')?.value) {
      this.form.patchValue({ nombreActividad: nombreValue });
    }
    if (nombreValue && !this.form.get('nombre')?.value) {
      this.form.patchValue({ nombre: nombreValue });
    }

    // Validar que haya al menos un responsable
    if (!this.tieneAlMenosUnResponsable()) {
      this.error.set('Debe agregar al menos una persona válida como responsable.');
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      const formValue = this.form.getRawValue();
      
      let fechaInicio: string | undefined = undefined;
      let fechaFin: string | undefined = undefined;
      
      if (formValue.fechaInicio) {
        const fecha = new Date(formValue.fechaInicio);
        if (!isNaN(fecha.getTime())) {
          fechaInicio = fecha.toISOString().split('T')[0];
        }
      }
      
      if (formValue.fechaFin) {
        const fecha = new Date(formValue.fechaFin);
        if (!isNaN(fecha.getTime())) {
          fechaFin = fecha.toISOString().split('T')[0];
        }
      }

      let horaRealizacion: string | undefined = undefined;
      if (formValue.horaRealizacion) {
        const hora12h = String(formValue.horaRealizacion).trim();
        const hora24h = this.convertir12hA24h(hora12h);
        if (hora24h) {
          horaRealizacion = hora24h.includes(':') ? (hora24h.split(':').length === 2 ? hora24h + ':00' : hora24h) : hora24h;
        }
      }

      const data: ActividadCreate = {
        nombreActividad: formValue.nombreActividad || formValue.nombre,
        nombre: formValue.nombreActividad || formValue.nombre,
        descripcion: formValue.descripcion || undefined,
        departamentoId: formValue.departamentoId || undefined,
        departamentoResponsableId: Array.isArray(formValue.departamentoResponsableId) && formValue.departamentoResponsableId.length > 0 ? formValue.departamentoResponsableId : undefined,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        idEstadoActividad: formValue.idEstadoActividad || undefined,
        idTipoActividad: Array.isArray(formValue.idTipoActividad) && formValue.idTipoActividad.length > 0 ? formValue.idTipoActividad : (formValue.categoriaActividadId ? [formValue.categoriaActividadId] : undefined),
        modalidad: formValue.modalidad || undefined,
        idCapacidadInstalada: formValue.idCapacidadInstalada || undefined,
        semanaMes: formValue.semanaMes || undefined,
        codigoActividad: formValue.codigoActividad || undefined,
        idActividadMensualInst: Array.isArray(formValue.idActividadMensualInst) && formValue.idActividadMensualInst.length > 0 ? formValue.idActividadMensualInst : undefined,
        esPlanificada: true, // Siempre true para actividades planificadas
        idIndicador: formValue.idIndicador || undefined,
        idActividadAnual: Array.isArray(formValue.idActividadAnual) && formValue.idActividadAnual.length > 0 ? formValue.idActividadAnual : undefined,
        objetivo: formValue.objetivo || undefined,
        anio: formValue.anio ? String(formValue.anio) : undefined,
        horaRealizacion: horaRealizacion,
        cantidadParticipantesProyectados: formValue.cantidadParticipantesProyectados || undefined,
        cantidadParticipantesEstudiantesProyectados: formValue.cantidadParticipantesEstudiantesProyectados || undefined,
        cantidadTotalParticipantesProtagonistas: formValue.cantidadTotalParticipantesProtagonistas || undefined,
        idTipoProtagonista: Array.isArray(formValue.idTipoProtagonista) && formValue.idTipoProtagonista.length > 0 ? formValue.idTipoProtagonista : undefined,
        idTipoEvidencias: Array.isArray(formValue.idTipoEvidencias) && formValue.idTipoEvidencias.length > 0 ? formValue.idTipoEvidencias : undefined,
        responsableActividad: formValue.responsableActividad || undefined,
        categoriaActividadId: Array.isArray(formValue.idTipoActividad) && formValue.idTipoActividad.length > 0 ? formValue.idTipoActividad[0] : (formValue.categoriaActividadId || undefined),
        areaConocimientoId: formValue.idArea || formValue.areaConocimientoId || undefined,
        ubicacion: formValue.ubicacion || undefined,
        activo: formValue.activo !== undefined ? formValue.activo : true
      };

      if (this.isEditMode()) {
        this.actividadesService.update(this.actividadId()!, data).subscribe({
          next: () => {
            const responsableActividad = formValue.responsableActividad?.trim();
            if (this.actividadId()) {
              this.crearResponsablesParaActividad(this.actividadId()!, responsableActividad);
            } else {
              this.router.navigate(['/actividades']);
            }
          },
          error: (err: any) => {
            console.error('Error saving actividad:', err);
            this.error.set('Error al guardar la actividad');
            this.loading.set(false);
          }
        });
      } else {
        this.actividadesService.create(data).subscribe({
          next: (actividadCreada) => {
            const indicadorId = this.indicadorIdFromQuery();
            const responsableActividad = formValue.responsableActividad?.trim();
            
            if (indicadorId && actividadCreada.id) {
              this.actividadesService.agregarIndicador(actividadCreada.id, indicadorId).subscribe({
                next: () => {
                  this.crearResponsablesParaActividad(actividadCreada.id, responsableActividad);
                },
                error: (errIndicador) => {
                  console.error('Error al asociar indicador:', errIndicador);
                  this.crearResponsablesParaActividad(actividadCreada.id, responsableActividad);
                }
              });
            } else {
              if (actividadCreada.id) {
                this.crearResponsablesParaActividad(actividadCreada.id, responsableActividad);
              } else {
                this.router.navigate(['/actividades']);
              }
            }
          },
          error: (err: any) => {
            console.error('Error saving actividad:', err);
            this.error.set('Error al guardar la actividad');
            this.loading.set(false);
          }
        });
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  toggleProtagonista(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idTipoProtagonista')?.value || [];
    let newValue: number[];
    
    if (checked) {
      if (!currentValue.includes(id)) {
        newValue = [...currentValue, id];
      } else {
        newValue = currentValue;
      }
      this.mostrarDropdownProtagonista.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      if (newValue.length === 0) {
        this.mostrarDropdownProtagonista.set(true);
      }
    }
    
    this.form.patchValue({ idTipoProtagonista: newValue });
  }

  mostrarDropdownProtagonistaFunc(): void {
    this.mostrarDropdownProtagonista.set(true);
  }

  tieneProtagonistasSeleccionados(): boolean {
    const currentValue = this.form.get('idTipoProtagonista')?.value || [];
    return Array.isArray(currentValue) && currentValue.length > 0;
  }

  getProtagonistasSeleccionados(): any[] {
    const idsSeleccionados = this.form.get('idTipoProtagonista')?.value || [];
    return this.tiposProtagonista().filter(tipo => idsSeleccionados.includes(tipo.id));
  }

  eliminarProtagonista(id: number): void {
    const currentValue = this.form.get('idTipoProtagonista')?.value || [];
    const newValue = currentValue.filter((item: number) => item !== id);
    this.form.patchValue({ idTipoProtagonista: newValue });
    
    if (newValue.length === 0) {
      this.mostrarDropdownProtagonista.set(true);
    }
  }

  isProtagonistaSelected(id: number): boolean {
    const currentValue = this.form.get('idTipoProtagonista')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  toggleDepartamentoResponsable(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('departamentoResponsableId')?.value || [];
    let newValue: number[];
    
    if (checked) {
      if (!currentValue.includes(id)) {
        newValue = [...currentValue, id];
      } else {
        newValue = currentValue;
      }
      this.mostrarDropdownDepartamentos.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      if (newValue.length === 0) {
        this.mostrarDropdownDepartamentos.set(true);
      }
    }
    
    this.form.patchValue({ departamentoResponsableId: newValue });
  }

  mostrarDropdownDepartamentosFunc(): void {
    this.mostrarDropdownDepartamentos.set(true);
  }

  tieneDepartamentosSeleccionados(): boolean {
    const currentValue = this.form.get('departamentoResponsableId')?.value || [];
    return Array.isArray(currentValue) && currentValue.length > 0;
  }

  getDepartamentosSeleccionados(): any[] {
    const idsSeleccionados = this.form.get('departamentoResponsableId')?.value || [];
    return this.departamentos().filter(dept => idsSeleccionados.includes(dept.id));
  }

  eliminarDepartamento(id: number): void {
    const currentValue = this.form.get('departamentoResponsableId')?.value || [];
    const newValue = currentValue.filter((item: number) => item !== id);
    this.form.patchValue({ departamentoResponsableId: newValue });
    
    if (newValue.length === 0) {
      this.mostrarDropdownDepartamentos.set(true);
    }
  }

  isDepartamentoResponsableSelected(id: number): boolean {
    const currentValue = this.form.get('departamentoResponsableId')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  isActividadAnualSelected(id: number): boolean {
    const currentValue = this.form.get('idActividadAnual')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  isActividadMensualSelected(id: number): boolean {
    const currentValue = this.form.get('idActividadMensualInst')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  tieneActividadesAnualesSeleccionadas(): boolean {
    const currentValue = this.form.get('idActividadAnual')?.value || [];
    return Array.isArray(currentValue) && currentValue.length > 0;
  }

  tieneActividadesMensualesSeleccionadas(): boolean {
    const currentValue = this.form.get('idActividadMensualInst')?.value || [];
    return Array.isArray(currentValue) && currentValue.length > 0;
  }

  toggleTipoActividad(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idTipoActividad')?.value || [];
    let newValue: number[];
    
    if (checked) {
      if (!currentValue.includes(id)) {
        newValue = [...currentValue, id];
      } else {
        newValue = currentValue;
      }
      this.mostrarDropdownTipoActividad.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      if (newValue.length === 0) {
        this.mostrarDropdownTipoActividad.set(true);
      }
    }
    
    this.form.patchValue({ idTipoActividad: newValue });
  }

  mostrarDropdownTipoActividadFunc(): void {
    this.mostrarDropdownTipoActividad.set(true);
  }

  tieneTiposActividadSeleccionados(): boolean {
    const currentValue = this.form.get('idTipoActividad')?.value || [];
    return Array.isArray(currentValue) && currentValue.length > 0;
  }

  getTiposActividadSeleccionados(): any[] {
    const idsSeleccionados = this.form.get('idTipoActividad')?.value || [];
    return this.categoriasActividad().filter(tipo => idsSeleccionados.includes(tipo.idCategoriaActividad || tipo.id));
  }

  eliminarTipoActividad(id: number): void {
    const currentValue = this.form.get('idTipoActividad')?.value || [];
    const newValue = currentValue.filter((item: number) => item !== id);
    this.form.patchValue({ idTipoActividad: newValue });
    
    if (newValue.length === 0) {
      this.mostrarDropdownTipoActividad.set(true);
    }
  }

  isTipoActividadSelected(id: number): boolean {
    const currentValue = this.form.get('idTipoActividad')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  private convertir24hA12h(hora24h: string): string {
    if (!hora24h || !hora24h.includes(':')) return hora24h;
    
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

  private convertir12hA24h(hora12h: string): string | null {
    if (!hora12h) return null;
    
    const hora = hora12h.trim().toUpperCase();
    const tieneAM = hora.includes('AM');
    const tienePM = hora.includes('PM');
    
    if (!tieneAM && !tienePM) {
      return hora;
    }
    
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

  private crearResponsable(idActividad: number, nombreResponsable: string): void {
    this.responsableService.getByActividad(idActividad).subscribe({
      next: (responsablesExistentes) => {
        if (responsablesExistentes && responsablesExistentes.length > 0) {
          const responsableExistente = responsablesExistentes[0];
          const updateData: any = {
            rolResponsable: nombreResponsable
          };
          this.responsableService.update(responsableExistente.idActividadResponsable, updateData).subscribe({
            next: () => {
              this.router.navigate(['/actividades']);
            },
            error: (err) => {
              console.error('Error actualizando responsable:', err);
              this.router.navigate(['/actividades']);
            }
          });
        } else {
          const responsableData: ActividadResponsableCreate = {
            idActividad: idActividad,
            idTipoResponsable: 1,
            rolResponsable: nombreResponsable,
            fechaAsignacion: new Date().toISOString().split('T')[0]
          };
          
          this.responsableService.create(responsableData).subscribe({
            next: () => {
              this.router.navigate(['/actividades']);
            },
            error: (err) => {
              console.error('Error creando responsable:', err);
              this.router.navigate(['/actividades']);
            }
          });
        }
      },
      error: (err) => {
        const responsableData: ActividadResponsableCreate = {
          idActividad: idActividad,
          idTipoResponsable: 1,
          rolResponsable: nombreResponsable,
          fechaAsignacion: new Date().toISOString().split('T')[0]
        };
        
        this.responsableService.create(responsableData).subscribe({
          next: () => {
            this.router.navigate(['/actividades']);
          },
          error: (createErr) => {
            console.error('Error creando responsable:', createErr);
            this.router.navigate(['/actividades']);
          }
        });
      }
    });
  }

  private actualizarResponsable(idActividad: number, nombreResponsable: string): void {
    this.responsableService.getByActividad(idActividad).subscribe({
      next: (responsablesExistentes) => {
        if (responsablesExistentes && responsablesExistentes.length > 0) {
          const responsableExistente = responsablesExistentes[0];
          const updateData: any = {
            idActividad: responsableExistente.idActividad,
            idTipoResponsable: responsableExistente.idTipoResponsable || 1,
            rolResponsable: nombreResponsable
          };
          this.responsableService.update(responsableExistente.idActividadResponsable, updateData).subscribe({
            next: () => {
              this.router.navigate(['/actividades']);
            },
            error: (err) => {
              console.error('Error actualizando responsable:', err);
              this.router.navigate(['/actividades']);
            }
          });
        } else {
          this.crearResponsable(idActividad, nombreResponsable);
        }
      },
      error: (err) => {
        this.crearResponsable(idActividad, nombreResponsable);
      }
    });
  }

  // Métodos para actividades anuales y mensuales
  toggleActividadAnual(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idActividadAnual')?.value || [];
    let newValue: number[];
    
    if (checked) {
      if (!currentValue.includes(id)) {
        newValue = [...currentValue, id];
      } else {
        newValue = currentValue;
      }
      this.mostrarDropdownActividadAnual.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      if (newValue.length === 0) {
        this.mostrarDropdownActividadAnual.set(true);
      }
    }
    
    this.form.patchValue({ idActividadAnual: newValue });
  }

  eliminarActividadAnual(id: number): void {
    const currentValue = this.form.get('idActividadAnual')?.value || [];
    const newValue = currentValue.filter((item: number) => item !== id);
    this.form.patchValue({ idActividadAnual: newValue });
    
    if (newValue.length === 0) {
      this.mostrarDropdownActividadAnual.set(true);
    }
  }

  getActividadesAnualesSeleccionadas(): ActividadAnual[] {
    const idsSeleccionados = this.form.get('idActividadAnual')?.value || [];
    const idsUnicos = Array.from(new Set(idsSeleccionados));
    const resultado = this.actividadesAnualesFiltradas().filter(anual => idsUnicos.includes(anual.idActividadAnual));
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

  eliminarActividadMensual(id: number): void {
    const currentValue = this.form.get('idActividadMensualInst')?.value || [];
    const newValue = currentValue.filter((item: number) => item !== id);
    this.form.patchValue({ idActividadMensualInst: newValue });
    
    if (newValue.length === 0) {
      this.mostrarDropdownActividadMensual.set(true);
    }
  }

  getActividadesMensualesSeleccionadas(): ActividadMensualInst[] {
    const idsSeleccionados = this.form.get('idActividadMensualInst')?.value || [];
    const idsUnicos = Array.from(new Set(idsSeleccionados));
    const resultado = this.actividadesMensualesFiltradas().filter(mensual => idsUnicos.includes(mensual.idActividadMensualInst));
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

  toggleActividadMensual(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idActividadMensualInst')?.value || [];
    let newValue: number[];
    
    if (checked) {
      if (!currentValue.includes(id)) {
        newValue = [...currentValue, id];
      } else {
        newValue = currentValue;
      }
      this.mostrarDropdownActividadMensual.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      if (newValue.length === 0) {
        this.mostrarDropdownActividadMensual.set(true);
      }
    }
    
    this.form.patchValue({ idActividadMensualInst: newValue });
  }

  crearNuevaActividadAnual(): void {
    const idIndicador = this.form.get('idIndicador')?.value;
    if (idIndicador) {
      this.router.navigate(['/actividades-anuales/nueva'], { queryParams: { idIndicador } });
    } else {
      this.router.navigate(['/actividades-anuales/nueva']);
    }
  }

  // Métodos para tipos de evidencia
  loadTiposEvidencia(): void {
    this.catalogosService.getTiposEvidencia().subscribe({
      next: (data) => this.tiposEvidencia.set(data || []),
      error: (err) => {
        console.error('Error loading tipos evidencia:', err);
        this.tiposEvidencia.set([]);
      }
    });
  }

  toggleTipoEvidencia(id: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    const currentValue = this.form.get('idTipoEvidencias')?.value || [];
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
    
    this.form.patchValue({ idTipoEvidencias: newValue });
  }

  eliminarTipoEvidencia(id: number): void {
    const currentValue = this.form.get('idTipoEvidencias')?.value || [];
    const newValue = currentValue.filter((item: number) => item !== id);
    this.form.patchValue({ idTipoEvidencias: newValue });
    
    if (newValue.length === 0) {
      this.mostrarDropdownTipoEvidencia.set(true);
    }
  }

  getTiposEvidenciaSeleccionados(): any[] {
    const idsSeleccionados = this.form.get('idTipoEvidencias')?.value || [];
    return this.tiposEvidencia().filter(tipo => idsSeleccionados.includes(tipo.idTipoEvidencia || tipo.id));
  }

  abrirDropdownTipoEvidencia(): void {
    this.mostrarDropdownTipoEvidencia.set(true);
  }

  isTipoEvidenciaSelected(id: number): boolean {
    const currentValue = this.form.get('idTipoEvidencias')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  // Métodos para responsables
  initializeFormResponsable(): void {
    this.formResponsable = this.fb.group({
      usuarios: this.fb.array([]),
      docentes: this.fb.array([]),
      estudiantes: this.fb.array([]),
      administrativos: this.fb.array([]),
      responsablesExternos: this.fb.array([])
    });
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
      idUsuario: [null, Validators.required]
    });
  }

  crearPersonaFormGroup(tipo: 'docente' | 'estudiante' | 'administrativo'): FormGroup {
    const idRolResponsableValidators = tipo === 'estudiante' ? [Validators.required] : [];
    
    return this.fb.group({
      idPersona: [null, Validators.required],
      idRolResponsable: [null, idRolResponsableValidators]
    });
  }

  crearResponsableExternoFormGroup(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required]],
      institucion: ['', [Validators.required]],
      cargo: [''],
      telefono: [''],
      correo: [''],
      idRolResponsable: [null, Validators.required]
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
    
    this.catalogosService.getRolesResponsable().subscribe({
      next: (data) => this.rolesResponsable.set(data || []),
      error: (err) => {
        console.warn('⚠️ No se pudo cargar roles de responsable:', err);
        this.rolesResponsable.set([]);
      }
    });
  }

  toggleTipoResponsable(tipo: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    const current = this.tiposResponsableSeleccionados();
    
    if (checked) {
      this.tiposResponsableSeleccionados.set([...current, tipo]);
    } else {
      this.tiposResponsableSeleccionados.set(current.filter(t => t !== tipo));
      this.limpiarResponsablesPorTipo(tipo);
    }
  }

  isTipoResponsableSeleccionado(tipo: string): boolean {
    return this.tiposResponsableSeleccionados().includes(tipo);
  }

  limpiarResponsablesPorTipo(tipo: string): void {
    if (tipo === 'usuario') {
      while (this.usuariosArray.length > 0) {
        this.usuariosArray.removeAt(0);
      }
    } else if (tipo === 'docente') {
      while (this.docentesArray.length > 0) {
        this.docentesArray.removeAt(0);
      }
    } else if (tipo === 'estudiante') {
      while (this.estudiantesArray.length > 0) {
        this.estudiantesArray.removeAt(0);
      }
    } else if (tipo === 'administrativo') {
      while (this.administrativosArray.length > 0) {
        this.administrativosArray.removeAt(0);
      }
    } else if (tipo === 'externo') {
      while (this.responsablesExternosArray.length > 0) {
        this.responsablesExternosArray.removeAt(0);
      }
    }
  }

  tieneAlMenosUnResponsable(): boolean {
    const tiposSeleccionados = this.tiposResponsableSeleccionados();
    if (tiposSeleccionados.length === 0) return false;

    for (const tipo of tiposSeleccionados) {
      if (tipo === 'usuario') {
        if (this.usuariosArray.length === 0) return false;
        for (let i = 0; i < this.usuariosArray.length; i++) {
          const control = this.usuariosArray.at(i);
          if (!control.get('idUsuario')?.value) return false;
        }
      } else if (tipo === 'docente') {
        if (this.docentesArray.length === 0) return false;
        for (let i = 0; i < this.docentesArray.length; i++) {
          const control = this.docentesArray.at(i);
          if (!control.get('idPersona')?.value) return false;
        }
      } else if (tipo === 'estudiante') {
        if (this.estudiantesArray.length === 0) return false;
        for (let i = 0; i < this.estudiantesArray.length; i++) {
          const control = this.estudiantesArray.at(i);
          if (!control.get('idPersona')?.value || !control.get('idRolResponsable')?.value) return false;
        }
      } else if (tipo === 'administrativo') {
        if (this.administrativosArray.length === 0) return false;
        for (let i = 0; i < this.administrativosArray.length; i++) {
          const control = this.administrativosArray.at(i);
          if (!control.get('idPersona')?.value) return false;
        }
      } else if (tipo === 'externo') {
        if (this.responsablesExternosArray.length === 0) return false;
        for (let i = 0; i < this.responsablesExternosArray.length; i++) {
          const control = this.responsablesExternosArray.at(i);
          if (!control.get('nombre')?.value || !control.get('institucion')?.value || !control.get('idRolResponsable')?.value) return false;
        }
      }
    }
    return true;
  }

  crearResponsablesParaActividad(idActividad: number, responsableActividad?: string): void {
    const responsables: ActividadResponsableCreate[] = [];
    const formValue = this.formResponsable.value;
    const fechaAsignacion = formValue.fechaAsignacion || new Date().toISOString().split('T')[0];

    console.log('🔄 Creando responsables para actividad:', idActividad);
    console.log('📋 FormResponsable value:', formValue);

    // Agregar responsable de actividad si existe
    if (responsableActividad) {
      responsables.push({
        idActividad,
        idTipoResponsable: 1, // Tipo por defecto
        rolResponsable: responsableActividad,
        fechaAsignacion: fechaAsignacion
      });
    }

    // Agregar usuarios
    this.usuariosArray.controls.forEach((control) => {
      const idUsuario = control.get('idUsuario')?.value;
      if (idUsuario) {
        responsables.push({
          idActividad,
          idUsuario,
          idTipoResponsable: 1, // Usuarios no requieren idRolResponsable según ejemplos
          fechaAsignacion: fechaAsignacion
        });
        console.log('✅ Usuario agregado a responsables:', idUsuario);
      }
    });

    // Agregar docentes
    this.docentesArray.controls.forEach((control) => {
      const idDocente = control.get('idPersona')?.value;
      const idRolResponsable = control.get('idRolResponsable')?.value;
      if (idDocente) {
        responsables.push({
          idActividad,
          idDocente,
          idTipoResponsable: 2, // Tipo docente
          rolResponsable: idRolResponsable ? this.getNombreRolResponsable(idRolResponsable) : undefined,
          fechaAsignacion: fechaAsignacion
        });
        console.log('✅ Docente agregado a responsables:', idDocente, 'Rol:', idRolResponsable);
      }
    });

    // Agregar estudiantes (usar idDocente ya que el backend usa el mismo campo)
    this.estudiantesArray.controls.forEach((control) => {
      const idDocente = control.get('idPersona')?.value;
      const idRolResponsable = control.get('idRolResponsable')?.value;
      if (idDocente && idRolResponsable) {
        responsables.push({
          idActividad,
          idDocente,
          idTipoResponsable: 3, // Tipo estudiante
          rolResponsable: this.getNombreRolResponsable(idRolResponsable),
          fechaAsignacion: fechaAsignacion
        });
        console.log('✅ Estudiante agregado a responsables:', idDocente, 'Rol:', idRolResponsable);
      }
    });

    // Agregar administrativos
    this.administrativosArray.controls.forEach((control) => {
      const idAdmin = control.get('idPersona')?.value;
      const idRolResponsable = control.get('idRolResponsable')?.value;
      if (idAdmin) {
        responsables.push({
          idActividad,
          idAdmin,
          idTipoResponsable: 4, // Tipo administrativo
          rolResponsable: idRolResponsable ? this.getNombreRolResponsable(idRolResponsable) : undefined,
          fechaAsignacion: fechaAsignacion
        });
        console.log('✅ Administrativo agregado a responsables:', idAdmin, 'Rol:', idRolResponsable);
      }
    });

    // Agregar responsables externos
    // NOTA: El backend no acepta campos para responsables externos en Create
    // Por ahora, no creamos responsables externos hasta que el backend lo soporte
    // this.responsablesExternosArray.controls.forEach((control) => {
    //   // El tipo ActividadResponsableCreate no tiene campos para responsables externos
    //   // Esto requeriría una extensión del backend
    // });

    // Crear todos los responsables en paralelo
    console.log('📊 Total de responsables a crear:', responsables.length);
    console.log('📋 Responsables a crear:', JSON.stringify(responsables, null, 2));
    
    if (responsables.length > 0) {
      forkJoin(
        responsables.map(responsable => this.responsableService.create(responsable))
      ).subscribe({
        next: (responsablesCreados) => {
          console.log('✅ Responsables creados exitosamente:', responsablesCreados);
          console.log('📊 Total de responsables creados:', responsablesCreados.length);
          this.mostrarAlertaExito();
        },
        error: (err) => {
          console.error('❌ Error creando responsables:', err);
          console.error('❌ Error details:', err.error);
          console.error('❌ Error status:', err.status);
          // Mostrar alerta de éxito aunque haya error con responsables
          this.mostrarAlertaExito();
        }
      });
    } else {
      console.warn('⚠️ No hay responsables para crear');
      this.mostrarAlertaExito();
    }
  }

  private mostrarAlertaExito(): void {
    const nombreActividad = this.form.get('nombreActividad')?.value || 'la actividad';
    // Limpiar el estado guardado del formulario al guardar exitosamente
    this.clearFormState();
    
    if (this.isEditMode()) {
      // Mensaje para actividad actualizada
      this.alertService.success(
        '¡Actividad actualizada!',
        `La actividad "${nombreActividad}" ha sido actualizada correctamente.`
      ).then(() => {
        this.router.navigate(['/actividades']);
      });
    } else {
      // Mensaje para actividad creada
      this.alertService.success(
        '¡Actividad creada exitosamente!',
        `La actividad "${nombreActividad}" ha sido creada correctamente.`
      ).then(() => {
        this.router.navigate(['/actividades']);
      });
    }
  }

  /**
   * Guarda el estado del formulario en sessionStorage
   */
  private saveFormState(): void {
    if (!this.form || this.isEditMode() || this.isCancelling) {
      return; // No guardar en modo edición o cuando se está cancelando
    }

    try {
      const formValue = this.form.value;
      const formState = {
        formValue,
        // Estado visual del formulario
        uiState: {
          seccionPlanificacionExpandida: this.seccionPlanificacionExpandida(),
          seccionInformacionExpandida: this.seccionInformacionExpandida(),
          seccionResponsablesExpandida: this.seccionResponsablesExpandida(),
          mostrarDropdownAnuales: this.mostrarDropdownAnuales(),
          mostrarDropdownMensuales: this.mostrarDropdownMensuales(),
          mostrarDropdownActividadAnual: this.mostrarDropdownActividadAnual(),
          mostrarDropdownActividadMensual: this.mostrarDropdownActividadMensual(),
          mostrarDropdownTipoEvidencia: this.mostrarDropdownTipoEvidencia(),
          mostrarDropdownDepartamentos: this.mostrarDropdownDepartamentos(),
          mostrarDropdownTipoActividad: this.mostrarDropdownTipoActividad(),
          mostrarDropdownProtagonista: this.mostrarDropdownProtagonista(),
          mostrarDropdownEstadoActividad: this.mostrarDropdownEstadoActividad(),
          mostrarDropdownModalidad: this.mostrarDropdownModalidad(),
          mostrarDropdownLocal: this.mostrarDropdownLocal(),
          localSeleccionado: this.localSeleccionado()
        },
        timestamp: new Date().toISOString()
      };
      sessionStorage.setItem(this.formStateKey, JSON.stringify(formState));
      console.log('💾 Estado del formulario guardado');
    } catch (error) {
      console.warn('Error guardando estado del formulario:', error);
    }
  }

  /**
   * Restaura el estado del formulario desde sessionStorage
   */
  private restoreFormState(): void {
    if (this.isEditMode()) {
      return; // No restaurar en modo edición
    }

    try {
      const savedState = sessionStorage.getItem(this.formStateKey);
      if (!savedState) {
        console.log('ℹ️ No hay estado guardado para restaurar');
        return;
      }

      const formState = JSON.parse(savedState);
      console.log('📦 Estado encontrado en sessionStorage:', formState);
      
      // Verificar que el estado no sea muy antiguo (máximo 24 horas)
      const timestamp = new Date(formState.timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        // El estado es muy antiguo, eliminarlo
        console.log('⏰ Estado muy antiguo, eliminando');
        sessionStorage.removeItem(this.formStateKey);
        return;
      }

      // Restaurar estado visual del formulario primero (inmediatamente)
      if (formState.uiState) {
        const uiState = formState.uiState;
        if (uiState.seccionPlanificacionExpandida !== undefined) {
          this.seccionPlanificacionExpandida.set(uiState.seccionPlanificacionExpandida);
        }
        if (uiState.seccionInformacionExpandida !== undefined) {
          this.seccionInformacionExpandida.set(uiState.seccionInformacionExpandida);
        }
        if (uiState.seccionResponsablesExpandida !== undefined) {
          this.seccionResponsablesExpandida.set(uiState.seccionResponsablesExpandida);
        }
        if (uiState.mostrarDropdownAnuales !== undefined) {
          this.mostrarDropdownAnuales.set(uiState.mostrarDropdownAnuales);
        }
        if (uiState.mostrarDropdownMensuales !== undefined) {
          this.mostrarDropdownMensuales.set(uiState.mostrarDropdownMensuales);
        }
        if (uiState.mostrarDropdownActividadAnual !== undefined) {
          this.mostrarDropdownActividadAnual.set(uiState.mostrarDropdownActividadAnual);
        }
        if (uiState.mostrarDropdownActividadMensual !== undefined) {
          this.mostrarDropdownActividadMensual.set(uiState.mostrarDropdownActividadMensual);
        }
        if (uiState.mostrarDropdownTipoEvidencia !== undefined) {
          this.mostrarDropdownTipoEvidencia.set(uiState.mostrarDropdownTipoEvidencia);
        }
        if (uiState.mostrarDropdownDepartamentos !== undefined) {
          this.mostrarDropdownDepartamentos.set(uiState.mostrarDropdownDepartamentos);
        }
        if (uiState.mostrarDropdownTipoActividad !== undefined) {
          this.mostrarDropdownTipoActividad.set(uiState.mostrarDropdownTipoActividad);
        }
        if (uiState.mostrarDropdownProtagonista !== undefined) {
          this.mostrarDropdownProtagonista.set(uiState.mostrarDropdownProtagonista);
        }
        if (uiState.mostrarDropdownEstadoActividad !== undefined) {
          this.mostrarDropdownEstadoActividad.set(uiState.mostrarDropdownEstadoActividad);
        }
        if (uiState.mostrarDropdownModalidad !== undefined) {
          this.mostrarDropdownModalidad.set(uiState.mostrarDropdownModalidad);
        }
        if (uiState.mostrarDropdownLocal !== undefined) {
          this.mostrarDropdownLocal.set(uiState.mostrarDropdownLocal);
        }
        if (uiState.localSeleccionado !== undefined && uiState.localSeleccionado !== null) {
          this.localSeleccionado.set(uiState.localSeleccionado);
        }
        console.log('✅ Estado visual del formulario restaurado');
      }

      // Restaurar valores del formulario después de asegurar que el formulario esté listo
      if (formState.formValue && this.form) {
        // Esperar un poco más para asegurar que todos los datos estén cargados
        setTimeout(() => {
          try {
            this.form.patchValue(formState.formValue, { emitEvent: false });
            console.log('✅ Valores del formulario restaurados');
          } catch (error) {
            console.warn('Error al restaurar valores del formulario:', error);
          }
        }, 500);
      }
    } catch (error) {
      console.warn('Error restaurando estado del formulario:', error);
      sessionStorage.removeItem(this.formStateKey);
    }
  }

  /**
   * Limpia el estado guardado del formulario
   */
  private clearFormState(): void {
    try {
      sessionStorage.removeItem(this.formStateKey);
      console.log('🗑️ Estado del formulario limpiado');
    } catch (error) {
      console.warn('Error limpiando estado del formulario:', error);
    }
  }

  /**
   * Maneja el clic en el botón de cancelar
   * Limpia el estado guardado y navega a la lista de actividades
   */
  onCancel(): void {
    // Marcar que se está cancelando para evitar guardar en ngOnDestroy
    this.isCancelling = true;
    
    // Limpiar el estado guardado del formulario
    this.clearFormState();
    
    // Limpiar también el formulario actual
    if (this.form) {
      this.form.reset();
      // Restablecer valores por defecto
      this.form.patchValue({
        esPlanificada: true,
        activo: true
      });
    }
    
    // Resetear estado visual
    this.seccionPlanificacionExpandida.set(false);
    this.seccionInformacionExpandida.set(false);
    this.seccionResponsablesExpandida.set(false);
    this.localSeleccionado.set(null);
    
    // Navegar a la lista de actividades
    this.router.navigate(['/actividades']);
  }

  /**
   * Configura el guardado automático del formulario
   */
  private setupFormAutoSave(): void {
    if (this.isEditMode() || this.isCancelling) {
      return; // No guardar automáticamente en modo edición o cuando se está cancelando
    }

    // Limpiar suscripción anterior si existe
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }

    // Guardar estado cada vez que el formulario cambie (con debounce)
    let saveTimeout: any;
    this.formSubscription = this.form.valueChanges.subscribe(() => {
      // No guardar si se está cancelando
      if (this.isCancelling) {
        return;
      }
      
      // Limpiar timeout anterior
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      
      // Guardar después de 1 segundo de inactividad
      saveTimeout = setTimeout(() => {
        if (!this.isCancelling) {
          this.saveFormState();
        }
      }, 1000);
    });
  }

  private getNombreRolResponsable(idRolResponsable: number): string | undefined {
    const rol = this.rolesResponsable().find(r => (r.id || r.idRolResponsable) === idRolResponsable);
    return rol?.nombre || undefined;
  }

  // Métodos para Estado de Actividad
  tieneEstadoActividadSeleccionado(): boolean {
    return !!this.form.get('idEstadoActividad')?.value;
  }

  getEstadoActividadSeleccionado(): any {
    const id = this.form.get('idEstadoActividad')?.value;
    if (!id) return null;
    return this.estadosActividad().find(e => (e.idEstadoActividad || e.id) === id);
  }

  toggleEstadoActividad(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idEstadoActividad')?.value;
    
    if (checked) {
      this.form.patchValue({ idEstadoActividad: Number(id) });
      this.mostrarDropdownEstadoActividad.set(false);
    } else {
      if (Number(currentValue) === Number(id)) {
        this.form.patchValue({ idEstadoActividad: null });
        this.mostrarDropdownEstadoActividad.set(true);
      }
    }
  }

  isEstadoActividadSelected(id: number): boolean {
    const currentValue = this.form.get('idEstadoActividad')?.value;
    return Number(currentValue) === Number(id);
  }

  eliminarEstadoActividad(): void {
    this.form.patchValue({ idEstadoActividad: null });
    this.mostrarDropdownEstadoActividad.set(true);
  }

  mostrarDropdownEstadoActividadFunc(): void {
    this.mostrarDropdownEstadoActividad.set(true);
  }

  // Métodos para Modalidad
  tieneModalidadSeleccionada(): boolean {
    return !!this.form.get('modalidad')?.value;
  }

  getModalidadSeleccionada(): string | null {
    return this.form.get('modalidad')?.value || null;
  }

  toggleModalidad(valor: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.form.patchValue({ modalidad: valor });
      this.mostrarDropdownModalidad.set(false);
    } else {
      this.form.patchValue({ modalidad: '' });
      this.mostrarDropdownModalidad.set(true);
    }
  }

  isModalidadSelected(valor: string): boolean {
    const currentValue = this.form.get('modalidad')?.value;
    return currentValue === valor;
  }

  eliminarModalidad(): void {
    this.form.patchValue({ modalidad: '' });
    this.mostrarDropdownModalidad.set(true);
  }

  mostrarDropdownModalidadFunc(): void {
    this.mostrarDropdownModalidad.set(true);
  }

  getOpcionesModalidad(): string[] {
    return ['Presencial', 'Virtual', 'Híbrida'];
  }

  // Métodos para Local
  tieneLocalSeleccionado(): boolean {
    // Verificar tanto el signal como el formulario para mayor confiabilidad
    return !!(this.localSeleccionado() || this.form.get('idCapacidadInstalada')?.value);
  }

  getLocalSeleccionado(): any {
    // Usar el signal para mejor reactividad
    const local = this.localSeleccionado();
    if (local) return local;
    
    // Si el signal no tiene valor, intentar obtenerlo del formulario
    const id = this.form.get('idCapacidadInstalada')?.value;
    if (id) {
      const localFromForm = this.capacidadesInstaladas().find(c => Number(c.id) === Number(id));
      if (localFromForm) {
        this.localSeleccionado.set(localFromForm);
        return localFromForm;
      }
    }
    return null;
  }

  toggleLocal(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idCapacidadInstalada')?.value;
    
    if (checked) {
      // Si se marca, establecer el nuevo valor
      const idNumero = Number(id);
      // Buscar el local en la lista
      const capacidades = this.capacidadesInstaladas();
      const local = capacidades.find(c => Number(c.id) === idNumero);
      
      if (local) {
        // Actualizar el signal primero
        this.localSeleccionado.set(local);
        // Luego actualizar el formulario
        this.form.patchValue({ idCapacidadInstalada: idNumero }, { emitEvent: true });
        // Ocultar el dropdown
        this.mostrarDropdownLocal.set(false);
      } else {
        // Si no se encuentra el local, al menos actualizar el formulario
        // y buscar después cuando las capacidades estén cargadas
        this.form.patchValue({ idCapacidadInstalada: idNumero }, { emitEvent: true });
        this.mostrarDropdownLocal.set(false);
        // Intentar encontrar el local después de un breve delay
        setTimeout(() => {
          const localEncontrado = this.capacidadesInstaladas().find(c => Number(c.id) === idNumero);
          if (localEncontrado) {
            this.localSeleccionado.set(localEncontrado);
            this.cdr.detectChanges();
          }
        }, 100);
      }
    } else {
      // Si se desmarca y es el valor actual, limpiar
      if (Number(currentValue) === Number(id)) {
        this.localSeleccionado.set(null);
        this.form.patchValue({ idCapacidadInstalada: null }, { emitEvent: true });
        this.mostrarDropdownLocal.set(true);
      }
    }
  }

  isLocalSelected(id: number): boolean {
    const currentValue = this.form.get('idCapacidadInstalada')?.value;
    // Comparar como números para evitar problemas de tipo
    return Number(currentValue) === Number(id);
  }

  eliminarLocal(): void {
    this.form.patchValue({ idCapacidadInstalada: null });
    this.mostrarDropdownLocal.set(true);
  }

  mostrarDropdownLocalFunc(): void {
    this.mostrarDropdownLocal.set(true);
  }
}

