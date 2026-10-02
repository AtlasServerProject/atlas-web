import { Directive, ElementRef, HostListener, inject } from '@angular/core';
/** Keeps keyboard focus inside native dialogs, including the Tab wrap to browser chrome. */
@Directive({ selector: 'dialog[atlasDialogFocus]', standalone: true })
export class DialogFocusDirective {
  private readonly element: HTMLDialogElement = inject(ElementRef<HTMLDialogElement>).nativeElement;
  @HostListener('keydown', ['$event']) onKey(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !this.element.open) return;
    const elements = Array.from(
      this.element.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    ).filter((e) => e.getClientRects().length > 0);
    if (!elements.length) {
      event.preventDefault();
      return;
    }
    const first = elements[0],
      last = elements[elements.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === this.element)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
