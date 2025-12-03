import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { PersonasService } from '../../core/services/personas.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { Estudiante } from '../../core/models/estudiante';
import type { Docente } from '../../core/models/docente';
import type { Administrativo } from '../../core/models/administrativo';
import type { Departamento } from '../../core/models/departamento';
import type { Genero } from '../../core/models/genero';
import type { EstadoEstudiante } from '../../core/models/estado-estudiante';
import type { CategoriaParticipacion } from '../../core/models/categoria-participacion';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-persona-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './persona-form.component.html',
})
export class PersonaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private personasService = inject(PersonasService);
  private catalogosService = inject(CatalogosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  tipoPersona = signal<'estudiantes' | 'docentes' | 'administrativos'>('estudiantes');
  isEditMode = signal(false);
  personaId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  // Catálogos
  departamentos = signal<Departamento[]>([]);
  generos = signal<Genero[]>([]);
  estadosEstudiante = signal<EstadoEstudiante[]>([]);
  categoriasParticipacion = signal<CategoriaParticipacion[]>([]);

  ngOnInit(): void {
    // Obtener tipo de persona de la ruta
    const tipo = this.route.snapshot.paramMap.get('tipo');
    if (tipo && ['estudiantes', 'docentes', 'administrativos'].includes(tipo)) {
      this.tipoPersona.set(tipo as 'estudiantes' | 'docentes' | 'administrativos');
    }

    // Verificar si es modo edición
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const idNumber = +id;
      // Validar que el ID sea un número válido y mayor que 0
      if (!isNaN(idNumber) && idNumber > 0) {
        this.isEditMode.set(true);
        this.personaId.set(idNumber);
      } else {
        console.warn('⚠️ ID inválido en la ruta:', id);
        this.error.set('ID inválido. Redirigiendo...');
        setTimeout(() => this.router.navigate(['/personas']), 2000);
        return;
      }
    }

    this.initializeForm();
    this.loadCatalogos();
    
    if (this.isEditMode() && this.personaId() && this.personaId()! > 0) {
      this.loadPersona(this.personaId()!);
    }
  }

  initializeForm(): void {
    const tipo = this.tipoPersona();
    
    if (tipo === 'estudiantes') {
      this.form = this.fb.group({
        nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
        matricula: ['', [Validators.required]],
        correo: ['', [Validators.required, Validators.email]],
        generoId: [null, Validators.required],
        departamentoId: [null, Validators.required],
        estadoId: [null, Validators.required],
        fechaIngreso: ['', Validators.required],
        numeroOrcid: [''], // Opcional
        cedula: [''], // Opcional
        carrera: [''], // Opcional
        idCategoriaParticipacion: [null], // Opcional
        nivelFormacion: [''], // Opcional
        activo: [true]
      });
    } else if (tipo === 'docentes') {
      this.form = this.fb.group({
        nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
        correo: ['', [Validators.required, Validators.email]],
        generoId: [null, Validators.required], // Requerido según DocenteCreateDto
        departamentoId: [null, Validators.required],
        numeroOrcid: [''], // Opcional
        cedula: [''], // Opcional
        nivelAcademico: [''], // Opcional
        activo: [true]
      });
    } else {
      // administrativos
      this.form = this.fb.group({
        nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
        correo: ['', [Validators.required, Validators.email]],
        generoId: [null, Validators.required], // Requerido según AdministrativoCreateDto
        departamentoId: [null, Validators.required],
        numeroOrcid: [''], // Opcional
        cedula: [''], // Opcional
        puesto: [''], // Opcional
        activo: [true]
      });
    }
  }

  loadCatalogos(): void {
    // Cargar departamentos (necesario para todos)
    this.catalogosService.getDepartamentos().subscribe({
      next: (data) => this.departamentos.set(data),
      error: (err) => console.error('Error loading departamentos:', err)
    });

    // Cargar géneros para estudiantes, docentes y administrativos
    if (this.tipoPersona() === 'estudiantes' || this.tipoPersona() === 'docentes' || this.tipoPersona() === 'administrativos') {
      this.catalogosService.getGeneros().subscribe({
        next: (data) => this.generos.set(data),
        error: (err) => console.error('Error loading generos:', err)
      });
    }
    
    // Cargar estados solo para estudiantes
    if (this.tipoPersona() === 'estudiantes') {

      this.catalogosService.getEstadosEstudiante().subscribe({
        next: (data) => this.estadosEstudiante.set(data),
        error: (err) => console.error('Error loading estados estudiante:', err)
      });

      this.catalogosService.getCategoriasParticipacion().subscribe({
        next: (data) => this.categoriasParticipacion.set(data),
        error: (err) => console.error('Error loading categorias participacion:', err)
      });
    }
  }

  loadPersona(id: number): void {
    // Validar que el ID sea válido
    if (!id || id <= 0 || isNaN(id)) {
      console.error('❌ ID inválido para cargar persona:', id);
      this.error.set('ID inválido. No se puede cargar la persona.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const tipo = this.tipoPersona();

    if (tipo === 'estudiantes') {
      this.personasService.getEstudiante(id).subscribe({
        next: (estudiante: Estudiante | null) => {
          if (estudiante) {
            this.form.patchValue({
              nombreCompleto: estudiante.nombreCompleto,
              matricula: estudiante.matricula,
              correo: estudiante.correo,
              generoId: estudiante.generoId,
              departamentoId: estudiante.departamentoId,
              estadoId: estudiante.estadoId,
              fechaIngreso: estudiante.fechaIngreso instanceof Date 
                ? estudiante.fechaIngreso.toISOString().split('T')[0]
                : (estudiante.fechaIngreso ? new Date(estudiante.fechaIngreso).toISOString().split('T')[0] : ''),
              numeroOrcid: estudiante.numeroOrcid || '',
              cedula: estudiante.cedula || '',
              carrera: estudiante.carrera || '',
              idCategoriaParticipacion: estudiante.idCategoriaParticipacion || null,
              nivelFormacion: estudiante.nivelFormacion || '',
              activo: estudiante.activo
            });
          }
          this.loading.set(false);
        },
        error: (err: any) => {
          console.error('Error loading estudiante:', err);
          this.error.set('Error al cargar los datos. Por favor, intenta nuevamente.');
          this.loading.set(false);
        }
      });
    } else if (tipo === 'docentes') {
      this.personasService.getDocente(id).subscribe({
        next: (docente: Docente | null) => {
          if (docente) {
            this.form.patchValue({
              nombreCompleto: docente.nombreCompleto,
              correo: docente.correo,
              generoId: docente.generoId,
              departamentoId: docente.departamentoId,
              numeroOrcid: docente.numeroOrcid || '',
              cedula: docente.cedula || '',
              nivelAcademico: docente.nivelAcademico || '',
              activo: docente.activo
            });
          }
          this.loading.set(false);
        },
        error: (err: any) => {
          console.error('Error loading docente:', err);
          this.error.set('Error al cargar los datos. Por favor, intenta nuevamente.');
          this.loading.set(false);
        }
      });
    } else {
      this.personasService.getAdministrativo(id).subscribe({
        next: (administrativo: Administrativo | null) => {
          if (administrativo) {
            // Si generoId es 0, intentar buscar el género por el código/descripción del backend
            let generoIdValue = administrativo.generoId;
            if (generoIdValue === 0 && this.generos().length > 0) {
              // El backend podría haber devuelto Genero como string, pero no lo tenemos aquí
              // Por ahora, usamos el valor que viene del mapeo
              console.warn('⚠️ loadPersona - generoId es 0 para administrativo, podría necesitar búsqueda por string');
            }
            
            this.form.patchValue({
              nombreCompleto: administrativo.nombreCompleto,
              correo: administrativo.correo,
              generoId: generoIdValue || null,
              departamentoId: administrativo.departamentoId,
              numeroOrcid: administrativo.numeroOrcid || '',
              cedula: administrativo.cedula || '',
              puesto: administrativo.puesto || '',
              activo: administrativo.activo ?? true
            });
          }
          this.loading.set(false);
        },
        error: (err: any) => {
          console.error('Error loading administrativo:', err);
          this.error.set('Error al cargar los datos. Por favor, intenta nuevamente.');
          this.loading.set(false);
        }
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const tipo = this.tipoPersona();
    const formValue = this.form.value;

    if (this.isEditMode()) {
      // Actualizar
      const id = this.personaId();
      
      // Validar que el ID sea válido
      if (!id || id <= 0 || isNaN(id)) {
        console.error('❌ ID inválido para actualizar persona:', id);
        this.error.set('ID inválido. No se puede actualizar la persona.');
        this.saving.set(false);
        return;
      }
      
      if (tipo === 'estudiantes') {
        // Filtrar solo los campos válidos para el DTO
        const estudianteData: Partial<Estudiante> = {
          nombreCompleto: formValue.nombreCompleto,
          matricula: formValue.matricula,
          correo: formValue.correo,
          generoId: formValue.generoId ? +formValue.generoId : undefined,
          departamentoId: formValue.departamentoId ? +formValue.departamentoId : undefined,
          estadoId: formValue.estadoId ? +formValue.estadoId : undefined,
          activo: formValue.activo ?? true,
          numeroOrcid: formValue.numeroOrcid || undefined,
          cedula: formValue.cedula || undefined,
          carrera: formValue.carrera || undefined,
          idCategoriaParticipacion: formValue.idCategoriaParticipacion ? +formValue.idCategoriaParticipacion : undefined,
          nivelFormacion: formValue.nivelFormacion || undefined,
          fechaIngreso: formValue.fechaIngreso ? new Date(formValue.fechaIngreso) : undefined
        };
        
        this.personasService.updateEstudiante(id, estudianteData).subscribe({
          next: () => {
            this.router.navigate(['/personas']);
          },
          error: (err: any) => {
            console.error('Error updating estudiante:', err);
            const errorMessage = err.error?.message || 
                                err.error?.title || 
                                err.message || 
                                'Error al actualizar el estudiante. Verifica que todos los campos requeridos estén completos.';
            this.error.set(errorMessage);
            this.saving.set(false);
          }
        });
      } else if (tipo === 'docentes') {
        this.personasService.updateDocente(id, formValue).subscribe({
          next: () => {
            this.router.navigate(['/personas']);
          },
          error: (err: any) => {
            console.error('Error updating docente:', err);
            this.error.set(err.error?.message || 'Error al actualizar. Por favor, intenta nuevamente.');
            this.saving.set(false);
          }
        });
      } else {
        this.personasService.updateAdministrativo(id, formValue).subscribe({
          next: () => {
            this.router.navigate(['/personas']);
          },
          error: (err: any) => {
            console.error('Error updating administrativo:', err);
            this.error.set(err.error?.message || 'Error al actualizar. Por favor, intenta nuevamente.');
            this.saving.set(false);
          }
        });
      }
    } else {
      // Crear
      if (tipo === 'estudiantes') {
        // Validar que todos los campos requeridos estén presentes
        if (!formValue.nombreCompleto || !formValue.matricula || !formValue.correo || 
            !formValue.generoId || !formValue.departamentoId || !formValue.estadoId || !formValue.fechaIngreso) {
          this.error.set('Por favor, completa todos los campos requeridos.');
          this.saving.set(false);
          return;
        }

        const estudianteData: Omit<Estudiante, 'id'> = {
          nombreCompleto: formValue.nombreCompleto.trim(),
          matricula: formValue.matricula.trim(),
          correo: formValue.correo.trim(),
          generoId: +formValue.generoId,
          departamentoId: +formValue.departamentoId,
          estadoId: +formValue.estadoId,
          fechaIngreso: new Date(formValue.fechaIngreso),
          activo: formValue.activo ?? true,
          numeroOrcid: formValue.numeroOrcid?.trim() || undefined,
          cedula: formValue.cedula?.trim() || undefined,
          carrera: formValue.carrera?.trim() || undefined,
          idCategoriaParticipacion: formValue.idCategoriaParticipacion ? +formValue.idCategoriaParticipacion : undefined,
          nivelFormacion: formValue.nivelFormacion?.trim() || undefined
        };
        
        console.log('🔄 FormComponent - Form value completo:', formValue);
        console.log('🔄 FormComponent - Datos del estudiante a crear:', estudianteData);
        console.log('🔄 FormComponent - Tipo de fechaIngreso:', typeof estudianteData.fechaIngreso);
        console.log('🔄 FormComponent - fechaIngreso value:', estudianteData.fechaIngreso);
        
        this.personasService.createEstudiante(estudianteData).subscribe({
          next: () => {
            this.router.navigate(['/personas']);
          },
          error: (err: any) => {
            console.error('❌ Error creating estudiante:', err);
          console.error('❌ Error details:', {
            status: err.status,
            statusText: err.statusText,
            error: err.error,
            message: err.message
          });
          
          let errorMessage = 'Error al crear. Por favor, intenta nuevamente.';
          
          // Detectar violaciones de restricciones UNIQUE en SQL
          if (err.error && typeof err.error === 'string') {
            const errorStr = err.error;
            
            // Detectar violación de UNIQUE en Cédula
            if (errorStr.includes("UQ_Estudiantes_Cedula") || (errorStr.includes("duplicate key") && errorStr.includes("Cedula"))) {
              const cedulaMatch = errorStr.match(/duplicate key value is \(([^)]+)\)/);
              const cedula = cedulaMatch ? cedulaMatch[1] : 'esta cédula';
              errorMessage = `La cédula ${cedula} ya está registrada. Por favor, verifica que la cédula sea correcta o deja el campo vacío si no tienes cédula.`;
            }
            // Detectar violación de UNIQUE en Correo (para estudiantes, docentes o administrativos)
            else if (errorStr.includes("UQ_Estudiantes_Correo") || errorStr.includes("UQ_Docentes_Correo") || errorStr.includes("UQ_Administrativos_Correo") || 
                     (errorStr.includes("duplicate key") && (errorStr.includes("Correo") || errorStr.includes("correo")))) {
              const correoMatch = errorStr.match(/duplicate key value is \(([^)]+)\)/);
              const correo = correoMatch ? correoMatch[1] : 'este correo';
              errorMessage = `El correo electrónico ${correo} ya está registrado. Por favor, usa otro correo.`;
            }
            // Detectar violación de UNIQUE en NumeroOrcid (para estudiantes, docentes o administrativos)
            else if (errorStr.includes("UQ_Estudiantes_ORCID") || errorStr.includes("UQ_Docentes_ORCID") || errorStr.includes("UQ_Administrativos_ORCID") || 
                     (errorStr.includes("duplicate key") && errorStr.includes("ORCID"))) {
              const orcidMatch = errorStr.match(/duplicate key value is \(([^)]+)\)/);
              const orcid = orcidMatch ? orcidMatch[1] : 'este número ORCID';
              if (orcid === '<NULL>' || orcid === 'NULL' || orcid === 'null') {
                errorMessage = 'Error: El sistema no permite múltiples registros sin número ORCID. Este es un problema del backend que debe corregirse.';
              } else {
                errorMessage = `El número ORCID ${orcid} ya está registrado. Por favor, verifica el número ORCID.`;
              }
            }
            // Detectar violación de UNIQUE en NumeroCarnet
            else if (errorStr.includes("UQ_Estudiantes") && errorStr.includes("NumeroCarnet") || errorStr.includes("duplicate key") && errorStr.includes("Carnet")) {
              errorMessage = 'La matrícula ya está registrada. Por favor, verifica la matrícula.';
            }
            // Detectar otras violaciones de UNIQUE
            else if (errorStr.includes("Violation of UNIQUE KEY constraint")) {
              const constraintMatch = errorStr.match(/constraint '([^']+)'/);
              const constraint = constraintMatch ? constraintMatch[1] : 'única';
              errorMessage = `Ya existe un registro con estos datos (restricción: ${constraint}). Por favor, verifica la información.`;
            }
          }
          
          if (err.error) {
            // Errores de validación de ASP.NET Core
            if (err.error.errors && typeof err.error.errors === 'object') {
              console.error('❌ Validation errors:', err.error.errors);
              const validationErrors: string[] = [];
              
              // Iterar sobre cada campo con errores
              Object.keys(err.error.errors).forEach(key => {
                const fieldErrors = err.error.errors[key];
                if (Array.isArray(fieldErrors)) {
                  fieldErrors.forEach((msg: string) => {
                    validationErrors.push(`${key}: ${msg}`);
                  });
                } else {
                  validationErrors.push(`${key}: ${fieldErrors}`);
                }
              });
              
              errorMessage = validationErrors.length > 0 
                ? validationErrors.join('\n')
                : err.error.title || 'Errores de validación';
            } else if (typeof err.error === 'string') {
              // Error del backend como string (excepción)
              const exceptionMatch = err.error.match(/Exception:\s*(.+?)(?:\r\n|$)/);
              if (exceptionMatch) {
                errorMessage = `Error del servidor: ${exceptionMatch[1]}`;
              } else {
                errorMessage = err.error;
              }
            } else if (err.error.message) {
              errorMessage = err.error.message;
            } else if (err.error.title) {
              errorMessage = err.error.title;
            } else if (err.status === 500) {
              errorMessage = 'Error interno del servidor. Por favor, verifica que todos los datos sean correctos e intenta nuevamente.';
            }
          }
          
          this.error.set(errorMessage);
          this.saving.set(false);
        }
      });
      } else if (tipo === 'docentes') {
        // Validar que todos los campos requeridos estén presentes
        if (!formValue.nombreCompleto || !formValue.correo || !formValue.generoId || !formValue.departamentoId) {
          this.error.set('Por favor, completa todos los campos requeridos.');
          this.saving.set(false);
          return;
        }
        
        const docenteData: Omit<Docente, 'id'> = {
          nombreCompleto: formValue.nombreCompleto.trim(),
          correo: formValue.correo.trim(),
          generoId: +formValue.generoId, // Requerido según DocenteCreateDto
          departamentoId: +formValue.departamentoId,
          numeroOrcid: formValue.numeroOrcid?.trim() || undefined,
          cedula: formValue.cedula?.trim() || undefined,
          nivelAcademico: formValue.nivelAcademico?.trim() || undefined,
          activo: formValue.activo ?? true
        };
        
        console.log('🔄 FormComponent - Datos del docente a crear:', docenteData);
        
        this.personasService.createDocente(docenteData).subscribe({
          next: () => {
            this.router.navigate(['/personas']);
          },
          error: (err: any) => {
            this.handleCreateError(err);
          }
        });
      } else {
        // Validar que todos los campos requeridos estén presentes
        if (!formValue.nombreCompleto || !formValue.correo || !formValue.generoId || !formValue.departamentoId) {
          this.error.set('Por favor, completa todos los campos requeridos.');
          this.saving.set(false);
          return;
        }
        
        const administrativoData: Omit<Administrativo, 'id'> = {
          nombreCompleto: formValue.nombreCompleto.trim(),
          correo: formValue.correo.trim(),
          generoId: +formValue.generoId, // Requerido según AdministrativoCreateDto
          departamentoId: +formValue.departamentoId,
          numeroOrcid: formValue.numeroOrcid?.trim() || undefined,
          cedula: formValue.cedula?.trim() || undefined,
          puesto: formValue.puesto?.trim() || undefined,
          activo: formValue.activo ?? true
        };
        
        console.log('🔄 FormComponent - Datos del administrativo a crear:', administrativoData);
        
        this.personasService.createAdministrativo(administrativoData).subscribe({
          next: () => {
            this.router.navigate(['/personas']);
          },
          error: (err: any) => {
            this.handleCreateError(err);
          }
        });
      }
    }
  }

  private handleCreateError(err: any): void {
    console.error('❌ Error creating persona:', err);
    console.error('❌ Error details:', {
      status: err.status,
      statusText: err.statusText,
      error: err.error,
      message: err.message
    });
    
    let errorMessage = 'Error al crear. Por favor, intenta nuevamente.';
    
    // Detectar violaciones de restricciones UNIQUE en SQL
    if (err.error && typeof err.error === 'string') {
      const errorStr = err.error;
      // Detectar violación de UNIQUE en Correo
      if (errorStr.includes("UQ_Estudiantes_Correo") || errorStr.includes("UQ_Docentes_Correo") || errorStr.includes("UQ_Administrativos_Correo") || 
          (errorStr.includes("duplicate key") && errorStr.includes("Correo"))) {
        const correoMatch = errorStr.match(/duplicate key value is \(([^)]+)\)/);
        const correo = correoMatch ? correoMatch[1] : 'este correo';
        errorMessage = `El correo electrónico ${correo} ya está registrado. Por favor, usa otro correo.`;
      }
      // Detectar violación de UNIQUE en NumeroOrcid (para estudiantes, docentes o administrativos)
      else if (errorStr.includes("UQ_Estudiantes_ORCID") || errorStr.includes("UQ_Docentes_ORCID") || errorStr.includes("UQ_Administrativos_ORCID") || 
               (errorStr.includes("duplicate key") && errorStr.includes("ORCID"))) {
        const orcidMatch = errorStr.match(/duplicate key value is \(([^)]+)\)/);
        const orcid = orcidMatch ? orcidMatch[1] : 'este número ORCID';
        if (orcid === '<NULL>' || orcid === 'NULL' || orcid === 'null') {
          errorMessage = 'Error: El sistema no permite múltiples registros sin número ORCID. Este es un problema del backend que debe corregirse.';
        } else {
          errorMessage = `El número ORCID ${orcid} ya está registrado. Por favor, verifica el número ORCID.`;
        }
      }
      // Detectar violación de UNIQUE en NumeroCarnet
      else if (errorStr.includes("UQ_Estudiantes") && errorStr.includes("NumeroCarnet") || errorStr.includes("duplicate key") && errorStr.includes("Carnet")) {
        errorMessage = 'La matrícula ya está registrada. Por favor, verifica la matrícula.';
      }
      // Detectar otras violaciones de UNIQUE
      else if (errorStr.includes("Violation of UNIQUE KEY constraint")) {
        const constraintMatch = errorStr.match(/constraint '([^']+)'/);
        const constraint = constraintMatch ? constraintMatch[1] : 'única';
        errorMessage = `Ya existe un registro con estos datos (restricción: ${constraint}). Por favor, verifica la información.`;
      }
    }
    
    if (err.error) {
      // Errores de validación de ASP.NET Core
      if (err.error.errors && typeof err.error.errors === 'object') {
        console.error('❌ Validation errors:', err.error.errors);
        const validationErrors: string[] = [];
        
        // Iterar sobre cada campo con errores
        Object.keys(err.error.errors).forEach(key => {
          const fieldErrors = err.error.errors[key];
          if (Array.isArray(fieldErrors)) {
            fieldErrors.forEach((msg: string) => {
              validationErrors.push(`${key}: ${msg}`);
            });
          } else {
            validationErrors.push(`${key}: ${fieldErrors}`);
          }
        });
        
        errorMessage = validationErrors.length > 0 
          ? validationErrors.join('\n')
          : err.error.title || 'Errores de validación';
      } else if (typeof err.error === 'string') {
        // Error del backend como string (excepción)
        const exceptionMatch = err.error.match(/Exception:\s*(.+?)(?:\r\n|$)/);
        if (exceptionMatch) {
          errorMessage = `Error del servidor: ${exceptionMatch[1]}`;
        } else {
          errorMessage = err.error;
        }
      } else if (err.error.message) {
        errorMessage = err.error.message;
      } else if (err.error.title) {
        errorMessage = err.error.title;
      } else if (err.status === 500) {
        errorMessage = 'Error interno del servidor. Por favor, verifica que todos los datos sean correctos e intenta nuevamente.';
      }
    }
    
    this.error.set(errorMessage);
    this.saving.set(false);
  }

  onCancel(): void {
    this.router.navigate(['/personas']);
  }

  getTipoLabel(): string {
    const tipo = this.tipoPersona();
    if (tipo === 'estudiantes') return 'Estudiante';
    if (tipo === 'docentes') return 'Docente';
    return 'Administrativo';
  }

  isEstudiante(): boolean {
    return this.tipoPersona() === 'estudiantes';
  }

  isDocente(): boolean {
    return this.tipoPersona() === 'docentes';
  }

  isAdministrativo(): boolean {
    return this.tipoPersona() === 'administrativos';
  }
}

