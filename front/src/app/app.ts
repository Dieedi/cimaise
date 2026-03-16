import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import Konva from 'konva';
import { CanvasService } from './services/canvas';
import appConfig from '../../../config/app.json';
import { ZoomService } from './services/zoom';
import { PanService } from './services/pan';
import { DropService } from './services/drop';
import { SelectionService } from './services/selection';
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
    this.setupMouseClick();
    this.canvasService.updateImagesBoundingBox();
    this.zoomService.setupZoom();
    this.panService.setupPan();
    this.dropService.setupDragAndDrop();
  }

  /** Handle mouse button events (pan toggle, future: selection, context menu) */
  private setupMouseClick(): void {
    this.stage.on('mousedown', (e) => {
      switch (e.evt.button){
        case MOUSE.drag_image:
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
          // click select on mouseup to allow box select draw on mousedown
          const target = e.target;
          if (target instanceof Konva.Image) {
            if (e.evt.ctrlKey) {
              this.selectionService.toggleSelect(target);
            } else {
              this.selectionService.select(target);
            }
          } else {
            this.selectionService.clearSelection();
          }
          break;
        case MOUSE.pan_view:
          this.panService.isPanning = false;
          break;
        case MOUSE.menu_open:
          break;
      }
    })
  }
}
