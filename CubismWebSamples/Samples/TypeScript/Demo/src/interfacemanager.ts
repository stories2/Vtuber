export class InterfaceManager {
    canvasEle: HTMLCanvasElement;

    constructor(canvasEle: HTMLCanvasElement) {
        this.canvasEle = canvasEle;

        this.initEvent();
    }

    initEvent() {
        // this.canvasEle.ontouchstart = onTouchBegan;
        // this.canvasEle.ontouchmove = onTouchMoved;
        // this.canvasEle.ontouchend = onTouchEnded;
        // this.canvasEle.ontouchcancel = onTouchCancel;
        // this.canvasEle.onmousedown = onClickBegan;
        // this.canvasEle.onmousemove = onMouseMoved;
        // this.canvasEle.onmouseup = onClickEnded;
    }
}