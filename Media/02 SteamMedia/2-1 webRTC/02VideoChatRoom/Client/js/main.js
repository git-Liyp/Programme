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
var remoteStream = null;
var peerConnect = null;

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

    var jsonMeg = null;
    try {
        jsonMeg = JSON.parse(event.data);   // 将json字符串转换成json对象    
    } catch (e) {
        console.warn('接收到WebSocket消息不是json字符串 :' + event.data);
        return;
    }

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
            handleOffer(jsonMeg);
            break;
        case SIGNAL_TYPE_ANSWER:
            handleAnswer(jsonMeg);
            break;
        case SIGNAL_TYPE_CANDIDATE:
            handleCandidate(jsonMeg);
            break;
        default:
            break;
    }
}

function handleResponseJoin(message) {
    console.log('handleResponseJoin Remote Uid : ' + message.remoteUid);
    remoteUserId = message.remoteUid;

}

function handleRemoteNewPeer(message) {
    console.log('handleRemoteNewPeer Remote Uid : ' + message.remoteUid);
    remoteUserId = message.remoteUid;
    doOffer();
}

function handleOffer(message) {
    console.log('handleOffer Remote Uid : ' + message.remoteUid);
    if(peerConnect == null)
    {
        createPeerConnection();
    }

    var desc = JSON.parse(message.msg);
    peerConnect.setRemoteDescription(desc);
    doAnswer();
}

function handleAnswer(message) {
    console.log('handleAnswer Remote Uid : ' + message.remoteUid);

    var desc = JSON.parse(message.msg);
    peerConnect.setRemoteDescription(desc);
    // doCandidate();
}

function handleCandidate(message) {
    console.log('handleCandidate Remote Uid : ' + message.remoteUid);

    var candidate = JSON.parse(message.msg);
    peerConnect.addIceCandidate(candidate).catch(e => {
        console.error('addIceCandidate error : ' + e.name);
    });
}

function handlePeerLeave(message) {
    console.log('handlePeerLeave Remote Uid : ' + message.remoteUid);
    remoteUserId = null;            // 远端用户id置空
    remoteVideo.srcObject = null;   // 远端视频置空（页面）
    if(peerConnect != null) {
        peerConnect.close();
        peerConnect = null;
    }
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

function handleIceCandidate(event) {
    console.log('handleIceCandidate....');
    if (event.candidate) {
        var jsonMsg = {
            'cmd'   : 'candidate',
            'roomId': roomId,
            'uid': localUserId,
            'remoteUid': remoteUserId,
            'msg': JSON.stringify(event.candidate) // 将candidate对象转换成json字符串,含有sdp mid
        };

        var message = JSON.stringify(jsonMsg);  // 将jsonMeg对象转换成json字符串
        zeroRTCEngine.sendMessage(message);     // 发送消息
        console.info('handleIceCandidate message : ' + message);
    }
    else{
        console.log(' IceCandidate end');
    }
}

function handleRemoteTrackAddStream(event) {
    console.log('handleRemoteTrackAddStream....');
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream; // 远端视频流,显示远端视频

}

function handleIceConnectionStateChange() {
    if(peerConnect) {
        console.log('iceConnectionStateChange : ' + peerConnect.iceConnectionState);
    }
}

function handleConnectionStateChange() {
    if(peerConnect) {
        console.log('connectionStateChange : ' + peerConnect.connectionState);
    }
}

function createPeerConnection() {
    console.log("createPeerConnection");
    var defaultConfiguration = {  
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
        iceTransportPolicy:"relay",//relay 或者 all
        // 修改ice数组测试效果，需要进行封装
        iceServers: [
            {
                "urls": [
                    "turn:192.168.0.102:3478?transport=udp",
                    "turn:192.168.0.102:3478?transport=tcp"       // 可以插入多个进行备选
                ],
                "username": "lyp",
                "credential": "123456"
            },
            {
                "urls": [
                    "stun:192.168.0.102:3478"
                ]
            }
        ]
    };
    peerConnect = new RTCPeerConnection(defaultConfiguration);

    peerConnect.onicecandidate = handleIceCandidate;
    peerConnect.ontrack = handleRemoteTrackAddStream;
    peerConnect.oniceconnectionstatechange = handleIceConnectionStateChange;
    peerConnect.onconnectionstatechange = handleConnectionStateChange;

    if (localStream) {
        localStream.getTracks().forEach(function(track) {
            peerConnect.addTrack(track, localStream);
        });
    }
}

// 发送offer消息
function createOfferAndSendMsg(session){
    peerConnect.setLocalDescription(session)
    .then(function() {
        var jsonMsg = {
            'cmd'   : 'offer',
            'roomId': roomId,
            'uid': localUserId,
            'remoteUid': remoteUserId,
            'msg': JSON.stringify(session) // 将session对象转换成json字符串,含有sdp mid
        };

        var message = JSON.stringify(jsonMsg);  // 将jsonMeg对象转换成json字符串
        zeroRTCEngine.sendMessage(message);     // 发送消息
        console.info('send Offer message : ' + message);
    })
    .catch(function(err) {
        console.error("offer setLocalDescription error: " + err);
    });
}

function handleCreateOfferError(err) {
    console.error("handleCreateOfferError error: " + err);
}

// 发送Answer消息
function createAnswerAndSendMsg(session){
    peerConnect.setLocalDescription(session)
    .then(function() {
        var jsonMsg = {
            'cmd'   : 'answer',
            'roomId': roomId,
            'uid': localUserId,
            'remoteUid': remoteUserId,
            'msg': JSON.stringify(session) // 将session对象转换成json字符串,含有sdp mid
        };

        var message = JSON.stringify(jsonMsg);  // 将jsonMeg对象转换成json字符串
        zeroRTCEngine.sendMessage(message);     // 发送消息
        console.info('send Answer message : ' + message);
    })
    .catch(function(err) {
        console.error("Answer setLocalDescription error: " + err);
    });
}

function handleCreateAnswerError(err) {
    console.error("handleCreateAnswerError error: " + err);
}

// 关闭本地视频流
function closeLocalStream() {
    console.log('closeLocalStream');
    if (localStream) {
        localStream.getTracks().forEach((track) => {
            track.stop();
        });
        localStream = null;
    }
}

function hangup() {
    console.log(' hangup ......');
    localStream.srcObject = null;   // 关闭本地视频流
    remoteStream.srcObject = null;  // 关闭远端视频流
    localVideo.srcObject = null;    // 关闭本地视频显示 （页面）
    remoteVideo.srcObject = null;   // 关闭远端视频显示 （页面）
    closeLocalStream(); // 关闭本地视频流
    if (peerConnect) {  // 关闭RTC peerConnection连接
        peerConnect.close();
        peerConnect = null;
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

// 发送offer消息
function doOffer() {
    console.log('doOffer');
    if(peerConnect == null)
    {
        createPeerConnection();
    }
    peerConnect.createOffer()
    .then(createOfferAndSendMsg)    // 发送offer消息
    .catch(handleCreateOfferError);
}

function doAnswer() {
    console.log('doAnswer');

    peerConnect.createAnswer()
    .then(createAnswerAndSendMsg)    // 发送Answer消息
    .catch(handleCreateAnswerError);
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

    hangup();   // 挂断
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