import { Injectable } from '@angular/core';
import { CanvasService } from './canvas';
import Konva from 'konva';

@Injectable({
  providedIn: 'root',
})
export class SelectionService {
  constructor(
    private canvasService: CanvasService,
  ) {}
  private get stage(): Konva.Stage{
    return this.canvasService.stage;
  }

  public isSelecting: boolean = false;

  private transformer!: Konva.Transformer;
  private selectedNodes: Konva.Node[] = [];
  private boxSelectRect!: Konva.Rect;
  private startX!: number;
  private startY!: number;

  init(): void {
    this.transformer = new Konva.Transformer({
    borderStroke: '#6dffce',
    borderStrokeWidth: 2,
    anchorSize: 0,
    rotateEnabled: false,
    resizeEnabled: false,
    });
    this.canvasService.layer.add(this.transformer);

    this.boxSelectRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      stroke: '#c9c9c9ad',
      strokeWidth: 1,
      fill: '#2e2e2ec0',
      globalCompositeOperation: 'xor', // multiply
    })
  }

  public select(node: Konva.Node) {
    this.clearSelection();
    this.selectedNodes.push(node);
    this.transformer.setNodes(this.selectedNodes);
  }

  public toggleSelect(node: Konva.Node) {
    if (this.selectedNodes.includes(node)) {
      const nodeIndex = this.selectedNodes.indexOf(node);
      this.selectedNodes.splice(nodeIndex, 1);

      this.transformer.setNodes(this.selectedNodes);
    } else {
      this.selectedNodes.push(node);
      this.transformer.setNodes(this.selectedNodes);
    }
  }

  public clearSelection() {
    this.selectedNodes = [];
    this.transformer.setNodes([]);
  }

  public startBoxSelect(startPosX: number, startPosY: number) {
    this.startX = startPosX;
    this.startY = startPosY;
    this.boxSelectRect.x(this.startX);
    this.boxSelectRect.y(this.startY);
    this.canvasService.layer.add(this.boxSelectRect);
  }

  public updateBoxSize(currentPosX: number, currentPosY: number) {
    this.boxSelectRect.width(currentPosX - this.startX);
    this.boxSelectRect.height(currentPosY - this.startY);
  }

  public endBoxSelect() {
    const boxRect = this.boxSelectRect.getClientRect();
    const images = this.canvasService.imgbb.getChildren(
      node => node !== this.canvasService.imgbbBg
    );
    this.clearSelection();
    images.forEach(node => {
      const nodeRect = node.getClientRect();
      if (this.haveIntersection(nodeRect, boxRect)) {
        this.selectedNodes.push(node);
      }
    });
    this.transformer.setNodes(this.selectedNodes);

    this.boxSelectRect.width(1);
    this.boxSelectRect.height(1);
    this.boxSelectRect.remove();
  }

  private haveIntersection(
    r1: {x: number, y: number, width: number, height: number},
    r2: typeof r1
  ) {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    )
  }
}
