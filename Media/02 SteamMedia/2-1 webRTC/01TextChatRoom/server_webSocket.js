var ws = require('nodejs-websocket'); //引入nodejs-websocket模块
var port = 7999; //设置端口号
var user = 0; // 用于统计在线人数

// 创建一个连接
var server = ws.createServer(function (conn) {
    user++;
    console.log('创建一个新连接------------');

    conn.nickname = 'user' + user;
    conn.fd = "user" + user;
    var mes = {};
    mes.type = 'enter';
    mes.data = conn.nickname + ' 进入聊天室'
    console.log(conn.nickname);

    console.log(JSON.stringify(mes));
    broadcast(JSON.stringify(mes)); // 广播消息

    // 监听客户端发送的消息
    conn.on('text', function (str) {
        console.log('收到消息：' + str);
        mes.type = 'message';
        mes.data = conn.nickname + ' 说: ' + str
        broadcast(JSON.stringify(mes)); // 广播消息
    })

    // 监听客户端断开连接
    conn.on('close', function (code, reason) {
        console.log('关闭连接');
        mes.type = 'leave';
        mes.data = conn.nickname + ' 离开聊天室'
        broadcast(JSON.stringify(mes)); // 广播消息
    })

    // 监听客户端异常关闭
    conn.on('error', function (error) {
        console.log('异常关闭');
        console.log(error);
    })
}).listen(port);


// 广播消息
function broadcast(str) {
    server.connections.forEach(function (connection) {
        connection.sendText(str);
    })
}