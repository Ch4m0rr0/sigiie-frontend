import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SubactividadService } from '../../core/services/subactividad.service';
import { ActividadesService } from '../../core/services/actividades.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { PersonasService } from '../../core/services/personas.service';
import { SubactividadResponsableService, type SubactividadResponsableCreate } from '../../core/services/subactividad-responsable.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import type { SubactividadCreate } from '../../core/models/subactividad';
import type { Actividad } from '../../core/models/actividad';
import type { Departamento } from '../../core/models/departamento';
import type { CategoriaActividad } from '../../core/models/categoria-actividad';
import type { EstadoActividad } from '../../core/models/estado-actividad';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import type { ActividadMensualInst } from '../../core/models/actividad-mensual-inst';
import { IndicadorService } from '../../core/services/indicador.service';
import type { Indicador } from '../../core/models/indicador';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import type { Docente } from '../../core/models/docente';
import type { Estudiante } from '../../core/models/estudiante';
import type { Administrativo } from '../../core/models/administrativo';
import type { Usuario } from '../../core/models/usuario';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';
import { AlertService } from '../../core/services/alert.service';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-subactividad-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './subactividad-form.component.html',
})
export class SubactividadFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private subactividadService = inject(SubactividadService);
  private actividadesService = inject(ActividadesService);
  private catalogosService = inject(CatalogosService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private indicadorService = inject(IndicadorService);
  private actividadAnualService = inject(ActividadAnualService);
  private subactividadResponsableService = inject(SubactividadResponsableService);
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
  actividades = signal<Actividad[]>([]);
  actividadPadre = signal<Actividad | null>(null);
  isEditMode = signal(false);
  subactividadId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  private cargandoRelaciones = false;
  private actividadesAnualesAnteriores: number[] = [];
  
  // Señales para controlar visibilidad de dropdowns
  mostrarDropdownActividad = signal(false);
  mostrarDropdownActividadAnual = signal(false);
  mostrarDropdownActividadMensual = signal(false);
  mostrarDropdownTipoEvidencia = signal(false);
  mostrarDropdownDepartamentos = signal(false);
  mostrarDropdownProtagonista = signal(false);
  mostrarDropdownEstadoActividad = signal(false);
  mostrarDropdownModalidad = signal(false);
  mostrarDropdownLocal = signal(false);
  
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

  ngOnInit(): void {
    this.initializeForm();
    this.loadActividades();
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
    const actividadId = this.route.snapshot.queryParamMap.get('actividadId');
    
    if (id) {
      this.isEditMode.set(true);
      this.subactividadId.set(+id);
      this.loadSubactividad(+id);
    } else if (actividadId) {
      // Pre-seleccionar actividad si viene de una actividad específica
      this.form.patchValue({ idActividad: +actividadId });
      // Cargar actividad padre para validar fechas
      this.cargarActividadPadre(+actividadId);
    }
  }

  initializeForm(): void {
    const currentYear = new Date().getFullYear();
    this.form = this.fb.group({
      idActividad: ['', Validators.required], // Requerido para subactividades
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      nombreSubactividad: ['', [Validators.required, Validators.minLength(3)]],
      nombreActividad: [''], // Para compatibilidad
      descripcion: [''],
      departamentoId: [null],
      departamentoResponsableId: [[]],
      fechaInicio: [''],
      fechaFin: [''],
      idEstadoActividad: [null],
      modalidad: [''],
      idCapacidadInstalada: [null],
      semanaMes: [null],
      idActividadMensualInst: [[]], // Array para múltiples selecciones
      esPlanificada: [false], // Toggle para indicar si la subactividad es planificada
      idIndicador: [null], // Opcional para subactividades
      idActividadAnual: [[]], // Opcional para subactividades
      objetivo: [''],
      cantidadParticipantesProyectados: [null],
      cantidadParticipantesEstudiantesProyectados: [null],
      cantidadTotalParticipantesProtagonistas: [null],
      idTipoEvidencias: [[]],
      anio: [String(currentYear)],
      horaRealizacion: [''],
      idTipoProtagonista: [[]],
      categoriaActividadId: [null],
      areaConocimientoId: [null],
      ubicacion: [''],
      activo: [true]
    }, { validators: [this.validarFechasConActividadPadre.bind(this), this.validarPlanificacion.bind(this)] });

    this.form.get('nombreSubactividad')?.valueChanges.subscribe(value => {
      if (value && this.form.get('nombre')?.value !== value) {
        this.form.patchValue({ nombre: value }, { emitEvent: false });
      }
      if (value && this.form.get('nombreActividad')?.value !== value) {
        this.form.patchValue({ nombreActividad: value }, { emitEvent: false });
      }
    });

    this.form.get('nombreActividad')?.valueChanges.subscribe(value => {
      if (value && this.form.get('nombreSubactividad')?.value !== value) {
        this.form.patchValue({ nombreSubactividad: value }, { emitEvent: false });
      }
    });

    this.form.get('nombre')?.valueChanges.subscribe(value => {
      if (value && this.form.get('nombreSubactividad')?.value !== value) {
        this.form.patchValue({ nombreSubactividad: value }, { emitEvent: false });
      }
    });

    // Suscripción para detectar cambios en idCapacidadInstalada
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

    // Suscripción para cargar actividad padre cuando se selecciona
    this.form.get('idActividad')?.valueChanges.subscribe(idActividad => {
      if (idActividad) {
        this.cargarActividadPadre(idActividad);
      } else {
        this.actividadPadre.set(null);
      }
    });

    // Suscripciones para validar fechas cuando cambian
    this.form.get('fechaInicio')?.valueChanges.subscribe(() => {
      this.form.updateValueAndValidity();
    });

    this.form.get('fechaFin')?.valueChanges.subscribe(() => {
      this.form.updateValueAndValidity();
    });

    // Suscripción para esPlanificada - actualizar validaciones cuando cambie
    this.form.get('esPlanificada')?.valueChanges.subscribe(esPlanificada => {
      // Actualizar validaciones del formulario
      this.form.updateValueAndValidity();
      
      // Si cambia a no planificada, limpiar selecciones automáticas (pero mantener las manuales)
      if (!esPlanificada) {
        // No limpiar las selecciones, solo actualizar validaciones
        // El usuario puede mantener sus selecciones si las hizo manualmente
      } else {
        // Si cambia a planificada y hay una actividad padre, intentar cargar automáticamente
        const idActividad = this.form.get('idActividad')?.value;
        if (idActividad) {
          this.cargarActividadPadre(idActividad);
        }
      }
    });

    // Suscripción para indicador (opcional)
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

    // Suscripción para actividades anuales
    this.form.get('idActividadAnual')?.valueChanges.subscribe(idActividadAnual => {
      if (this.cargandoRelaciones) return;
      
      const actividadesAnuales = Array.isArray(idActividadAnual) ? idActividadAnual : (idActividadAnual ? [idActividadAnual] : []);
      
      const actividadesAgregadas = actividadesAnuales.filter(id => !this.actividadesAnualesAnteriores.includes(id));
      const actividadesEliminadas = this.actividadesAnualesAnteriores.filter(id => !actividadesAnuales.includes(id));
      
      if (actividadesAgregadas.length > 0) {
        actividadesAgregadas.forEach(idAnual => {
          this.actividadMensualInstService.getByActividadAnual(idAnual).subscribe({
            next: (actividadesMensuales) => {
              const actividadesFiltradas = (actividadesMensuales || []).filter(m => m.idActividadAnual === idAnual);
              const mensualesActuales = this.actividadesMensualesFiltradas();
              const todasLasMensuales = [...mensualesActuales, ...actividadesFiltradas];
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
      
      if (actividadesEliminadas.length > 0) {
        const mensualesActuales = this.actividadesMensualesFiltradas();
        const mensualesFiltradas = mensualesActuales.filter(m => 
          !actividadesEliminadas.includes(m.idActividadAnual)
        );
        this.actividadesMensualesFiltradas.set(mensualesFiltradas);
        
        const idMensualesActuales = this.form.get('idActividadMensualInst')?.value || [];
        const idMensualesValidos = Array.isArray(idMensualesActuales) 
          ? idMensualesActuales.filter(id => mensualesFiltradas.find(m => m.idActividadMensualInst === id))
          : [];
        this.form.patchValue({ idActividadMensualInst: idMensualesValidos }, { emitEvent: false });
      }
      
      if (actividadesAnuales.length === 0) {
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({ idActividadMensualInst: [] }, { emitEvent: false });
      }
      
      this.actividadesAnualesAnteriores = [...actividadesAnuales];
    });
  }

  loadActividades(): void {
    this.actividadesService.list().subscribe({
      next: (data) => this.actividades.set(data),
      error: (err) => console.error('Error loading actividades:', err)
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

  cargarActividadPadre(idActividad: number): void {
    this.actividadesService.get(idActividad).subscribe({
      next: (actividad) => {
        this.actividadPadre.set(actividad);
        // Validar fechas si ya están establecidas
        this.form.updateValueAndValidity();

        // Solo cargar automáticamente indicador, actividades anuales y mensuales si la subactividad es planificada
        const esPlanificada = this.form.get('esPlanificada')?.value;
        if (!esPlanificada) {
          // Si no es planificada, no cargar automáticamente pero sí validar fechas
          return;
        }

        // Cargar automáticamente indicador, actividades anuales y mensuales si existen
        if (actividad.idIndicador) {
          // Establecer el indicador en el formulario
          this.form.patchValue({ idIndicador: actividad.idIndicador }, { emitEvent: false });
          
          // Cargar actividades anuales asociadas al indicador
          this.cargandoRelaciones = true;
          this.actividadAnualService.getByIndicador(actividad.idIndicador).subscribe({
            next: (actividadesAnuales) => {
              const actividadesFiltradas = (actividadesAnuales || []).filter(a => {
                const idIndicadorNum = Number(actividad.idIndicador);
                const aIdIndicadorNum = Number(a.idIndicador);
                return aIdIndicadorNum === idIndicadorNum;
              });
              this.actividadesAnualesFiltradas.set(actividadesFiltradas);
              
              // Si la actividad tiene actividades anuales asociadas, seleccionarlas
              if (actividad.idActividadAnual) {
                const idActividadAnualArray = Array.isArray(actividad.idActividadAnual) 
                  ? actividad.idActividadAnual 
                  : [actividad.idActividadAnual];
                
                // Filtrar solo las que existen en las actividades anuales cargadas
                const idsValidos = idActividadAnualArray.filter(id => 
                  actividadesFiltradas.some(a => a.idActividadAnual === id)
                );
                
                if (idsValidos.length > 0) {
                  this.form.patchValue({ idActividadAnual: idsValidos }, { emitEvent: false });
                  
                  // Cargar actividades mensuales asociadas a las actividades anuales seleccionadas
                  const requestsMensuales = idsValidos.map(idAnual => 
                    this.actividadMensualInstService.getByActividadAnual(idAnual)
                  );
                  
                  if (requestsMensuales.length > 0) {
                    forkJoin(requestsMensuales).pipe(
                      map(results => results.flat()),
                      catchError(() => of([]))
                    ).subscribe(mensuales => {
                      // Eliminar duplicados
                      const mensualesUnicas = mensuales.filter((mensual, index, self) =>
                        index === self.findIndex(m => m.idActividadMensualInst === mensual.idActividadMensualInst)
                      );
                      this.actividadesMensualesFiltradas.set(mensualesUnicas);
                      
                      // Si la actividad tiene actividades mensuales asociadas, seleccionarlas
                      if (actividad.idActividadMensualInst) {
                        const idActividadMensualInstArray = Array.isArray(actividad.idActividadMensualInst) 
                          ? actividad.idActividadMensualInst 
                          : [actividad.idActividadMensualInst];
                        
                        // Filtrar solo las que existen en las actividades mensuales cargadas
                        const idsMensualesValidos = idActividadMensualInstArray.filter(id => 
                          mensualesUnicas.some(m => m.idActividadMensualInst === id)
                        );
                        
                        if (idsMensualesValidos.length > 0) {
                          this.form.patchValue({ idActividadMensualInst: idsMensualesValidos }, { emitEvent: false });
                        }
                      }
                      this.cargandoRelaciones = false;
                    });
                  } else {
                    this.cargandoRelaciones = false;
                  }
                } else {
                  this.cargandoRelaciones = false;
                }
              } else {
                this.cargandoRelaciones = false;
              }
            },
            error: (err) => {
              console.error('Error cargando actividades anuales:', err);
              this.actividadesAnualesFiltradas.set([]);
              this.cargandoRelaciones = false;
            }
          });
        }
      },
      error: (err) => {
        console.error('Error loading actividad padre:', err);
        this.actividadPadre.set(null);
      }
    });
  }

  // Validador de formulario para fechas con actividad padre
  validarFechasConActividadPadre(): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      const actividadPadre = this.actividadPadre();
      if (!actividadPadre) return null;

      const fechaInicio = control.get('fechaInicio')?.value;
      const fechaFin = control.get('fechaFin')?.value;

      if (fechaInicio || fechaFin) {
        const fechaInicioPadre = actividadPadre.fechaInicio ? new Date(actividadPadre.fechaInicio) : null;
        const fechaFinPadre = actividadPadre.fechaFin ? new Date(actividadPadre.fechaFin) : null;

        if (fechaInicio) {
          const fechaInicioSub = new Date(fechaInicio);
          if (fechaInicioPadre && fechaInicioSub < fechaInicioPadre) {
            control.get('fechaInicio')?.setErrors({ 
              fechaFueraDeRango: true,
              mensaje: `La fecha de inicio debe ser posterior o igual a ${fechaInicioPadre.toISOString().split('T')[0]}`
            });
            return { fechaInicioFueraDeRango: true };
          }
          if (fechaFinPadre && fechaInicioSub > fechaFinPadre) {
            control.get('fechaInicio')?.setErrors({ 
              fechaFueraDeRango: true,
              mensaje: `La fecha de inicio debe ser anterior o igual a ${fechaFinPadre.toISOString().split('T')[0]}`
            });
            return { fechaInicioFueraDeRango: true };
          }
        }

        if (fechaFin) {
          const fechaFinSub = new Date(fechaFin);
          if (fechaInicioPadre && fechaFinSub < fechaInicioPadre) {
            control.get('fechaFin')?.setErrors({ 
              fechaFueraDeRango: true,
              mensaje: `La fecha de fin debe ser posterior o igual a ${fechaInicioPadre.toISOString().split('T')[0]}`
            });
            return { fechaFinFueraDeRango: true };
          }
          if (fechaFinPadre && fechaFinSub > fechaFinPadre) {
            control.get('fechaFin')?.setErrors({ 
              fechaFueraDeRango: true,
              mensaje: `La fecha de fin debe ser anterior o igual a ${fechaFinPadre.toISOString().split('T')[0]}`
            });
            return { fechaFinFueraDeRango: true };
          }
        }
      }

      return null;
    };
  }

  // Validador de formulario para planificación
  validarPlanificacion(): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      const esPlanificada = control.get('esPlanificada')?.value;
      
      // Si no es planificada, no hay validación requerida
      if (!esPlanificada) {
        // Limpiar errores de validación de planificación si existen
        const errors = control.errors;
        if (errors && errors['planificacionRequerida']) {
          delete errors['planificacionRequerida'];
          if (Object.keys(errors).length === 0) {
            control.setErrors(null);
          } else {
            control.setErrors(errors);
          }
        }
        return null;
      }

      // Si es planificada, debe tener al menos uno de: idIndicador, idActividadAnual, o idActividadMensualInst
      const idIndicador = control.get('idIndicador')?.value;
      const idActividadAnual = control.get('idActividadAnual')?.value;
      const idActividadMensualInst = control.get('idActividadMensualInst')?.value;

      const tieneIndicador = idIndicador !== null && idIndicador !== undefined;
      const tieneActividadAnual = Array.isArray(idActividadAnual) 
        ? idActividadAnual.length > 0 
        : (idActividadAnual !== null && idActividadAnual !== undefined);
      const tieneActividadMensual = Array.isArray(idActividadMensualInst) 
        ? idActividadMensualInst.length > 0 
        : (idActividadMensualInst !== null && idActividadMensualInst !== undefined);

      if (!tieneIndicador && !tieneActividadAnual && !tieneActividadMensual) {
        return { 
          planificacionRequerida: true,
          mensaje: 'Las subactividades planificadas deben tener al menos un indicador, una actividad anual o una actividad mensual'
        };
      }

      return null;
    };
  }

  cargarActividadesPorIndicador(idIndicador: number, skipCheck: boolean = false): void {
    if (!skipCheck && this.cargandoRelaciones) return;
    
    this.cargandoRelaciones = true;
    
    this.actividadAnualService.getByIndicador(idIndicador).subscribe({
      next: (actividadesAnuales) => {
        const actividadesFiltradas = (actividadesAnuales || []).filter(a => {
          const idIndicadorNum = Number(idIndicador);
          const aIdIndicadorNum = Number(a.idIndicador);
          return aIdIndicadorNum === idIndicadorNum;
        });
        this.actividadesAnualesFiltradas.set(actividadesFiltradas);
        this.actividadesMensualesFiltradas.set([]);
        this.cargandoRelaciones = false;
      },
      error: (err) => {
        console.error('Error cargando actividades anuales:', err);
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.cargandoRelaciones = false;
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

  loadTiposEvidencia(): void {
    this.catalogosService.getTiposEvidencia().subscribe({
      next: (data) => this.tiposEvidencia.set(data || []),
      error: (err) => {
        console.error('Error loading tipos evidencia:', err);
        this.tiposEvidencia.set([]);
      }
    });
  }

  loadSubactividad(id: number): void {
    this.loading.set(true);
    this.subactividadService.getById(id).subscribe({
      next: (data) => {
        console.log('📥 Datos recibidos del backend para subactividad:', data);
        
        // Convertir horaRealizacion de "HH:MM:SS" a "HH:MM" para el input type="time"
        let horaRealizacionFormatted = '';
        if (data.horaRealizacion) {
          const horaStr = String(data.horaRealizacion);
          // Si viene como "10:00:00", tomar solo "10:00"
          if (horaStr.includes(':')) {
            const partes = horaStr.split(':');
            horaRealizacionFormatted = `${partes[0]}:${partes[1]}`;
          } else {
            horaRealizacionFormatted = horaStr;
          }
        }

        const nombreSubactividad = data.nombreSubactividad || data.nombreActividad || data.nombre || '';
        
        const departamentoResponsableIdArray = Array.isArray(data.departamentoResponsableId) 
          ? data.departamentoResponsableId 
          : (data.departamentoResponsableId ? [data.departamentoResponsableId] : []);
        
        const idActividadAnualArray = Array.isArray(data.idActividadAnual) 
          ? data.idActividadAnual 
          : (data.idActividadAnual ? [data.idActividadAnual] : []);
        
        const idTipoProtagonistaArray = Array.isArray(data.idTipoProtagonista) 
          ? data.idTipoProtagonista 
          : (data.idTipoProtagonista ? [data.idTipoProtagonista] : []);
        
        const idActividadMensualInstArray = Array.isArray(data.idActividadMensualInst) 
          ? data.idActividadMensualInst 
          : (data.idActividadMensualInst ? [data.idActividadMensualInst] : []);
        
        const idTipoEvidenciasArray = Array.isArray(data.idTipoEvidencias) 
          ? data.idTipoEvidencias 
          : (data.idTipoEvidencias ? [data.idTipoEvidencias] : []);

        console.log('📋 Valores a establecer en el formulario:', {
          objetivo: data.objetivo,
          horaRealizacion: horaRealizacionFormatted,
          horaRealizacionOriginal: data.horaRealizacion,
          idEstadoActividad: data.idEstadoActividad,
          idCapacidadInstalada: data.idCapacidadInstalada,
          idTipoProtagonista: idTipoProtagonistaArray,
          idTipoProtagonistaOriginal: data.idTipoProtagonista,
          cantidadTotalParticipantesProtagonistas: data.cantidadTotalParticipantesProtagonistas,
          idTipoEvidencias: idTipoEvidenciasArray,
          idTipoEvidenciasOriginal: data.idTipoEvidencias
        });
        
        console.log('🔍 Verificación de campos específicos en data:', {
          'data.objetivo': data.objetivo,
          'data.horaRealizacion': data.horaRealizacion,
          'data.idCapacidadInstalada': data.idCapacidadInstalada,
          'data.idTipoProtagonista': data.idTipoProtagonista,
          'data.idTipoEvidencias': data.idTipoEvidencias,
          'data.cantidadTotalParticipantesProtagonistas': data.cantidadTotalParticipantesProtagonistas
        });
        
        // Esperar un momento para asegurar que los catálogos estén cargados
        setTimeout(() => {
        this.form.patchValue({
          idActividad: data.idActividad,
          nombre: nombreSubactividad,
          nombreActividad: nombreSubactividad,
          nombreSubactividad: nombreSubactividad,
          descripcion: data.descripcion || '',
          departamentoId: data.departamentoId || null,
          departamentoResponsableId: departamentoResponsableIdArray,
          fechaInicio: data.fechaInicio || '',
          fechaFin: data.fechaFin || '',
          idEstadoActividad: data.idEstadoActividad !== undefined && data.idEstadoActividad !== null ? data.idEstadoActividad : null,
          modalidad: data.modalidad || '',
          idCapacidadInstalada: data.idCapacidadInstalada !== undefined && data.idCapacidadInstalada !== null ? data.idCapacidadInstalada : null,
          semanaMes: data.semanaMes || null,
          idActividadMensualInst: idActividadMensualInstArray,
          idIndicador: data.idIndicador || null,
          idActividadAnual: idActividadAnualArray,
          objetivo: data.objetivo !== undefined && data.objetivo !== null ? data.objetivo : '',
          anio: data.anio ? String(data.anio) : String(new Date().getFullYear()),
          horaRealizacion: horaRealizacionFormatted,
          cantidadParticipantesProyectados: data.cantidadParticipantesProyectados !== undefined && data.cantidadParticipantesProyectados !== null ? data.cantidadParticipantesProyectados : null,
          cantidadParticipantesEstudiantesProyectados: data.cantidadParticipantesEstudiantesProyectados !== undefined && data.cantidadParticipantesEstudiantesProyectados !== null ? data.cantidadParticipantesEstudiantesProyectados : null,
          cantidadTotalParticipantesProtagonistas: data.cantidadTotalParticipantesProtagonistas !== undefined && data.cantidadTotalParticipantesProtagonistas !== null ? data.cantidadTotalParticipantesProtagonistas : null,
          idTipoProtagonista: idTipoProtagonistaArray,
          idTipoEvidencias: idTipoEvidenciasArray,
          categoriaActividadId: data.categoriaActividadId || null,
          areaConocimientoId: data.areaConocimientoId || null,
          ubicacion: data.ubicacion || '',
          activo: data.activo ?? true,
          esPlanificada: data.esPlanificada ?? false
        }, { emitEvent: false });

        console.log('✅ Formulario actualizado. Valores actuales:', {
          objetivo: this.form.get('objetivo')?.value,
          horaRealizacion: this.form.get('horaRealizacion')?.value,
          idEstadoActividad: this.form.get('idEstadoActividad')?.value,
          idCapacidadInstalada: this.form.get('idCapacidadInstalada')?.value,
          idTipoProtagonista: this.form.get('idTipoProtagonista')?.value,
          cantidadTotalParticipantesProtagonistas: this.form.get('cantidadTotalParticipantesProtagonistas')?.value,
          idTipoEvidencias: this.form.get('idTipoEvidencias')?.value
        });
        
        // Forzar detección de cambios para asegurar que los valores se muestren en la UI
        this.form.updateValueAndValidity({ emitEvent: false });

        // Verificar que los catálogos estén cargados
        console.log('📚 Catálogos cargados:', {
          estadosActividad: this.estadosActividad().length,
          tiposEvidencia: this.tiposEvidencia().length,
          tiposProtagonista: this.tiposProtagonista().length,
          capacidadesInstaladas: this.capacidadesInstaladas().length
        });

        // Buscar y establecer el local seleccionado
        if (data.idCapacidadInstalada) {
          const local = this.capacidadesInstaladas().find(c => Number(c.id) === Number(data.idCapacidadInstalada));
          console.log('🏢 Local encontrado:', local, 'para ID:', data.idCapacidadInstalada, 'de', this.capacidadesInstaladas().length, 'locales disponibles');
          this.localSeleccionado.set(local || null);
          if (local) {
            this.mostrarDropdownLocal.set(false);
          }
        } else {
          console.log('⚠️ No se encontró idCapacidadInstalada en los datos:', data.idCapacidadInstalada);
          this.localSeleccionado.set(null);
        }

        // Actualizar estados de los dropdowns después de cargar los datos
        // Ocultar dropdowns que tienen valores seleccionados
        if (data.idEstadoActividad) {
          this.mostrarDropdownEstadoActividad.set(false);
          console.log('📊 Estado de actividad seleccionado:', data.idEstadoActividad);
        }
        if (idTipoEvidenciasArray.length > 0) {
          this.mostrarDropdownTipoEvidencia.set(false);
          console.log('📎 Tipos de evidencia seleccionados:', idTipoEvidenciasArray);
        } else {
          console.log('⚠️ No se encontraron tipos de evidencia en los datos. idTipoEvidencias:', data.idTipoEvidencias);
        }
        if (idTipoProtagonistaArray.length > 0) {
          this.mostrarDropdownProtagonista.set(false);
          console.log('👥 Protagonistas seleccionados:', idTipoProtagonistaArray);
        }
        if (data.idCapacidadInstalada) {
          this.mostrarDropdownLocal.set(false);
        }
        if (departamentoResponsableIdArray.length > 0) {
          this.mostrarDropdownDepartamentos.set(false);
        }
        }, 100); // Pequeño delay para asegurar que los catálogos estén cargados

        // Cargar actividad padre para validar fechas
        if (data.idActividad) {
          this.cargarActividadPadre(data.idActividad);
        }

        if (data.idIndicador) {
          this.cargarActividadesPorIndicador(data.idIndicador, true);
        } else {
          this.actividadesAnualesFiltradas.set([]);
          this.actividadesMensualesFiltradas.set([]);
          this.cargandoRelaciones = false;
          this.loading.set(false);
        }

        // Cargar responsables
        this.subactividadResponsableService.getBySubactividad(id).subscribe({
          next: (responsables) => {
            console.log('👥 Responsables recibidos del backend:', responsables);
            if (responsables && responsables.length > 0) {
              responsables.forEach(responsable => {
                console.log('👤 Procesando responsable:', responsable);
              if (responsable.idDocente) {
                  this.agregarPersona('docente');
                  const docenteIndex = this.docentesArray.length - 1;
                  this.docentesArray.at(docenteIndex).patchValue({
                    idPersona: responsable.idDocente
                  });
                  if (!this.tiposResponsableSeleccionados().includes('docente')) {
                    this.tiposResponsableSeleccionados.set([...this.tiposResponsableSeleccionados(), 'docente']);
                  }
                  console.log('✅ Docente agregado:', responsable.idDocente);
              } else if (responsable.idAdministrativo) {
                  this.agregarPersona('administrativo');
                  const adminIndex = this.administrativosArray.length - 1;
                  this.administrativosArray.at(adminIndex).patchValue({
                    idPersona: responsable.idAdministrativo
                  });
                  if (!this.tiposResponsableSeleccionados().includes('administrativo')) {
                    this.tiposResponsableSeleccionados.set([...this.tiposResponsableSeleccionados(), 'administrativo']);
                  }
                  console.log('✅ Administrativo agregado:', responsable.idAdministrativo);
                }
              });
              console.log('✅ Total responsables cargados:', responsables.length);
            } else {
              console.log('⚠️ No se encontraron responsables para esta subactividad');
            }
            this.loading.set(false);
          },
          error: (err) => {
            console.warn('⚠️ Error loading responsables:', err);
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error loading subactividad:', err);
        this.error.set('Error al cargar la subactividad');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    const nombreValue = this.form.get('nombreSubactividad')?.value || this.form.get('nombreActividad')?.value || this.form.get('nombre')?.value;
    if (nombreValue && !this.form.get('nombreSubactividad')?.value) {
      this.form.patchValue({ nombreSubactividad: nombreValue });
    }
    if (nombreValue && !this.form.get('nombreActividad')?.value) {
      this.form.patchValue({ nombreActividad: nombreValue });
    }
    if (nombreValue && !this.form.get('nombre')?.value) {
      this.form.patchValue({ nombre: nombreValue });
    }

    // Validar fechas con actividad padre antes de enviar
    this.form.updateValueAndValidity();

    // Verificar si hay errores de validación de fechas
    const fechaInicioErrors = this.form.get('fechaInicio')?.errors;
    const fechaFinErrors = this.form.get('fechaFin')?.errors;
    if (fechaInicioErrors?.['fechaFueraDeRango'] || fechaFinErrors?.['fechaFueraDeRango']) {
      const errorMessage = fechaFinErrors?.['mensaje'] || fechaInicioErrors?.['mensaje'] || 'Las fechas de la subactividad deben estar dentro del rango de fechas de la actividad padre.';
      this.error.set(errorMessage);
      this.form.markAllAsTouched();
      return;
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
        // El input type="time" devuelve el formato "HH:MM", necesitamos convertirlo a "HH:MM:SS" para el backend
        const horaStr = String(formValue.horaRealizacion).trim();
        if (horaStr.includes(':')) {
          const partes = horaStr.split(':');
          if (partes.length === 2) {
            // Formato "HH:MM" -> "HH:MM:SS"
            horaRealizacion = `${partes[0]}:${partes[1]}:00`;
          } else if (partes.length === 3) {
            // Ya tiene segundos, usar tal cual
            horaRealizacion = horaStr;
          }
        } else {
          // Si no tiene formato de hora, intentar convertir
          horaRealizacion = horaStr;
        }
        console.log('🕐 Hora de realización convertida:', horaRealizacion, 'desde:', formValue.horaRealizacion);
      }

      // Preparar actividades anuales y mensuales - el backend espera un número, no un array
      // Tomar el primer elemento si es un array, o el número directamente
      let idActividadAnualValue: number | undefined = undefined;
      if (formValue.idActividadAnual !== null && formValue.idActividadAnual !== undefined) {
        if (Array.isArray(formValue.idActividadAnual) && formValue.idActividadAnual.length > 0) {
          idActividadAnualValue = formValue.idActividadAnual[0];
        } else if (!Array.isArray(formValue.idActividadAnual)) {
          idActividadAnualValue = formValue.idActividadAnual;
        }
      }
      
      let idActividadMensualInstValue: number | undefined = undefined;
      if (formValue.idActividadMensualInst !== null && formValue.idActividadMensualInst !== undefined) {
        if (Array.isArray(formValue.idActividadMensualInst) && formValue.idActividadMensualInst.length > 0) {
          idActividadMensualInstValue = formValue.idActividadMensualInst[0];
        } else if (!Array.isArray(formValue.idActividadMensualInst)) {
          idActividadMensualInstValue = formValue.idActividadMensualInst;
        }
      }

      // Preparar arrays para tipos de protagonista y tipos de evidencia (estos sí pueden ser arrays)
      const idTipoProtagonistaArray = Array.isArray(formValue.idTipoProtagonista) 
        ? formValue.idTipoProtagonista.filter((id: number) => id !== null && id !== undefined)
        : (formValue.idTipoProtagonista ? [formValue.idTipoProtagonista] : []);
      
      const idTipoEvidenciasArray = Array.isArray(formValue.idTipoEvidencias) 
        ? formValue.idTipoEvidencias.filter((id: number) => id !== null && id !== undefined)
        : (formValue.idTipoEvidencias ? [formValue.idTipoEvidencias] : []);

      const data: SubactividadCreate = {
        idActividad: formValue.idActividad,
        nombre: formValue.nombreSubactividad || formValue.nombreActividad || formValue.nombre,
        nombreSubactividad: formValue.nombreSubactividad || formValue.nombreActividad || formValue.nombre,
        descripcion: formValue.descripcion || undefined,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        departamentoResponsableId: Array.isArray(formValue.departamentoResponsableId) && formValue.departamentoResponsableId.length > 0 ? formValue.departamentoResponsableId[0] : undefined,
        ubicacion: formValue.ubicacion || undefined,
        modalidad: formValue.modalidad || undefined,
        activo: formValue.activo !== undefined ? formValue.activo : true,
        idCapacidadInstalada: (formValue.idCapacidadInstalada !== null && formValue.idCapacidadInstalada !== undefined && formValue.idCapacidadInstalada > 0) ? formValue.idCapacidadInstalada : undefined,
        // Agregar campos de planificación
        esPlanificada: formValue.esPlanificada !== undefined ? formValue.esPlanificada : false,
        idIndicador: formValue.idIndicador || undefined,
        idActividadAnual: idActividadAnualValue,
        idActividadMensualInst: idActividadMensualInstValue,
        // Agregar campos adicionales
        objetivo: formValue.objetivo !== undefined && formValue.objetivo !== null ? formValue.objetivo : undefined,
        horaRealizacion: horaRealizacion || undefined,
        idEstadoActividad: formValue.idEstadoActividad !== undefined && formValue.idEstadoActividad !== null ? formValue.idEstadoActividad : undefined,
        idTipoProtagonista: idTipoProtagonistaArray.length > 0 ? idTipoProtagonistaArray : undefined,
        cantidadTotalParticipantesProtagonistas: formValue.cantidadTotalParticipantesProtagonistas !== undefined && formValue.cantidadTotalParticipantesProtagonistas !== null ? formValue.cantidadTotalParticipantesProtagonistas : undefined,
        idTipoEvidencias: idTipoEvidenciasArray.length > 0 ? idTipoEvidenciasArray : undefined
      };

      console.log('📤 Datos a enviar al backend (SubactividadCreate):', JSON.stringify(data, null, 2));

      if (this.isEditMode()) {
        this.subactividadService.update(this.subactividadId()!, data).subscribe({
          next: () => {
            if (this.subactividadId()) {
              this.crearResponsablesParaSubactividad(this.subactividadId()!);
            } else {
              this.mostrarAlertaExito();
            }
                      },
                      error: (err: any) => {
            console.error('Error saving subactividad:', err);
            let errorMessage = 'Error al guardar la subactividad';
            if (err.error?.message) {
              errorMessage = err.error.message;
            } else if (err.error?.error) {
              errorMessage = err.error.error;
            } else if (typeof err.error === 'string') {
              errorMessage = err.error;
            }
            this.error.set(errorMessage);
            this.loading.set(false);
                      }
                    });
                  } else {
        this.subactividadService.create(data).subscribe({
          next: (subactividadCreada) => {
            if (subactividadCreada.idSubactividad) {
              this.crearResponsablesParaSubactividad(subactividadCreada.idSubactividad);
            } else {
              this.mostrarAlertaExito();
            }
                      },
                      error: (err: any) => {
            console.error('Error saving subactividad:', err);
            let errorMessage = 'Error al guardar la subactividad';
            
            // Manejar errores de validación del backend
            if (err.error?.errors && typeof err.error.errors === 'object') {
              const validationErrors = Object.entries(err.error.errors)
                .map(([field, messages]: [string, any]) => {
                  const messageList = Array.isArray(messages) ? messages.join(', ') : String(messages);
                  return `${field}: ${messageList}`;
                })
                .join('\n');
              errorMessage = `Errores de validación:\n${validationErrors}`;
            } else if (err.error?.message) {
              errorMessage = err.error.message;
            } else if (err.error?.error) {
              errorMessage = err.error.error;
            } else if (err.error?.title) {
              errorMessage = err.error.title;
            } else if (typeof err.error === 'string') {
              errorMessage = err.error;
            }
            
            this.error.set(errorMessage);
            this.loading.set(false);
                      }
                    });
                  }
                } else {
      this.form.markAllAsTouched();
    }
  }

  // Métodos para responsables (igual que actividad planificada)
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

  crearResponsablesParaSubactividad(idSubactividad: number): void {
    const responsables: SubactividadResponsableCreate[] = [];
    const formValue = this.formResponsable.value;

    // Solo agregar docentes y administrativos (el backend de subactividad solo soporta estos)
    this.docentesArray.controls.forEach((control) => {
      const idDocente = control.get('idPersona')?.value;
      if (idDocente) {
        responsables.push({
          idSubactividad,
          idDocente,
                activo: true
        });
      }
    });

    this.administrativosArray.controls.forEach((control) => {
      const idAdmin = control.get('idPersona')?.value;
      if (idAdmin) {
        responsables.push({
          idSubactividad,
          idAdministrativo: idAdmin,
          activo: true
        });
      }
    });

    // Crear todos los responsables en paralelo
    if (responsables.length > 0) {
      forkJoin(
        responsables.map(responsable => this.subactividadResponsableService.create(responsable))
      ).subscribe({
                next: () => {
          this.mostrarAlertaExito();
        },
        error: (err) => {
          console.error('Error creando responsables:', err);
          this.mostrarAlertaExito();
                }
              });
            } else {
      this.mostrarAlertaExito();
    }
  }

  private mostrarAlertaExito(): void {
    const nombreSubactividad = this.form.get('nombreSubactividad')?.value || this.form.get('nombreActividad')?.value || 'la subactividad';
    
    if (this.isEditMode()) {
      this.alertService.success(
        '¡Subactividad actualizada!',
        `La subactividad "${nombreSubactividad}" ha sido actualizada correctamente.`
      ).then(() => {
              this.router.navigate(['/subactividades']);
      });
    } else {
      this.alertService.success(
        '¡Subactividad creada exitosamente!',
        `La subactividad "${nombreSubactividad}" ha sido creada correctamente.`
      ).then(() => {
        this.router.navigate(['/subactividades']);
      });
    }
  }

  // Métodos para dropdowns (igual que actividad planificada)
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

  isActividadAnualSelected(id: number): boolean {
    const currentValue = this.form.get('idActividadAnual')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  isActividadMensualSelected(id: number): boolean {
    const currentValue = this.form.get('idActividadMensualInst')?.value || [];
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

  tieneEstadoActividadSeleccionado(): boolean {
    return !!this.form.get('idEstadoActividad')?.value;
  }

  getEstadoActividadSeleccionado(): any {
    const id = this.form.get('idEstadoActividad')?.value;
    if (!id) return null;
    return this.estadosActividad().find(e => (e.idEstadoActividad || e.id) === id);
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

  tieneModalidadSeleccionada(): boolean {
    return !!this.form.get('modalidad')?.value;
  }

  getModalidadSeleccionada(): string | null {
    return this.form.get('modalidad')?.value || null;
  }

  getOpcionesModalidad(): string[] {
    return ['Presencial', 'Virtual', 'Híbrida'];
  }

  toggleLocal(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idCapacidadInstalada')?.value;
    
    if (checked) {
      const idNumero = Number(id);
      const capacidades = this.capacidadesInstaladas();
      const local = capacidades.find(c => Number(c.id) === idNumero);
      
      if (local) {
        this.localSeleccionado.set(local);
        this.form.patchValue({ idCapacidadInstalada: idNumero }, { emitEvent: true });
        this.mostrarDropdownLocal.set(false);
      } else {
        this.form.patchValue({ idCapacidadInstalada: idNumero }, { emitEvent: true });
        this.mostrarDropdownLocal.set(false);
        setTimeout(() => {
          const localEncontrado = this.capacidadesInstaladas().find(c => Number(c.id) === idNumero);
          if (localEncontrado) {
            this.localSeleccionado.set(localEncontrado);
            this.cdr.detectChanges();
          }
        }, 100);
      }
    } else {
      if (Number(currentValue) === Number(id)) {
        this.localSeleccionado.set(null);
        this.form.patchValue({ idCapacidadInstalada: null }, { emitEvent: true });
        this.mostrarDropdownLocal.set(true);
      }
    }
  }

  isLocalSelected(id: number): boolean {
    const currentValue = this.form.get('idCapacidadInstalada')?.value;
    return Number(currentValue) === Number(id);
  }

  eliminarLocal(): void {
    this.form.patchValue({ idCapacidadInstalada: null });
    this.mostrarDropdownLocal.set(true);
  }

  mostrarDropdownLocalFunc(): void {
    this.mostrarDropdownLocal.set(true);
  }

  tieneLocalSeleccionado(): boolean {
    return !!(this.localSeleccionado() || this.form.get('idCapacidadInstalada')?.value);
  }

  getLocalSeleccionado(): any {
    const local = this.localSeleccionado();
    if (local) return local;
    
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

  /**
   * Verifica si el formulario tiene cambios sin guardar
   */
  private tieneCambiosSinGuardar(): boolean {
    if (!this.form) return false;
    
    // Si está en modo edición, verificar si hay cambios
    if (this.isEditMode()) {
      return this.form.dirty;
    }
    
    // En modo creación, verificar si hay datos ingresados
    const formValue = this.form.value;
    const tieneDatos = !!(
      formValue.nombreSubactividad?.trim() ||
      formValue.nombre?.trim() ||
      formValue.descripcion?.trim() ||
      formValue.fechaInicio ||
      formValue.fechaFin ||
      formValue.horaRealizacion ||
      formValue.idActividad ||
      formValue.idIndicador ||
      (formValue.idActividadAnual && formValue.idActividadAnual.length > 0) ||
      (formValue.idActividadMensualInst && formValue.idActividadMensualInst.length > 0) ||
      formValue.departamentoResponsableId ||
      formValue.idTipoProtagonista ||
      formValue.modalidad ||
      formValue.idCapacidadInstalada ||
      formValue.cantidadParticipantesProyectados ||
      formValue.cantidadTotalParticipantesProtagonistas ||
      formValue.objetivo?.trim() ||
      formValue.ubicacion?.trim() ||
      (formValue.idTipoEvidencias && formValue.idTipoEvidencias.length > 0)
    );
    
    return tieneDatos;
  }

  /**
   * Maneja el clic en el botón de cancelar
   * Muestra alertas de confirmación antes de cancelar
   */
  async onCancel(): Promise<void> {
    // Verificar si hay cambios sin guardar
    const tieneCambios = this.tieneCambiosSinGuardar();
    
    if (tieneCambios) {
      // Si hay cambios, mostrar alerta con opción de guardar
      const result = await this.alertService.confirm(
        '¿Desea cancelar la subactividad?',
        'Tiene cambios sin guardar. ¿Desea guardar la subactividad para más tarde o descartar los cambios?',
        'Guardar para más tarde',
        'Descartar cambios',
        {
          showDenyButton: true,
          denyButtonText: 'Continuar editando',
          denyButtonColor: '#6b7280'
        }
      );
      
      if (result.isConfirmed) {
        // Usuario eligió "Guardar para más tarde"
        // Aquí podrías implementar lógica para guardar en localStorage o similar
        this.confirmarCancelacion();
      } else if (result.isDenied) {
        // Usuario eligió "Continuar editando"
        return; // No hacer nada, quedarse en el formulario
      } else {
        // Usuario eligió "Descartar cambios" o cerró el diálogo
        this.confirmarCancelacion();
      }
    } else {
      // Si no hay cambios, mostrar alerta simple de confirmación
      const result = await this.alertService.confirm(
        '¿Desea cancelar?',
        '¿Está seguro de que desea salir?',
        'Sí, cancelar',
        'No, continuar'
      );
      
      if (result.isConfirmed) {
        this.confirmarCancelacion();
      }
      // Si no confirma, no hacer nada
    }
  }

  /**
   * Confirma la cancelación y navega a la lista de subactividades
   */
  private confirmarCancelacion(): void {
    // Limpiar el formulario actual
    if (this.form) {
      this.form.reset();
      // Restablecer valores por defecto
      this.form.patchValue({
        esPlanificada: false,
        activo: true
      });
    }
    
    // Resetear estado visual
    this.localSeleccionado.set(null);
    
    // Navegar a la lista de subactividades
    this.router.navigate(['/subactividades']);
  }

  // Métodos para dropdown de Actividad
  toggleActividad(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.form.patchValue({ idActividad: Number(id) });
      this.mostrarDropdownActividad.set(false);
    } else {
      if (Number(this.form.get('idActividad')?.value) === Number(id)) {
        this.form.patchValue({ idActividad: null });
        this.mostrarDropdownActividad.set(true);
      }
    }
  }

  isActividadSelected(id: number): boolean {
    const currentValue = this.form.get('idActividad')?.value;
    return Number(currentValue) === Number(id);
  }

  eliminarActividad(): void {
    this.form.patchValue({ idActividad: null });
    this.mostrarDropdownActividad.set(true);
  }

  mostrarDropdownActividadFunc(): void {
    this.mostrarDropdownActividad.set(true);
  }

  tieneActividadSeleccionada(): boolean {
    return !!this.form.get('idActividad')?.value;
  }

  getActividadSeleccionada(): Actividad | null {
    const id = this.form.get('idActividad')?.value;
    if (!id) return null;
    return this.actividades().find(a => a.id === id) || null;
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
}
