import { Injectable } from '@angular/core';
import { CanvasService } from './canvas';
import { FrameService } from './frame';
import Konva from 'konva';
import windowConfig from '../../../../config/window.json';

@Injectable({
  providedIn: 'root',
})
export class ZoomService {
  constructor(
    private canvasService: CanvasService,
    private frameService: FrameService,
  ) {}
  private get stage(): Konva.Stage{
    return this.canvasService.stage;
  }

  /** Setup mouse wheel zoom, centered on cursor position */
  public setupZoom(): void {
    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();
      // Block zoom while editing frame title
      if (this.frameService.isEditing) return;
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

      this.frameService.updateTitleScales();
    });
  }
}
