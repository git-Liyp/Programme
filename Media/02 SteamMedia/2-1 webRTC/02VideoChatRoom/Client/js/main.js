'use strict'

var localVideo = document.getElementById('localVideo');
var remoteVideo = document.getElementById('remoteVideo');
var localStream = null;

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

document.getElementById('joinBtn').onclick = function() {
    console.log('加入按钮被点击了');
    // 初始化本地码流
    initLocalStream();
};