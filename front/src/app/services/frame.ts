import { Injectable } from '@angular/core';
import { CanvasService } from './canvas';
import Konva from 'konva';
import canvasConfig from '../../../../config/canvas.json';

const FRAME = canvasConfig.frame;

type Edge = 'top' | 'bottom' | 'left' | 'right';
type ResizeHandle = Edge | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null;

const CURSOR_MAP: Record<string, string> = {
  'top': 'ns-resize',
  'bottom': 'ns-resize',
  'left': 'ew-resize',
  'right': 'ew-resize',
  'top-left': 'nwse-resize',
  'bottom-right': 'nwse-resize',
  'top-right': 'nesw-resize',
  'bottom-left': 'nesw-resize',
};

let frameCounter = 0;

@Injectable({
  providedIn: 'root',
})
export class FrameService {
  private frames: Konva.Group[] = [];
  private selectedFrame: Konva.Group | null = null;
  private children: Map<string, Konva.Node[]> = new Map();

  // Resize state
  public isResizing = false;
  private resizeHandle: ResizeHandle = null;
  private resizeFrame: Konva.Group | null = null;
  private resizeStartX = 0;
  private resizeStartY = 0;
  private resizeStartRect = { x: 0, y: 0, width: 0, height: 0 };

  constructor(private canvasService: CanvasService) {}

  private get stage(): Konva.Stage {
    return this.canvasService.stage;
  }

  public init(): void {
    // Double-click on a frame title to edit it
    this.stage.on('dblclick', (e) => {
      const target = e.target;
      if (!this.isFrameNode(target)) return;
      const frame = this.getFrameFromChild(target);
      if (!frame) return;
      this.editTitle(frame);
    });
  }

  public createFrame(): Konva.Group {
    const stagePos = this.stage.position();
    const scale = this.stage.scaleX();

    const centerX = (window.innerWidth / 2 - stagePos.x) / scale;
    const centerY = (window.innerHeight / 2 - stagePos.y) / scale;

    const id = `frame_${frameCounter++}`;

    const group = new Konva.Group({
      id,
      x: centerX - FRAME.defaultWidth / 2,
      y: centerY - FRAME.defaultHeight / 2,
      width: FRAME.defaultWidth,
      height: FRAME.defaultHeight,
      draggable: true,
    });

    const bg = new Konva.Rect({
      name: 'frame-bg',
      width: FRAME.defaultWidth,
      height: FRAME.defaultHeight,
      fill: FRAME.bgColor,
      opacity: FRAME.bgOpacity,
      stroke: FRAME.borderColor,
      strokeWidth: FRAME.borderWidth,
      cornerRadius: FRAME.cornerRadius,
    });

    const title = new Konva.Text({
      name: 'frame-title',
      text: 'Frame',
      x: FRAME.titlePadding,
      y: FRAME.titlePadding,
      fontSize: FRAME.titleFontSize,
      fontFamily: FRAME.titleFontFamily,
      fill: FRAME.titleColor,
    });

    group.add(bg);
    group.add(title);

    // Track position delta to move children along with the frame
    let lastX = group.x();
    let lastY = group.y();

    group.on('dragstart', () => {
      lastX = group.x();
      lastY = group.y();
    });

    group.on('dragmove', () => {
      const dx = group.x() - lastX;
      const dy = group.y() - lastY;
      lastX = group.x();
      lastY = group.y();

      const frameChildren = this.children.get(id) || [];
      frameChildren.forEach(child => {
        child.x(child.x() + dx);
        child.y(child.y() + dy);
      });
      this.canvasService.updateImagesBoundingBox();
    });

    // Add to imgbb group, just above the background rect
    this.canvasService.imgbb.add(group);
    group.zIndex(1);
    this.frames.push(group);
    this.children.set(id, []);
    this.canvasService.updateImagesBoundingBox();

    return group;
  }

