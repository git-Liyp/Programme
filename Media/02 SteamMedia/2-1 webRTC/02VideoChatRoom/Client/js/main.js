'use strict'

// 信令常量定义 (客户端与服务器均需要定义，且保持一致)
const SIGNAL_TYPE_JOIN       = "join";           // join        主动加入房间
const SIGNAL_TYPE_RESP_JOIN  = "resp-join";      // resp-join   告知加入者对方是谁
const SIGNAL_TYPE_LEAVE      = "leave";          // leave       主动离开房间
const SIGNAL_TYPE_NEW_PEER   = "new-peer";       // new-peer    有新的peer加入房间
const SIGNAL_TYPE_PEER_LEAVE = "peer-leave";     // peer-leave  有peer离开房间
const SIGNAL_TYPE_OFFER      = "offer";          // offer       发起offer给对端peer
const SIGNAL_TYPE_ANSWER     = "answer";         // answer      发起answer给对端peer
const SIGNAL_TYPE_CANDIDATE  = "candidate";      // candidate   发起candidate给对端peer

var localUserId = Math.random().toString(36).substr(2); // 本地用户id
var remoteUserId = null;    // 对端用户id （远端）
var roomId = 0;

var localVideo = document.getElementById('localVideo');
var remoteVideo = document.getElementById('remoteVideo');
var localStream = null;

var ZeroRTCEngineTemp = null;
var zeroRTCEngine = null;

var ZeroRTCEngine = function(wsUrl) {
    this.init(wsUrl);
    ZeroRTCEngineTemp = this;
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

    var jsonMeg = JSON.parse(event.data);   // 将json字符串转换成json对象

    switch (jsonMeg.cmd) {
        case SIGNAL_TYPE_RESP_JOIN:
            handleResponseJoin(jsonMeg);
            break;
        case SIGNAL_TYPE_NEW_PEER:
            handleRemoteNewPeer(jsonMeg);
            break;
        case SIGNAL_TYPE_PEER_LEAVE:
            handlePeerLeave(jsonMeg);
            break;
        case SIGNAL_TYPE_OFFER:
            //handleOffer(jsonMeg);
            break;
        case SIGNAL_TYPE_ANSWER:
            //handleAnswer(jsonMeg);
            break;
        case SIGNAL_TYPE_CANDIDATE:
            //handleCandidate(jsonMeg);
            break;
        default:
            break;
    }
}

function handleRemoteNewPeer(message) {
    console.log('handleRemoteNewPeer Remote Uid : ' + message.remoteUid);
    remoteUserId = jsonMeg.remoteUid;
    // doOffer();

}

function handleResponseJoin(message) {
    console.log('handleResponseJoin Remote Uid : ' + message.remoteUid);
    remoteUserId = jsonMeg.remoteUid;
    // doOffer();
}

function handlePeerLeave(message) {
    console.log('handlePeerLeave Remote Uid : ' + message.remoteUid);
    remoteUserId = null;    // 远端用户id置空
    remoteVideo.srcObject = null; // 远端视频置空
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

// 发送消息方法   添加sendMessage方法
ZeroRTCEngine.prototype.sendMessage = function(message) {
    this.signaling.send(message);
}

// 创建webSocket方法   添加createWebSocket方法
ZeroRTCEngine.prototype.createWebSocket = function() {
    ZeroRTCEngineTemp = this;

    // 将WebSocket对象赋值给signaling属性
    ZeroRTCEngineTemp.signaling = new WebSocket(this.wsUrl);

    // 将webSocket的onopen事件绑定到自定义对象onopen方法
    ZeroRTCEngineTemp.signaling.onopen = function() {
        ZeroRTCEngineTemp.onOpen();
    }

    // 将webSocket的onmessage事件绑定到自定义对象onmessage方法
    ZeroRTCEngineTemp.signaling.onmessage = function(event) {
        ZeroRTCEngineTemp.onMessage(event);
    }

    ZeroRTCEngineTemp.signaling.onclose = function(event) {
        ZeroRTCEngineTemp.onClose(event);
    }
    ZeroRTCEngineTemp.signaling.onerror = function(event) {
        ZeroRTCEngineTemp.onError(event);
    }
}

// 发送加入房间消息
function doJoin(roomId) {
    var jsonMeg = {
        'cmd'   : 'join',
        'roomId': roomId,
        'uid': localUserId,
    };

    var message = JSON.stringify(jsonMeg);  // 将jsonMeg对象转换成json字符串
    zeroRTCEngine.sendMessage(message);     // 发送消息
    console.info('doJoin message : ' + message);
}

// 发送离开房间消息
function doLeave() {
    var jsonMeg = {
        'cmd'   : 'leave',
        'roomId': roomId,
        'uid': localUserId,
    };

    var message = JSON.stringify(jsonMeg);  // 将jsonMeg对象转换成json字符串
    zeroRTCEngine.sendMessage(message);     // 发送消息
    console.info('doLeave message : ' + message);
}
// 打开本地视频流
function openLocalStream(stream) {
    console.log('open Local Video Stream');

    doJoin(roomId);
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

// 加入房间按钮点击事件
document.getElementById('joinBtn').onclick = function() {
    roomId = document.getElementById('zero-roomId').value;
    if (roomId == '' || roomId == "请输入房间ID号") {
        alert('请输入房间号');
        return;
    }
    console.log('加入按钮被点击了 roomId : ' + roomId);
    // 初始化本地码流
    initLocalStream();
};

// 离开房间按钮点击事件
document.getElementById('leaveBtn').onclick = function() {
    console.log('离开按钮被点击了');

    // 发送离开房间消息
    doLeave();
};