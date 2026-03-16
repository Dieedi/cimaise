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

  private transformer!: Konva.Transformer;
  private selectedNodes: Konva.Node[] = [];

  init(): void {
    this.transformer = new Konva.Transformer({
    borderStroke: '#6dffce',
    borderStrokeWidth: 2,
    anchorSize: 0,
    rotateEnabled: false,
    resizeEnabled: false,
    });
    this.canvasService.layer.add(this.transformer);
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
}
