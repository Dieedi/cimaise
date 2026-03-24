import { Injectable } from '@angular/core';
import { CanvasService } from './canvas';
import { FrameService, FRAME_NODE_NAME } from './frame';
import { ApiService } from './api';
import Konva from 'konva';
import JSZip from 'jszip';
import appConfig from '../../../../config/app.json';

@Injectable({
  providedIn: 'root',
})
export class SaveService {
  /** Backend board ID — null until the board has been registered on the server */
  private currentBoardId: string | null = null;

  constructor(
    private canvasService: CanvasService,
    private frameService: FrameService,
    private apiService: ApiService,
  ) {}
  private get stage(): Konva.Stage{
    return this.canvasService.stage;
  }

  /** Set the backend board ID (e.g. when opening a board that was already registered) */
  public setBoardId(id: string | null): void {
    this.currentBoardId = id;
  }

  /** Get the current backend board ID */
  public getBoardId(): string | null {
    return this.currentBoardId;
  }

  public async save() {
    const images = this.canvasService.getImages();

    const zip = new JSZip();
    const imagesFolder = zip.folder('images')!;

    const imgDataList = images.map((node, i) => {
      const id = node.id() || `img_${i}`;
      node.id(id);

      // Extract image data from the Konva node and embed it in the ZIP
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
    const zipData = await zip.generateAsync({ type: 'uint8array' });

    // Save locally and get the file path back from Electron
    const filePath = await window.electronAPI.saveFile(zipData);
    if (!filePath) return; // User cancelled the dialog

    // Sync with backend if connected
    await this.syncToBackend(filePath);
  }

  /**
   * Register or update the board on the backend after a local save.
   * Extracts the board title from the filename (e.g. "my-board.moody" → "my-board").
   */
  private async syncToBackend(filePath: string): Promise<void> {
    if (!this.apiService.connected) return;

    const title = this.extractTitle(filePath);

    try {
      if (this.currentBoardId) {
        // Board already registered — update its metadata
        await this.apiService.updateBoard(this.currentBoardId, { title, filePath });
      } else {
        // First save while connected — create the board on the server
        const board = await this.apiService.createBoard(title, filePath);
        this.currentBoardId = board.id;
      }
    } catch (err) {
      console.warn('Failed to sync board to backend:', err);
    }
  }

  /** Extract a human-readable title from a file path */
  private extractTitle(filePath: string): string {
    const filename = filePath.replace(/\\/g, '/').split('/').pop() || 'Untitled';
    return filename.replace(/\.moody$/i, '');
  }
}