  // Restore a frame from saved data (used by OpenService)
  public restoreFrame(data: {
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    children: string[];
  }): Konva.Group {
    const group = new Konva.Group({
      id: data.id,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      draggable: true,
    });

    const bg = new Konva.Rect({
      name: 'frame-bg',
      width: data.width,
      height: data.height,
      fill: FRAME.bgColor,
      opacity: FRAME.bgOpacity,
      stroke: FRAME.borderColor,
      strokeWidth: FRAME.borderWidth,
      cornerRadius: FRAME.cornerRadius,
    });

    const title = new Konva.Text({
      name: 'frame-title',
      text: data.title,
      x: FRAME.titlePadding,
      y: FRAME.titlePadding,
      fontSize: FRAME.titleFontSize,
      fontFamily: FRAME.titleFontFamily,
      fill: FRAME.titleColor,
    });

    group.add(bg);
    group.add(title);

    let lastX = group.x();
    let lastY = group.y();

    group.on('dragstart', () => {
      lastX = group.x();
      lastY = group.y();
    });

    group.on('dragmove', () => {
      const dx = group.x() - lastX;
      const dy = group.y() - lastY;
      lastX = group.x();
      lastY = group.y();

      const frameChildren = this.children.get(data.id) || [];
      frameChildren.forEach(child => {
        child.x(child.x() + dx);
        child.y(child.y() + dy);
      });
      this.canvasService.updateImagesBoundingBox();
    });

    this.canvasService.imgbb.add(group);
    group.zIndex(1);
    this.frames.push(group);
    this.children.set(data.id, []);
    this.canvasService.updateImagesBoundingBox();

    // Update title scale to match current zoom
    const inverseScale = 1 / this.stage.scaleX();
    title.scale({ x: inverseScale, y: inverseScale });

    return group;
  }

  // Bind images to a frame by their IDs (called after images are restored)
  public bindChildrenByIds(frameId: string, childrenIds: string[]): void {
    const images = this.canvasService.imgbb.getChildren(
      node => node !== this.canvasService.imgbbBg
    );
    const frameChildren: Konva.Node[] = [];
    childrenIds.forEach(id => {
      const img = images.find(node => node.id() === id);
      if (img) frameChildren.push(img);
    });
    this.children.set(frameId, frameChildren);
  }

  // Clear all frames (used by OpenService before restoring)
  public clearAllFrames(): void {
    this.frames.forEach(frame => frame.destroy());
    this.frames = [];
    this.children.clear();
    this.selectedFrame = null;
  }

  public selectFrame(group: Konva.Group): void {
    if (this.selectedFrame && this.selectedFrame !== group) {
      this.clearFrameSelection();
    }
    this.selectedFrame = group;
    const bg = group.findOne('.frame-bg') as Konva.Rect;
    if (bg) {
      bg.stroke(FRAME.borderHighlightColor);
      bg.strokeWidth(2);
    }
  }

  public clearFrameSelection(): void {
    if (this.selectedFrame) {
      const bg = this.selectedFrame.findOne('.frame-bg') as Konva.Rect;
      if (bg) {
        bg.stroke(FRAME.borderColor);
        bg.strokeWidth(FRAME.borderWidth);
      }
    }
    this.selectedFrame = null;
  }

  public getSelectedFrame(): Konva.Group | null {
    return this.selectedFrame;
  }

  public getFrames(): Konva.Group[] {
    return this.frames;
  }

  // Keep title visually the same size regardless of zoom level
  public updateTitleScales(): void {
    const stageScale = this.stage.scaleX();
    const inverseScale = 1 / stageScale;
    this.frames.forEach(frame => {
      const title = frame.findOne('.frame-title') as Konva.Text;
      if (title) {
        title.scale({ x: inverseScale, y: inverseScale });
      }
    });
  }

  public isFrameNode(target: Konva.Node): boolean {
    const parent = target.parent;
    if (!parent) return false;
    return this.frames.includes(parent as Konva.Group);
  }

  public getFrameFromChild(target: Konva.Node): Konva.Group | null {
    const parent = target.parent;
    if (!parent) return null;
    if (this.frames.includes(parent as Konva.Group)) {
      return parent as Konva.Group;
    }
    return null;
  }

  // Start resize from app component mousedown
  public startResize(worldX: number, worldY: number): boolean {
    const result = this.detectEdge(worldX, worldY);
    if (!result) return false;

    this.isResizing = true;
    this.resizeHandle = result.handle;
    this.resizeFrame = result.frame;
    this.resizeStartX = worldX;
    this.resizeStartY = worldY;

    const bg = result.frame.findOne('.frame-bg') as Konva.Rect;
    this.resizeStartRect = {
      x: result.frame.x(),
      y: result.frame.y(),
      width: bg.width(),
      height: bg.height(),
    };

    // Disable frame dragging while resizing
    result.frame.draggable(false);
    return true;
  }

