import { Routes } from '@angular/router';
import { HomePageComponent } from './home-page';
import { StorePageComponent } from './store-page';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'store', component: StorePageComponent },
  { path: '**', redirectTo: '' }
];
