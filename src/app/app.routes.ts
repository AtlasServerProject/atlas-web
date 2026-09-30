import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { HowToPlayPageComponent } from './pages/how-to-play/how-to-play-page.component';
import { NoticesPageComponent } from './pages/notices/notices-page.component';
import { StorePageComponent } from './pages/store/store-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'how-to-play', component: HowToPlayPageComponent },
  { path: 'notices', component: NoticesPageComponent },
  { path: 'store', component: StorePageComponent },
  { path: '**', redirectTo: '' },
];