  public updateResize(worldX: number, worldY: number): void {
    if (!this.isResizing || !this.resizeFrame || !this.resizeHandle) return;

    const dx = worldX - this.resizeStartX;
    const dy = worldY - this.resizeStartY;
    const bg = this.resizeFrame.findOne('.frame-bg') as Konva.Rect;
    const handle = this.resizeHandle;

    let newX = this.resizeStartRect.x;
    let newY = this.resizeStartRect.y;
    let newW = this.resizeStartRect.width;
    let newH = this.resizeStartRect.height;

    // Horizontal
    if (handle.includes('right')) {
      newW = Math.max(FRAME.minWidth, this.resizeStartRect.width + dx);
    } else if (handle.includes('left')) {
      const maxDx = this.resizeStartRect.width - FRAME.minWidth;
      const clampedDx = Math.min(dx, maxDx);
      newX = this.resizeStartRect.x + clampedDx;
      newW = this.resizeStartRect.width - clampedDx;
    }

    // Vertical
    if (handle.includes('bottom')) {
      newH = Math.max(FRAME.minHeight, this.resizeStartRect.height + dy);
    } else if (handle.includes('top')) {
      const maxDy = this.resizeStartRect.height - FRAME.minHeight;
      const clampedDy = Math.min(dy, maxDy);
      newY = this.resizeStartRect.y + clampedDy;
      newH = this.resizeStartRect.height - clampedDy;
    }

    this.resizeFrame.position({ x: newX, y: newY });
    this.resizeFrame.width(newW);
    this.resizeFrame.height(newH);
    bg.width(newW);
    bg.height(newH);
    this.canvasService.updateImagesBoundingBox();
  }

  public endResize(): void {
    if (this.resizeFrame) {
      this.resizeFrame.draggable(true);
    }
    this.isResizing = false;
    this.resizeHandle = null;
    this.resizeFrame = null;
  }

  // Detect which edge/corner the cursor is near, update cursor
  public updateCursorForEdge(worldX: number, worldY: number): void {
    const result = this.detectEdge(worldX, worldY);
    const container = this.stage.container();
    if (result) {
      container.style.cursor = CURSOR_MAP[result.handle!] || 'default';
      // Highlight hovered frame border
      const bg = result.frame.findOne('.frame-bg') as Konva.Rect;
      bg.stroke(FRAME.borderHighlightColor);
    } else {
      container.style.cursor = 'default';
      // Reset non-selected frame borders
      this.frames.forEach(frame => {
        if (frame !== this.selectedFrame) {
          const bg = frame.findOne('.frame-bg') as Konva.Rect;
          bg.stroke(FRAME.borderColor);
        }
      });
    }
  }

