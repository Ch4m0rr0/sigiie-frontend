import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-skeleton',
  imports: [CommonModule],
  template: `
    <div 
      [class]="getClasses()"
      [style.width]="width"
      [style.height]="height"
      [style.border-radius]="rounded"
      [style.background-size]="'200% 100%'"
    ></div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SkeletonComponent {
  @Input() width: string = '100%';
  @Input() height: string = '1rem';
  @Input() rounded: string = '0.5rem';
  @Input() variant: 'default' | 'circular' | 'rectangular' = 'default';

  getClasses(): string {
    const baseClasses = 'animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-shimmer';
    
    if (this.variant === 'circular') {
      return `${baseClasses} rounded-full`;
    } else if (this.variant === 'rectangular') {
      return `${baseClasses} rounded-none`;
    }
    
    return baseClasses;
  }
}

