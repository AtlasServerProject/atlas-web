import { Injectable, inject } from '@angular/core';
import { CommerceClient } from './commerce-client.service';
export interface GoogleProvider { enabled: boolean; clientId: string | null; linked: boolean; }
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
 private readonly api=inject(CommerceClient);
 provider(){return this.api.get<GoogleProvider>('auth/google/provider');}
 challenge(link:boolean){return this.api.post<{nonce:string}>('auth/google/challenge',{link});}
 link(credential:string){return this.api.post<void>('auth/google/complete',{credential});}
}
