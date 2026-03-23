import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
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
const MOUSE = appConfig.mouse;

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit{
  /** Reference to the canvas container DOM element */
  @ViewChild('canvasContainer') containerRef!: ElementRef<HTMLDivElement>;

  constructor(
    private canvasService: CanvasService,
    private zoomService: ZoomService,
    private panService: PanService,
    private dropService: DropService,
    private selectionService: SelectionService,
    private saveService: SaveService,
    private openService: OpenService,
    private frameService: FrameService,
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
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === appConfig.shortcuts.save) {
        e.preventDefault();
        this.saveService.save();
      }
      if (e.ctrlKey && e.key === appConfig.shortcuts.open) {
        e.preventDefault();
        this.openService.open();
      }
      if (e.key === appConfig.shortcuts.newFrame) {
        this.frameService.createFrame();
      }
    });
  }

  /** Handle mouse button events (pan toggle, future: selection, context menu) */
  private setupMouseClick(): void {
    this.stage.on('mousedown', (e) => {
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
}
