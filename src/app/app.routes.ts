import { RecoveryPageComponent } from './pages/account/recovery-page.component';
import { adminGuard, authGuard } from './core/guards';
import { AuthPageComponent } from './pages/account/auth-page.component';
import { AccountPageComponent } from './pages/account/account-page.component';
import { AdminPageComponent } from './pages/account/admin-page.component';
import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { HowToPlayPageComponent } from './pages/how-to-play/how-to-play-page.component';
import { NoticesPageComponent } from './pages/notices/notices-page.component';
import { StorePageComponent } from './pages/store/store-page.component';
import { VipDetailPageComponent } from './pages/store/vip-detail-page.component';

export const routes: Routes = [
  {
    path: 'recuperar-senha',
    title: 'Recuperar senha | Atlas Cobblemon',
    component: RecoveryPageComponent,
    data: { mode: 'forgot' },
  },
  {
    path: 'verificar-email',
    title: 'Confirmar email | Atlas Cobblemon',
    component: RecoveryPageComponent,
    data: { mode: 'verify' },
  },
  {
    path: 'redefinir-senha',
    title: 'Nova senha | Atlas Cobblemon',
    component: RecoveryPageComponent,
    data: { mode: 'reset' },
  },
  { path: '', title: 'Atlas Cobblemon — Sua próxima aventura', component: HomePageComponent },
  { path: 'how-to-play', title: 'Como jogar | Atlas Cobblemon', component: HowToPlayPageComponent },
  { path: 'notices', title: 'Novidades | Atlas Cobblemon', component: NoticesPageComponent },
  { path: 'store/vip/:slug', component: VipDetailPageComponent },
  { path: 'store', title: 'Loja VIP | Atlas Cobblemon', component: StorePageComponent },
  { path: 'loja', title: 'Loja | Atlas Cobblemon', component: StorePageComponent },
  { path: 'login', title: 'Entrar | Atlas Cobblemon', component: AuthPageComponent },
  {
    path: 'cadastro',
    title: 'Criar conta | Atlas Cobblemon',
    component: AuthPageComponent,
    data: { register: true },
  },
  {
    path: 'conta',
    title: 'Minha conta | Atlas Cobblemon',
    component: AccountPageComponent,
    canActivate: [authGuard],
  },
  {
    path: 'minhas-compras',
    title: 'Minhas compras | Atlas Cobblemon',
    component: AccountPageComponent,
    canActivate: [authGuard],
    data: { purchases: true },
  },
  {
    path: 'admin',
    title: 'Admin | Atlas Cobblemon',
    component: AdminPageComponent,
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: '' },
];
