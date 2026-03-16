import { Injectable } from '@angular/core';
import { CanvasService } from './canvas';
import Konva from 'konva';
import JSZip from 'jszip';
import appConfig from '../../../../config/app.json';

@Injectable({
  providedIn: 'root',
})
export class SaveService {
  constructor(
    private canvasService: CanvasService,
  ) {}
  private get stage(): Konva.Stage{
    return this.canvasService.stage;
  }

  public async save() {
    const images = this.canvasService.imgbb.getChildren(
      node => node !== this.canvasService.imgbbBg
    );
    const imgDataList = images.map(node => {
      return {
        x: node.x(),
        y: node.y(),
        width: node.width(),
        height: node.height(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        rotation: node.rotation(),
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
    };
    const jsonString = JSON.stringify(boardData, null, 2);

    const zip = new JSZip();
    zip.file('board.json', jsonString);
    const zipData = await zip.generateAsync({ type: 'uint8array' });

    window.electronAPI.saveFile(zipData);
  }
}
