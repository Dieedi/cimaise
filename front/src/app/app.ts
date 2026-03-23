import { Component, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import Konva from 'konva';
import { CanvasService } from './services/canvas';
import appConfig from '../../../config/app.json';
import { ZoomService } from './services/zoom';
import { PanService } from './services/pan';
import { DropService } from './services/drop';
import { SelectionService } from './services/selection';
import { SaveService } from './services/save';
import { OpenService } from './services/open';
import { FrameService } from './services/frame';
import { ContextMenuService, MenuItem } from './services/context-menu';
import { KeyBindingService } from './services/keybinding';
const MOUSE = appConfig.mouse;

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit{
  @ViewChild('canvasContainer') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('contextMenuEl') contextMenuEl?: ElementRef<HTMLDivElement>;

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
    private cdr: ChangeDetectorRef,
  ) {}
  private get stage(): Konva.Stage{
    return this.canvasService.stage;
  }

  /** Initialize the Konva stage, layer, and all canvas interactions */
  ngAfterViewInit(): void {
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
    this.keybinding.register('newFrame', () => this.frameService.createFrame());
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
        case MOUSE.drag_image:
          // Try frame edge resize first
          if (this.frameService.startResize(worldX, worldY)) {
            break;
          }
          this.selectionService.isSelecting = true;
          this.selectionService.startBoxSelect(worldX, worldY);
          break;
        case MOUSE.pan_view:
          this.panService.isPanning = true;
          break;
        case MOUSE.menu_open:
          break;
      }
    })

    this.stage.on('mouseup', (e) => {
      switch (e.evt.button){
        case MOUSE.drag_image:
          if (this.frameService.isResizing) {
            this.frameService.endResize();
            break;
          }
          this.selectionService.isSelecting = false;
          const hasBoxSelected = this.selectionService.endBoxSelect();
          if (!hasBoxSelected) {
            // click select on mouseup to allow box select draw on mousedown
            const target = e.target;
            if (target instanceof Konva.Image) {
              this.frameService.clearFrameSelection();
              if (e.evt.ctrlKey) {
                this.selectionService.toggleSelect(target);
              } else {
                this.selectionService.select(target);
              }
            } else if (this.frameService.isFrameNode(target)) {
              this.selectionService.clearSelection();
              const frame = this.frameService.getFrameFromChild(target);
              if (frame) {
                this.frameService.selectFrame(frame);
              }
            } else {
              this.selectionService.clearSelection();
              this.frameService.clearFrameSelection();
            }
          }
          break;
        case MOUSE.pan_view:
          this.panService.isPanning = false;
          break;
        case MOUSE.menu_open:
          break;
      }
    })

    this.stage.on('mousemove', (e) => {
      const stagePos = this.stage.position();
      const scale = this.stage.scaleX();
      const worldX = (e.evt.pageX - stagePos.x) / scale;
      const worldY = (e.evt.pageY - stagePos.y) / scale;

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
      { type: 'action', label: 'Add Frame', action: () => this.frameService.createFrame() },
      { type: 'separator' },
      { type: 'action', label: 'Reset Zoom', action: () => {
        this.stage.scale({ x: 1, y: 1 });
        this.frameService.updateTitleScales();
      }},
      { type: 'action', label: 'Focus All', action: () => this.focusAll() },
    ];
  }

  private buildImageMenu(image: Konva.Image): MenuItem[] {
    return [
      { type: 'action', label: 'Duplicate', action: () => this.duplicateImage(image) },
      { type: 'action', label: 'Delete', action: () => this.deleteImage(image) },
    ];
  }

  private buildFrameMenu(frame: Konva.Group): MenuItem[] {
    return [
      { type: 'action', label: 'Rename', action: () => this.frameService.editTitle(frame) },
      { type: 'separator' },
      { type: 'action', label: 'Delete Frame', action: () => this.frameService.deleteFrame(frame) },
      { type: 'action', label: 'Delete Frame + Content', action: () => this.frameService.deleteFrameWithContent(frame) },
    ];
  }

  private deleteImage(image: Konva.Image): void {
    this.selectionService.clearSelection();
    this.frameService.updateImageAttachment(image);
    image.destroy();
    this.canvasService.updateImagesBoundingBox();
  }

  private duplicateImage(image: Konva.Image): void {
    const offset = 20;
    const clone = image.clone({
      x: image.x() + offset,
      y: image.y() + offset,
    }) as Konva.Image;

    clone.on('dragstart', (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button !== MOUSE.drag_image) {
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

    const padding = 50;
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
