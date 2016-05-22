/// <reference path="jquery-1.7.1.js" />
/*********************************
              客户端
**********************************/
$(function () {
    Helper.InitEvent();
    Helper.InitEmoji();
    setTimeout(function () {
        Helper.client.Init();
    }, 1000)
});

var Client = function () {
    this.socket = null;
};
Client.prototype = {
    Init: function () {
        var that = this;       
        //建立到服务器的socket连接
        this.socket = io.connect();
        //监听连接建立
        this.socket.on("connect", function () {
            $(".connect-cover").show();
            $(".nickName-window").show();
            $(".ChatMessage").css("visibility", "hidden");
        });
        //断开连接
        this.socket.on("loginOut", function () {
            $(".connect-cover").show();
            $(".ChatMessage").css("visibility", "hidden");
            $(".connect-word").text("正在接连服务器…………");
        });
        //监听用户已存在
        this.socket.on("userExisted", function (msg) {
            $(".nickName-errorWord").text(msg);
        });
        //用户名输入错误
        this.socket.on("nickNameError", function (msg) {
            $(".nickName-errorWord").text(msg);
        });     
        //监听成功登陆
        this.socket.on("loginSuccess", function (username) {
            $(".connect-cover").hide();
            $(".nickName-errorWord").text("");
            $(".ChatMessage").text("");
            $(".ChatMessage").css("visibility", "visible");
            $(".userName").text(username);
            $(".txtSendMessage").focus();
        });
        //监听未登录状态
        this.socket.on("unLogin", function () {
            Helper.ShowMessage("请先登录");
            $(".connect-cover").show();
            $(".nickName-window").show();
            $(".ChatMessage").css("visibility", "hidden");
        });
        //监听用户进入或离开聊天室
        this.socket.on("system", function (username, users, type) {
            if (type == "loginRoom") {
                $(".ChatMessage").append("<p class='loginRoom msg'>" + username + " 悄悄的进来了</p>");
            } else{
                $(".ChatMessage").append("<p class='leaveRoom msg'>" + username + " 默默的离开了</p>");
            }
            $(".ChatMessage").scrollTop($(".ChatMessage")[0].scrollHeight);
            //初始化在线人
            that.InitOnlineUsers(users);
        });
        //接收消息
        this.socket.on("acceptMessage", function (msg, username, datetime, color, fontSize) {
            msg = Helper.replaceEmoji(msg);
            $(".ChatMessage").append("<p class='msg_info msg'>" + username + " " + datetime + "</p>\
                                      <p class='msg_text' style='color:" + color + ";font-Size:" + fontSize + ";'>" + msg + "</p>");
            $(".ChatMessage").scrollTop($(".ChatMessage")[0].scrollHeight);
            Helper.SendNotice(msg,username);
        });
        //接收图片
        this.socket.on("acceptImg", function (imgData, username, datetime) {
            $(".ChatMessage").append("<p class='msg_info msg'>" + username + " " + datetime + "</p>\
                                      <a href='" + imgData + "' target='_blank'><img class='img_text' src='" + imgData + "'/></a>");
            $(".ChatMessage").scrollTop($(".ChatMessage")[0].scrollHeight);
            Helper.SendNotice("<图片>", username);
        });
        //接收文件
        //this.socket.on("acceptFile", function (FileData, FileName, username, datetime) {
        //    $(".ChatMessage").append("<p class='msg_info msg'>" + username + " " + datetime + "</p>\
        //                              <a class='msg_text' href='" + FileData + "' target='_blank'>" + FileName + "</a>");
        //    $(".ChatMessage").scrollTop($(".ChatMessage")[0].scrollHeight);
        //    Helper.SendNotice("<文件>", username);
        //});
        
    },
    //统计在线人数
    InitOnlineUsers: function (users) {
        $(".online-word").text("在线人数：" + users.length)
        $(".onlineUser").text("");
        for (var i = 0; i < users.length; i++) {
            if (users[i] == $(".userName").text()) {
                $(".onlineUser").append("<div class='user_own'><p class='userList'>" + users[i] + "</p></div>");
                continue;
            }
            $(".onlineUser").append("<div class='user_other'><p class='userList'>" + users[i] + "</p></div>");
        }
    }
}

