import { Injectable } from '@angular/core';
import { CanvasService } from './canvas';
import Konva from 'konva';
import { SelectionService } from './selection';

@Injectable({
  providedIn: 'root',
})
export class PanService {
  public isPanning: boolean = false;

  constructor(
    private canvasService: CanvasService,
    private selectionService: SelectionService,
  ) {}
  private get stage(): Konva.Stage{
    return this.canvasService.stage;
  }

  /** Pan the canvas by dragging with the middle mouse button */
  public setupPan(): void {
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
}
