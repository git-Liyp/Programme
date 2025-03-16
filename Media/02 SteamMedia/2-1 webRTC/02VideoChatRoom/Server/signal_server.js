// 信令常量定义 (客户端与服务器均需要定义，且保持一致)
const SIGNAL_TYPE_JOIN       = "join";           // join        主动加入房间
const SIGNAL_TYPE_RESP_JOIN  = "resp-join";      // resp-join   告知加入者对方是谁
const SIGNAL_TYPE_LEAVE      = "leave";          // leave       主动离开房间
const SIGNAL_TYPE_NEW_PEER   = "new-peer";       // new-peer    有新的peer加入房间
const SIGNAL_TYPE_PEER_LEAVE = "peer-leave";     // peer-leave  有peer离开房间
const SIGNAL_TYPE_OFFER      = "offer";          // offer       发起offer给对端peer
const SIGNAL_TYPE_ANSWER     = "answer";         // answer      发起answer给对端peer
const SIGNAL_TYPE_CANDIDATE  = "candidate";      // candidate   发起candidate给对端peer

/** ----- ZeroRTCMap ----- */
/**
 * 实现一个简单的键值对映射数据结构
 * @class ZeroRTCMap
 * @description 提供基本的Map功能,包括添加、获取、删除、清空等操作
 * @constructor
 * @property {Array} _entrys - 存储键值对条目的内部数组
 * @method put - 添加或更新键值对
 * @method get - 根据键获取值
 * @method remove - 移除指定键的条目
 * @method clear - 清空所有条目
 * @method contains - 检查是否包含指定键
 * @method size - 获取条目数量
 * @method getEntrys - 获取所有条目
 * @private _getIndex - 获取指定键的索引位置
 */
var ZeroRTCMap = function () {
    this._entrys = new Array();

    this.put = function (key, value) {
        if (key == null || key == undefined) {
            return;
        }
        var index = this._getIndex(key);
        if (index == -1) {
            var entry = new Object();
            entry.key = key;
            entry.value = value;
            this._entrys[this._entrys.length] = entry;
        } else {
            this._entrys[index].value = value;
        }
    };
    this.get = function (key) {
        var index = this._getIndex(key);
        return (index != -1) ? this._entrys[index].value : null;
    };
    this.remove = function (key) {
        var index = this._getIndex(key);
        if (index != -1) {
            this._entrys.splice(index, 1);
        }
    };
    this.clear = function () {
        this._entrys.length = 0;
    };
    this.contains = function (key) {
        var index = this._getIndex(key);
        return (index != -1) ? true : false;
    };
    this.size = function () {
        return this._entrys.length;
    };
    this.getEntrys = function () {
        return this._entrys;
    };
    this._getIndex = function (key) {
        if (key == null || key == undefined) {
            return -1;
        }
        var _length = this._entrys.length;
        for (var i = 0; i < _length; i++) {
            var entry = this._entrys[i];
            if (entry == null || entry == undefined) {
                continue;
            }
            if (entry.key === key) {// equal
                return i;
            }
        }
        return -1;
    };
}

var roomTableMap = new ZeroRTCMap();

function Client(uid, conn, roomId) {
    this.uid = uid;     // 用户所属的id
    this.conn = conn;   // uid对应的websocket连接
    this.roomId = roomId;
}

