import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-actividad-no-planificada-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './actividad-no-planificada-form.component.html',
})
export class ActividadNoPlanificadaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private actividadesService = inject(ActividadesService);
  private catalogosService = inject(CatalogosService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private indicadorService = inject(IndicadorService);
  private actividadAnualService = inject(ActividadAnualService);
  private responsableService = inject(ActividadResponsableService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

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
  }

  initializeForm(): void {
    const currentYear = new Date().getFullYear();
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
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
      idActividadMensualInst: [null],
      esPlanificada: [false], // Siempre false para actividades no planificadas
      idIndicador: [null],
      idActividadAnual: [[]],
      objetivo: [''],
      cantidadParticipantesProyectados: [null, Validators.required],
      cantidadParticipantesEstudiantesProyectados: [null],
      anio: [currentYear],
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

    this.form.get('idIndicador')?.valueChanges.subscribe(idIndicador => {
      if (this.cargandoRelaciones) return;
      
      if (idIndicador) {
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({
          idActividadAnual: null,
          idActividadMensualInst: null
        }, { emitEvent: false });
        
        this.cargarActividadesPorIndicador(idIndicador, false);
      } else {
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({
          idActividadAnual: null,
          idActividadMensualInst: null
        }, { emitEvent: false });
      }
    });

    this.form.get('idActividadAnual')?.valueChanges.subscribe(idActividadAnual => {
      if (this.cargandoRelaciones) return;
      
      const actividadesAnuales = Array.isArray(idActividadAnual) ? idActividadAnual : (idActividadAnual ? [idActividadAnual] : []);
      
      if (actividadesAnuales.length > 0) {
        this.cargarActividadesMensualesPorAnual(actividadesAnuales[0], false);
      } else {
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({ idActividadMensualInst: null }, { emitEvent: false });
      }
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
    
    this.actividadAnualService.getByIndicador(idIndicador).subscribe({
      next: (actividadesAnuales) => {
        const actividadesFiltradas = (actividadesAnuales || []).filter(a => a.idIndicador === idIndicador);
        this.actividadesAnualesFiltradas.set(actividadesFiltradas);
        
        if (skipCheck && actividadAnualActual) {
          const actividadesAnualesArray = Array.isArray(actividadAnualActual) ? actividadAnualActual : [actividadAnualActual];
          const actividadesValidas = actividadesAnualesArray.filter(id => 
            actividadesFiltradas.find(a => a.idActividadAnual === id)
          );
          
          if (actividadesValidas.length > 0) {
            this.form.patchValue({ idActividadAnual: actividadesValidas }, { emitEvent: false });
            this.cargarActividadesMensualesPorAnual(actividadesValidas[0], skipCheck);
          } else {
            this.form.patchValue({ idActividadAnual: [] }, { emitEvent: false });
            this.actividadesMensualesFiltradas.set([]);
            this.cargandoRelaciones = false;
            if (skipCheck) {
              this.loading.set(false);
            }
          }
        } else if (!skipCheck) {
          const actividadAnualActualNormal = this.form.get('idActividadAnual')?.value;
          if (!actividadAnualActualNormal || (Array.isArray(actividadAnualActualNormal) && actividadAnualActualNormal.length === 0)) {
            if (actividadesFiltradas.length > 0) {
              const primeraAnual = actividadesFiltradas[0];
              this.form.patchValue({ idActividadAnual: [primeraAnual.idActividadAnual] }, { emitEvent: false });
              this.cargarActividadesMensualesPorAnual(primeraAnual.idActividadAnual, skipCheck);
            } else {
              this.actividadesMensualesFiltradas.set([]);
              this.cargandoRelaciones = false;
            }
          } else {
            const actividadesAnualesArray = Array.isArray(actividadAnualActualNormal) ? actividadAnualActualNormal : [actividadAnualActualNormal];
            if (actividadesAnualesArray.length > 0) {
              this.cargarActividadesMensualesPorAnual(actividadesAnualesArray[0], skipCheck);
            } else {
              this.actividadesMensualesFiltradas.set([]);
              this.cargandoRelaciones = false;
            }
          }
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
    this.actividadesMensualesFiltradas.set([]);
    const actividadMensualActual = skipCheck ? this.form.get('idActividadMensualInst')?.value : null;
    
    this.actividadMensualInstService.getByActividadAnual(idActividadAnual).subscribe({
      next: (actividadesMensuales) => {
        const actividadesFiltradas = (actividadesMensuales || []).filter(m => m.idActividadAnual === idActividadAnual);
        this.actividadesMensualesFiltradas.set(actividadesFiltradas);
        
        if (skipCheck && actividadMensualActual) {
          const actividadMensualValida = actividadesFiltradas.find(m => m.idActividadMensualInst === actividadMensualActual);
          if (actividadMensualValida) {
            this.form.patchValue({ idActividadMensualInst: actividadMensualActual }, { emitEvent: false });
          } else {
            this.form.patchValue({ idActividadMensualInst: null }, { emitEvent: false });
          }
        } else if (!skipCheck) {
          const actividadMensualActualNormal = this.form.get('idActividadMensualInst')?.value;
          if (!actividadMensualActualNormal && actividadesFiltradas.length > 0) {
            const primeraMensual = actividadesFiltradas[0];
            this.form.patchValue({ idActividadMensualInst: primeraMensual.idActividadMensualInst }, { emitEvent: false });
          }
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

  crearNuevaActividadAnual(): void {
    const indicadorId = this.form.get('idIndicador')?.value;
    if (!indicadorId) {
      this.error.set('Por favor, seleccione un indicador antes de crear una nueva actividad anual.');
      return;
    }
    
    this.router.navigate(['/actividades-anuales/nueva'], {
      queryParams: { idIndicador: indicadorId }
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
          idActividadMensualInst: data.idActividadMensualInst || null,
          esPlanificada: false, // Siempre false para actividades no planificadas
          idIndicador: data.idIndicador || null,
          idActividadAnual: idActividadAnualArray,
          objetivo: data.objetivo || '',
          anio: data.anio || new Date().getFullYear(),
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
        idActividadMensualInst: formValue.idActividadMensualInst || undefined,
        esPlanificada: false, // Siempre false para actividades no planificadas
        idIndicador: formValue.idIndicador || undefined,
        idActividadAnual: Array.isArray(formValue.idActividadAnual) && formValue.idActividadAnual.length > 0 ? formValue.idActividadAnual : undefined,
        objetivo: formValue.objetivo || undefined,
        anio: formValue.anio || undefined,
        horaRealizacion: horaRealizacion,
        cantidadParticipantesProyectados: formValue.cantidadParticipantesProyectados || undefined,
        cantidadParticipantesEstudiantesProyectados: formValue.cantidadParticipantesEstudiantesProyectados || undefined,
        idTipoProtagonista: Array.isArray(formValue.idTipoProtagonista) && formValue.idTipoProtagonista.length > 0 ? formValue.idTipoProtagonista : undefined,
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
            if (responsableActividad && this.actividadId()) {
              this.actualizarResponsable(this.actividadId()!, responsableActividad);
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
                  if (responsableActividad) {
                    this.crearResponsable(actividadCreada.id, responsableActividad);
                  } else {
                    this.router.navigate(['/actividades']);
                  }
                },
                error: (errIndicador) => {
                  console.error('Error al asociar indicador:', errIndicador);
                  if (responsableActividad) {
                    this.crearResponsable(actividadCreada.id, responsableActividad);
                  } else {
                    this.router.navigate(['/actividades']);
                  }
                }
              });
            } else {
              if (responsableActividad && actividadCreada.id) {
                this.crearResponsable(actividadCreada.id, responsableActividad);
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
      newValue = [...currentValue, id];
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
    }
    
    this.form.patchValue({ idTipoProtagonista: newValue });
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
      newValue = [...currentValue, id];
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
    }
    
    this.form.patchValue({ departamentoResponsableId: newValue });
  }

  isDepartamentoResponsableSelected(id: number): boolean {
    const currentValue = this.form.get('departamentoResponsableId')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  toggleActividadAnual(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idActividadAnual')?.value || [];
    let newValue: number[];
    
    if (checked) {
      newValue = [...currentValue, id];
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
    }
    
    this.form.patchValue({ idActividadAnual: newValue });
  }

  isActividadAnualSelected(id: number): boolean {
    const currentValue = this.form.get('idActividadAnual')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  toggleTipoActividad(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idTipoActividad')?.value || [];
    let newValue: number[];
    
    if (checked) {
      newValue = [...currentValue, id];
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
    }
    
    this.form.patchValue({ idTipoActividad: newValue });
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
}

