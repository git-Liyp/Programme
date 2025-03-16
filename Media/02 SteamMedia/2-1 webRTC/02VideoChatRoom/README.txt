功能：基于webRTC实现的双人视频聊天室
局限：局域网、双人聊天

环境要求：1、使用nodejs做服务器

操作步骤：1、安装nodejs服务器
            #npm init ‐y
            #npm install nodejs-websocket
        2、使用nodejs执行signal_server.js的脚本
            #node signal_server.js
        3、在浏览器中打开index.html文件即可在web端操作


注意：客户端使用时需要修改main.js的connet连接IP地址
    如代码所示：ZeroRTCEngine('ws://192.168.0.102:8001');

