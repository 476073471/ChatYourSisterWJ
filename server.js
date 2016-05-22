/*********************************
              服务器
**********************************/
var express = require('express'),
    app = express(),
    fs = require('fs'),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    users = [];//用户数组
var r = express();
app.use('/', express.static(__dirname + '/Chat'));
//server.listen(9001);
server.listen(process.env.PORT || 3000);
console.log("启动成功");
//socket部分
io.sockets.on('connection', function (socket) {
    //登陆
    socket.on("login", function (username) {
        var msg = Helper.JudgeNickName(username)
        if (msg != "true") {
            socket.emit("nickNameError", msg);
        }
        else if (users.indexOf(username) > -1) {
            socket.login = false;
            socket.emit("userExisted", "用户名已存在");
        } else {
            socket.login = true;
            socket.username = username;
            users.push(username);
            socket.emit("loginSuccess", username);
            //通知所有用户
            io.sockets.emit("system", username, users, "loginRoom");
        }
        console.log(users);
   });
    //离开
    socket.on("disconnect", function () {
        if (socket.login) {
            users.splice(users.indexOf(socket.username), 1);
            socket.broadcast.emit("system", socket.username, users, "leaveRoom");
        }
        console.log(users);
    });
    //接收消息并会送
    socket.on("sendMessage", function (msg, color, fontSize) {
        if (!socket.login) {
            socket.emit("unLogin");
            return;
        }
        var datetime = new Date().toLocaleString();
        fontSize = fontSize > 17 || fontSize < 12 ? 13 : fontSize;
        io.sockets.emit("acceptMessage", msg, socket.username, datetime, color, fontSize)
    });
    //发送图片
    socket.on("sendImg", function (imgData) {
        if (!socket.login) {
            socket.emit("unLogin");
            return;
        }
        var datetime = new Date().toLocaleString();
        io.sockets.emit("acceptImg", imgData, socket.username, datetime);
    });
    ////上传文件
    //socket.on("uploadFile", function (FileData, FileName, Finish) {
    //    if (!socket.login) {
    //        socket.emit("unLogin");
    //        return;
    //    }
    //    if (!Finish) {
    //        if (!socket.writeStream) {
    //            socket.upload = true;
    //            socket.writeStream = fs.createWriteStream(__dirname + "/Chat/Files/" + FileName);
    //        }
    //        socket.writeStream.write(FileData);
    //        socket.emit("ReadBlockFinish");
    //    } else {
    //        socket.writeStream.end();
    //        console.log(11)
    //        socket.writeStream = null;
    //        socket.upload = false;
    //    }
    //});
});

var Helper = {
    //判断昵称是否正确
    JudgeNickName: function (nickName) {
        if (nickName == "") {
            return "昵称不能为空";
        }
        if (nickName.replace(/[^\x00-\xff]/g, '__').length > 16) {
            return "昵称太长";
        }
        reg = /^[a-zA-Z0-9\u4E00-\u9FA5.]+$/;
        if (!reg.test(nickName)) {
            return "昵称有非法字符";
        }
        return "true";
    }
}