/*********************************
              帮助类
**********************************/
var Helper = {
    client: null,
    //是否启用通知
    notice: false,
    //弹窗
    notification: null,
    //窗体是否获取了焦点
    windowFocus:false,
    //初始化事件
    InitEvent: function () {
        //初始化客户端
        this.client = new Client();
        //输入昵称
        $(".input_nickName").click(function () {
            var nickName = $(".input_nickNametext").val();
            if (Helper.JudgeNickName(nickName)) {
                Helper.client.socket.emit("login", nickName);
            }
        });
        //发送消息
        $(".txtSendMessage").keydown(function (e) {
            var keyJudge = false;
            //按Enter发送
            if ($(".sendType").val() == 0) {
                keyJudge = e.keyCode == 13;
                //按Alt+Enter发送
            } else if ($(".sendType").val() == 1) {
                keyJudge = e.keyCode == 13 && e.altKey;
            }
            if (keyJudge) {
                e.preventDefault();
                if ($(".txtSendMessage").val().trim() == "") return;
                Helper.client.socket.emit("sendMessage", $(".txtSendMessage").val(), $(".selectColor").val(), $(".selectFontSize").val())
                $(".txtSendMessage").val("");
            }
        });
        //窗体获取和失去焦点
        $(window).bind("blur", function () { Helper.windowFocus = false }
            ).bind("focus", function () { Helper.windowFocus = true }),
        //选择颜色
        $(".selectColor").change(function () {
            $(".txtSendMessage").css("color", $(".selectColor").val())
            $(".txtSendMessage").focus();
        });
        //选择字体大小
        $(".selectFontSize").change(function () {
            $(".txtSendMessage").css("fontSize", $(".selectFontSize").val())
            $(".txtSendMessage").focus();
        });
        //选择发送消息方式
        $(".sendType").change(function () {
            $(".txtSendMessage").focus();
        });
        //清屏
        $(".clearMsg").click(function () {
            $(".ChatMessage").text("");
            $(".txtSendMessage").focus();
        });
        //选择图片
        $(".selectImg").click(function () {
            $("#selectImg").trigger('click');
            $(".txtSendMessage").focus();
        });
        //选择图片
        $("#selectImg").change(function () {
            if (this.files.length != 0) {
                var file = this.files[0],
                    reader = new FileReader();
                if (!/image\/\w+/.test(file.type)) {
                    Helper.ShowMessage("请选择图片格式");
                    this.value = '';
                    return;
                }
                if (file.size > 1024 * 1024 * 3) {
                    Helper.ShowMessage("图片大小必须小于3MB");
                    this.value = '';
                    return;
                }
                if (!reader) {
                    Helper.ShowMessage("您的浏览器不支持该功能（IE比较渣，慎用！)");
                    this.value = '';
                    return;
                }
                //正在读取
                reader.onprogress = function () {
                    $(".content").append("<div class='reader-cover cover'>\
                                             <div class='reader-window'></div>\
                                             <div class='reader-word'>读取上传图片中……</div>\
                                          </div>")         
                };
                //读取成功
                reader.onload = function (e) {
                    $("#selectImg").val("");
                    Helper.client.socket.emit("sendImg", e.target.result);
                    $("#selectFile").val("");
                    setTimeout(function () {
                        $(".reader-cover").remove();
                    }, 1000);
                };
                reader.readAsDataURL(file);
            }
        });
        //选择文件
        $(".selectFile").click(function () {
            $("#selectFile").trigger('click');
            $(".txtSendMessage").focus();
        });
        //上传文件
        $("#selectFile").change(function () {
            if (this.files.length != 0) {
                var file = this.files[0],
                    reader = new FileReader();
                if (file.size > 1024 * 1024 * 1024) {
                    Helper.ShowMessage("文件大小必须小于1GB");
                    this.value = "";
                    return;
                }
                if (file.size == 0) {
                    Helper.ShowMessage("无法上传空文件");
                    this.value = "";
                    return;
                }
                if (!reader) {
                    Helper.ShowMessage("您的浏览器不支持该功能（IE比较渣，慎用！)");
                    this.value = "";
                    return;
                }
                Helper.ShowMessage("安全起见，暂不可用");
                //UploadFile.Init(file,1024*1024,reader);
                
            }
        });
        //选择表情
        $(".selectApp").click(function () {
            if ($(".emojiArea").css("display") == "none") {
                $(".emojiArea").fadeIn(500);
            } else {
                $(".emojiArea").fadeOut(500);
            }
            $(".txtSendMessage").focus();
        });
        //点击表情
        $(".emojiArea").click(function (e) {
            if(e.target.nodeName.toLowerCase()=='img'){
                $(".txtSendMessage").val($(".txtSendMessage").val() + "[emoji&" + e.target.title + "]");
                $(".emojiArea").fadeOut(100);
                $(".txtSendMessage").focus();
            }        
        });
        //启用通知
        $(".selectNotice").click(function () {
            if ($(".selectNotice").val() == "启用通知") {
                if (!window.Notification) {
                    Helper.ShowMessage("您的浏览器不支持该功能（IE比较渣，慎用！)");
                    return;
                }
                Notification.requestPermission();
                $(".selectNotice").val("取消通知");
                Helper.notice = true;
            } else if ($(".selectNotice").val() == "取消通知") {
                $(".selectNotice").val("启用通知");
                Helper.notice = false;
            }
        });
        $(".txtSendMessage")[0].addEventListener('paste', function (e) {
            //获取剪贴板内容
            var clipboard = e.clipboardData;
            for (var i = 0; i < clipboard.items.length; i++) {
                if (clipboard.items[i].kind == 'file' || clipboard.items[i].type.indexOf('image') > -1) {
                    var file = clipboard.items[i].getAsFile(),
                        reader = new FileReader();
                    if (file.size > 1024 * 1024 * 3) {
                        Helper.ShowMessage("图片大小必须小于3MB");
                        return;
                    }
                    if (!reader) {
                        Helper.ShowMessage("您的浏览器不支持该功能（IE比较渣，慎用！)");
                        return;
                    }
                    reader.onload = function (e) {
                        Helper.client.socket.emit("sendImg", e.target.result);
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
        //王婕
        $(".goWJ").click(function () {
            window.open("https://chatyoursisterwj.herokuapp.com/WJ.html");
        });
    },
    //判断昵称是否正确
    JudgeNickName: function (nickName) {
        if (nickName =="") {
            $(".nickName-errorWord").text("昵称不能为空");
            return false;
        }
        if (nickName.replace(/[^\x00-\xff]/g, '__').length > 16) {
            $(".nickName-errorWord").text("昵称太长");
            return false;
        }
        reg = /^[a-zA-Z0-9\u4E00-\u9FA5.]+$/;
        if (!reg.test(nickName)) {
            $(".nickName-errorWord").text("昵称有非法字符");
            return false;
        }
        return true;
    },
    //发送通知
    SendNotice: function (msg, username) {
        if (Helper.notice) {
            if (window.Notification.permission == "granted") {
                //不在本窗体才提示
                if (!Helper.windowFocus) {
                    if (Helper.notification == null) {
                        //msg = msg.length > 5 ? msg.substr(0, 5) + "…" : msg
                        Helper.notification = new Notification("您有新的消息", {
                            tag: "1",
                            body: username + ":" + msg,
                            icon: "../Images/notice.png"
                        });
                        Helper.notification.onclick = function () {
                            //激活弹出该通知窗口的浏览器窗口     
                            window.focus();
                            Helper.notification = null;
                        };
                        Helper.notification.onclose = function () {
                            Helper.notification = null;
                        };
                    }
                }
            }
        }
    },
    //提示错误信息
    ShowMessage: function (msg) {
        $(".MsgContent").find("span").text(msg);
        $(".MsgContent").fadeIn(1000);
        setTimeout(function () {
            $(".MsgContent").fadeOut(1000);
        },3000);
    },
    //初始化表情图片
    InitEmoji: function () {
        for (var i = 0; i < 10; i++) {
            $(".emojiArea").append("<img title='" + i + "' src='../Images/emojis/" + i + ".gif'/>")
        }
    },
    //将标识符替换为表情
    replaceEmoji: function (msg) {
        var match,
        reg = /\[emoji&\d+\]/g,
        emojiIndex;
        while (match = reg.exec(msg)) {
            emojiIndex = match[0].slice(7, -1);
            msg = msg.replace(match[0], '<img class="img_emoji" src="../Images/emojis/' + emojiIndex + '.gif"/>');
        };
        return msg;
    }
}

/*********************************
            文件上传类
**********************************/
var UploadFile = {
    file: null,
    fileSize: 0,
    parapraph: 0,
    startSize: 0,
    endSize: 0,
    reader:null,
    Init: function (file, paragraph,reader) {
        this.file = file;
        this.fileSize = this.file.size;
        this.paragraph = paragraph;
        this.reader = reader;
        this.startSize = 0;
        this.endSize = 0;
        $(".content").append("<div class='reader-cover cover'>\
                                    <div class='reader-window'></div>\
                                    <div class='reader-word'>文件上传中请稍后<progress value='0' max='100'></progress></div>\
                                </div>")
        this.reader.onload = function (e) {
            $("#selectFile").val("");
            $(".reader-word").find("progress").val(UploadFile.endSize / UploadFile.fileSize * 100);
            Helper.client.socket.emit("uploadFile", e.target.result, UploadFile.file.name, false);
        };
        //监听片段读取完成
        Helper.client.socket.on("ReadBlockFinish", function () {
            //继续读取
            if (UploadFile.endSize < UploadFile.file.size) {
                UploadFile.BlockRead();
            }
            //完成读取
            else {
                $(".reader-cover").remove();
                Helper.ShowMessage("上传成功");
                Helper.client.socket.emit("uploadFile", null, null, true);
            }          
        });
        //开始上传
        this.BlockRead();
    },
    //分段读取文件
    BlockRead: function (reader) {
        if (this.endSize < this.file.size) {
            //处理文件发送（字节）
            this.startSize = this.endSize;
            if (this.paragraph > (this.file.size - this.endSize)) {
                this.endSize = this.file.size;
            } else {
                this.endSize += this.paragraph;
            }
            var blob = this.file.slice(this.startSize, this.endSize);
            UploadFile.reader.readAsArrayBuffer(blob);
        }
    }
}
