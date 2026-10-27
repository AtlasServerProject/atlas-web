import { SecurityDialogComponent } from './shared/security-dialog.component';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { PlayModalComponent } from './shared/play-modal/play-modal.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SecurityDialogComponent, RouterOutlet, NavbarComponent, FooterComponent, PlayModalComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {}
