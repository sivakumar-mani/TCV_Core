import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {MatExpansionModule} from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-sidebar',
  imports: [MatExpansionModule, MatListModule,MatIcon, RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
readonly panelOpenState = signal(false);  // using to expand collapse the accordion
}
