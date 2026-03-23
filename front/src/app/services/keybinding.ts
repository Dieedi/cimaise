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

/** Flat representation for the UI panel */
export interface BindingEntry {
  action: string;
  label: string;
  type: 'keyboard' | 'mouse';
  display: string;
}

const MOUSE_BUTTON_NAMES: Record<number, string> = {
  0: 'Left Click',
  1: 'Middle Click',
  2: 'Right Click',
  3: 'Button 4',
  4: 'Button 5',
};

@Injectable({
  providedIn: 'root',
})
export class KeyBindingService {
  private bindings: Map<string, ParsedBinding> = new Map();
  private mouseBindings: Map<string, number> = new Map();
  private handlers: Map<string, ActionHandler> = new Map();
  private labels: Map<string, string> = new Map();
  /** When true, the global keydown listener skips action dispatch */
  public capturing = false;

  constructor() {
    this.loadBindings();
  }

  /** Parse all bindings from config */
  private loadBindings(): void {
    const actions = keybindingsConfig.actions as Record<string, ActionBinding>;
    for (const [action, binding] of Object.entries(actions)) {
      if (binding.shortcut) {
        this.bindings.set(action, this.parseShortcut(binding.shortcut));
      }
      this.labels.set(action, binding.label);
    }

    const mouse = keybindingsConfig.mouse as Record<string, MouseBinding>;
    for (const [action, binding] of Object.entries(mouse)) {
      this.mouseBindings.set(action, binding.button);
      this.labels.set(action, binding.label);
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
    // Skip if user is typing in an input/textarea or capturing a new shortcut
    if (this.capturing) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    let matched = false;
    for (const [action, binding] of this.bindings) {
      if (this.matches(e, binding)) {
        if (!matched) e.preventDefault();
        matched = true;
        const handler = this.handlers.get(action);
        if (handler) handler();
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
    return this.formatBinding(binding);
  }

  /** Format a ParsedBinding to a human-readable string */
  private formatBinding(binding: ParsedBinding): string {
    const parts: string[] = [];
    if (binding.ctrl) parts.push('Ctrl');
    if (binding.shift) parts.push('Shift');
    if (binding.alt) parts.push('Alt');
    parts.push(binding.key.toUpperCase());
    return parts.join('+');
  }

  /** Get all bindings as a flat list for the settings panel */
  public getAllBindings(): BindingEntry[] {
    const entries: BindingEntry[] = [];

    // Keyboard actions — includes unbound ones
    const actions = keybindingsConfig.actions as Record<string, ActionBinding>;
    for (const action of Object.keys(actions)) {
      entries.push({
        action,
        label: this.labels.get(action) || action,
        type: 'keyboard',
        display: this.getShortcutLabel(action) || 'None',
      });
    }

    for (const [action, button] of this.mouseBindings) {
      entries.push({
        action,
        label: this.labels.get(action) || action,
        type: 'mouse',
        display: MOUSE_BUTTON_NAMES[button] || `Button ${button}`,
      });
    }

    return entries;
  }

  /** Update a keyboard shortcut from a captured KeyboardEvent */
  public updateShortcut(action: string, e: KeyboardEvent): string {
    const parsed: ParsedBinding = {
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
      key: e.key.toLowerCase(),
    };
    this.bindings.set(action, parsed);
    return this.formatBinding(parsed);
  }

  /** Update a mouse button binding from a captured MouseEvent */
  public updateMouseButton(action: string, e: MouseEvent): string {
    this.mouseBindings.set(action, e.button);
    return MOUSE_BUTTON_NAMES[e.button] || `Button ${e.button}`;
  }
}
