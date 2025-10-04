import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, IconComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {}