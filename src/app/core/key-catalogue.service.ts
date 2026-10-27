import { Injectable, signal } from '@angular/core';
export interface KeyPokemon {
  species: string;
  name: string;
  classification: 'legendary' | 'mythical';
  modelUrl: string;
  animation: string;
  generation: number;
}
export interface KeyCrate {
  hiddenPreviews?: string[];
  identifier: string;
  name: string;
  generation: number | null;
  region: string | null;
  period: string | null;
  species: KeyPokemon[];
}
interface Catalogue {
  schemaVersion: number;
  generatedAt: string;
  crates: KeyCrate[];
}
export function currentCrateMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts();
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`;
}
@Injectable({ providedIn: 'root' })
export class KeyCatalogueService {
  readonly catalogue = signal<Catalogue | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  private pending?: Promise<void>;
  load(force = false): Promise<void> {
    if (this.pending) return this.pending;
    if (this.catalogue() && !force) return Promise.resolve();
    this.loading.set(true);
    this.error.set('');
    return (this.pending = (async () => {
      try {
        const response = await fetch('/pokemon/keys/catalogue.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error('Unavailable');
        const data = (await response.json()) as Catalogue;
        if (data.schemaVersion !== 1 || !Array.isArray(data.crates) || data.crates.length !== 10)
          throw new Error('Invalid catalogue');
        for (const crate of data.crates) {
          if (
            !/^(generation_[1-9]|legendary_monthly)$/.test(crate.identifier) ||
            !Array.isArray(crate.species)
          )
            throw new Error('Invalid crate');
          for (const pokemon of crate.species) {
            if (
              !/^[a-z0-9]+$/.test(pokemon.species) ||
              !new RegExp(`^/pokemon/keys/${pokemon.species}/model\\.json\\?v=[a-f0-9]{12}$`).test(
                pokemon.modelUrl,
              )
            )
              throw new Error('Invalid asset path');
          }
        }
        this.catalogue.set(data);
      } catch {
        this.error.set('Não foi possível carregar o catálogo. Tente novamente em instantes.');
      } finally {
        this.loading.set(false);
        this.pending = undefined;
      }
    })());
  }
}
