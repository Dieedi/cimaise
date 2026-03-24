import { Component, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import Konva from 'konva';
import { CanvasService } from './services/canvas';
import canvasConfig from '../../../config/canvas.json';
import { ZoomService } from './services/zoom';
import { PanService } from './services/pan';
import { DropService } from './services/drop';
import { SelectionService } from './services/selection';
import { SaveService } from './services/save';
import { OpenService } from './services/open';
import { FrameService } from './services/frame';
import { ContextMenuService, MenuItem } from './services/context-menu';
import { KeyBindingService, BindingEntry } from './services/keybinding';
import { ApiService } from './services/api';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit{
  @ViewChild('canvasContainer') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('contextMenuEl') contextMenuEl?: ElementRef<HTMLDivElement>;

  // Keybindings panel state
  public keybindingsPanelOpen = false;
  public keybindingEntries: BindingEntry[] = [];
  public capturingAction: string | null = null;
  private capturingType: 'keyboard' | 'mouse' | null = null;
  private captureKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private captureMouseHandler: ((e: MouseEvent) => void) | null = null;

  // Window drag state (right-click drag to move frameless window)
  private windowDragState: {
    startX: number; startY: number;
    lastX: number; lastY: number;
    isDragging: boolean;
  } | null = null;

  // Last known cursor position in world coordinates
  private lastWorldX = 0;
  private lastWorldY = 0;

  constructor(
    private canvasService: CanvasService,
    private zoomService: ZoomService,
    private panService: PanService,
    private dropService: DropService,
    private selectionService: SelectionService,
    private saveService: SaveService,
    private openService: OpenService,
    private frameService: FrameService,
    public contextMenu: ContextMenuService,
    private keybinding: KeyBindingService,
    public apiService: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}
  private get stage(): Konva.Stage{
    return this.canvasService.stage;
  }

  /** Initialize the Konva stage, layer, and all canvas interactions */
  ngAfterViewInit(): void {
    // Try to connect to the backend server
    this.apiService.tryConnect().then(connected => {
      if (connected) console.log('[Moody] Connected to server');
      else console.log('[Moody] No server found — offline mode');
      this.cdr.detectChanges();
    });
    // get DOM
    const container = this.containerRef.nativeElement;

    this.canvasService.init(container);
    this.selectionService.init();
    this.frameService.init();
    this.setupMouseClick();
    this.canvasService.updateImagesBoundingBox();
    this.zoomService.setupZoom();
    this.panService.setupPan();
    this.dropService.setupDragAndDrop();
    this.setupContextMenu();

    // Close context menu on any click outside it
    document.addEventListener('mousedown', (e) => {
      if (!this.contextMenu.visible) return;
      const menuEl = this.contextMenuEl?.nativeElement;
      if (menuEl && !menuEl.contains(e.target as Node)) {
        this.contextMenu.close();
        this.cdr.detectChanges();
      }
    });

    // Register keyboard shortcuts via KeyBindingService
    this.keybinding.register('save', () => this.saveService.save());
    this.keybinding.register('open', () => this.openService.open());
    this.keybinding.register('closeApp', () => window.close());
    this.keybinding.register('newFrame', () => this.frameService.createFrame(this.lastWorldX, this.lastWorldY));
    this.keybinding.register('resetZoom', () => {
      this.stage.scale({ x: 1, y: 1 });
      this.frameService.updateTitleScales();
    });
    this.keybinding.register('focusAll', () => this.focusAll());
    this.keybinding.register('deleteImage', () => {
      const images = [...this.selectionService.getSelectedImages()];
      const frames = [...this.selectionService.getSelectedFrames()];
      this.selectionService.clearSelection();
      images.forEach(img => this.deleteImage(img));
      frames.forEach(frame => this.frameService.deleteFrame(frame));
    });
    this.keybinding.register('deleteFrame', () => {
      const frames = this.selectionService.getSelectedFrames();
      if (frames.length > 0) {
        this.selectionService.clearSelection();
        frames.forEach(frame => this.frameService.deleteFrame(frame));
      }
    });
    this.keybinding.register('duplicateImage', () => {
      const selected = this.selectionService.getSelectedImages();
      selected.forEach(img => this.duplicateImage(img));
    });
    this.keybinding.register('renameFrame', () => {
      const frames = this.selectionService.getSelectedFrames();
      if (frames.length === 1) this.frameService.editTitle(frames[0]);
    });
    this.keybinding.listen();
  }

  /** Handle mouse button events (pan toggle, future: selection, context menu) */
  private setupMouseClick(): void {
    this.stage.on('mousedown', (e) => {
      if (this.contextMenu.visible) {
        this.contextMenu.close();
        this.cdr.detectChanges();
      }

      const stagePos = this.stage.position();
      const scale = this.stage.scaleX();
      const worldX = (e.evt.pageX - stagePos.x) / scale;
      const worldY = (e.evt.pageY - stagePos.y) / scale;

      switch (e.evt.button){
        case this.keybinding.getMouseButton('dragImage'):
          // Try frame edge resize first
          if (this.frameService.startResize(worldX, worldY)) {
            break;
          }
          // Only start box select on empty canvas area (not on images or frames)
          const target = e.target;
          if (target instanceof Konva.Image || this.frameService.isFrameNode(target)) {
            break;
          }
          this.selectionService.isSelecting = true;
          this.selectionService.startBoxSelect(worldX, worldY);
          break;
        case this.keybinding.getMouseButton('panView'):
          this.panService.isPanning = true;
          break;
        case this.keybinding.getMouseButton('menuOpen'):
          this.windowDragState = {
            startX: e.evt.screenX,
            startY: e.evt.screenY,
            lastX: e.evt.screenX,
            lastY: e.evt.screenY,
            isDragging: false,
          };
          break;
      }
    })

    this.stage.on('mouseup', (e) => {
      switch (e.evt.button){
        case this.keybinding.getMouseButton('dragImage'):
          if (this.frameService.isResizing) {
            this.frameService.endResize();
            break;
          }
          this.selectionService.isSelecting = false;
          const hasBoxSelected = this.selectionService.endBoxSelect(this.frameService.getFrames());
          if (!hasBoxSelected) {
            // click select on mouseup to allow box select draw on mousedown
            const target = e.target;
            if (target instanceof Konva.Image) {
              if (e.evt.ctrlKey) {
                this.selectionService.toggleSelect(target);
              } else {
                this.selectionService.select(target);
              }
            } else if (this.frameService.isFrameNode(target)) {
              const frame = this.frameService.getFrameFromChild(target);
              if (frame) {
                if (e.evt.ctrlKey) {
                  this.selectionService.toggleSelect(frame);
                } else {
                  this.selectionService.select(frame);
                }
              }
            } else {
              this.selectionService.clearSelection();
            }
          }
          break;
        case this.keybinding.getMouseButton('panView'):
          this.panService.isPanning = false;
          break;
        case this.keybinding.getMouseButton('menuOpen'):
          // Delay reset so contextmenu event can still check isDragging
          setTimeout(() => this.windowDragState = null, 0);
          break;
      }
    })

    this.stage.on('mousemove', (e) => {
      // Window drag with right-click
      if (this.windowDragState) {
        const dx = e.evt.screenX - this.windowDragState.lastX;
        const dy = e.evt.screenY - this.windowDragState.lastY;
        const totalDx = e.evt.screenX - this.windowDragState.startX;
        const totalDy = e.evt.screenY - this.windowDragState.startY;

        if (!this.windowDragState.isDragging) {
          if (Math.abs(totalDx) > 5 || Math.abs(totalDy) > 5) {
            this.windowDragState.isDragging = true;
          } else {
            return;
          }
        }

        this.windowDragState.lastX = e.evt.screenX;
        this.windowDragState.lastY = e.evt.screenY;
        window.electronAPI.moveWindow(dx, dy);
        return;
      }

      const stagePos = this.stage.position();
      const scale = this.stage.scaleX();
      const worldX = (e.evt.pageX - stagePos.x) / scale;
      const worldY = (e.evt.pageY - stagePos.y) / scale;
      this.lastWorldX = worldX;
      this.lastWorldY = worldY;

      if (this.frameService.isResizing) {
        this.frameService.updateResize(worldX, worldY);
        return;
      }

      if (this.selectionService.isSelecting) {
        this.selectionService.updateBoxSize(worldX, worldY);
      }

      // Update cursor when hovering frame edges
      this.frameService.updateCursorForEdge(worldX, worldY);
    })
  }

  private setupContextMenu(): void {
    const container = this.stage.container();

    container.addEventListener('contextmenu', (e) => {
      e.preventDefault();

      // Skip context menu if window was dragged
      if (this.windowDragState?.isDragging) {
        return;
      }

      // Find which Konva node is under the cursor
      const pos = this.stage.getPointerPosition();
      const target = pos ? this.stage.getIntersection(pos) : null;

      let items: MenuItem[];

      if (target instanceof Konva.Image) {
        items = this.buildImageMenu(target);
      } else if (target && this.frameService.isFrameNode(target)) {
        const frame = this.frameService.getFrameFromChild(target);
        items = frame ? this.buildFrameMenu(frame) : [];
      } else {
        items = this.buildCanvasMenu();
      }

      this.contextMenu.open(e.pageX, e.pageY, items);
      this.cdr.detectChanges();

      // Reposition if menu overflows the viewport
      requestAnimationFrame(() => {
        const menuEl = this.contextMenuEl?.nativeElement;
        if (!menuEl) return;
        const rect = menuEl.getBoundingClientRect();
        let x = e.pageX;
        let y = e.pageY;
        if (x + rect.width > window.innerWidth) {
          x = x - rect.width;
        }
        if (y + rect.height > window.innerHeight) {
          y = y - rect.height;
        }
        this.contextMenu.posX = Math.max(0, x);
        this.contextMenu.posY = Math.max(0, y);
        this.cdr.detectChanges();
      });
    });
  }

  private buildCanvasMenu(): MenuItem[] {
    return [
      { type: 'action', label: 'Save', action: () => this.saveService.save() },
      { type: 'action', label: 'Open', action: () => this.openService.open() },
      { type: 'separator' },
      { type: 'action', label: 'Add Frame', action: () => this.frameService.createFrame(this.lastWorldX, this.lastWorldY) },
      { type: 'action', label: 'Clear Canvas', color: '#f87171', action: () => this.clearCanvas() },
      { type: 'separator' },
      { type: 'action', label: 'Reset Zoom', action: () => {
        this.stage.scale({ x: 1, y: 1 });
        this.frameService.updateTitleScales();
      }},
      { type: 'action', label: 'Focus All', action: () => this.focusAll() },
      { type: 'separator' },
      { type: 'action', label: 'Keybindings', action: () => this.openKeybindingsPanel() },
      { type: 'separator' },
      this.apiService.connected
        ? { type: 'action', label: '● Server Connected', color: '#4ade80', action: () => this.apiService.disconnect().then(() => this.cdr.detectChanges()) }
        : { type: 'action', label: '○ Offline mode', action: () => this.apiService.tryConnect().then(() => this.cdr.detectChanges()) },
      { type: 'separator' },
      { type: 'action', label: 'Close', action: () => window.close() },
    ];
  }

  private buildImageMenu(image: Konva.Image): MenuItem[] {
    return [
      { type: 'action', label: 'Duplicate', action: () => this.duplicateImage(image) },
      { type: 'action', label: 'Delete', action: () => this.deleteImage(image) },
    ];
  }

  private buildFrameMenu(frame: Konva.Group): MenuItem[] {
    const currentColor = this.frameService.getColor(frame);
    const swatches = canvasConfig.frame.colorPresets.map(preset => ({
      color: preset.color,
      active: preset.color === currentColor,
    }));

    return [
      { type: 'action', label: 'Rename', action: () => this.frameService.editTitle(frame) },
      { type: 'separator' },
      {
        type: 'color-picker',
        swatches,
        onPick: (color: string) => this.frameService.setColor(frame, color),
      },
      { type: 'separator' },
      { type: 'action', label: 'Delete Frame', action: () => this.frameService.deleteFrame(frame) },
      { type: 'action', label: 'Delete Frame + Content', action: () => this.frameService.deleteFrameWithContent(frame) },
    ];
  }

  private clearCanvas(): void {
    this.selectionService.clearSelection();
    this.frameService.clearAllFrames();
    this.canvasService.getImages().forEach(node => node.destroy());
    this.canvasService.updateImagesBoundingBox();
  }

  private deleteImage(image: Konva.Image): void {
    this.selectionService.clearSelection();
    this.frameService.updateImageAttachment(image);
    image.destroy();
    this.canvasService.updateImagesBoundingBox();
  }

  private duplicateImage(image: Konva.Image): void {
    const offset = canvasConfig.image.duplicateOffset;
    const clone = image.clone({
      x: image.x() + offset,
      y: image.y() + offset,
    }) as Konva.Image;

    clone.on('dragstart', (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button !== this.keybinding.getMouseButton('dragImage')) {
        clone.stopDrag();
      }
    });
    clone.on('dragmove', () => {
      this.canvasService.updateImagesBoundingBox();
    });
    clone.on('dragend', () => {
      this.frameService.updateImageAttachment(clone);
    });

    this.canvasService.imgbb.add(clone);
    this.canvasService.updateImagesBoundingBox();
    this.frameService.updateImageAttachment(clone);
  }

  public onMenuItemClick(item: MenuItem, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.close();
    if (item.action) {
      item.action();
    }
  }

  public onSwatchClick(item: MenuItem, color: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.close();
    if (item.onPick) {
      item.onPick(color);
    }
  }

  public openKeybindingsPanel(): void {
    this.keybindingEntries = this.keybinding.getAllBindings();
    this.keybindingsPanelOpen = true;
    this.cdr.detectChanges();
  }

  public closeKeybindingsPanel(): void {
    this.stopCapture();
    this.keybindingsPanelOpen = false;
    this.cdr.detectChanges();
  }

  public startCapture(entry: BindingEntry, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    // Clean up any previous capture
    this.stopCapture();

    this.capturingAction = entry.action;
    this.capturingType = entry.type;
    this.keybinding.capturing = true;
    this.cdr.detectChanges();

    if (entry.type === 'keyboard') {
      this.captureKeyHandler = (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Ignore lone modifier keys
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

        const display = this.keybinding.updateShortcut(entry.action, e);
        entry.display = display;
        this.stopCapture();
        this.cdr.detectChanges();
      };
      document.addEventListener('keydown', this.captureKeyHandler, true);
    } else {
      this.captureMouseHandler = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const display = this.keybinding.updateMouseButton(entry.action, e);
        entry.display = display;
        this.stopCapture();
        this.cdr.detectChanges();
      };
      // Delay to avoid capturing the click that opened capture mode
      setTimeout(() => {
        if (this.captureMouseHandler) {
          document.addEventListener('mousedown', this.captureMouseHandler, true);
        }
      }, 100);
    }
  }

  private stopCapture(): void {
    this.capturingAction = null;
    this.capturingType = null;
    this.keybinding.capturing = false;

    if (this.captureKeyHandler) {
      document.removeEventListener('keydown', this.captureKeyHandler, true);
      this.captureKeyHandler = null;
    }
    if (this.captureMouseHandler) {
      document.removeEventListener('mousedown', this.captureMouseHandler, true);
      this.captureMouseHandler = null;
    }
  }

  private focusAll(): void {
    const nodes = this.canvasService.imgbb.getChildren(
      node => node !== this.canvasService.imgbbBg
    );
    if (nodes.length === 0) return;

    // Calculate bounding box of all content
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.x());
      minY = Math.min(minY, node.y());
      maxX = Math.max(maxX, node.x() + node.width());
      maxY = Math.max(maxY, node.y() + node.height());
    });

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    if (contentW === 0 || contentH === 0) return;

    const padding = canvasConfig.viewport.focusAllPadding;
    const viewW = window.innerWidth - padding * 2;
    const viewH = window.innerHeight - padding * 2;

    // Scale to fit
    const scale = Math.min(viewW / contentW, viewH / contentH);
    this.stage.scale({ x: scale, y: scale });

    // Center content in viewport
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    this.stage.position({
      x: window.innerWidth / 2 - centerX * scale,
      y: window.innerHeight / 2 - centerY * scale,
    });

    this.frameService.updateTitleScales();
  }
}
