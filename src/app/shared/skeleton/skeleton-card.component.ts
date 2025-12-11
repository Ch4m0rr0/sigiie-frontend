import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton.component';

@Component({
  standalone: true,
  selector: 'app-skeleton-card',
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
      <div class="space-y-4">
        @if (showHeader) {
          <div class="flex items-center justify-between">
            <app-skeleton width="40%" height="1.5rem" variant="default"></app-skeleton>
            <app-skeleton width="20%" height="1rem" variant="default"></app-skeleton>
          </div>
        }
        
        @if (showContent) {
          <div class="space-y-3">
            @for (i of [1,2,3]; track i) {
              <app-skeleton width="100%" height="1rem" variant="default"></app-skeleton>
            }
          </div>
        }
        
        @if (showFooter) {
          <div class="flex items-center gap-2 pt-4 border-t border-slate-100">
            <app-skeleton width="30%" height="2rem" variant="default"></app-skeleton>
            <app-skeleton width="30%" height="2rem" variant="default"></app-skeleton>
          </div>
        }
      </div>
    </div>
  `
})
export class SkeletonCardComponent {
  @Input() showHeader: boolean = true;
  @Input() showContent: boolean = true;
  @Input() showFooter: boolean = false;
}

