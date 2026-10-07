import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CommerceClient } from '../../core/commerce-client.service';
interface Purchase { id: string; productName: string; days: number; status: string; purchasedAt: string; activatedAt: string | null; }
@Component({selector: 'app-purchase-mailbox', standalone: true, imports: [DatePipe],
 template: `<section class="card" aria-labelledby="mailbox-title"><h2 id="mailbox-title">Correio de compras</h2><p>Suas compras ficam guardadas até você ativá-las. No Minecraft, use <strong>/compras</strong> para confirmar. Os dias do VIP começam nessa ativação.</p>
 @if (error()) { <p role="status">{{ error() }}</p> }
 @for (item of items().slice(0,27); track item.id) { <article><h3>{{ item.productName }}</h3><p>{{ label(item.status) }}</p><p>{{ item.days }} dias · Compra em {{ item.purchasedAt | date:'dd/MM/yyyy HH:mm':'-0300' }}</p>@if(item.activatedAt){<p>Ativado em {{ item.activatedAt | date:'dd/MM/yyyy HH:mm':'-0300' }}</p>}</article> } @empty { @if(!loading() && !error()){<p>Nenhuma compra neste correio.</p>} }
 <div class="actions"><button class="button secondary" [disabled]="loading() || page() === 0" (click)="load(page()-1)">Anterior</button><button class="button secondary" [disabled]="loading()" (click)="load(page())">Atualizar</button><button class="button secondary" [disabled]="loading() || items().length <= 27" (click)="load(page()+1)">Próxima</button></div></section>`,
 styles: [`article{padding:1rem 0;border-top:1px solid #294235}.actions{display:flex;flex-wrap:wrap;gap:.5rem}`]})
export class PurchaseMailboxComponent implements OnInit {
 private readonly client=inject(CommerceClient);readonly items=signal<Purchase[]>([]);readonly page=signal(0);readonly loading=signal(false);readonly error=signal('');
 ngOnInit(){void this.load(0);}
 async load(page:number){this.loading.set(true);this.error.set('');try{this.items.set(await this.client.get<Purchase[]>('users/me/purchases?page='+page));this.page.set(page);}catch{this.error.set('Não foi possível consultar o correio. Tente novamente.');}finally{this.loading.set(false);}}
 label(status:string){return ({AVAILABLE:'Disponível para ativar no /compras',ACTIVATING:'Ativação em andamento',ACTIVATED:'Ativado',REVIEW:'Em revisão pela equipe'} as Record<string,string>)[status] ?? 'Consulte a equipe';}
}
