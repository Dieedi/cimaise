import { Injectable } from '@angular/core';
import { CanvasService } from './canvas';
import { FrameService } from './frame';
import { KeyBindingService } from './keybinding';
import Konva from 'konva';

@Injectable({
  providedIn: 'root',
})
export class DropService {
  constructor(
    private canvasService: CanvasService,
    private frameService: FrameService,
    private keybinding: KeyBindingService,
  ) {}
  private get stage(): Konva.Stage{
    return this.canvasService.stage;
  }

  /** Handle image files dropped from the OS file explorer onto the canvas */
  public setupDragAndDrop(): void {
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
                if (e.evt.button !== this.keybinding.getMouseButton('dragImage')) {
                  kImg.stopDrag();
                }
              })
              kImg.on('dragmove', () => {
                this.canvasService.updateImagesBoundingBox();
              })
              kImg.on('dragend', () => {
                this.frameService.updateImageAttachment(kImg);
              })
              this.canvasService.imgbb.add(kImg);
              this.canvasService.updateImagesBoundingBox();
              this.frameService.updateImageAttachment(kImg);
            };
            img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
        }
      });
    })
  }
}
