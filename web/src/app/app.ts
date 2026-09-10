import { afterNextRender, Component } from '@angular/core';
import { ContactsPage } from './contacts/contacts-page';

const BOOT_SPLASH_MIN_MS = 1500;

@Component({
  selector: 'app-root',
  imports: [ContactsPage],
  templateUrl: './app.html',
})
export class App {
  constructor() {
    afterNextRender(() => this.dismissBootSplash());
  }

  private dismissBootSplash(): void {
    const splash = document.getElementById('boot-splash');
    if (!splash) {
      return;
    }
    const remaining = Math.max(0, BOOT_SPLASH_MIN_MS - performance.now());
    setTimeout(() => {
      splash.classList.add('boot-splash-hide');
      setTimeout(() => splash.remove(), 240);
    }, remaining);
  }
}
