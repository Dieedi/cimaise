import { Injectable } from '@angular/core';

export type MenuItemType = 'action' | 'separator' | 'color-picker';

export interface ColorSwatch {
  color: string;
  active?: boolean;
}

export interface MenuItem {
  type: MenuItemType;
  label?: string;
  color?: string;
  action?: () => void;
  swatches?: ColorSwatch[];
  onPick?: (color: string) => void;
}

export type ContextType = 'canvas' | 'image' | 'frame';

@Injectable({
  providedIn: 'root',
})
export class ContextMenuService {
  public visible = false;
  public posX = 0;
  public posY = 0;
  public items: MenuItem[] = [];

  public open(x: number, y: number, items: MenuItem[]): void {
    this.posX = x;
    this.posY = y;
    this.items = items;
    this.visible = true;
  }

  public close(): void {
    this.visible = false;
    this.items = [];
  }
}
