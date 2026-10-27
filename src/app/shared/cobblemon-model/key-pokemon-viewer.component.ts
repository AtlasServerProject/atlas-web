import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  input,
  signal,
} from '@angular/core';
import type { PokemonView } from './key-renderer';

@Component({
  selector: 'app-key-pokemon-viewer',
  standalone: true,
  template: ` <div class="specimen" [class.failed]="error()">
    <div
      class="stage"
      #stage
      tabindex="0"
      role="group"
      [attr.aria-label]="
        name() + ' normal e shiny em 3D. Use as setas para girar e R para restaurar.'
      "
      (keydown)="keyboard($event)"
      (pointerdown)="start($event)"
      (pointermove)="drag($event)"
      (pointerup)="end($event)"
      (pointercancel)="end($event)"
    >
      <div class="pedestal normal"></div>
      <div class="pedestal shiny"></div>
      <canvas #canvas aria-hidden="true"></canvas>
      @if (!ready() && !error()) {
        <span class="state" role="status">Carregando modelos 3D…</span>
      }
      @if (error()) {
        <div class="state" role="status">
          Visualização 3D indisponível neste momento.<button type="button" (click)="retry()">
            Tentar novamente
          </button>
        </div>
      }
    </div>
    <div class="variant-labels">
      <span><i></i> Normal</span><span class="shiny-label">✦ Shiny</span>
    </div>
    <div class="viewer-controls">
      <span>{{ animation() }} · arraste para girar</span>
      <button
        type="button"
        (click)="rotate(-0.4)"
        [disabled]="!ready()"
        [attr.aria-label]="'Girar ' + name() + ' à esquerda'"
      >
        ↶
      </button>
      <button
        type="button"
        (click)="rotate(0.4)"
        [disabled]="!ready()"
        [attr.aria-label]="'Girar ' + name() + ' à direita'"
      >
        ↷
      </button>
      <button
        type="button"
        (click)="reset()"
        [disabled]="!ready()"
        [attr.aria-label]="'Restaurar visão de ' + name()"
      >
        ⟲
      </button>
    </div>
  </div>`,
  styles: `
    :host {
      display: block;
    }
    .specimen {
      border-radius: 16px;
      overflow: hidden;
      background:
        radial-gradient(ellipse at 20% 25%, #14416377, transparent 58%),
        radial-gradient(ellipse at 80% 30%, #51416333, transparent 55%), #081426;
    }
    .stage {
      position: relative;
      height: 270px;
      touch-action: pan-y;
      cursor: grab;
    }
    .stage:active {
      cursor: grabbing;
    }
    .stage:focus-visible {
      outline: 2px solid #72e4ff;
      outline-offset: -3px;
      border-radius: 16px;
    }
    canvas {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    .stage::after {
      content: '';
      position: absolute;
      top: 18px;
      bottom: 28px;
      left: 50%;
      width: 1px;
      background: linear-gradient(transparent, #9fbcd322, transparent);
    }
    .pedestal {
      position: absolute;
      width: 34%;
      height: 24px;
      bottom: 25px;
      border: 1px solid #71d8ff26;
      border-radius: 50%;
      background: radial-gradient(ellipse, #53b4df15, transparent 70%);
    }
    .normal {
      left: 8%;
    }
    .shiny {
      right: 8%;
      border-color: #e8be6726;
    }
    .state {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 12px;
      text-align: center;
      font-size: 12px;
      color: #a4b8d1;
      pointer-events: none;
      z-index: 2;
      padding: 20px;
    }
    .state button {
      pointer-events: auto;
    }
    .variant-labels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #adc9e4;
      padding: 0 0 20px;
    }
    .shiny-label {
      color: #edc97b;
    }
    i {
      display: inline-block;
      width: 6px;
      height: 6px;
      background: #7fe4ff;
      border-radius: 50%;
      margin: 0 5px 1px 0;
    }
    .viewer-controls {
      display: flex;
      gap: 6px;
      align-items: center;
      border-top: 1px solid #b3d2ef0f;
      padding: 10px 12px;
      color: #8ba4bf;
      font-size: 10px;
    }
    .viewer-controls span {
      flex: 1;
    }
    button {
      font: inherit;
      background: #e5f5ff08;
      border: 1px solid #90bdde30;
      color: #d0eaff;
      border-radius: 7px;
      min-width: 32px;
      min-height: 32px;
      cursor: pointer;
    }
    button:focus-visible {
      outline: 2px solid #72e4ff;
    }
    button:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .state button {
      padding: 8px 12px;
    }
    @media (max-width: 540px) {
      .stage {
        height: 250px;
      }
    }
  `,
})
export class KeyPokemonViewerComponent implements AfterViewInit, OnDestroy {
  readonly modelUrl = input.required<string>();
  readonly name = input.required<string>();
  readonly animation = input('Caminhada');
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stage', { static: true }) stage!: ElementRef<HTMLElement>;
  readonly ready = signal(false);
  readonly error = signal(false);
  private observer?: IntersectionObserver;
  private abort?: AbortController;
  private view?: PokemonView;
  private visible = false;
  private destroyed = false;
  private loading = false;
  private dragX?: number;
  ngAfterViewInit() {
    this.observer = new IntersectionObserver(
      (entries) => {
        this.visible = entries.some((entry) => entry.isIntersecting);
        if (this.visible) void this.load();
        else this.unload();
      },
      { threshold: 0.01 },
    );
    this.observer.observe(this.stage.nativeElement);
  }
  private async load() {
    if (this.loading || this.view || this.destroyed || !this.visible) return;
    this.loading = true;
    this.error.set(false);
    const abort = new AbortController();
    this.abort = abort;
    try {
      const { mountKeyPokemon } = await import('./key-renderer');
      if (abort.signal.aborted) return;
      const view = await mountKeyPokemon(this.canvas.nativeElement, this.modelUrl(), abort.signal);
      if (this.destroyed || !this.visible || abort.signal.aborted) {
        view.dispose();
        return;
      }
      this.view = view;
      this.ready.set(true);
    } catch {
      if (!abort.signal.aborted) this.error.set(true);
    } finally {
      this.loading = false;
      if (abort.signal.aborted && this.visible && !this.destroyed) void this.load();
    }
  }
  private unload() {
    this.abort?.abort();
    this.view?.dispose();
    this.view = undefined;
    this.ready.set(false);
  }
  retry() {
    if (!this.loading) void this.load();
  }
  rotate(delta: number) {
    this.view?.rotate(delta);
  }
  reset() {
    this.view?.reset();
  }
  keyboard(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', '+', '=', '-', 'r', 'R'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') this.rotate(-0.25);
    if (event.key === 'ArrowRight') this.rotate(0.25);
    if (event.key === '+' || event.key === '=') this.view?.zoom(0.1);
    if (event.key === '-') this.view?.zoom(-0.1);
    if (event.key.toLowerCase() === 'r') this.reset();
  }
  start(event: PointerEvent) {
    if (event.button !== 0) return;
    this.dragX = event.clientX;
    this.stage.nativeElement.setPointerCapture(event.pointerId);
  }
  drag(event: PointerEvent) {
    if (this.dragX === undefined) return;
    this.rotate((event.clientX - this.dragX) * 0.012);
    this.dragX = event.clientX;
  }
  end(event: PointerEvent) {
    this.dragX = undefined;
    if (this.stage.nativeElement.hasPointerCapture(event.pointerId))
      this.stage.nativeElement.releasePointerCapture(event.pointerId);
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.observer?.disconnect();
    this.unload();
  }
}
