import { Injectable } from '@angular/core';
import { CanvasService } from './canvas';
import { FrameService, FRAME_NODE_NAME } from './frame';
import Konva from 'konva';
import JSZip from 'jszip';
import appConfig from '../../../../config/app.json';

@Injectable({
  providedIn: 'root',
})
export class SaveService {
  /** Current file path — null until first save or open */
  private currentFilePath: string | null = null;

  /** True when the canvas has unsaved changes */
  private _dirty: boolean = false;
  public get dirty(): boolean { return this._dirty; }
  public set dirty(value: boolean) {
    this._dirty = value;
    document.title = value ? '● Cimaise' : 'Cimaise';
  }

  constructor(
    private canvasService: CanvasService,
    private frameService: FrameService,
  ) {}
  private get stage(): Konva.Stage{
    return this.canvasService.stage;
  }

  /** Set the current file path (called by OpenService after opening a file) */
  public setFilePath(path: string | null): void {
    this.currentFilePath = path;
  }


  /** Save: write silently to current path, or show dialog if no path yet */
  public async save() {
    const zipData = await this.generateZip();

    if (this.currentFilePath) {
      // Silent save to the known path (no dialog)
      await window.electronAPI.saveFileTo(this.currentFilePath, zipData);
    } else {
      // First save — show the dialog
      const filePath = await window.electronAPI.saveFile(zipData);
      if (!filePath) return; // User cancelled
      this.currentFilePath = filePath;
    }

    this.dirty = false;
  }

  /** Save As: always show the dialog, even if a path is already known */
  public async saveAs() {
    const zipData = await this.generateZip();

    const filePath = await window.electronAPI.saveFile(zipData);
    if (!filePath) return; // User cancelled

    this.currentFilePath = filePath;
    this.dirty = false;
  }

  /** Generate the .moody ZIP archive from the current canvas state */
  private async generateZip(): Promise<Uint8Array> {
    const images = this.canvasService.getImages();

    const zip = new JSZip();
    const imagesFolder = zip.folder('images')!;

    const imgDataList = images.map((node, i) => {
      const id = node.id() || `img_${i}`;
      node.id(id);

      const htmlImg = node.image() as HTMLImageElement;
      const dataUrl = htmlImg.src;
      const base64 = dataUrl.split(',')[1];
      const extension = dataUrl.split(';')[0].split('/')[1] || 'png';
      const filename = `${id}.${extension}`;
      imagesFolder.file(filename, base64, { base64: true });

      return {
        id,
        file: `images/${filename}`,
        x: node.x(),
        y: node.y(),
        width: node.width(),
        height: node.height(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        rotation: node.rotation(),
      };
    });

    const framesData = this.frameService.getFrames().map(frame => {
      const bg = frame.findOne(`.${FRAME_NODE_NAME.BG}`) as Konva.Rect;
      const title = this.frameService.getTitle(frame);
      const children = this.frameService.getChildren(frame);
      return {
        id: frame.id(),
        title: title ? title.text() : 'Frame',
        x: frame.x(),
        y: frame.y(),
        width: bg.width(),
        height: bg.height(),
        bgColor: bg.fill(),
        children: children.map(c => c.id()),
      };
    });

    const boardData = {
      version: appConfig.save.formatVersion,
      canvas: {
        x: this.canvasService.stage.x(),
        y: this.canvasService.stage.y(),
        scale: this.canvasService.stage.scaleX(),
      },
      images: imgDataList,
      frames: framesData,
    };

    zip.file('board.json', JSON.stringify(boardData, null, 2));
    return zip.generateAsync({ type: 'uint8array' });
  }
}
