import { Injectable } from '@angular/core';
import keybindingsConfig from '../../../../config/keybindings.json';

interface ActionBinding {
  label: string;
  shortcut: string;
}

interface MouseBinding {
  label: string;
  button: number;
}

interface ParsedBinding {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

type ActionHandler = () => void;

@Injectable({
  providedIn: 'root',
})
export class KeyBindingService {
  private bindings: Map<string, ParsedBinding> = new Map();
  private mouseBindings: Map<string, number> = new Map();
  private handlers: Map<string, ActionHandler> = new Map();

  constructor() {
    this.loadBindings();
  }

  /** Parse all bindings from config */
  private loadBindings(): void {
    const actions = keybindingsConfig.actions as Record<string, ActionBinding>;
    for (const [action, binding] of Object.entries(actions)) {
      this.bindings.set(action, this.parseShortcut(binding.shortcut));
    }

    const mouse = keybindingsConfig.mouse as Record<string, MouseBinding>;
    for (const [action, binding] of Object.entries(mouse)) {
      this.mouseBindings.set(action, binding.button);
    }
  }

  /**
   * Parse a shortcut string like "ctrl+shift+s" into modifiers + key.
   * Format: [modifier+]...key — modifiers: ctrl, shift, alt
   */
  private parseShortcut(shortcut: string): ParsedBinding {
    const parts = shortcut.toLowerCase().split('+');
    return {
      ctrl: parts.includes('ctrl'),
      shift: parts.includes('shift'),
      alt: parts.includes('alt'),
      key: parts.filter(p => !['ctrl', 'shift', 'alt'].includes(p))[0],
    };
  }

  /** Register a handler for a named action */
  public register(action: string, handler: ActionHandler): void {
    this.handlers.set(action, handler);
  }

  /** Attach the global keydown listener — call once in ngAfterViewInit */
  public listen(): void {
    document.addEventListener('keydown', (e) => {
      this.handleKeyEvent(e);
    });
  }

  /** Match a keyboard event against all bindings and execute the handler */
  private handleKeyEvent(e: KeyboardEvent): void {
    // Skip if user is typing in an input/textarea
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    for (const [action, binding] of this.bindings) {
      if (this.matches(e, binding)) {
        e.preventDefault();
        const handler = this.handlers.get(action);
        if (handler) handler();
        return;
      }
    }
  }

  /** Check if a keyboard event matches a parsed binding */
  private matches(e: KeyboardEvent, binding: ParsedBinding): boolean {
    return (
      e.key.toLowerCase() === binding.key &&
      e.ctrlKey === binding.ctrl &&
      e.shiftKey === binding.shift &&
      e.altKey === binding.alt
    );
  }

  /** Get the mouse button number for a named mouse action */
  public getMouseButton(action: string): number {
    const button = this.mouseBindings.get(action);
    if (button === undefined) {
      throw new Error(`Unknown mouse action: ${action}`);
    }
    return button;
  }

  /** Get the display label for a shortcut (e.g. "Ctrl+S") */
  public getShortcutLabel(action: string): string {
    const binding = this.bindings.get(action);
    if (!binding) return '';

    const parts: string[] = [];
    if (binding.ctrl) parts.push('Ctrl');
    if (binding.shift) parts.push('Shift');
    if (binding.alt) parts.push('Alt');
    parts.push(binding.key.toUpperCase());
    return parts.join('+');
  }
}