  private editTitle(frame: Konva.Group): void {
    const title = frame.findOne('.frame-title') as Konva.Text;
    if (!title) return;

    // Calculate screen position of the title
    const titleAbsPos = title.getAbsolutePosition();
    const stageContainer = this.stage.container();
    const stageRect = stageContainer.getBoundingClientRect();
    const scale = this.stage.scaleX();

    const input = document.createElement('input');
    input.type = 'text';
    input.value = title.text();
    input.style.position = 'fixed';
    input.style.left = `${stageRect.left + titleAbsPos.x * scale + this.stage.x() % 1}px`;
    input.style.top = `${stageRect.top + titleAbsPos.y * scale + this.stage.y() % 1}px`;

    // Match Konva text appearance
    const scaledFontSize = FRAME.titleFontSize * scale;
    input.style.fontSize = `${scaledFontSize}px`;
    input.style.fontFamily = FRAME.titleFontFamily;
    input.style.color = FRAME.titleColor;
    input.style.background = 'transparent';
    input.style.border = 'none';
    input.style.outline = 'none';
    input.style.padding = '0';
    input.style.margin = '0';
    input.style.zIndex = '1000';

    // Hide Konva text while editing
    title.visible(false);

    document.body.appendChild(input);
    input.focus();
    input.select();

    const commit = () => {
      const newText = input.value.trim() || 'Frame';
      title.text(newText);
      title.visible(true);
      input.remove();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        commit();
      } else if (e.key === 'Escape') {
        title.visible(true);
        input.remove();
      }
    });

    input.addEventListener('blur', () => {
      if (document.body.contains(input)) {
        commit();
      }
    });
  }

  // Called after an image is dropped or dragged — attach/detach from frames
  public updateImageAttachment(image: Konva.Node): void {
    const oldFrame = this.getFrameForImage(image);
    this.detachImage(image);

    // Check if image center is inside a frame
    const imgCenterX = image.x() + (image.width() * image.scaleX()) / 2;
    const imgCenterY = image.y() + (image.height() * image.scaleY()) / 2;

    for (const frame of this.frames) {
      if (this.isInsideFrame(frame, imgCenterX, imgCenterY)) {
        const frameChildren = this.children.get(frame.id()) || [];
        frameChildren.push(image);
        this.children.set(frame.id(), frameChildren);

        // Only resize if the image is new to this frame
        if (frame !== oldFrame) {
          this.fitFrameToChildren(frame);
        }
        return;
      }
    }

    // Image was detached — shrink old frame if needed
    if (oldFrame) {
      this.fitFrameToChildren(oldFrame);
    }
  }

  public getChildren(frame: Konva.Group): Konva.Node[] {
    return this.children.get(frame.id()) || [];
  }

  private getFrameForImage(image: Konva.Node): Konva.Group | null {
    for (const [frameId, frameChildren] of this.children.entries()) {
      if (frameChildren.includes(image)) {
        return this.frames.find(f => f.id() === frameId) || null;
      }
    }
    return null;
  }

  private detachImage(image: Konva.Node): void {
    for (const [frameId, frameChildren] of this.children.entries()) {
      const index = frameChildren.indexOf(image);
      if (index !== -1) {
        frameChildren.splice(index, 1);
        return;
      }
    }
  }

  // Resize frame to fit all its children images + title
  private fitFrameToChildren(frame: Konva.Group): void {
    const frameChildren = this.children.get(frame.id()) || [];
    const bg = frame.findOne('.frame-bg') as Konva.Rect;
    const title = frame.findOne('.frame-title') as Konva.Text;

    if (frameChildren.length === 0) return;

    const padding = FRAME.contentPadding;
    const titleHeight = FRAME.titlePadding + title.height() + padding;

    // Calculate bounding box of all children (absolute coordinates)
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    frameChildren.forEach(child => {
      const cx = child.x();
      const cy = child.y();
      const cw = child.width() * child.scaleX();
      const ch = child.height() * child.scaleY();
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx + cw);
      maxY = Math.max(maxY, cy + ch);
    });

    // New frame position and size to contain all children
    const newX = minX - padding;
    const newY = minY - titleHeight;
    const newW = Math.max(FRAME.minWidth, maxX - minX + padding * 2);
    const newH = Math.max(FRAME.minHeight, maxY - minY + titleHeight + padding);

    frame.position({ x: newX, y: newY });
    frame.width(newW);
    frame.height(newH);
    bg.width(newW);
    bg.height(newH);
    this.canvasService.updateImagesBoundingBox();
  }

  private isInsideFrame(frame: Konva.Group, x: number, y: number): boolean {
    const bg = frame.findOne('.frame-bg') as Konva.Rect;
    const fx = frame.x();
    const fy = frame.y();
    return x >= fx && x <= fx + bg.width() && y >= fy && y <= fy + bg.height();
  }

  private detectEdge(worldX: number, worldY: number): { frame: Konva.Group; handle: ResizeHandle } | null {
    // Scale threshold by inverse of zoom so hit area stays constant on screen
    const scale = this.stage.scaleX();
    const threshold = FRAME.edgeThreshold / scale;
    // Larger corner zone for easier targeting
    const cornerThreshold = threshold * 3;

    for (const frame of this.frames) {
      const bg = frame.findOne('.frame-bg') as Konva.Rect;
      const fx = frame.x();
      const fy = frame.y();
      const fw = bg.width();
      const fh = bg.height();

      // Check if cursor is near the frame at all
      const inXRange = worldX >= fx - cornerThreshold && worldX <= fx + fw + cornerThreshold;
      const inYRange = worldY >= fy - cornerThreshold && worldY <= fy + fh + cornerThreshold;
      if (!inXRange || !inYRange) continue;

      const nearLeft = Math.abs(worldX - fx) <= threshold;
      const nearRight = Math.abs(worldX - (fx + fw)) <= threshold;
      const nearTop = Math.abs(worldY - fy) <= threshold;
      const nearBottom = Math.abs(worldY - (fy + fh)) <= threshold;

      // Corners use a larger zone for easier targeting
      const cornerNearLeft = Math.abs(worldX - fx) <= cornerThreshold;
      const cornerNearRight = Math.abs(worldX - (fx + fw)) <= cornerThreshold;
      const cornerNearTop = Math.abs(worldY - fy) <= cornerThreshold;
      const cornerNearBottom = Math.abs(worldY - (fy + fh)) <= cornerThreshold;

      let handle: ResizeHandle = null;

      // Check corners first (larger hit zone)
      if (cornerNearTop && cornerNearLeft) handle = 'top-left';
      else if (cornerNearTop && cornerNearRight) handle = 'top-right';
      else if (cornerNearBottom && cornerNearLeft) handle = 'bottom-left';
      else if (cornerNearBottom && cornerNearRight) handle = 'bottom-right';
      // Then edges
      else if (nearTop && inXRange) handle = 'top';
      else if (nearBottom && inXRange) handle = 'bottom';
      else if (nearLeft && inYRange) handle = 'left';
      else if (nearRight && inYRange) handle = 'right';

      if (handle) {
        return { frame, handle };
      }
    }
    return null;
  }
}
