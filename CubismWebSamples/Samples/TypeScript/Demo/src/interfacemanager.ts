export class InterfaceManager {
    canvasEle: HTMLCanvasElement;

    moveSwitch: HTMLElement;
    btnZoomIn: HTMLButtonElement;
    btnZoomOut: HTMLButtonElement;

    isMoveEnabled: boolean;

    posX: number;
    posY: number;
    scale: number;

    constructor(canvasEle: HTMLCanvasElement) {
        this.isMoveEnabled = false;
        this.posX = 0;
        this.posY = 0;
        this.scale = 1;

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

        this.btnZoomIn.addEventListener('click', (e) => {
            if (this.scale < 2.0)
                this.scale += 0.05;
        });
        this.btnZoomOut.addEventListener('click', (e) => {
            if (this.scale > 0.5)
                this.scale -= 0.05;
        });
    }
}