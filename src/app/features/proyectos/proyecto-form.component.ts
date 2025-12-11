import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProyectosService } from '../../core/services/proyectos.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { EdicionService } from '../../core/services/edicion.service';
import { PersonasService } from '../../core/services/personas.service';
import type { ProyectoCreate, ProyectoParticipanteCreate } from '../../core/models/proyecto';
import type { Departamento } from '../../core/models/departamento';
import type { TipoIniciativa } from '../../core/models/tipo-iniciativa';
import type { TipoInvestigacion } from '../../core/models/tipo-investigacion';
import type { AreaConocimiento } from '../../core/models/area-conocimiento';
import type { TipoDocumento } from '../../core/models/tipo-documento';
import type { Edicion } from '../../core/models/edicion';
import type { Docente } from '../../core/models/docente';
import type { Estudiante } from '../../core/models/estudiante';
import type { Administrativo } from '../../core/models/administrativo';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';
import { AlertService } from '../../core/services/alert.service';
import { forkJoin } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-proyecto-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './proyecto-form.component.html',
})
export class ProyectoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private proyectosService = inject(ProyectosService);
  private catalogosService = inject(CatalogosService);
  private edicionService = inject(EdicionService);
  private personasService = inject(PersonasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertService = inject(AlertService);

  form!: FormGroup;
  isEditMode = signal(false);
  proyectoId = signal<number | null>(null);
  tipoProyecto = signal<string | null>(null); // Para 'planificado' o 'no-planificado'
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Catálogos
  departamentos = signal<Departamento[]>([]);
  estadosProyecto = signal<any[]>([]);
  ediciones = signal<Edicion[]>([]);
  tiposIniciativa = signal<TipoIniciativa[]>([]);
  tiposInvestigacion = signal<TipoInvestigacion[]>([]);
  areasConocimiento = signal<AreaConocimiento[]>([]);
  tiposDocumento = signal<TipoDocumento[]>([]);

  // Participantes
  docentes = signal<Docente[]>([]);
  estudiantes = signal<Estudiante[]>([]);
  administrativos = signal<Administrativo[]>([]);

  // Búsqueda para participantes
  terminoBusquedaDocente = signal<string>('');
  terminoBusquedaEstudiante = signal<string>('');
  terminoBusquedaAdministrativo = signal<string>('');
  mostrarDropdownDocente = signal(false);
  mostrarDropdownEstudiante = signal(false);
  mostrarDropdownAdministrativo = signal(false);

  // Acordeones para secciones del formulario
  seccionInformacionExpandida = signal(true);
  seccionClasificacionExpandida = signal(true);
  seccionParticipantesExpandida = signal(true);
  seccionDocumentosExpandida = signal(true);

  ngOnInit(): void {
    this.initializeForm();
    
    // Leer query param para tipo de proyecto
    const tipo = this.route.snapshot.queryParamMap.get('tipo');
    if (tipo === 'planificado' || tipo === 'no-planificado') {
      this.tipoProyecto.set(tipo);
    }
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.proyectoId.set(+id);
      // Cargar catálogos y personas primero, luego cargar el proyecto
      this.loadCatalogosAndPersonas(() => {
        this.loadProyecto(+id);
      });
    } else {
      // Si no es edición, cargar catálogos y personas normalmente
      this.loadCatalogos();
      this.loadPersonas();
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      nombreProyecto: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      fechaInicio: [''],
      fechaFin: [''],
      departamentoId: [null],
      idEstadoProyecto: [null],
      idTipoIniciativa: [null],
      idTipoInvestigacion: [null],
      idAreaConocimiento: [null],
      idTipoDocumento: [null],
      tipoAutor: [''],
      archivoSoporte: [null],
      docentes: this.fb.array([]),
      estudiantes: this.fb.array([]),
      administrativos: this.fb.array([])
    });

  }

  // Getters para FormArrays
  get docentesFormArray(): FormArray {
    return this.form.get('docentes') as FormArray;
  }

  get estudiantesFormArray(): FormArray {
    return this.form.get('estudiantes') as FormArray;
  }

  get administrativosFormArray(): FormArray {
    return this.form.get('administrativos') as FormArray;
  }

  loadCatalogos(): void {
    forkJoin({
      departamentos: this.catalogosService.getDepartamentos(),
      estadosProyecto: this.catalogosService.getEstadosProyecto(),
      ediciones: this.edicionService.getAll(),
      tiposIniciativa: this.catalogosService.getTiposIniciativa(),
      tiposInvestigacion: this.catalogosService.getTiposInvestigacion(),
      areasConocimiento: this.catalogosService.getAreasConocimiento(),
      tiposDocumento: this.catalogosService.getTiposDocumento()
    }).subscribe({
      next: (data) => {
        this.departamentos.set(data.departamentos);
        this.estadosProyecto.set(data.estadosProyecto);
        this.ediciones.set(data.ediciones);
        this.tiposIniciativa.set(data.tiposIniciativa);
        this.tiposInvestigacion.set(data.tiposInvestigacion);
        this.areasConocimiento.set(data.areasConocimiento);
        this.tiposDocumento.set(data.tiposDocumento);
      },
      error: (err) => {
        console.error('Error loading catalogos:', err);
      }
    });
  }

  loadPersonas(): void {
    forkJoin({
      docentes: this.personasService.listDocentes(),
      estudiantes: this.personasService.listEstudiantes(),
      administrativos: this.personasService.listAdministrativos()
    }).subscribe({
      next: (data) => {
        this.docentes.set(data.docentes);
        this.estudiantes.set(data.estudiantes);
        this.administrativos.set(data.administrativos);
      },
      error: (err) => {
        console.error('Error loading personas:', err);
      }
    });
  }

  loadCatalogosAndPersonas(callback?: () => void): void {
    forkJoin({
      catalogos: forkJoin({
        departamentos: this.catalogosService.getDepartamentos(),
        estadosProyecto: this.catalogosService.getEstadosProyecto(),
        ediciones: this.edicionService.getAll(),
        tiposIniciativa: this.catalogosService.getTiposIniciativa(),
        tiposInvestigacion: this.catalogosService.getTiposInvestigacion(),
        areasConocimiento: this.catalogosService.getAreasConocimiento(),
        tiposDocumento: this.catalogosService.getTiposDocumento()
      }),
      personas: forkJoin({
        docentes: this.personasService.listDocentes(),
        estudiantes: this.personasService.listEstudiantes(),
        administrativos: this.personasService.listAdministrativos()
      })
    }).subscribe({
      next: (data) => {
        // Asignar catálogos
        this.departamentos.set(data.catalogos.departamentos);
        this.estadosProyecto.set(data.catalogos.estadosProyecto);
        this.ediciones.set(data.catalogos.ediciones);
        this.tiposIniciativa.set(data.catalogos.tiposIniciativa);
        this.tiposInvestigacion.set(data.catalogos.tiposInvestigacion);
        this.areasConocimiento.set(data.catalogos.areasConocimiento);
        this.tiposDocumento.set(data.catalogos.tiposDocumento);
        
        // Asignar personas
        this.docentes.set(data.personas.docentes);
        this.estudiantes.set(data.personas.estudiantes);
        this.administrativos.set(data.personas.administrativos);
        
        // Ejecutar callback después de cargar todo
        if (callback) {
          callback();
        }
      },
      error: (err) => {
        console.error('Error loading catalogos and personas:', err);
        if (callback) {
          callback(); // Ejecutar callback incluso si hay error
        }
      }
    });
  }

  loadProyecto(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.proyectosService.getById(id).subscribe({
      next: (proyecto) => {
        if (proyecto) {
          console.log('📦 Proyecto recibido del servicio:', proyecto);
          console.log('📦 Campos del proyecto:', {
            departamentoId: proyecto.departamentoId,
            idEstadoProyecto: proyecto.idEstadoProyecto,
            idTipoIniciativa: proyecto.idTipoIniciativa,
            idTipoInvestigacion: proyecto.idTipoInvestigacion,
            idAreaConocimiento: proyecto.idAreaConocimiento,
            idTipoDocumento: proyecto.idTipoDocumento,
            nombreProyecto: proyecto.nombreProyecto,
            descripcion: proyecto.descripcion
          });

          // Formatear fechas correctamente
          let fechaInicio = '';
          let fechaFin = '';
          if (proyecto.fechaInicio) {
            const fechaInicioDate = new Date(proyecto.fechaInicio);
            fechaInicio = fechaInicioDate.toISOString().split('T')[0];
          }
          if (proyecto.fechaFin) {
            const fechaFinDate = new Date(proyecto.fechaFin);
            fechaFin = fechaFinDate.toISOString().split('T')[0];
          }

          // Función para establecer valores cuando los catálogos estén listos
          const establecerValores = () => {
            // Verificar que los catálogos estén cargados
            const catalogosListos = 
              this.departamentos().length > 0 || 
              this.estadosProyecto().length > 0 || 
              this.tiposIniciativa().length > 0 ||
              this.tiposInvestigacion().length > 0 ||
              this.areasConocimiento().length > 0 ||
              this.tiposDocumento().length > 0;

            if (!catalogosListos) {
              // Si los catálogos aún no están listos, esperar un poco más
              setTimeout(establecerValores, 100);
              return;
            }

            // Convertir valores a números cuando sea necesario para asegurar coincidencia con los selects
            const departamentoId = proyecto.departamentoId ? Number(proyecto.departamentoId) : null;
            const idEstadoProyecto = proyecto.idEstadoProyecto ? Number(proyecto.idEstadoProyecto) : null;
            const idTipoIniciativa = proyecto.idTipoIniciativa ? Number(proyecto.idTipoIniciativa) : null;
            const idTipoInvestigacion = proyecto.idTipoInvestigacion ? Number(proyecto.idTipoInvestigacion) : null;
            const idAreaConocimiento = proyecto.idAreaConocimiento ? Number(proyecto.idAreaConocimiento) : null;
            const idTipoDocumento = proyecto.idTipoDocumento ? Number(proyecto.idTipoDocumento) : null;

            // Verificar que los valores existan en los catálogos antes de establecerlos
            const deptExists = !departamentoId || this.departamentos().some(d => d.id === departamentoId);
            const estadoExists = !idEstadoProyecto || this.estadosProyecto().some(e => e.id === idEstadoProyecto);
            const tipoIniciativaExists = !idTipoIniciativa || this.tiposIniciativa().some(t => t.id === idTipoIniciativa);
            const tipoInvestigacionExists = !idTipoInvestigacion || this.tiposInvestigacion().some(t => t.id === idTipoInvestigacion);
            const areaConocimientoExists = !idAreaConocimiento || this.areasConocimiento().some(a => a.id === idAreaConocimiento);
            const tipoDocumentoExists = !idTipoDocumento || this.tiposDocumento().some(t => t.id === idTipoDocumento);

            console.log('🔍 Cargando proyecto - Valores extraídos:', {
              departamentoId,
              idEstadoProyecto,
              idTipoIniciativa,
              idTipoInvestigacion,
              idAreaConocimiento,
              idTipoDocumento
            });
            console.log('🔍 Cargando proyecto - Validaciones:', {
              deptExists,
              estadoExists,
              tipoIniciativaExists,
              tipoInvestigacionExists,
              areaConocimientoExists,
              tipoDocumentoExists,
              totalDepartamentos: this.departamentos().length,
              totalEstados: this.estadosProyecto().length,
              departamentosIds: this.departamentos().map(d => d.id),
              estadosIds: this.estadosProyecto().map(e => e.id),
            });

            // Establecer valores - usar los valores del proyecto directamente si existen
            const finalDepartamentoId = deptExists ? departamentoId : (proyecto.departamentoId ? Number(proyecto.departamentoId) : null);
            const finalIdEstadoProyecto = estadoExists ? idEstadoProyecto : (proyecto.idEstadoProyecto ? Number(proyecto.idEstadoProyecto) : null);
            const finalIdTipoIniciativa = tipoIniciativaExists ? idTipoIniciativa : (proyecto.idTipoIniciativa ? Number(proyecto.idTipoIniciativa) : null);
            const finalIdTipoInvestigacion = tipoInvestigacionExists ? idTipoInvestigacion : (proyecto.idTipoInvestigacion ? Number(proyecto.idTipoInvestigacion) : null);
            const finalIdAreaConocimiento = areaConocimientoExists ? idAreaConocimiento : (proyecto.idAreaConocimiento ? Number(proyecto.idAreaConocimiento) : null);
            const finalIdTipoDocumento = tipoDocumentoExists ? idTipoDocumento : (proyecto.idTipoDocumento ? Number(proyecto.idTipoDocumento) : null);

            this.form.patchValue({
              nombreProyecto: proyecto.nombreProyecto || proyecto.nombre || '',
              descripcion: proyecto.descripcion || '',
              fechaInicio: fechaInicio,
              fechaFin: fechaFin,
              departamentoId: finalDepartamentoId,
              idEstadoProyecto: finalIdEstadoProyecto,
              idTipoIniciativa: finalIdTipoIniciativa,
              idTipoInvestigacion: finalIdTipoInvestigacion,
              idAreaConocimiento: finalIdAreaConocimiento,
              idTipoDocumento: finalIdTipoDocumento,
              tipoAutor: proyecto.tipoAutor || ''
            }, { emitEvent: false });


            // Cargar participantes
            if (proyecto.docentes && proyecto.docentes.length > 0) {
              this.docentesFormArray.clear();
              proyecto.docentes.forEach(docente => {
                this.docentesFormArray.push(this.fb.group({
                  id: [Number(docente.id)],
                  rolEnProyecto: [docente.rolEnProyecto || '']
                }));
              });
            }

            if (proyecto.estudiantes && proyecto.estudiantes.length > 0) {
              this.estudiantesFormArray.clear();
              proyecto.estudiantes.forEach(estudiante => {
                this.estudiantesFormArray.push(this.fb.group({
                  id: [Number(estudiante.id)],
                  rolEnProyecto: [estudiante.rolEnProyecto || '']
                }));
              });
            }

            if (proyecto.administrativos && proyecto.administrativos.length > 0) {
              this.administrativosFormArray.clear();
              proyecto.administrativos.forEach(admin => {
                this.administrativosFormArray.push(this.fb.group({
                  id: [Number(admin.id)],
                  rolEnProyecto: [admin.rolEnProyecto || '']
                }));
              });
            }

            // Forzar actualización del formulario
            this.form.updateValueAndValidity({ emitEvent: false });

            // Forzar la detección de cambios después de establecer los valores
            // Esto asegura que los selects reconozcan los valores establecidos
            setTimeout(() => {
              // Verificar que los valores se establecieron correctamente
              console.log('✅ Valores establecidos en el formulario:', {
                departamentoId: this.form.get('departamentoId')?.value,
                idEstadoProyecto: this.form.get('idEstadoProyecto')?.value,
                idTipoIniciativa: this.form.get('idTipoIniciativa')?.value,
                idTipoInvestigacion: this.form.get('idTipoInvestigacion')?.value,
                idAreaConocimiento: this.form.get('idAreaConocimiento')?.value,
                idTipoDocumento: this.form.get('idTipoDocumento')?.value
              });
            }, 50);
          };

          // Iniciar el proceso de establecer valores
          establecerValores();
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading proyecto:', err);
        this.error.set('Error al cargar el proyecto. Por favor, intenta nuevamente.');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    const formValue = this.form.getRawValue();
    
    // Construir arrays de participantes
    const docentes: ProyectoParticipanteCreate[] = formValue.docentes
      .filter((d: any) => d.id)
      .map((d: any) => ({
        id: d.id,
        rolEnProyecto: d.rolEnProyecto || undefined
      }));

    const estudiantes: ProyectoParticipanteCreate[] = formValue.estudiantes
      .filter((e: any) => e.id)
      .map((e: any) => ({
        id: e.id,
        rolEnProyecto: e.rolEnProyecto || undefined
      }));

    const administrativos: ProyectoParticipanteCreate[] = formValue.administrativos
      .filter((a: any) => a.id)
      .map((a: any) => ({
        id: a.id,
        rolEnProyecto: a.rolEnProyecto || undefined
      }));

    const proyectoData: ProyectoCreate = {
      nombreProyecto: formValue.nombreProyecto,
      descripcion: formValue.descripcion || undefined,
      fechaInicio: formValue.fechaInicio || undefined,
      fechaFin: formValue.fechaFin || undefined,
      departamentoId: formValue.departamentoId || undefined,
      idEstadoProyecto: formValue.idEstadoProyecto || undefined,
      idTipoIniciativa: formValue.idTipoIniciativa || undefined,
      idTipoInvestigacion: formValue.idTipoInvestigacion || undefined,
      idAreaConocimiento: formValue.idAreaConocimiento || undefined,
      idTipoDocumento: formValue.idTipoDocumento || undefined,
      tipoAutor: formValue.tipoAutor || undefined,
      archivoSoporte: formValue.archivoSoporte || undefined,
      docentes: docentes.length > 0 ? docentes : undefined,
      estudiantes: estudiantes.length > 0 ? estudiantes : undefined,
      administrativos: administrativos.length > 0 ? administrativos : undefined
    };

    if (this.isEditMode()) {
      const id = this.proyectoId();
      if (id) {
        this.proyectosService.update(id, proyectoData).subscribe({
        next: (proyecto) => {
          if (proyecto) {
            this.alertService.success('Éxito', 'Proyecto actualizado exitosamente');
            setTimeout(() => {
              this.router.navigate(['/proyectos']);
            }, 1500);
          } else {
            this.error.set('Error al actualizar el proyecto');
            this.saving.set(false);
          }
        },
          error: (err) => {
            console.error('Error updating proyecto:', err);
            // Extraer mensaje de error del backend si está disponible
            let errorMessage = 'Error al actualizar el proyecto. Por favor, intenta nuevamente.';
            if (err.error) {
              const errorText = typeof err.error === 'string' ? err.error : JSON.stringify(err.error || {});
              if (errorText.includes('No se pueden establecer fechas manualmente')) {
                errorMessage = 'No se pueden establecer fechas manualmente si el proyecto está ligado a una edición. Por favor, deselecciona la edición o deja las fechas vacías.';
              } else if (err.error.message) {
                errorMessage = err.error.message;
              } else if (typeof err.error === 'string') {
                errorMessage = err.error;
              }
            }
            this.error.set(errorMessage);
            this.saving.set(false);
          }
        });
      }
    } else {
      this.proyectosService.create(proyectoData).subscribe({
        next: (proyecto) => {
          this.alertService.success('Éxito', 'Proyecto creado exitosamente');
          setTimeout(() => {
            this.router.navigate(['/proyectos']);
          }, 1500);
        },
        error: (err) => {
          console.error('Error creating proyecto:', err);
          // Extraer mensaje de error del backend si está disponible
          let errorMessage = 'Error al crear el proyecto. Por favor, intenta nuevamente.';
          if (err.error) {
            const errorText = typeof err.error === 'string' ? err.error : JSON.stringify(err.error || {});
            if (errorText.includes('No se pueden establecer fechas manualmente')) {
              errorMessage = 'No se pueden establecer fechas manualmente si el proyecto está ligado a una edición. Por favor, deselecciona la edición o deja las fechas vacías.';
            } else if (err.error.message) {
              errorMessage = err.error.message;
            } else if (typeof err.error === 'string') {
              errorMessage = err.error;
            }
          }
          this.error.set(errorMessage);
          this.saving.set(false);
        }
      });
    }
  }

  /**
   * Verifica si hay cambios sin guardar en el formulario
   */
  private tieneCambiosSinGuardar(): boolean {
    if (!this.form) {
      return false;
    }

    const formValue = this.form.getRawValue();
    
    // Verificar si hay datos en los campos principales
    const tieneDatos = !!(
      formValue.nombreProyecto?.trim() ||
      formValue.descripcion?.trim() ||
      formValue.fechaInicio ||
      formValue.fechaFin ||
      formValue.departamentoId ||
      formValue.idEstadoProyecto ||
      formValue.idTipoIniciativa ||
      formValue.idTipoInvestigacion ||
      formValue.idAreaConocimiento ||
      formValue.idTipoDocumento ||
      formValue.tipoAutor?.trim() ||
      formValue.archivoSoporte ||
      (formValue.docentes && formValue.docentes.length > 0) ||
      (formValue.estudiantes && formValue.estudiantes.length > 0) ||
      (formValue.administrativos && formValue.administrativos.length > 0)
    );
    
    return tieneDatos;
  }

  /**
   * Maneja el clic en el botón de cancelar
   * Muestra alertas de confirmación antes de cancelar
   */
  async cancel(): Promise<void> {
    // Verificar si hay cambios sin guardar
    const tieneCambios = this.tieneCambiosSinGuardar();
    
    if (tieneCambios) {
      // Si hay cambios, mostrar alerta con opción de continuar editando
      const result = await this.alertService.confirm(
        '¿Desea cancelar el proyecto?',
        'Tiene cambios sin guardar. ¿Desea descartar los cambios y salir?',
        'Sí, descartar cambios',
        'No, continuar',
        {
          showDenyButton: true,
          denyButtonText: 'Continuar editando',
          denyButtonColor: '#6b7280'
        }
      );
      
      if (result.isConfirmed) {
        // Usuario eligió "Descartar cambios"
        this.router.navigate(['/proyectos']);
      } else if (result.isDenied) {
        // Usuario eligió "Continuar editando"
        return; // No hacer nada, quedarse en el formulario
      }
      // Si cerró el diálogo, no hacer nada
    } else {
      // Si no hay cambios, mostrar alerta simple de confirmación
      const result = await this.alertService.confirm(
        '¿Desea cancelar?',
        '¿Está seguro de que desea salir?',
        'Sí, cancelar',
        'No, continuar'
      );
      
      if (result.isConfirmed) {
        this.router.navigate(['/proyectos']);
      }
      // Si no confirma, no hacer nada
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (field?.hasError('minlength')) {
      return `Mínimo ${field.errors?.['minlength'].requiredLength} caracteres`;
    }
    if (field?.hasError('min')) {
      return 'El valor debe ser mayor o igual a 0';
    }
    return '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.form.patchValue({ archivoSoporte: input.files[0] });
    }
  }

  // Métodos para gestionar participantes - Docentes
  agregarDocente(docente: Docente): void {
    const existe = this.docentesFormArray.controls.some(control => control.get('id')?.value === docente.id);
    if (!existe) {
      this.docentesFormArray.push(this.fb.group({
        id: [docente.id],
        rolEnProyecto: ['']
      }));
    }
    this.mostrarDropdownDocente.set(false);
    this.terminoBusquedaDocente.set('');
  }

  eliminarDocente(index: number): void {
    this.docentesFormArray.removeAt(index);
  }

  getDocenteById(id: number): Docente | undefined {
    return this.docentes().find((d: Docente) => d.id === id);
  }

  filtrarDocentes(): Docente[] {
    const termino = this.terminoBusquedaDocente().toLowerCase().trim();
    if (!termino) return this.docentes();
    return this.docentes().filter((d: Docente) => {
      const nombre = (d.nombreCompleto || '').toLowerCase();
      return nombre.includes(termino);
    });
  }

  // Métodos para gestionar participantes - Estudiantes
  agregarEstudiante(estudiante: Estudiante): void {
    const existe = this.estudiantesFormArray.controls.some(control => control.get('id')?.value === estudiante.id);
    if (!existe) {
      this.estudiantesFormArray.push(this.fb.group({
        id: [estudiante.id],
        rolEnProyecto: ['']
      }));
    }
    this.mostrarDropdownEstudiante.set(false);
    this.terminoBusquedaEstudiante.set('');
  }

  eliminarEstudiante(index: number): void {
    this.estudiantesFormArray.removeAt(index);
  }

  getEstudianteById(id: number): Estudiante | undefined {
    return this.estudiantes().find((e: Estudiante) => e.id === id);
  }

  filtrarEstudiantes(): Estudiante[] {
    const termino = this.terminoBusquedaEstudiante().toLowerCase().trim();
    if (!termino) return this.estudiantes();
    return this.estudiantes().filter((e: Estudiante) => {
      const nombre = (e.nombreCompleto || '').toLowerCase();
      return nombre.includes(termino);
    });
  }

  // Métodos para gestionar participantes - Administrativos
  agregarAdministrativo(admin: Administrativo): void {
    const existe = this.administrativosFormArray.controls.some(control => control.get('id')?.value === admin.id);
    if (!existe) {
      this.administrativosFormArray.push(this.fb.group({
        id: [admin.id],
        rolEnProyecto: ['']
      }));
    }
    this.mostrarDropdownAdministrativo.set(false);
    this.terminoBusquedaAdministrativo.set('');
  }

  eliminarAdministrativo(index: number): void {
    this.administrativosFormArray.removeAt(index);
  }

  getAdministrativoById(id: number): Administrativo | undefined {
    return this.administrativos().find((a: Administrativo) => a.id === id);
  }

  filtrarAdministrativos(): Administrativo[] {
    const termino = this.terminoBusquedaAdministrativo().toLowerCase().trim();
    if (!termino) return this.administrativos();
    return this.administrativos().filter((a: Administrativo) => {
      const nombre = (a.nombreCompleto || '').toLowerCase();
      return nombre.includes(termino);
    });
  }

  // Métodos para acordeones
  toggleSeccionInformacion(): void {
    this.seccionInformacionExpandida.set(!this.seccionInformacionExpandida());
  }

  toggleSeccionClasificacion(): void {
    this.seccionClasificacionExpandida.set(!this.seccionClasificacionExpandida());
  }

  toggleSeccionParticipantes(): void {
    this.seccionParticipantesExpandida.set(!this.seccionParticipantesExpandida());
  }

  toggleSeccionDocumentos(): void {
    this.seccionDocumentosExpandida.set(!this.seccionDocumentosExpandida());
  }
}