function handleJoin(conn, jsonMsg) {
    var roomId  = jsonMsg.roomId;
    var uid     = jsonMsg.uid;

    console.log('handleJoin uid: ' + uid + "try to join room: " + roomId);

    // 查询房间号是否存在
    var roomMap = roomTableMap.get(roomId);
    if (roomMap == null) {
        // 创建房间
        roomMap = new ZeroRTCMap();
        roomTableMap.put(roomId, roomMap);
    }

    // 限制房间人数（仅支持一对一）
    if (roomMap.size() >= 2) {
        console.error('roomId: ' + roomId + ' 已经有两人存在，请使用其他房间');
        // 加信令通知客户端房间已满
        conn.sendText('roomId: ' + roomId + ' 已经有两人存在，请使用其他房间');
        conn.close();
        return;
    }

    // 将客户端加入房间
    var client = new Client(uid, conn, roomId);     // 创建客户端对象
    roomMap.put(uid, client);  // 将客户端加入房间
    if(roomMap.size() > 1)  // 有两个人存在
    {
        var clients = roomMap.getEntrys();  // 获取房间内所有客户端
        for(var i in clients) {
            var remoteUid = clients[i].key;
            if(remoteUid != uid) {  // 给对方发送消息
                var jsonMsg = {
                    'cmd'   : SIGNAL_TYPE_NEW_PEER,
                    'remoteUid': uid // 告知对端自己的uid
                };
                var msg = JSON.stringify(jsonMsg);
                console.info('new peer : ' + msg);

                var remoteClient = roomMap.get(remoteUid);
                remoteClient.conn.sendText(msg);    // 给对方发送消息

                jsonMsg = {
                    'cmd'   : SIGNAL_TYPE_RESP_JOIN,
                    'remoteUid': remoteUid // 告知自己对端的uid
                };
                msg = JSON.stringify(jsonMsg);
                console.info('response join :' + msg);

                conn.sendText(msg);    // 给自己发送消息
            }

        }
    }

}

function handleleave(conn, jsonMsg) {
    var roomId  = jsonMsg.roomId;
    var uid     = jsonMsg.uid;

    console.log('handleleave uid: ' + uid + "try to leave room: " + roomId);

    // 查询房间号是否存在
    var roomMap = roomTableMap.get(roomId);
    if (roomMap == null) {
        console.error('roomId: ' + roomId + ' 不存在');
        return;
    }

    // 将客户端从房间中移除
    roomMap.remove(uid);

    // 通知房间内其他客户端，有客户端离开
    var clients = roomMap.getEntrys();  // 获取房间内所有客户端
    for(var i in clients) {
        var remoteUid = clients[i].key;
         // 给对方发送离开消息
        var jsonMsg = {
            'cmd'   : SIGNAL_TYPE_PEER_LEAVE,
            'remoteUid': uid // 告知对端自己的uid
        };
        var msg = JSON.stringify(jsonMsg);
        console.info('peer leave : ' + msg);

        var remoteClient = roomMap.get(remoteUid);
        if(remoteClient)
        {
            console.info('notify peer: ' + remoteClient.uid + ', uid :' + uid + ' leave');
            remoteClient.conn.sendText(msg);    // 给对方发送消息
        }
        
    }
}

var ws = require('nodejs-websocket'); // 引入nodejs-websocket模块
var port = 8001; // 设置端口

var server = ws.createServer(function (conn) { // 创建一个服务器
    console.log('New connection ----------');

    conn.sendText('Welcome to nodejs-websocket'); // 给客户端发送消息

    conn.on('text', function (str) { // 监听客户端发送的消息
        console.info('Received msg: ' + str);
        
        var jsonMsg = JSON.parse(str);
        switch (jsonMsg.cmd)
        {
            case SIGNAL_TYPE_JOIN:      // 主动加入房间
                handleJoin(conn, jsonMsg);
                break;
            case SIGNAL_TYPE_RESP_JOIN:
                // 告知加入者对方是谁
                break;
            case SIGNAL_TYPE_LEAVE:     // 主动离开房间
                handleleave(conn, jsonMsg);
                break;
            case SIGNAL_TYPE_NEW_PEER:
                // 有新的peer加入房间
                break;
            case SIGNAL_TYPE_PEER_LEAVE:
                // 有peer离开房间
                break;
            case SIGNAL_TYPE_OFFER:
                // 发起offer给对端peer
                break;
            case SIGNAL_TYPE_ANSWER:
                // 发起answer给对端peer
                break;
            case SIGNAL_TYPE_CANDIDATE:
                // 发起candidate给对端peer
                break;
            default:
                console.log('Unknow cmd: ' + jsonMsg.cmd);
                break;
        }
    });

    conn.on('close', function (code, reason) { // 监听客户端关闭连接
        console.log('Connection closed code: ' + code + ' reason: ' + reason);
    });

    conn.on('error', function (err) { // 监听客户端错误
        console.log('Connection error : ' + err);
    });
}).listen(port); // 监听端口