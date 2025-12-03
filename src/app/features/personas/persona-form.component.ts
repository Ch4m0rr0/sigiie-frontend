import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PersonasService } from '../../core/services/personas.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { Estudiante } from '../../core/models/estudiante';
import type { Docente } from '../../core/models/docente';
import type { Administrativo } from '../../core/models/administrativo';
import type { ResponsableExterno } from '../../core/models/responsable-externo';
import type { Departamento } from '../../core/models/departamento';
import type { Genero } from '../../core/models/genero';
import type { EstadoEstudiante } from '../../core/models/estado-estudiante';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-persona-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
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
  tipoPersona = signal<'estudiantes' | 'docentes' | 'administrativos' | 'responsables-externos'>('estudiantes');
  isEditMode = signal(false);
  personaId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  // Catálogos
  departamentos = signal<Departamento[]>([]);
  generos = signal<Genero[]>([]);
  estadosEstudiante = signal<EstadoEstudiante[]>([]);
  carreras = signal<any[]>([]);
  nivelesAcademico = signal<any[]>([]);
  
  
  // Opciones fijas para nivel de formación
  nivelesFormacion = [
    { value: 'Bachiller', label: 'Bachiller' },
    { value: 'Pregrado', label: 'Pregrado' },
    { value: 'Grado', label: 'Grado' },
    { value: 'Maestría', label: 'Maestría' },
    { value: 'Doctorado', label: 'Doctorado' }
  ];

  ngOnInit(): void {
    // Obtener tipo de persona de la ruta
    const tipo = this.route.snapshot.paramMap.get('tipo');
    if (tipo && ['estudiantes', 'docentes', 'administrativos', 'responsables-externos'].includes(tipo)) {
      this.tipoPersona.set(tipo as 'estudiantes' | 'docentes' | 'administrativos' | 'responsables-externos');
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
    // Cargar catálogos primero, luego cargar persona si está en modo edición
    this.loadCatalogos(() => {
      if (this.isEditMode() && this.personaId() && this.personaId()! > 0) {
        this.loadPersona(this.personaId()!);
      }
    });
  }

  initializeForm(): void {
    const tipo = this.tipoPersona();
    
    if (tipo === 'estudiantes') {
      this.form = this.fb.group({
        nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
        numeroCarnet: ['', [Validators.required]],
        correo: ['', [Validators.required, Validators.email]],
        idGenero: [null, Validators.required],
        idCarrera: [null, Validators.required],
        idEstadoEstudiante: [null, Validators.required],
        cedula: ['', Validators.required], // Obligatorio
        numeroOrcid: [''], // Opcional
        numeroTelefono: [''], // Opcional
        nivelFormacion: [''], // Opcional
        activo: [true] // Solo en update
      });
    } else if (tipo === 'docentes') {
      this.form = this.fb.group({
        nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
        correo: ['', [Validators.required, Validators.email]],
        idGenero: [null, Validators.required],
        departamentoId: [null, Validators.required],
        cedula: [''], // Opcional
        numeroOrcid: [''], // Opcional
        numeroTelefono: [''], // Opcional
        idNivelAcademico: [null], // Opcional
        activo: [true] // Solo en update
      });
    } else if (tipo === 'administrativos') {
      this.form = this.fb.group({
        nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
        correo: ['', [Validators.required, Validators.email]],
        idGenero: [null, Validators.required],
        departamentoId: [null, Validators.required],
        cedula: [''], // Opcional
        numeroOrcid: [''], // Opcional
        numeroTelefono: [''], // Opcional
        idNivelAcademico: [null], // Opcional
        puesto: [''], // Opcional
        activo: [true] // Solo en update
      });
    } else {
      // responsables-externos
      this.form = this.fb.group({
        nombre: ['', [Validators.required, Validators.minLength(3)]],
        institucion: ['', [Validators.required, Validators.minLength(3)]],
        cargo: [''], // Opcional
        telefono: [''], // Opcional
        correo: ['', Validators.email], // Opcional pero con validación de email
        activo: [true] // Solo en update
      });
    }
  }

  loadCatalogos(callback?: () => void): void {
    const tipo = this.tipoPersona();
    const observables: any[] = [];
    
    // Cargar departamentos (necesario para docentes y administrativos)
    if (tipo === 'docentes' || tipo === 'administrativos') {
      observables.push(
        this.catalogosService.getDepartamentos().pipe(
          catchError((err: any) => {
            console.error('Error loading departamentos:', err);
            return of([]);
          })
        )
      );
    }

    // Cargar géneros para estudiantes, docentes y administrativos
    if (tipo === 'estudiantes' || tipo === 'docentes' || tipo === 'administrativos') {
      observables.push(
        this.catalogosService.getGeneros().pipe(
          catchError((err: any) => {
            console.error('Error loading generos:', err);
            return of([]);
          })
        )
      );
    }
    
    // Cargar carreras solo para estudiantes
    if (tipo === 'estudiantes') {
      observables.push(
        this.catalogosService.getCarreras().pipe(
          catchError((err: any) => {
            console.error('Error loading carreras:', err);
            return of([]);
          })
        )
      );
    }
    
    // Cargar estados solo para estudiantes
    if (tipo === 'estudiantes') {
      observables.push(
        this.catalogosService.getEstadosEstudiante().pipe(
          catchError((err: any) => {
            console.error('Error loading estados estudiante:', err);
            return of([]);
          })
        )
      );
    }
    
    // Cargar niveles académicos para docentes y administrativos
    if (tipo === 'docentes' || tipo === 'administrativos') {
      observables.push(
        this.catalogosService.getNivelesAcademico().pipe(
          catchError((err: any) => {
            console.error('Error loading niveles academico:', err);
            return of([]);
          })
        )
      );
    }

    // Cargar todos los catálogos en paralelo
    if (observables.length > 0) {
      forkJoin(observables).subscribe({
        next: (results: any[]) => {
          let index = 0;
          
          if (tipo === 'docentes' || tipo === 'administrativos') {
            this.departamentos.set(results[index++] || []);
          }
          
          if (tipo === 'estudiantes' || tipo === 'docentes' || tipo === 'administrativos') {
            this.generos.set(results[index++] || []);
          }
          
          if (tipo === 'estudiantes') {
            this.carreras.set(results[index++] || []);
            this.estadosEstudiante.set(results[index++] || []);
          }
          
          if (tipo === 'docentes' || tipo === 'administrativos') {
            this.nivelesAcademico.set(results[index++] || []);
          }
          
          // Ejecutar callback después de cargar todos los catálogos
          if (callback) {
            callback();
          }
        },
        error: (err: any) => {
          console.error('Error loading catalogos:', err);
          if (callback) {
            callback();
          }
        }
      });
    } else if (callback) {
      callback();
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
            // Esperar a que los catálogos estén completamente cargados
            const checkAndPatch = () => {
              const generosLoaded = this.generos().length > 0;
              const estadosLoaded = this.estadosEstudiante().length > 0;
              const carrerasLoaded = this.carreras().length > 0;
              
              if (!generosLoaded || !estadosLoaded || !carrerasLoaded) {
                // Si los catálogos aún no están cargados, esperar un poco más
                setTimeout(checkAndPatch, 100);
                return;
              }
              
              // Obtener ID de género desde el catálogo usando el nombre del backend
              let idGenero: number | null = null;
              if (estudiante.idGenero && estudiante.idGenero > 0) {
                idGenero = Number(estudiante.idGenero);
              } else if (estudiante.genero) {
                // Si no viene el ID, buscar por el nombre/código/descripción del género
                // El backend puede devolver "Femenino" pero el catálogo puede tener codigo "F" o descripcion "Femenino"
                const generoNombre = estudiante.genero.toLowerCase().trim();
                const generoEncontrado = this.generos().find(g => {
                  const codigo = g.codigo?.toLowerCase().trim() || '';
                  const descripcion = g.descripcion?.toLowerCase().trim() || '';
                  // Buscar coincidencia exacta o parcial
                  return codigo === generoNombre || 
                         descripcion === generoNombre ||
                         codigo.includes(generoNombre) ||
                         descripcion.includes(generoNombre) ||
                         generoNombre.includes(codigo) ||
                         generoNombre.includes(descripcion);
                });
                if (generoEncontrado) {
                  idGenero = generoEncontrado.id;
                  console.log('✅ Género encontrado:', {
                    generoBackend: estudiante.genero,
                    generoEncontrado: generoEncontrado,
                    idGenero
                  });
                } else {
                  console.warn('⚠️ Género no encontrado en catálogo:', {
                    generoBackend: estudiante.genero,
                    generosDisponibles: this.generos().map(g => ({ id: g.id, codigo: g.codigo, descripcion: g.descripcion }))
                  });
                }
              }
              
              // Obtener ID de estado desde el catálogo usando el nombre del backend
              let idEstadoEstudiante: number | null = null;
              if (estudiante.idEstadoEstudiante && estudiante.idEstadoEstudiante > 0) {
                idEstadoEstudiante = Number(estudiante.idEstadoEstudiante);
              } else if (estudiante.estadoEstudiante) {
                // Si no viene el ID, buscar por el nombre del estado
                const estadoNombre = estudiante.estadoEstudiante.toLowerCase().trim();
                const estadoEncontrado = this.estadosEstudiante().find(e => {
                  const nombre = e.nombre?.toLowerCase().trim() || '';
                  return nombre === estadoNombre || 
                         nombre.includes(estadoNombre) ||
                         estadoNombre.includes(nombre);
                });
                if (estadoEncontrado) {
                  idEstadoEstudiante = estadoEncontrado.id;
                  console.log('✅ Estado encontrado:', {
                    estadoBackend: estudiante.estadoEstudiante,
                    estadoEncontrado: estadoEncontrado,
                    idEstadoEstudiante
                  });
                } else {
                  console.warn('⚠️ Estado no encontrado en catálogo:', {
                    estadoBackend: estudiante.estadoEstudiante,
                    estadosDisponibles: this.estadosEstudiante().map(e => ({ id: e.id, nombre: e.nombre }))
                  });
                }
              }
              
              // Obtener ID de carrera
              const idCarrera = estudiante.idCarrera != null && estudiante.idCarrera !== 0 ? Number(estudiante.idCarrera) : null;
              
              console.log('🔄 Cargando valores del estudiante:', {
                estudianteIdGenero: estudiante.idGenero,
                estudianteGenero: estudiante.genero,
                estudianteIdCarrera: estudiante.idCarrera,
                estudianteIdEstadoEstudiante: estudiante.idEstadoEstudiante,
                estudianteEstadoEstudiante: estudiante.estadoEstudiante,
                nivelFormacion: estudiante.nivelFormacion,
                generosCargados: this.generos().length,
                estadosCargados: this.estadosEstudiante().length,
                carrerasCargadas: this.carreras().length,
                idGeneroEncontrado: idGenero,
                idEstadoEncontrado: idEstadoEstudiante
              });
              
              // Hacer patchValue con los valores convertidos
              this.form.patchValue({
                nombreCompleto: estudiante.nombreCompleto,
                numeroCarnet: estudiante.numeroCarnet,
                correo: estudiante.correo,
                idGenero: idGenero,
                idCarrera: idCarrera,
                idEstadoEstudiante: idEstadoEstudiante,
                cedula: estudiante.cedula || '',
                numeroOrcid: estudiante.numeroOrcid || '',
                numeroTelefono: estudiante.numeroTelefono || '',
                nivelFormacion: estudiante.nivelFormacion || '',
                activo: estudiante.activo
              }, { emitEvent: false });
              
              // Forzar actualización después de un pequeño delay
              setTimeout(() => {
                // Verificar que los valores se asignaron correctamente
                const formIdGenero = this.form.get('idGenero')?.value;
                const formIdCarrera = this.form.get('idCarrera')?.value;
                const formIdEstadoEstudiante = this.form.get('idEstadoEstudiante')?.value;
                
                console.log('✅ Valores después de patchValue:', {
                  formIdGenero,
                  formIdCarrera,
                  formIdEstadoEstudiante,
                  nivelFormacion: this.form.get('nivelFormacion')?.value,
                  generoExiste: this.generos().some(g => g.id === formIdGenero),
                  estadoExiste: this.estadosEstudiante().some(e => e.id === formIdEstadoEstudiante),
                  carreraExiste: this.carreras().some(c => (c.idCarrera || c.id) === formIdCarrera)
                });
                
                // Forzar actualización de los controles
                this.form.get('idGenero')?.updateValueAndValidity({ emitEvent: false });
                this.form.get('idCarrera')?.updateValueAndValidity({ emitEvent: false });
                this.form.get('idEstadoEstudiante')?.updateValueAndValidity({ emitEvent: false });
              }, 100);
            };
            
            // Iniciar la verificación después de un pequeño delay
            setTimeout(checkAndPatch, 100);
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
            // Esperar a que los catálogos estén completamente cargados
            const checkAndPatch = () => {
              const generosLoaded = this.generos().length > 0;
              const departamentosLoaded = this.departamentos().length > 0;
              const nivelesLoaded = this.nivelesAcademico().length > 0;
              
              if (!generosLoaded || !departamentosLoaded || !nivelesLoaded) {
                // Si los catálogos aún no están cargados, esperar un poco más
                setTimeout(checkAndPatch, 100);
                return;
              }
              
              // Obtener ID de género desde el catálogo usando el nombre del backend
              let idGenero: number | null = null;
              if (docente.idGenero && docente.idGenero > 0) {
                idGenero = Number(docente.idGenero);
              } else if (docente.genero) {
                const generoNombre = docente.genero.toLowerCase().trim();
                const generoEncontrado = this.generos().find(g => {
                  const codigo = g.codigo?.toLowerCase().trim() || '';
                  const descripcion = g.descripcion?.toLowerCase().trim() || '';
                  return codigo === generoNombre || 
                         descripcion === generoNombre ||
                         codigo.includes(generoNombre) ||
                         descripcion.includes(generoNombre) ||
                         generoNombre.includes(codigo) ||
                         generoNombre.includes(descripcion);
                });
                if (generoEncontrado) {
                  idGenero = generoEncontrado.id;
                }
              }
              
              // Obtener ID de departamento desde el catálogo usando el nombre del backend
              let idDepartamento: number | null = null;
              // Si viene el ID y es válido, usarlo
              if (docente.departamentoId != null && docente.departamentoId !== 0 && !isNaN(Number(docente.departamentoId))) {
                idDepartamento = Number(docente.departamentoId);
                console.log('✅ Usando departamentoId del backend:', idDepartamento);
              } else if (docente.departamento) {
                // Si no viene el ID o es 0, buscar por nombre en el catálogo
                const departamentoNombre = docente.departamento.toLowerCase().trim();
                const departamentoEncontrado = this.departamentos().find(d => {
                  const nombre = d.nombre?.toLowerCase().trim() || '';
                  // Comparación exacta primero, luego parcial
                  return nombre === departamentoNombre || 
                         nombre.includes(departamentoNombre) ||
                         departamentoNombre.includes(nombre);
                });
                if (departamentoEncontrado) {
                  idDepartamento = departamentoEncontrado.id;
                  console.log('✅ Departamento encontrado por nombre:', {
                    departamentoBackend: docente.departamento,
                    departamentoEncontrado: departamentoEncontrado,
                    idDepartamento
                  });
                } else {
                  console.warn('⚠️ Departamento no encontrado en catálogo:', {
                    departamentoBackend: docente.departamento,
                    departamentoBackendTrimmed: departamentoNombre,
                    departamentosDisponibles: this.departamentos().map(d => ({ id: d.id, nombre: d.nombre, nombreTrimmed: d.nombre?.toLowerCase().trim() }))
                  });
                }
              } else {
                console.warn('⚠️ No hay departamentoId ni nombre de departamento en el docente:', docente);
              }
              
              let idNivelAcademico: number | null = null;
              if (docente.idNivelAcademico != null && docente.idNivelAcademico !== 0) {
                idNivelAcademico = Number(docente.idNivelAcademico);
              } else if (docente.nombreNivelAcademico) {
                // Si no viene el ID pero viene el nombre, buscar en el catálogo
                const nivelNombre = docente.nombreNivelAcademico.toLowerCase().trim();
                const nivelEncontrado = this.nivelesAcademico().find(n => {
                  const nombre = n.nombre?.toLowerCase().trim() || '';
                  return nombre === nivelNombre || 
                         nombre.includes(nivelNombre) ||
                         nivelNombre.includes(nombre);
                });
                if (nivelEncontrado) {
                  idNivelAcademico = nivelEncontrado.id;
                }
              }
              
              console.log('🔄 Cargando valores del docente:', {
                docenteCompleto: docente,
                docenteIdGenero: docente.idGenero,
                docenteGenero: docente.genero,
                docenteIdDepartamento: docente.departamentoId,
                docenteDepartamentoNombre: docente.departamento,
                docenteIdNivelAcademico: docente.idNivelAcademico,
                docenteNumeroOrcid: docente.numeroOrcid,
                docenteCedula: docente.cedula,
                docenteNumeroTelefono: docente.numeroTelefono,
                docenteActivo: docente.activo,
                generosCargados: this.generos().length,
                departamentosCargados: this.departamentos().length,
                departamentosDisponibles: this.departamentos().map(d => ({ id: d.id, nombre: d.nombre })),
                nivelesCargados: this.nivelesAcademico().length,
                idGeneroEncontrado: idGenero,
                idDepartamentoEncontrado: idDepartamento,
                idNivelAcademicoEncontrado: idNivelAcademico
              });
              
              // Hacer patchValue con los valores convertidos
              const patchData = {
                nombreCompleto: docente.nombreCompleto || '',
                correo: docente.correo || '',
                idGenero: idGenero,
                departamentoId: idDepartamento,
                numeroOrcid: docente.numeroOrcid || '',
                cedula: docente.cedula || '',
                numeroTelefono: docente.numeroTelefono || '',
                idNivelAcademico: idNivelAcademico,
                activo: docente.activo !== undefined ? docente.activo : true
              };
              
              console.log('🔄 patchValue para docente:', patchData);
              
              this.form.patchValue(patchData, { emitEvent: false });
              
              setTimeout(() => {
                const formIdGenero = this.form.get('idGenero')?.value;
                const formDepartamentoId = this.form.get('departamentoId')?.value;
                const formIdNivelAcademico = this.form.get('idNivelAcademico')?.value;
                
                console.log('✅ Valores después de patchValue:', {
                  formIdGenero,
                  formDepartamentoId,
                  formIdNivelAcademico,
                  formNumeroOrcid: this.form.get('numeroOrcid')?.value,
                  formCedula: this.form.get('cedula')?.value,
                  formNumeroTelefono: this.form.get('numeroTelefono')?.value,
                  formActivo: this.form.get('activo')?.value,
                  generoExiste: this.generos().some(g => g.id === formIdGenero),
                  departamentoExiste: this.departamentos().some(d => d.id === formDepartamentoId),
                  nivelExiste: this.nivelesAcademico().some(n => (n.idNivelAcademico || n.id) === formIdNivelAcademico)
                });
                
                this.form.get('idGenero')?.updateValueAndValidity({ emitEvent: false });
                this.form.get('departamentoId')?.updateValueAndValidity({ emitEvent: false });
                this.form.get('idNivelAcademico')?.updateValueAndValidity({ emitEvent: false });
              }, 50);
            };
            
            // Iniciar la verificación después de un pequeño delay
            setTimeout(checkAndPatch, 100);
          }
          this.loading.set(false);
        },
        error: (err: any) => {
          console.error('Error loading docente:', err);
          this.error.set('Error al cargar los datos. Por favor, intenta nuevamente.');
          this.loading.set(false);
        }
      });
    } else if (tipo === 'administrativos') {
      this.personasService.getAdministrativo(id).subscribe({
        next: (administrativo: Administrativo | null) => {
          if (administrativo) {
            // Esperar a que los catálogos estén completamente cargados
            const checkAndPatch = () => {
              const generosLoaded = this.generos().length > 0;
              const departamentosLoaded = this.departamentos().length > 0;
              const nivelesLoaded = this.nivelesAcademico().length > 0;
              
              if (!generosLoaded || !departamentosLoaded || !nivelesLoaded) {
                // Si los catálogos aún no están cargados, esperar un poco más
                setTimeout(checkAndPatch, 100);
                return;
              }
              
              // Obtener ID de género desde el catálogo usando el nombre del backend
              let idGenero: number | null = null;
              if (administrativo.idGenero && administrativo.idGenero > 0) {
                idGenero = Number(administrativo.idGenero);
              } else if (administrativo.genero) {
                const generoNombre = administrativo.genero.toLowerCase().trim();
                const generoEncontrado = this.generos().find(g => {
                  const codigo = g.codigo?.toLowerCase().trim() || '';
                  const descripcion = g.descripcion?.toLowerCase().trim() || '';
                  return codigo === generoNombre || 
                         descripcion === generoNombre ||
                         codigo.includes(generoNombre) ||
                         descripcion.includes(generoNombre) ||
                         generoNombre.includes(codigo) ||
                         generoNombre.includes(descripcion);
                });
                if (generoEncontrado) {
                  idGenero = generoEncontrado.id;
                }
              }
              
              // Obtener ID de departamento desde el catálogo usando el nombre del backend
              let idDepartamento: number | null = null;
              // Si viene el ID y es válido, usarlo
              if (administrativo.departamentoId != null && administrativo.departamentoId !== 0 && !isNaN(Number(administrativo.departamentoId))) {
                idDepartamento = Number(administrativo.departamentoId);
                console.log('✅ Usando departamentoId del backend:', idDepartamento);
              } else if (administrativo.departamento) {
                // Si no viene el ID o es 0, buscar por nombre en el catálogo
                const departamentoNombre = administrativo.departamento.toLowerCase().trim();
                const departamentoEncontrado = this.departamentos().find(d => {
                  const nombre = d.nombre?.toLowerCase().trim() || '';
                  return nombre === departamentoNombre || 
                         nombre.includes(departamentoNombre) ||
                         departamentoNombre.includes(nombre);
                });
                if (departamentoEncontrado) {
                  idDepartamento = departamentoEncontrado.id;
                  console.log('✅ Departamento encontrado por nombre:', {
                    departamentoBackend: administrativo.departamento,
                    departamentoEncontrado: departamentoEncontrado,
                    idDepartamento
                  });
                }
              }
              
              let idNivelAcademico: number | null = null;
              if (administrativo.idNivelAcademico != null && administrativo.idNivelAcademico !== 0) {
                idNivelAcademico = Number(administrativo.idNivelAcademico);
              } else if (administrativo.nombreNivelAcademico) {
                // Si no viene el ID pero viene el nombre, buscar en el catálogo
                const nivelNombre = administrativo.nombreNivelAcademico.toLowerCase().trim();
                const nivelEncontrado = this.nivelesAcademico().find(n => {
                  const nombre = n.nombre?.toLowerCase().trim() || '';
                  return nombre === nivelNombre || 
                         nombre.includes(nivelNombre) ||
                         nivelNombre.includes(nombre);
                });
                if (nivelEncontrado) {
                  idNivelAcademico = nivelEncontrado.id;
                }
              }
              
              console.log('🔄 Cargando valores del administrativo:', {
                administrativoCompleto: administrativo,
                administrativoIdGenero: administrativo.idGenero,
                administrativoGenero: administrativo.genero,
                administrativoIdDepartamento: administrativo.departamentoId,
                administrativoDepartamentoNombre: administrativo.departamento,
                administrativoIdNivelAcademico: administrativo.idNivelAcademico,
                administrativoNumeroOrcid: administrativo.numeroOrcid,
                administrativoCedula: administrativo.cedula,
                administrativoNumeroTelefono: administrativo.numeroTelefono,
                administrativoPuesto: administrativo.puesto,
                administrativoActivo: administrativo.activo,
                generosCargados: this.generos().length,
                departamentosCargados: this.departamentos().length,
                nivelesCargados: this.nivelesAcademico().length,
                idGeneroEncontrado: idGenero,
                idDepartamentoEncontrado: idDepartamento,
                idNivelAcademicoEncontrado: idNivelAcademico
              });
              
              // Hacer patchValue con los valores convertidos
              const patchData = {
                nombreCompleto: administrativo.nombreCompleto || '',
                correo: administrativo.correo || '',
                idGenero: idGenero,
                departamentoId: idDepartamento,
                numeroOrcid: administrativo.numeroOrcid || '',
                cedula: administrativo.cedula || '',
                numeroTelefono: administrativo.numeroTelefono || '',
                idNivelAcademico: idNivelAcademico,
                puesto: administrativo.puesto || '',
                activo: administrativo.activo !== undefined ? administrativo.activo : true
              };
              
              console.log('🔄 patchValue para administrativo:', patchData);
              
              this.form.patchValue(patchData, { emitEvent: false });
              
              setTimeout(() => {
                const formIdGenero = this.form.get('idGenero')?.value;
                const formDepartamentoId = this.form.get('departamentoId')?.value;
                const formIdNivelAcademico = this.form.get('idNivelAcademico')?.value;
                
                console.log('✅ Valores después de patchValue:', {
                  formIdGenero,
                  formDepartamentoId,
                  formIdNivelAcademico,
                  formNumeroOrcid: this.form.get('numeroOrcid')?.value,
                  formCedula: this.form.get('cedula')?.value,
                  formNumeroTelefono: this.form.get('numeroTelefono')?.value,
                  formPuesto: this.form.get('puesto')?.value,
                  formActivo: this.form.get('activo')?.value,
                  generoExiste: this.generos().some(g => g.id === formIdGenero),
                  departamentoExiste: this.departamentos().some(d => d.id === formDepartamentoId),
                  nivelExiste: this.nivelesAcademico().some(n => (n.idNivelAcademico || n.id) === formIdNivelAcademico)
                });
                
                this.form.get('idGenero')?.updateValueAndValidity({ emitEvent: false });
                this.form.get('departamentoId')?.updateValueAndValidity({ emitEvent: false });
                this.form.get('idNivelAcademico')?.updateValueAndValidity({ emitEvent: false });
              }, 50);
            };
            
            // Iniciar la verificación después de un pequeño delay
            setTimeout(checkAndPatch, 100);
          }
          this.loading.set(false);
        },
        error: (err: any) => {
          console.error('Error loading administrativo:', err);
          this.error.set('Error al cargar los datos. Por favor, intenta nuevamente.');
          this.loading.set(false);
        }
      });
    } else {
      // responsables-externos
      this.personasService.getResponsableExterno(id).subscribe({
        next: (responsable: ResponsableExterno | null) => {
          if (responsable) {
            this.form.patchValue({
              nombre: responsable.nombre,
              institucion: responsable.institucion,
              cargo: responsable.cargo || '',
              telefono: responsable.telefono || '',
              correo: responsable.correo || '',
              activo: responsable.activo
            });
          }
          this.loading.set(false);
        },
        error: (err: any) => {
          console.error('Error loading responsable externo:', err);
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
        // Validar y convertir valores antes de enviar
        const idGenero = formValue.idGenero ? Number(formValue.idGenero) : null;
        const idCarrera = formValue.idCarrera ? Number(formValue.idCarrera) : null;
        const idEstadoEstudiante = formValue.idEstadoEstudiante ? Number(formValue.idEstadoEstudiante) : null;
        
        // Validar que los IDs sean números válidos
        if (!idGenero || isNaN(idGenero) || idGenero <= 0) {
          this.error.set('El género es requerido');
          this.saving.set(false);
          return;
        }
        if (!idCarrera || isNaN(idCarrera) || idCarrera <= 0) {
          this.error.set('La carrera es requerida');
          this.saving.set(false);
          return;
        }
        if (!idEstadoEstudiante || isNaN(idEstadoEstudiante) || idEstadoEstudiante <= 0) {
          this.error.set('El estado del estudiante es requerido');
          this.saving.set(false);
          return;
        }
        
        // Filtrar solo los campos válidos para el DTO
        const estudianteData: Partial<Estudiante> = {
          nombreCompleto: formValue.nombreCompleto?.trim() || '',
          numeroCarnet: formValue.numeroCarnet?.trim() || '',
          correo: formValue.correo?.trim() || '',
          idGenero: idGenero,
          idCarrera: idCarrera,
          idEstadoEstudiante: idEstadoEstudiante,
          activo: formValue.activo ?? true,
          cedula: formValue.cedula?.trim() || undefined,
          numeroOrcid: formValue.numeroOrcid?.trim() || undefined,
          numeroTelefono: formValue.numeroTelefono?.trim() || undefined,
          nivelFormacion: formValue.nivelFormacion?.trim() || undefined
        };
        
        this.personasService.updateEstudiante(id, estudianteData).subscribe({
          next: (estudianteActualizado) => {
            console.log('✅ Estudiante actualizado exitosamente:', estudianteActualizado);
            this.saving.set(false);
            this.router.navigate(['/personas'], { queryParams: { tipo: 'estudiantes' } });
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
        const docenteData: Partial<Docente> = {
          nombreCompleto: formValue.nombreCompleto,
          correo: formValue.correo,
          idGenero: formValue.idGenero != null ? Number(formValue.idGenero) : undefined,
          departamentoId: formValue.departamentoId != null ? Number(formValue.departamentoId) : undefined,
          activo: formValue.activo ?? true,
          numeroOrcid: formValue.numeroOrcid || undefined,
          cedula: formValue.cedula || undefined,
          numeroTelefono: formValue.numeroTelefono || undefined,
          idNivelAcademico: formValue.idNivelAcademico != null && formValue.idNivelAcademico !== '' ? Number(formValue.idNivelAcademico) : undefined
        };
        
        console.log('🔄 UPDATE Docente - Datos del formulario:', formValue);
        console.log('🔄 UPDATE Docente - Datos a enviar:', docenteData);
        
        this.personasService.updateDocente(id, docenteData).subscribe({
          next: (docenteActualizado) => {
            console.log('✅ Docente actualizado exitosamente:', docenteActualizado);
            this.saving.set(false);
            this.router.navigate(['/personas'], { queryParams: { tipo: 'docentes' } });
          },
          error: (err: any) => {
            console.error('❌ Error updating docente:', err);
            console.error('❌ Error completo:', JSON.stringify(err, null, 2));
            if (err.error) {
              console.error('❌ Error body:', err.error);
              if (err.error.errors) {
                console.error('❌ Errores de validación:', err.error.errors);
              }
            }
            this.error.set(err.error?.message || err.message || 'Error al actualizar. Por favor, intenta nuevamente.');
            this.saving.set(false);
          }
        });
      } else if (tipo === 'administrativos') {
        const administrativoData: Partial<Administrativo> = {
          nombreCompleto: formValue.nombreCompleto,
          correo: formValue.correo,
          idGenero: formValue.idGenero != null ? Number(formValue.idGenero) : undefined,
          departamentoId: formValue.departamentoId != null ? Number(formValue.departamentoId) : undefined,
          activo: formValue.activo ?? true,
          numeroOrcid: formValue.numeroOrcid || undefined,
          cedula: formValue.cedula || undefined,
          numeroTelefono: formValue.numeroTelefono || undefined,
          idNivelAcademico: formValue.idNivelAcademico != null && formValue.idNivelAcademico !== '' ? Number(formValue.idNivelAcademico) : undefined,
          puesto: formValue.puesto || undefined
        };
        
        console.log('🔄 UPDATE Administrativo - Datos del formulario:', formValue);
        console.log('🔄 UPDATE Administrativo - Datos a enviar:', administrativoData);
        
        this.personasService.updateAdministrativo(id, administrativoData).subscribe({
          next: (administrativoActualizado) => {
            console.log('✅ Administrativo actualizado exitosamente:', administrativoActualizado);
            this.saving.set(false);
            this.router.navigate(['/personas'], { queryParams: { tipo: 'administrativos' } });
          },
          error: (err: any) => {
            console.error('❌ Error updating administrativo:', err);
            console.error('❌ Error completo:', JSON.stringify(err, null, 2));
            if (err.error) {
              console.error('❌ Error body:', err.error);
              if (err.error.errors) {
                console.error('❌ Errores de validación:', err.error.errors);
              }
            }
            this.error.set(err.error?.message || err.message || 'Error al actualizar. Por favor, intenta nuevamente.');
            this.saving.set(false);
          }
        });
      } else {
        // responsables-externos
        const responsableData: Partial<ResponsableExterno> = {
          nombre: formValue.nombre,
          institucion: formValue.institucion,
          cargo: formValue.cargo || undefined,
          telefono: formValue.telefono || undefined,
          correo: formValue.correo || undefined,
          activo: formValue.activo ?? true
        };
        
        console.log('🔄 UPDATE Responsable Externo - Datos del formulario:', formValue);
        console.log('🔄 UPDATE Responsable Externo - Datos a enviar:', responsableData);
        
        this.personasService.updateResponsableExterno(id, responsableData).subscribe({
          next: (responsableActualizado) => {
            console.log('✅ Responsable Externo actualizado exitosamente:', responsableActualizado);
            this.saving.set(false);
            this.router.navigate(['/personas'], { queryParams: { tipo: 'responsables-externos' } });
          },
          error: (err: any) => {
            console.error('❌ Error updating responsable externo:', err);
            console.error('❌ Error completo:', JSON.stringify(err, null, 2));
            if (err.error) {
              console.error('❌ Error body:', err.error);
              if (err.error.errors) {
                console.error('❌ Errores de validación:', err.error.errors);
              }
            }
            this.error.set(err.error?.message || err.message || 'Error al actualizar. Por favor, intenta nuevamente.');
            this.saving.set(false);
          }
        });
      }
    } else {
      // Crear
      if (tipo === 'estudiantes') {
        // Validar que todos los campos requeridos estén presentes según la documentación
        if (!formValue.nombreCompleto || !formValue.numeroCarnet || !formValue.correo || 
            !formValue.idGenero || !formValue.idCarrera || !formValue.idEstadoEstudiante) {
          this.error.set('Por favor, completa todos los campos requeridos.');
          this.saving.set(false);
          return;
        }

        const estudianteData: Omit<Estudiante, 'id'> = {
          nombreCompleto: formValue.nombreCompleto.trim(),
          numeroCarnet: formValue.numeroCarnet.trim(),
          correo: formValue.correo.trim(),
          idGenero: +formValue.idGenero,
          idCarrera: +formValue.idCarrera,
          idEstadoEstudiante: +formValue.idEstadoEstudiante,
          activo: true, // Por defecto activo
          cedula: formValue.cedula.trim(),
          numeroOrcid: formValue.numeroOrcid?.trim() || undefined,
          numeroTelefono: formValue.numeroTelefono?.trim() || undefined,
          nivelFormacion: formValue.nivelFormacion?.trim() || undefined
        };
        
        console.log('🔄 FormComponent - Form value completo:', formValue);
        console.log('🔄 FormComponent - Datos del estudiante a crear:', estudianteData);
        
        this.personasService.createEstudiante(estudianteData).subscribe({
          next: (estudianteCreado) => {
            console.log('✅ Estudiante creado exitosamente:', estudianteCreado);
            this.saving.set(false);
            this.router.navigate(['/personas'], { queryParams: { tipo: 'estudiantes' } });
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
        // Validar que todos los campos requeridos estén presentes según la documentación
        if (!formValue.nombreCompleto || !formValue.correo || !formValue.idGenero || !formValue.departamentoId) {
          this.error.set('Por favor, completa todos los campos requeridos.');
          this.saving.set(false);
          return;
        }
        
        const docenteData: Omit<Docente, 'id'> = {
          nombreCompleto: formValue.nombreCompleto.trim(),
          correo: formValue.correo.trim(),
          idGenero: +formValue.idGenero,
          departamentoId: +formValue.departamentoId,
          activo: true, // Por defecto activo
          cedula: formValue.cedula?.trim() || undefined,
          numeroOrcid: formValue.numeroOrcid?.trim() || undefined,
          numeroTelefono: formValue.numeroTelefono?.trim() || undefined,
          idNivelAcademico: formValue.idNivelAcademico ? +formValue.idNivelAcademico : undefined
        };
        
        console.log('🔄 FormComponent - Datos del docente a crear:', docenteData);
        
        console.log('🔄 CREATE Docente - Datos del formulario:', formValue);
        console.log('🔄 CREATE Docente - Datos a enviar:', docenteData);
        
        this.personasService.createDocente(docenteData).subscribe({
          next: (docenteCreado) => {
            console.log('✅ Docente creado exitosamente:', docenteCreado);
            this.saving.set(false);
            this.router.navigate(['/personas'], { queryParams: { tipo: 'docentes' } });
          },
          error: (err: any) => {
            console.error('❌ Error creating docente:', err);
            console.error('❌ Error completo:', JSON.stringify(err, null, 2));
            if (err.error) {
              console.error('❌ Error body:', err.error);
              if (err.error.errors) {
                console.error('❌ Errores de validación:', err.error.errors);
              }
            }
            this.handleCreateError(err);
            this.saving.set(false);
          }
        });
      } else if (tipo === 'administrativos') {
        // Validar que todos los campos requeridos estén presentes según la documentación
        if (!formValue.nombreCompleto || !formValue.correo || !formValue.idGenero || !formValue.departamentoId) {
          this.error.set('Por favor, completa todos los campos requeridos.');
          this.saving.set(false);
          return;
        }
        
        const administrativoData: Omit<Administrativo, 'id'> = {
          nombreCompleto: formValue.nombreCompleto.trim(),
          correo: formValue.correo.trim(),
          idGenero: +formValue.idGenero,
          departamentoId: +formValue.departamentoId,
          activo: true, // Por defecto activo
          cedula: formValue.cedula?.trim() || undefined,
          numeroOrcid: formValue.numeroOrcid?.trim() || undefined,
          numeroTelefono: formValue.numeroTelefono?.trim() || undefined,
          idNivelAcademico: formValue.idNivelAcademico ? +formValue.idNivelAcademico : undefined,
          puesto: formValue.puesto?.trim() || undefined
        };
        
        console.log('🔄 CREATE Administrativo - Datos del formulario:', formValue);
        console.log('🔄 CREATE Administrativo - Datos a enviar:', administrativoData);
        
        this.personasService.createAdministrativo(administrativoData).subscribe({
          next: (administrativoCreado) => {
            console.log('✅ Administrativo creado exitosamente:', administrativoCreado);
            this.saving.set(false);
            this.router.navigate(['/personas'], { queryParams: { tipo: 'administrativos' } });
          },
          error: (err: any) => {
            console.error('❌ Error creating administrativo:', err);
            console.error('❌ Error completo:', JSON.stringify(err, null, 2));
            if (err.error) {
              console.error('❌ Error body:', err.error);
              if (err.error.errors) {
                console.error('❌ Errores de validación:', err.error.errors);
              }
            }
            this.handleCreateError(err);
            this.saving.set(false);
          }
        });
      } else {
        // responsables-externos
        // Validar que todos los campos requeridos estén presentes
        if (!formValue.nombre || !formValue.institucion) {
          this.error.set('Por favor, completa todos los campos requeridos (nombre, institucion).');
          this.saving.set(false);
          return;
        }
        
        const responsableData: Omit<ResponsableExterno, 'id'> = {
          nombre: formValue.nombre.trim(),
          institucion: formValue.institucion.trim(),
          cargo: formValue.cargo?.trim() || undefined,
          telefono: formValue.telefono?.trim() || undefined,
          correo: formValue.correo?.trim() || undefined,
          activo: true // Por defecto activo (no se envía en POST, solo para el modelo)
        };
        
        console.log('🔄 CREATE Responsable Externo - Datos del formulario:', formValue);
        console.log('🔄 CREATE Responsable Externo - Datos a enviar:', responsableData);
        
        this.personasService.createResponsableExterno(responsableData).subscribe({
          next: (responsableCreado) => {
            console.log('✅ Responsable Externo creado exitosamente:', responsableCreado);
            this.saving.set(false);
            this.router.navigate(['/personas'], { queryParams: { tipo: 'responsables-externos' } });
          },
          error: (err: any) => {
            console.error('❌ Error creating responsable externo:', err);
            console.error('❌ Error completo:', JSON.stringify(err, null, 2));
            if (err.error) {
              console.error('❌ Error body:', err.error);
              if (err.error.errors) {
                console.error('❌ Errores de validación:', err.error.errors);
              }
            }
            this.handleCreateError(err);
            this.saving.set(false);
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
    const tipo = this.tipoPersona();
    this.router.navigate(['/personas'], { queryParams: { tipo: tipo } });
  }

  getTipoLabel(): string {
    const tipo = this.tipoPersona();
    if (tipo === 'estudiantes') return 'Estudiante';
    if (tipo === 'docentes') return 'Docente';
    if (tipo === 'administrativos') return 'Administrativo';
    return 'Participante Externo';
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

  isResponsableExterno(): boolean {
    return this.tipoPersona() === 'responsables-externos';
  }
}

