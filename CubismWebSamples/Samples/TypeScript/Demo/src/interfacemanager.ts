export class InterfaceManager {
    canvasEle: HTMLCanvasElement;

    moveSwitch: HTMLElement;
    btnZoomIn: HTMLButtonElement;
    btnZoomOut: HTMLButtonElement;

    isMoveEnabled: boolean;

    constructor(canvasEle: HTMLCanvasElement) {
        this.isMoveEnabled = false;

        this.canvasEle = canvasEle;

        this.moveSwitch = document.querySelector('div.pos-move-switch');
        this.btnZoomIn = document.querySelector('button.btn-zoom-in');
        this.btnZoomOut = document.querySelector('button.btn-zoom-out');

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

        this.moveSwitch.addEventListener('change', (e) => this.isMoveEnabled = (e.target as any).checked);

        this.btnZoomIn.addEventListener('click', (e) => console.log('zoom in', e));
        this.btnZoomOut.addEventListener('click', (e) => console.log('zoom out', e));
    }
}