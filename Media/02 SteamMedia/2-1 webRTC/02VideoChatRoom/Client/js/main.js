'use strict'

var localVideo = document.getElementById('localVideo');
var remoteVideo = document.getElementById('remoteVideo');
var localStream = null;

var zeroRTCEngine = null;

var ZeroRTCEngine = function(wsUrl) {
    this.init(wsUrl);
    zeroRTCEngine = this;
    return this;
}

// 添加init方法   prototype是js的原型对象，用于给类添加方法
ZeroRTCEngine.prototype.init = function(wsUrl) {
    // 添加wsUrl属性 并初始化
    this.wsUrl = wsUrl;
    // 添加signaling属性 并初始化
    this.signaling = null;
}

// open事件触发   添加onOpen方法
ZeroRTCEngine.prototype.onOpen = function() {
    console.log('WebSocket连接成功');
}

// message事件触发   添加onMessage方法
ZeroRTCEngine.prototype.onMessage = function(event) {
    console.log('接收到WebSocket消息 :' + event.data);
}

// close事件触发   添加onClose方法
ZeroRTCEngine.prototype.onClose = function(event) {
    console.log('WebSocket连接关闭, code:  '
        + event.code
        + ', reason:  '
        + EventTarget.reason);
}

// error事件触发   添加onError方法
ZeroRTCEngine.prototype.onError = function(event) {
    console.log('WebSocket连接错误' + event.data);
}

// 创建webSocket方法   添加createWebSocket方法
ZeroRTCEngine.prototype.createWebSocket = function() {
    zeroRTCEngine = this;

    // 将WebSocket对象赋值给signaling属性
    zeroRTCEngine.signaling = new WebSocket(zeroRTCEngine.wsUrl);

    // 将webSocket的onopen事件绑定到自定义对象onopen方法
    zeroRTCEngine.signaling.onopen = function() {
        zeroRTCEngine.onOpen();
    }

    // 将webSocket的onmessage事件绑定到自定义对象onmessage方法
    zeroRTCEngine.signaling.onmessage = function(event) {
        zeroRTCEngine.onMessage(event);
    }

    zeroRTCEngine.signaling.onclose = function(event) {
        zeroRTCEngine.onClose(event);
    }
    zeroRTCEngine.signaling.onerror = function(event) {
        zeroRTCEngine.onError(event);
    }

}



// 打开本地视频流
function openLocalStream(stream) {
    console.log('open Local Video Stream');

    localVideo.srcObject = stream;
    localStream = stream;
}

// 初始化本地码流
function initLocalStream() {
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    })
    .then(openLocalStream)
    .catch(function(err) {
        alert('getUserMedia() error: ' + err.name);
    });
}

zeroRTCEngine = new ZeroRTCEngine('ws://192.168.0.102:8001');
zeroRTCEngine.createWebSocket();

document.getElementById('joinBtn').onclick = function() {
    console.log('加入按钮被点击了');
    // 初始化本地码流
    initLocalStream();
};