import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import Konva from 'konva';
import windowConfig from '../../../config/window.json';
import appConfig from '../../../config/app.json';
const MOUSE = appConfig.mouse;

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit{
  /** Reference to the canvas container DOM element */
  @ViewChild('canvasContainer') containerRef!: ElementRef<HTMLDivElement>;

  private stage!: Konva.Stage;
  private layer!: Konva.Layer;
  private imgbb!: Konva.Group;
  private imgbbBg!: Konva.Rect;
  private isPanning: boolean = false;

  /** Initialize the Konva stage, layer, and all canvas interactions */
  ngAfterViewInit(): void {
    // get DOM
    const container = this.containerRef.nativeElement;

    // new konva stage attached to element
    this.stage = new Konva.Stage({
      container: container,
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // add a draw layer
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
    this.imgbb = new Konva.Group({
      x: 0,
      y: 0,
      draggable: false,
      id: 'imgbb'
    });
    this.layer.add(this.imgbb);
    this.imgbbBg = new Konva.Rect({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: '#2e2e2e'
    });
    this.imgbb.add(this.imgbbBg);

    this.updateImagesBoundingBox();
    this.setupMouseClick();
    this.setupZoom();
    this.setupPan();
    this.setupDragAndDrop();
  }

  private updateImagesBoundingBox(): void {
    const nodes = this.imgbb.getChildren(node => node !== this.imgbbBg);
    if (nodes.length === 0) {
      this.imgbbBg.visible(false);
    } else {
      const padding = 10;
      // get bounds
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      nodes.forEach(node => {
        minX = Math.min(minX, node.x());
        minY = Math.min(minY, node.y());
        maxX = Math.max(maxX, node.x() + node.width());
        maxY = Math.max(maxY, node.y() + node.height());
      });

      this.imgbbBg.position({ x: minX - padding, y: minY - padding });
      this.imgbbBg.size({ width: maxX - minX + padding * 2, height: maxY - minY + padding * 2});
      this.imgbbBg.visible(true);
    }
  }

  /** Handle mouse button events (pan toggle, future: selection, context menu) */
  private setupMouseClick(): void {
    this.stage.on('mousedown', (e) => {
      switch (e.evt.button){
        case MOUSE.drag_image:
          break;
        case MOUSE.pan_view:
          this.isPanning = true;
          break;
        case MOUSE.menu_open:
          break;
      }
    })

    this.stage.on('mouseup', (e) => {
      switch (e.evt.button){
        case MOUSE.drag_image:
          break;
        case MOUSE.pan_view:
          this.isPanning = false;
          break;
        case MOUSE.menu_open:
          break;
      }
    })
  }

  /** Setup mouse wheel zoom, centered on cursor position */
  private setupZoom(): void {
    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const scaleBy = windowConfig.canvas.zoomFactor;
      const currentScale = this.stage.scaleX();
      // cursor position on screen
      const pointer = this.stage.getPointerPosition()!;

      // cursor position in world
      const mousePointTo = {
        x: (pointer.x - this.stage.x()) / currentScale,
        y: (pointer.y - this.stage.y()) / currentScale,
      };

      // newScale
      const direction = e.evt.deltaY < 0 ? 1 : -1;
      const newScale = direction > 0 ? currentScale * scaleBy : currentScale / scaleBy;
      this.stage.scale({ x: newScale, y: newScale });

      // reposition stage
      this.stage.position({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      })
    });
  }

  /** Pan the canvas by dragging with the middle mouse button */
  private setupPan(): void {
    this.stage.on('mousemove', (e) => {
      if (this.isPanning) {
        const currentPosition = this.stage.position();
        this.stage.position({
          x: e.evt.movementX + currentPosition.x,
          y: e.evt.movementY + currentPosition.y,
        })
      }
    });
  }

  /** Handle image files dropped from the OS file explorer onto the canvas */
  private setupDragAndDrop(): void {
    const container = this.stage.container();
    container.addEventListener('dragover', (e) => {
      // to allow drop
      e.preventDefault();
    })

    container.addEventListener('drop', (e) => {
      // avoid file opening
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (!files) return;
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              const stagePos = this.stage.position();
              const scale = this.stage.scaleX();
              const dropX = (e.pageX - stagePos.x) / scale;
              const dropY = (e.pageY - stagePos.y) / scale;
              const kImg = new Konva.Image({
                image: img,
                draggable: true,
                x: dropX - img.width / 2,
                y: dropY - img.height / 2,
              });
              kImg.on('dragstart', (e) => {
                if (e.evt.button !== MOUSE.drag_image) {
                  kImg.stopDrag();
                }
              })
              kImg.on('dragmove', (e) => {
                this.updateImagesBoundingBox();
              })
              this.imgbb.add(kImg);
              this.updateImagesBoundingBox();
            };
            img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
        }
      });
    })
  }
}
