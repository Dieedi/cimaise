import { Injectable } from '@angular/core';
import { CanvasService } from './canvas';
import { SelectionService } from './selection';
import { FrameService } from './frame';
import { SaveService } from './save';
import { KeyBindingService } from './keybinding';
import Konva from 'konva';
import JSZip from 'jszip';
import { migrateBoard } from './migrations';

@Injectable({
  providedIn: 'root',
})
export class OpenService {
  constructor(
    private canvasService: CanvasService,
    private selectionService: SelectionService,
    private frameService: FrameService,
    private saveService: SaveService,
    private keybinding: KeyBindingService,
  ) {}

  public async open(): Promise<void> {
    const result = await window.electronAPI.openFile();
    if (!result) return;

    const [data, filePath] = result;

    // Remember the file path so Ctrl+S saves to the same location
    this.saveService.setFilePath(filePath);

    const zip = await JSZip.loadAsync(data);
    const boardFile = zip.file('board.json');
    if (!boardFile) {
      throw new Error('Invalid .cim file: missing board.json');
    }

    const boardJson = await boardFile.async('string');
    const boardData = migrateBoard(JSON.parse(boardJson));

    this.clearCanvas();
    this.restoreCanvas(boardData.canvas);
    await this.restoreImages(zip, boardData.images);
    this.restoreFrames(boardData.frames || []);

    // Board just opened — no unsaved changes yet
    this.saveService.dirty = false;
  }

  private clearCanvas(): void {
    this.selectionService.clearSelection();
    this.frameService.clearAllFrames();
    this.canvasService.getImages().forEach(node => node.destroy());
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
          if (e.evt.button !== this.keybinding.getMouseButton('dragImage')) {
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
