import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
const VARIANTS = [
  { id: 'oak', name: 'Carvalho' }, { id: 'birch', name: 'Bétula' },
  { id: 'jungle', name: 'Selva' }, { id: 'spruce', name: 'Pinheiro' },
  { id: 'acacia', name: 'Acácia' }, { id: 'darkoak', name: 'Carvalho escuro' },
  { id: 'swamp', name: 'Pântano' }, { id: 'azalea', name: 'Azaleia' },
  { id: 'mangrove', name: 'Mangue' }, { id: 'cherry', name: 'Cerejeira' },
];
@Component({
  selector: 'app-cobblemon-model', standalone: true,
  template: `<div #viewer class="viewer" role="group" tabindex="0" aria-describedby="torterra-instructions" [attr.aria-label]="'Torterra do Cobblemon — ' + current().name"></div>
    @if (!ready()) { <img src="/pokemon/torterra-preview.png" width="460" height="460" alt="Torterra do Cobblemon" /> }
    <span id="torterra-instructions" class="interaction-hint">Arraste para girar · role ou use dois dedos para zoom<span class="sr-only">. No teclado: setas para girar, mais e menos para zoom, R para restaurar.</span></span>
    @if (ready()) {
      <div class="variant-controls"><span>{{ current().name }}</span>
        <button (click)="next()" [disabled]="busy()" aria-label="Trocar variante do Torterra">Trocar variante ↻</button>
      </div>
    }`,
  styles: `:host{display:block;position:relative;width:100%;max-width:460px;aspect-ratio:1;padding-bottom:52px;box-sizing:content-box;}
    .viewer{position:absolute;inset:0 0 52px;}img{position:absolute;inset:0;width:100%;height:calc(100% - 52px);object-fit:contain;}
    .interaction-hint{position:absolute;bottom:42px;left:0;right:0;text-align:center;font-size:10px;color:#a8b9d0;}
    .viewer:focus-visible{outline:2px solid #86e0ff;outline-offset:3px;border-radius:24px;}
    .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);}
    .variant-controls{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:12px;font-size:11px;color:#b6c7df;}
    button{border:1px solid #89caff44;border-radius:20px;background:#0b142bd9;color:#86e0ff;padding:8px 12px;cursor:pointer;font:inherit;}
    button:focus-visible{outline:2px solid #86e0ff;outline-offset:3px;}button:disabled{opacity:.5;cursor:wait;}
    @media(max-width:640px){
      :host{aspect-ratio:auto;padding-bottom:0;}
      .viewer{position:relative;inset:auto;aspect-ratio:1;width:100%;}
      img{height:auto;aspect-ratio:1;}
      .interaction-hint{display:block;position:relative;inset:auto;margin:18px 8px 12px;line-height:1.6;}
      .variant-controls{position:relative;inset:auto;flex-wrap:wrap;}
    }`,
})
export class CobblemonModelComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewer', { static: true }) viewer!: ElementRef<HTMLElement>;
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly current = signal(VARIANTS[0]);
  private index = Math.floor(Math.random() * VARIANTS.length);
  private observer?: IntersectionObserver;
  private cleanup?: () => void;
  private layer?: HTMLElement;
  private timer?: ReturnType<typeof setInterval>;
  private pending = new Set<() => void>();
  private destroyed = false;
  private visible = false;
  private started = false;
  private interacting = false;
  private resumeAt = 0;
  private interaction = (active: boolean) => {
    this.interacting = active;
    this.resumeAt = Date.now() + 15000;
  };
  ngAfterViewInit() {
    this.observer = new IntersectionObserver(entries => {
      this.visible = entries.some(entry => entry.isIntersecting);
      if (this.visible && !this.started) {
        this.started = true;
        void this.load(this.index);
        this.timer = setInterval(() => {
          if (this.visible && !document.hidden && !this.interacting && Date.now() >= this.resumeAt && !matchMedia('(prefers-reduced-motion: reduce)').matches) this.next();
        }, 15000);
      }
    });
    this.observer.observe(this.viewer.nativeElement);
  }
  next() { if (!this.busy()) void this.load((this.index + 1) % VARIANTS.length); }
  private async load(index: number) {
    this.busy.set(true);
    const layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;inset:0;opacity:0;transition:opacity .5s';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) layer.style.transition = 'none';
    let dispose: (() => void) | undefined;
    try {
      const { mountTorterra } = await import('./torterra-renderer');
      if (this.destroyed) return;
      this.viewer.nativeElement.appendChild(layer);
      const release = await mountTorterra(layer, VARIANTS[index].id, this.interaction);
      let disposed = false;
      dispose = () => { if (!disposed) { disposed = true; release(); layer.remove(); } };
      if (this.destroyed) { dispose(); return; }
      const previous = this.cleanup;
      if (previous) {
        this.pending.add(previous);
        setTimeout(() => { previous(); this.pending.delete(previous); }, 550);
      }
      if (this.layer) this.layer.style.opacity = '0';
      void layer.offsetWidth;
      layer.style.opacity = '1';
      if (this.layer) this.layer.style.pointerEvents = 'none';
      this.layer = layer;
      this.cleanup = dispose;
      this.index = index;
      this.current.set(VARIANTS[index]);
      this.ready.set(true);
    } catch { dispose?.(); layer.remove(); /* Keep the previous variant or static preview. */ }
    finally { this.busy.set(false); }
  }
  ngOnDestroy() {
    this.destroyed = true;
    clearInterval(this.timer);
    this.observer?.disconnect(); this.cleanup?.();
    this.pending.forEach(dispose => dispose()); this.pending.clear();
  }
}
