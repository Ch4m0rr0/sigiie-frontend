import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import { IndicadorService } from '../../core/services/indicador.service';
import { AlertService } from '../../core/services/alert.service';
import type { ActividadMensualInstCreate } from '../../core/models/actividad-mensual-inst';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import type { Indicador } from '../../core/models/indicador';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-actividad-mensual-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './actividad-mensual-form.component.html',
})
export class ActividadMensualFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private actividadAnualService = inject(ActividadAnualService);
  private indicadorService = inject(IndicadorService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertService = inject(AlertService);

  form!: FormGroup;
  indicadores = signal<Indicador[]>([]);
  actividadesAnuales = signal<ActividadAnual[]>([]);
  isEditMode = signal(false);
  actividadMensualId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  seccionInformacionExpandida = signal(true);
  seccionEstadoExpandida = signal(true);
  
  // Dropdowns
  mostrarDropdownIndicador = signal(false);
  indicadorSeleccionado = signal<Indicador | null>(null);
  mostrarDropdownActividadAnual = signal(false);
  actividadAnualSeleccionada = signal<ActividadAnual | null>(null);

  readonly meses = [
    { value: 1, nombre: 'Enero' },
    { value: 2, nombre: 'Febrero' },
    { value: 3, nombre: 'Marzo' },
    { value: 4, nombre: 'Abril' },
    { value: 5, nombre: 'Mayo' },
    { value: 6, nombre: 'Junio' },
    { value: 7, nombre: 'Julio' },
    { value: 8, nombre: 'Agosto' },
    { value: 9, nombre: 'Septiembre' },
    { value: 10, nombre: 'Octubre' },
    { value: 11, nombre: 'Noviembre' },
    { value: 12, nombre: 'Diciembre' }
  ];

  ngOnInit(): void {
    this.initializeForm();
    this.loadIndicadores();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.actividadMensualId.set(+id);
      this.loadActividadMensual(+id);
    }

    // Leer idIndicador de query params (si viene desde el dropdown de actividades)
    const idIndicador = this.route.snapshot.queryParams['idIndicador'];
    if (idIndicador) {
      const idIndicadorNum = Number(idIndicador);
      if (!isNaN(idIndicadorNum)) {
        console.log('🔄 Preseleccionando indicador desde query params:', idIndicadorNum);
        // Esperar a que los indicadores se carguen antes de preseleccionar
        setTimeout(() => {
          this.form.patchValue({ idIndicador: idIndicadorNum });
          const indicador = this.indicadores().find(ind => ind.idIndicador === idIndicadorNum);
          if (indicador) {
            this.indicadorSeleccionado.set(indicador);
          }
        }, 100);
        // No llamar loadActividadesAnuales aquí porque valueChanges se encargará
      }
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      idIndicador: [null, Validators.required],
      idActividadAnual: [null, Validators.required],
      mes: [null, Validators.required],
      nombre: [''],
      descripcion: [''],
      activo: [true]
    });
    
    // Suscribirse a cambios en el indicador para filtrar actividades anuales
    this.form.get('idIndicador')?.valueChanges.subscribe(idIndicador => {
      console.log('🔄 Cambio en idIndicador:', idIndicador, 'tipo:', typeof idIndicador);
      
      if (idIndicador) {
        // Convertir a número si viene como string
        const idIndicadorNum = Number(idIndicador);
        if (isNaN(idIndicadorNum)) {
          console.error('❌ ID de indicador inválido en valueChanges:', idIndicador);
          this.actividadesAnuales.set([]);
          this.form.patchValue({ idActividadAnual: null }, { emitEvent: false });
          this.indicadorSeleccionado.set(null);
          return;
        }
        
        // Actualizar el indicador seleccionado
        const indicador = this.indicadores().find(ind => ind.idIndicador === idIndicadorNum);
        this.indicadorSeleccionado.set(indicador || null);
        
        // Limpiar la selección de actividad anual cuando cambia el indicador
        this.form.patchValue({ idActividadAnual: null }, { emitEvent: false });
        this.actividadAnualSeleccionada.set(null);
        this.loadActividadesAnuales(idIndicadorNum);
      } else {
        // Si no hay indicador, limpiar las actividades anuales
        console.log('🔄 Limpiando actividades anuales (sin indicador)');
        this.actividadesAnuales.set([]);
        this.form.patchValue({ idActividadAnual: null }, { emitEvent: false });
        this.indicadorSeleccionado.set(null);
        this.actividadAnualSeleccionada.set(null);
      }
    });

    // Escuchar cambios en la actividad anual para actualizar el signal
    this.form.get('idActividadAnual')?.valueChanges.subscribe((idActividadAnual) => {
      if (idActividadAnual) {
        const actividadAnual = this.actividadesAnuales().find(a => a.idActividadAnual === idActividadAnual);
        this.actividadAnualSeleccionada.set(actividadAnual || null);
      } else {
        this.actividadAnualSeleccionada.set(null);
      }
    });
  }
  
  loadIndicadores(): void {
    this.indicadorService.getAll().subscribe({
      next: (data) => {
        this.indicadores.set(data);
      },
      error: (err) => {
        console.error('Error loading indicadores:', err);
      }
    });
  }

  loadActividadesAnuales(idIndicador: number): void {
    if (!idIndicador) {
      this.actividadesAnuales.set([]);
      return;
    }
    
    // Asegurar que idIndicador sea un número
    const idIndicadorNum = Number(idIndicador);
    if (isNaN(idIndicadorNum)) {
      console.error('❌ ID de indicador inválido:', idIndicador);
      this.actividadesAnuales.set([]);
      return;
    }
    
    console.log('🔄 Cargando actividades anuales para indicador:', idIndicadorNum);
    
    // Usar getByIndicador para obtener solo las actividades anuales del indicador
    this.actividadAnualService.getByIndicador(idIndicadorNum).subscribe({
      next: (data) => {
        console.log('✅ Actividades anuales recibidas del servicio:', data);
        console.log('📊 Total de actividades recibidas:', data?.length || 0);
        
        // El servicio ya filtra por indicador, pero verificamos que coincidan
        const actividadesFiltradas = (data || []).filter(a => {
          const aIdIndicador = Number(a.idIndicador);
          const matches = aIdIndicador === idIndicadorNum;
          if (!matches) {
            console.warn('⚠️ Actividad anual con idIndicador diferente:', a.idActividadAnual, 'esperado:', idIndicadorNum, 'recibido:', aIdIndicador);
          }
          return matches;
        });
        
        console.log('✅ Actividades anuales filtradas:', actividadesFiltradas.length);
        console.log('📋 Actividades:', actividadesFiltradas.map(a => ({
          id: a.idActividadAnual,
          nombre: a.nombre,
          anio: a.anio,
          idIndicador: a.idIndicador
        })));
        
        this.actividadesAnuales.set(actividadesFiltradas);
        
        if (actividadesFiltradas.length === 0) {
          console.warn('⚠️ No se encontraron actividades anuales para el indicador:', idIndicadorNum);
        }
      },
      error: (err) => {
        console.error('❌ Error loading actividades anuales:', err);
        console.error('❌ Error details:', {
          status: err.status,
          message: err.message,
          error: err.error
        });
        this.error.set('Error al cargar las actividades anuales');
        this.actividadesAnuales.set([]);
      }
    });
  }

  loadActividadMensual(id: number): void {
    this.loading.set(true);
    this.actividadMensualInstService.getById(id).subscribe({
      next: (data) => {
        if (data) {
          // Obtener el idIndicador desde la actividad anual relacionada
          const idIndicador = data.actividadAnual?.idIndicador || null;
          
          console.log('🔄 Cargando actividad mensual:', id);
          console.log('📋 Datos recibidos:', data);
          console.log('📊 ID Indicador desde actividad anual:', idIndicador);
          
          // Si hay indicador, cargar las actividades anuales primero
          if (idIndicador) {
            const idIndicadorNum = Number(idIndicador);
            if (!isNaN(idIndicadorNum)) {
              // Cargar actividades anuales antes de hacer patchValue
              // para que el dropdown tenga las opciones disponibles
              this.loadActividadesAnuales(idIndicadorNum);
            }
          }
          
          // Hacer patchValue después de cargar actividades anuales
          // El valueChanges se encargará de cargar las actividades si cambia el indicador
          this.form.patchValue({
            idIndicador: idIndicador ? Number(idIndicador) : null,
            idActividadAnual: data.idActividadAnual || null,
            mes: data.mes || null,
            nombre: data.nombre || '',
            descripcion: data.descripcion || '',
            activo: data.activo ?? true
          }, { emitEvent: false }); // No emitir eventos para evitar cargas duplicadas
          
          // Actualizar los signals de selección después de un pequeño delay
          setTimeout(() => {
            if (idIndicador) {
              const indicador = this.indicadores().find(ind => ind.idIndicador === Number(idIndicador));
              if (indicador) {
                this.indicadorSeleccionado.set(indicador);
              }
            }
            if (data.idActividadAnual) {
              const actividadAnual = this.actividadesAnuales().find(a => a.idActividadAnual === data.idActividadAnual);
              if (actividadAnual) {
                this.actividadAnualSeleccionada.set(actividadAnual);
              }
            }
          }, 200);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading actividad mensual:', err);
        this.error.set('Error al cargar la actividad mensual institucional');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      const formValue = this.form.value;

      // Validar y convertir valores numéricos
      // Los valores del select pueden venir como string, null o número
      let idActividadAnual: number;
      let mes: number;

      // Convertir idActividadAnual
      if (formValue.idActividadAnual === null || formValue.idActividadAnual === undefined || formValue.idActividadAnual === '') {
        this.error.set('La actividad anual es requerida');
        this.loading.set(false);
        return;
      }
      idActividadAnual = Number(formValue.idActividadAnual);
      if (isNaN(idActividadAnual) || idActividadAnual <= 0) {
        this.error.set('La actividad anual seleccionada no es válida');
        this.loading.set(false);
        return;
      }

      // Convertir mes
      if (formValue.mes === null || formValue.mes === undefined || formValue.mes === '') {
        this.error.set('El mes es requerido');
        this.loading.set(false);
        return;
      }
      mes = Number(formValue.mes);
      if (isNaN(mes) || mes < 1 || mes > 12) {
        this.error.set('El mes debe estar entre 1 y 12');
        this.loading.set(false);
        return;
      }

      const data: ActividadMensualInstCreate = {
        idActividadAnual: idActividadAnual,
        mes: mes,
        nombre: formValue.nombre?.trim() || undefined,
        descripcion: formValue.descripcion?.trim() || undefined,
        activo: formValue.activo ?? true
      };

      console.log('🔄 FormComponent - Datos a enviar:', JSON.stringify(data, null, 2));

      if (this.isEditMode()) {
        this.actividadMensualInstService.update(this.actividadMensualId()!, data).subscribe({
          next: () => {
            this.mostrarAlertaExito();
          },
          error: (err: any) => {
            console.error('Error saving actividad mensual:', err);
            this.error.set('Error al guardar la actividad mensual institucional');
            this.loading.set(false);
          }
        });
      } else {
        console.log('🔄 Creando actividad mensual institucional...');
        console.log('📋 Datos a enviar:', data);
        
        this.actividadMensualInstService.create(data).subscribe({
          next: (response) => {
            console.log('✅ Actividad mensual creada exitosamente:', response);
            console.log('📊 ID de actividad mensual creada:', response.idActividadMensualInst);
            
            // Mostrar alerta de éxito
            this.mostrarAlertaExito();
          },
          error: (err: any) => {
            console.error('❌ Error saving actividad mensual:', err);
            console.error('❌ Error status:', err.status);
            console.error('❌ Error message:', err.message);
            console.error('❌ Error body:', err.error);
            
            let errorMessage = 'Error al crear la actividad mensual institucional';
            
            if (err.error) {
              // Intentar extraer mensajes de validación del backend
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
            
            this.error.set(errorMessage);
            this.loading.set(false);
          }
        });
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  get idIndicador() { return this.form.get('idIndicador'); }
  get idActividadAnual() { return this.form.get('idActividadAnual'); }
  get mes() { return this.form.get('mes'); }

  // Métodos para el dropdown de indicador
  mostrarDropdownIndicadorFunc(): void {
    this.mostrarDropdownIndicador.set(!this.mostrarDropdownIndicador());
  }

  toggleIndicador(idIndicador: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.form.patchValue({ idIndicador: idIndicador });
      const indicador = this.indicadores().find(ind => ind.idIndicador === idIndicador);
      this.indicadorSeleccionado.set(indicador || null);
      this.mostrarDropdownIndicador.set(false);
    }
  }

  isIndicadorSelected(idIndicador: number): boolean {
    return this.form.get('idIndicador')?.value === idIndicador;
  }

  tieneIndicadorSeleccionado(): boolean {
    return !!this.indicadorSeleccionado();
  }

  eliminarIndicador(): void {
    this.form.patchValue({ idIndicador: null });
    this.indicadorSeleccionado.set(null);
  }

  getIndicadoresFiltrados(): Indicador[] {
    return this.indicadores();
  }

  // Métodos para el dropdown de actividad anual
  mostrarDropdownActividadAnualFunc(): void {
    this.mostrarDropdownActividadAnual.set(!this.mostrarDropdownActividadAnual());
  }

  toggleActividadAnual(idActividadAnual: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.form.patchValue({ idActividadAnual: idActividadAnual });
      const actividadAnual = this.actividadesAnuales().find(a => a.idActividadAnual === idActividadAnual);
      this.actividadAnualSeleccionada.set(actividadAnual || null);
      this.mostrarDropdownActividadAnual.set(false);
    }
  }

  isActividadAnualSelected(idActividadAnual: number): boolean {
    return this.form.get('idActividadAnual')?.value === idActividadAnual;
  }

  tieneActividadAnualSeleccionada(): boolean {
    return !!this.actividadAnualSeleccionada();
  }

  eliminarActividadAnual(): void {
    this.form.patchValue({ idActividadAnual: null });
    this.actividadAnualSeleccionada.set(null);
  }

  getActividadesAnualesFiltradas(): ActividadAnual[] {
    return this.actividadesAnuales();
  }

  private mostrarAlertaExito(): void {
    const nombreActividad = this.form.get('nombre')?.value || 'la actividad mensual';
    
    if (this.isEditMode()) {
      // Mensaje para actividad mensual actualizada
      this.alertService.success(
        '¡Actividad mensual actualizada!',
        `La actividad mensual "${nombreActividad}" ha sido actualizada correctamente.`
      ).then(() => {
        this.router.navigate(['/actividades']);
      });
    } else {
      // Mensaje para actividad mensual creada
      this.alertService.success(
        '¡Actividad mensual creada exitosamente!',
        `La actividad mensual "${nombreActividad}" ha sido creada correctamente.`
      ).then(() => {
        this.router.navigate(['/actividades']);
      });
    }
  }
}

