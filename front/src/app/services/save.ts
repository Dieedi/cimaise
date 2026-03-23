import { Injectable } from '@angular/core';
import { CanvasService } from './canvas';
import { FrameService } from './frame';
import Konva from 'konva';
import JSZip from 'jszip';
import appConfig from '../../../../config/app.json';

@Injectable({
  providedIn: 'root',
})
export class SaveService {
  constructor(
    private canvasService: CanvasService,
    private frameService: FrameService,
  ) {}
  private get stage(): Konva.Stage{
    return this.canvasService.stage;
  }

  public async save() {
    const images = this.canvasService.imgbb.getChildren(
      node => node !== this.canvasService.imgbbBg && node instanceof Konva.Image
    ) as Konva.Image[];

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
      const bg = frame.findOne('.frame-bg') as Konva.Rect;
      const title = frame.findOne('.frame-title') as Konva.Text;
      const children = this.frameService.getChildren(frame);
      return {
        id: frame.id(),
        title: title.text(),
        x: frame.x(),
        y: frame.y(),
        width: bg.width(),
        height: bg.height(),
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

    window.electronAPI.saveFile(zipData);
  }
}
