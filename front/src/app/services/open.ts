import { Injectable } from '@angular/core';
import { CanvasService } from './canvas';
import { SelectionService } from './selection';
import { FrameService } from './frame';
import Konva from 'konva';
import JSZip from 'jszip';
import appConfig from '../../../../config/app.json';
import { migrateBoard } from './migrations';

const MOUSE = appConfig.mouse;

@Injectable({
  providedIn: 'root',
})
export class OpenService {
  constructor(
    private canvasService: CanvasService,
    private selectionService: SelectionService,
    private frameService: FrameService,
  ) {}

  public async open(): Promise<void> {
    const data = await window.electronAPI.openFile();
    if (!data) return;

    const zip = await JSZip.loadAsync(data);
    const boardFile = zip.file('board.json');
    if (!boardFile) {
      throw new Error('Invalid .moody file: missing board.json');
    }

    const boardJson = await boardFile.async('string');
    const boardData = migrateBoard(JSON.parse(boardJson));

    this.clearCanvas();
    this.restoreCanvas(boardData.canvas);
    await this.restoreImages(zip, boardData.images);
    this.restoreFrames(boardData.frames || []);
  }

  private clearCanvas(): void {
    this.selectionService.clearSelection();
    this.frameService.clearAllFrames();
    const children = this.canvasService.imgbb.getChildren(
      node => node !== this.canvasService.imgbbBg && node instanceof Konva.Image
    );
    children.forEach(node => node.destroy());
  }

  private restoreCanvas(canvas: { x: number; y: number; scale: number }): void {
    const stage = this.canvasService.stage;
    stage.position({ x: canvas.x, y: canvas.y });
    stage.scale({ x: canvas.scale, y: canvas.scale });
  }

  private async restoreImages(zip: JSZip, images: any[]): Promise<void> {
    for (const imgData of images) {
      const imgFile = zip.file(imgData.file);
      if (!imgFile) continue;

      const blob = await imgFile.async('blob');
      const dataUrl = await this.blobToDataUrl(blob);
      await this.createImage(dataUrl, imgData);
    }
    this.canvasService.updateImagesBoundingBox();
  }

  private createImage(dataUrl: string, imgData: any): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const kImg = new Konva.Image({
          id: imgData.id,
          image: img,
          draggable: true,
          x: imgData.x,
          y: imgData.y,
          width: imgData.width,
          height: imgData.height,
          scaleX: imgData.scaleX,
          scaleY: imgData.scaleY,
          rotation: imgData.rotation,
        });
        kImg.on('dragstart', (e) => {
          if (e.evt.button !== MOUSE.drag_image) {
            kImg.stopDrag();
          }
        });
        kImg.on('dragmove', () => {
          this.canvasService.updateImagesBoundingBox();
        });
        kImg.on('dragend', () => {
          this.frameService.updateImageAttachment(kImg);
        });
        this.canvasService.imgbb.add(kImg);
        resolve();
      };
      img.src = dataUrl;
    });
  }

  private restoreFrames(frames: any[]): void {
    frames.forEach(frameData => {
      this.frameService.restoreFrame(frameData);
      this.frameService.bindChildrenByIds(frameData.id, frameData.children);
    });
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
}
