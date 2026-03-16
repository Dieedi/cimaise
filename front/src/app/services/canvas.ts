import { Injectable } from '@angular/core';
import Konva from 'konva';

@Injectable({
  providedIn: 'root',
})
export class CanvasService {
  private _stage!: Konva.Stage;
  public get stage(): Konva.Stage {
    return this._stage;
  }
  private _layer!: Konva.Layer;
  public get layer(): Konva.Layer {
    return this._layer;
  }
  private _imgbb!: Konva.Group;
  public get imgbb(): Konva.Group {
    return this._imgbb;
  }
  private _imgbbBg!: Konva.Rect;
  public get imgbbBg(): Konva.Rect {
    return this._imgbbBg;
  }

  init(container: HTMLDivElement): void {

    // new konva stage attached to element
    this._stage = new Konva.Stage({
      container: container,
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // add a draw layer
    this._layer = new Konva.Layer();
    this._stage.add(this._layer);
    this._imgbb = new Konva.Group({
      x: 0,
      y: 0,
      draggable: false,
      id: 'imgbb'
    });
    this._layer.add(this._imgbb);
    this._imgbbBg = new Konva.Rect({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: '#2e2e2e'
    });
    this._imgbb.add(this._imgbbBg);

  }

  public updateImagesBoundingBox(): void {
    const nodes = this.imgbb.getChildren(node => node !== this._imgbbBg);
    if (nodes.length === 0) {
      this._imgbbBg.visible(false);
    } else {
      const padding = 2;
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

      this._imgbbBg.position({ x: minX - padding, y: minY - padding });
      this._imgbbBg.size({ width: maxX - minX + padding * 2, height: maxY - minY + padding * 2});
      this._imgbbBg.visible(true);
    }
  }
}
