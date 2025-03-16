var ws = require('nodejs-websocket'); // 引入nodejs-websocket模块
var port = 8001; // 设置端口

var server = ws.createServer(function (conn) { // 创建一个服务器
    console.log('New connection ----------');

    conn.sendText('Welcome to nodejs-websocket'); // 给客户端发送消息

    conn.on('text', function (str) { // 监听客户端发送的消息
        console.log('Received msg: ' + str);
        conn.sendText(str.toUpperCase()+'!!!'); // 给客户端发送消息
    });

    conn.on('close', function (code, reason) { // 监听客户端关闭连接
        console.log('Connection closed code: ' + code + ' reason: ' + reason);
    });

    conn.on('error', function (err) { // 监听客户端错误
        console.log('Connection error : ' + err);
    });
}).listen(port); // 监听端口