import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import { AlertService } from '../../core/services/alert.service';
import type { ActividadMensualInstCreate } from '../../core/models/actividad-mensual-inst';
import type { ActividadAnual } from '../../core/models/actividad-anual';
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertService = inject(AlertService);

  form!: FormGroup;
  actividadesAnuales = signal<ActividadAnual[]>([]);
  isEditMode = signal(false);
  actividadMensualId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  seccionInformacionExpandida = signal(true);
  
  // Dropdown de actividad anual
  mostrarDropdownActividadAnual = signal(false);
  actividadAnualSeleccionada = signal<ActividadAnual | null>(null);
  terminoBusquedaActividadAnual = signal<string>('');
  
  // Actividades anuales filtradas por búsqueda
  actividadesAnualesFiltradas = computed(() => {
    const termino = this.terminoBusquedaActividadAnual().toLowerCase().trim();
    if (!termino) {
      return this.actividadesAnuales();
    }
    return this.actividadesAnuales().filter(anual => {
      const nombre = (anual.nombre || '').toLowerCase();
      const nombreIndicador = (anual.nombreIndicador || '').toLowerCase();
      const codigoIndicador = (anual.codigoIndicador || '').toLowerCase();
      const anio = (anual.anio || '').toString();
      return nombre.includes(termino) || 
             nombreIndicador.includes(termino) || 
             codigoIndicador.includes(termino) ||
             anio.includes(termino);
    });
  });


  ngOnInit(): void {
    this.initializeForm();
    this.loadActividadesAnuales();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.actividadMensualId.set(+id);
      this.loadActividadMensual(+id);
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      idActividadAnual: [null, Validators.required],
      nombre: ['', Validators.required],
      descripcion: ['']
      // activo se establece automáticamente como true al crear
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
  
  loadActividadesAnuales(): void {
    this.actividadAnualService.getAll().subscribe({
      next: (data) => {
        this.actividadesAnuales.set(data || []);
      },
      error: (err) => {
        console.error('Error loading actividades anuales:', err);
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
          this.form.patchValue({
            idActividadAnual: data.idActividadAnual || null,
            nombre: data.nombre || '',
            descripcion: data.descripcion || ''
          }, { emitEvent: false });
          
          // Actualizar el signal de selección después de un pequeño delay
          setTimeout(() => {
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
        console.error('Error loading actividad mensual:', err);
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

      // Validar y convertir idActividadAnual
      let idActividadAnual: number;
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

      const data: ActividadMensualInstCreate = {
        idActividadAnual: idActividadAnual,
        nombre: formValue.nombre?.trim() || undefined,
        descripcion: formValue.descripcion?.trim() || undefined
        // activo se establece automáticamente como true en el backend
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

  get idActividadAnual() { return this.form.get('idActividadAnual'); }

  // Métodos para el dropdown de actividad anual
  toggleDropdownActividadAnualFunc(): void {
    this.mostrarDropdownActividadAnual.set(!this.mostrarDropdownActividadAnual());
    if (!this.mostrarDropdownActividadAnual()) {
      this.terminoBusquedaActividadAnual.set('');
    }
  }

  seleccionarActividadAnual(idActividadAnual: number): void {
    this.form.patchValue({ idActividadAnual: idActividadAnual });
    const actividadAnual = this.actividadesAnuales().find(a => a.idActividadAnual === idActividadAnual);
    this.actividadAnualSeleccionada.set(actividadAnual || null);
    this.mostrarDropdownActividadAnual.set(false);
    this.terminoBusquedaActividadAnual.set('');
  }

  tieneActividadAnualSeleccionada(): boolean {
    return !!this.actividadAnualSeleccionada();
  }

  eliminarActividadAnual(): void {
    this.form.patchValue({ idActividadAnual: null });
    this.actividadAnualSeleccionada.set(null);
    this.terminoBusquedaActividadAnual.set('');
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

