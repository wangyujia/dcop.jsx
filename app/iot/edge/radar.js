/// js/app/iot/edge/radar.js
/**
 * 物联网边缘侧雷达协议的对接和计算
 */


/**
 * 雷达目标缓冲列表
 */
var radar_ruda_targets;


/**
 * 雷达数据接收
 * @param {Pointer} buf 缓冲区地址
 * @param {Number} len 缓冲区长度
 * @param {Function} extra_buf_save 额外数据保存函数
 * @param {Object} ch_recv_para 通道接收参数
 *  ch_recv_para: {
 *      ch: {Number} 通道ID
 *      ip: {String} IP
 *      port: {Number} 端口
 *      proto: {String} 协议
 *      find: {Function} 查找节点函数 function(rsp)
 *      ack: {Function} 应答函数 function(rsp)
 *      dump: {String} DUMP开关
 *  }
 */
function radar_ruda_recv(buf, len, extra_buf_save, ch_recv_para) {
    var dump_switch = ch_recv_para.dump;
    if (dump_switch == "radar_all") {
        printlog("recv radar data:");
        bytes.dump(buf, len);
    }

    /// 数据不足，调用外部接收函数保存数据 (头部和尾部共8个字节)
    if (bytes.zero(buf) || len < 8) {
        if (extra_buf_save) extra_buf_save(buf, len);
        return;
    }

    var pos = 0;
    while (pos <= (len - 9)) {
        /// 查找头部
        var head = radar_ruda_magic(buf, len, pos, 0xca, 0xcb, 0xcc, 0xcd);
        if (head > (len - 4)) {
            /// 找不到头部，只有丢掉这包数据了
            return;
        }

        /// 查找尾部
        var tail = radar_ruda_magic(buf, len, head + 4, 0xea, 0xeb, 0xec, 0xed);
        if (tail > (len - 4)) {
            /// 找不到尾部，只有缓存这包数据，等待下次处理
            if (extra_buf_save) extra_buf_save(bytes.shift(buf, len, head), len - head);
            return;
        }

        /// 计算校验和，并处理数据
        if (tail > (head + 5)) {
            var check_computed = radar_ruda_checksum(buf, tail - 1, head + 4);
            var check_saved    = bytes.byte(buf, len, tail - 1);
            if (dump_switch == "radar_all") {
                printlog("checksum: " + check_computed + "|" + check_saved);
            }
            if (check_computed == check_saved) {
                radar_ruda_data(ch_recv_para, buf, tail - 1, head + 4);
            }
        }

        pos += tail + 4;
    }
    
}


/**
 * 雷达查找魔术字
 */
function radar_ruda_magic(buf, len, pos, g1, g2, g3, g4) {
    while (pos <= (len - 4)) {
        var h1 = bytes.byte(buf, len, pos);
        var h2 = bytes.byte(buf, len, pos + 1);
        var h3 = bytes.byte(buf, len, pos + 2);
        var h4 = bytes.byte(buf, len, pos + 3);
        if (h1 != g1 || h2 != g2 || h3 != g3 || h4 != g4) {
            pos ++;
            continue;
        }

        break;
    }

    return pos;
}


/**
 * 雷达计算校验和
 * @param {Pointer} buf 缓冲区地址
 * @param {Number} len 缓冲区长度
 * @param {Number} pos 缓冲区偏移
 */
function radar_ruda_checksum(buf, len, pos) {
    var first = true;
    var check = 0;
    while (pos <= len) {
        if (first) {
            check = bytes.byte(buf, len, pos);
            first = false;
        } else {
            check ^= bytes.byte(buf, len, pos);
        }
        pos ++;
    }

    return check;
}


/**
 * 雷达获取数据
 * @param {Object} para 通道参数
 * @param {Pointer} buf 缓冲区地址
 * @param {Number} len 缓冲区长度
 * @param {Number} pos 缓冲区偏移
 */
function radar_ruda_data(para, buf, len, pos) {
    var basic;
    while (pos < len) {
        if ((pos + 3) > len) return;
        var l = bytes.byte(buf, len, pos + 2);
        if ((pos + 3 + l) > len) return;
        var id = bytes.word(buf, len, pos);
        switch (id) {
            case 0x0501:
                basic = radar_ruda_data_basic(para, buf, pos + 3 + l, pos + 3);
                break;
            default:
                radar_ruda_data_target(para, basic, id, buf, pos + 3 + l, pos + 3);
                break;
        }

        pos += 3 + l;
    }
}


/**
 * 雷达获取基础数据
 * @param {Object} para 通道参数
 * @param {Pointer} buf 缓冲区地址
 * @param {Number} len 缓冲区长度
 * @param {Number} pos 缓冲区偏移
 */
function radar_ruda_data_basic(para, buf, len, pos) {
    if (!para || (pos + 8) > len) return;
    var timer  = bytes.dword(buf, len, pos);
    var period = bytes.byte (buf, len, pos + 5);
    var count  = bytes.byte (buf, len, pos + 7);
    var basic  = {
        timer: timer,
        period: period,
        count: count
    };

    var ch = para.ch;
    var dump_switch = para.dump;
    if (dump_switch == "radar_basic") {
        print_obj_member(basic, printlog, "radar(ch:" + ch + ") basic");
    }

    /// 无目标时，清空目标缓存
    if (!count && radar_ruda_targets && radar_ruda_targets[ch]) radar_ruda_targets[ch] = {};

    return basic;
}


/**
 * 雷达获取目标数据
 * @param {Object} para 通道参数
 * @param {Object} basic 基础参数
 * @param {Number} id 标识符
 * @param {Pointer} buf 缓冲区地址
 * @param {Number} len 缓冲区长度
 * @param {Number} pos 缓冲区偏移
 */
function radar_ruda_data_target(para, basic, id, buf, len, pos) {
    if (!para || (pos + 8) > len) return;

    var b1 = bytes.byte(buf, len, pos);
    var b2 = bytes.byte(buf, len, pos + 1);
    var b3 = bytes.byte(buf, len, pos + 2);
    var b4 = bytes.byte(buf, len, pos + 3);
    var b5 = bytes.byte(buf, len, pos + 4);
    var b6 = bytes.byte(buf, len, pos + 5);
    var b7 = bytes.byte(buf, len, pos + 6);
    var b8 = bytes.byte(buf, len, pos + 7);
    var target = b1 >> 2;
    var length = (((b1  & 0x03) << 6)  | (b2 >> 2)) * 0.2;
    var speedY = ((((b2 & 0x03) << 9)  | (b3 << 1) | (b4 >> 7)) - 1024) * 100 / 1000 * 3600 / 1000;
    var speedX = ((((b4 & 0x7f) << 4)  | (b5 >> 4)) - 1024) * 100 / 1000 * 3600 / 1000;
    var coordY = ((((b5 & 0x0f) << 10) | (b6 << 2) | (b7 >> 6)) - 8192) * 64 / 1000;
    var coordX = ((((b7 & 0x3f) << 8)  | b8) - 8192) * 64 / 1000;

    var ch = para.ch;
    var o = {
        ch: ch,
        id: id,
        target: target,
        coordX: coordX,
        coordY: coordY,
        speedX: speedX,
        speedY: speedY,
        length: length
    };

    if (basic) {
        o.timer = basic.timer;
        o.period = basic.period;
        o.count = basic.count;
    }

    var dump_switch = para.dump;
    if (dump_switch == "radar_all" || dump_switch == "radar_target") {
        print_obj_member(o, printlog, "radar(ch:" + ch + ") target");
    }

    var node;
    var find = para.find;
    if (find) node = find(o);
    if (!node || !node.config) {
        if (dump_switch == "radar_all" || dump_switch == "radar_target") {
            printlog("radar(ch:" + ch + ") not found node config, dropped!");
        }

        return;
    }

    var ack = para.ack;
    if (ack) ack(o);
}


/**
 * 过滤目标
 * @param {Object} o 目标
 * @description 需要和缓冲的同一目标进行判断，返回否的目标需要被过滤掉
 */
function radar_ruda_filter_target(o, ctrl) {
    if (!o || typeof(o.ch) == "undefined" || typeof(o.id) == "undefined" || typeof(o.target) == "undefined" || 
        typeof(o.coordX_toLine) == "undefined" || 
        typeof(o.coordY_toLine) == "undefined" || 
        typeof(o.timer) == "undefined" || 
        typeof(o.period) == "undefined") {
        o.dropped = "dropped cause no correct member!";
        return false;
    }

    /// 目标没有进行缓冲的话，缓冲后返回否 (先不上报)
    if (!radar_ruda_targets) radar_ruda_targets = {};
    if (!radar_ruda_targets[o.ch]) radar_ruda_targets[o.ch] = {};
    if (!radar_ruda_targets[o.ch][o.id]) radar_ruda_targets[o.ch][o.id] = {};
    if (!radar_ruda_targets[o.ch][o.id][o.target]) {
         radar_ruda_targets[o.ch][o.id][o.target] = o;
         o.dropped = "dropped cause buffered first time!";
        return false;
    }

    /// 判断目标的X轴移动速度 (km/s)
    var prev = radar_ruda_targets[o.ch][o.id][o.target];
    var time = Math.abs(o.timer - prev.timer) * o.period;
    /// 需要合并事件: 2秒上报一次，目标要持续2秒时间
    if (ctrl && ctrl.merge && time < 2000) {
        o.dropped = "dropped cause merged within 2s!";
        return false;
    }

    /// 需要进行过滤: X方向的速度超过Y方向的速度+20km/s
    if (ctrl && ctrl.filter) {
        var speedX = Math.abs(o.coordX_toLine - prev.coordX_toLine) * 3600/ time;
        var speedY = Math.abs(o.coordY_toLine - prev.coordY_toLine) * 3600/ time;
        if (speedX > (speedY + 20)) {
            radar_ruda_targets[o.ch][o.id][o.target] = o;
            o.dropped = "dropped cause filtered by too high X speed!";
            return false;
        }
    }

    radar_ruda_targets[o.ch][o.id][o.target] = o;
    return true;
}


/**
 * 雷达数据处理
 * @param {Object} data 要处理的数据
 * @param {Object} rsp 设备的响应
 * @param {Object} node 设备节点
 * 针对计算的配置方式有：
 * 1）设备点相对坐标，相交点相对坐标
        config: {
            device: 设备点相对坐标,
            node:   相交点相对坐标
        }
 * 2）起始点GPS，设备点GPS，相交点GPS
        config: {
            start:  起始点GPS,
            device: 设备点GPS,
            node:   相交点GPS
        }
 * 3）起始点GPS，设备点相对坐标，相交点相对坐标
        config: {
            start:  起始点GPS,
            device: 设备点相对坐标,
            node:   相交点相对坐标
        }
 * 4）起始点GPS，设备点北斗坐标，起始点北斗坐标(坐标放到'线段'对象中，线段远端没有的话则使用相交点)，相交点北斗坐标
        config: {
            start: 起始点GPS,
            device: 设备点北斗坐标,
            line: [起始点北斗坐标, ...(没有的话则使用相交点)],
            node: 相交点北斗坐标
        }
 */
function radar_ruda_proc(data, rsp, node) {
    var dump_switch = (typeof(channel_dump_switch) != "undefined")? channel_dump_switch() : "";
    if (dump_switch == "radar_all" || dump_switch == "radar_target") {
        print_obj_member(data, printlog, "radar_ruda_proc in");
    }
    if (!node.config || !node.config.device || !node.config.node) {
        if (dump_switch == "radar_all" || dump_switch == "radar_target") {
            printlog("radar(ch:" + data.ch + ",devid:" + data.id + ",target:" + data.target + ") no config!");
        }
        return false;
    }

    /// 获取设备内部坐标：X轴同向，Y轴反向
    var x = data.coordX;
    var y = 0 - data.coordY;
    if (typeof(node.config.angle) == "number") x *= Math.cos(node.config.angle * Math.PI / 180);
    /// 获取起点配置
    var s = node.config.start;
    // if (!s) s = {lng:104.060867,lat:30.594687};
    if (s) { data.startLng = s.lng; data.startLat = s.lat; }
    /// 获取设备配置
    var d = node.config.device;
    if (typeof(d.lng) != "undefined" && typeof(d.lat) != "undefined" && s) d = coor_getGpsRelative(s, d);
    data.deviceX = d.x;
    data.deviceY = d.y;
    /// 获取交点配置
    var o = node.config.node;
    if (typeof(o.lng) != "undefined" && typeof(o.lat) != "undefined" && s) o = coor_getGpsRelative(s, o);
    data.nodeX = o.x;
    data.nodeY = o.y;
    /// 获取区域中轴线配置
    var c; // 中轴线坐标原点
    var e; // 中轴线坐标终点
    var l = node.config.line;
    if (l) { c = (l[0])? l[0] : {x:0,y:0};      e = (l[1])? l[1] : o; }
    else   { c = {x:0,y:0};                     e = o; }
    data.lineCenterX = c.x;
    data.lineCenterY = c.y;
    data.lineRemoteX = e.x;
    data.lineRemoteY = e.y;
    l = coor_getLinePara(c, e);
    if (!l) {
        if (dump_switch == "radar_all" || dump_switch == "radar_target") {
            printlog("radar(ch:" + data.ch + ",devid:" + data.id + ",target:" + data.target + ") no middle line!");
        }
        return false;
    }
    data.lineAngle = Math.round(l.a * 10000) / 10000;
    var p = {x:x,y:y};
    /// 获取设备在区域内的相对坐标
    var q = coor_getLineRelative(c, l, d);
    data.deviceX_toLine = q.x;
    data.deviceY_toLine = q.y;
    /// 获取目标点的区域坐标和全局坐标
    var a = coor_getLineAngle(d, o) - l.a;
    data.deviceAngle_toLine = Math.round(a * 10000) / 10000;
    var coor_toLine         = coor_getLineAbsolute(q, a, p);
    data.coordX_toLine      = Math.round(coor_toLine.x * 10000) / 10000;
    data.coordY_toLine      = Math.round(coor_toLine.y * 10000) / 10000;
    var coor_toCoor         = coor_getLineAbsolute(c, l.a, coor_toLine);
    var x_toCenter          = coor_toCoor.x - c.x;
    var y_toCenter          = coor_toCoor.y - c.y;
    data.coordX_toCoor      = Math.round(x_toCenter * 10000) / 10000;
    data.coordY_toCoor      = Math.round(y_toCenter * 10000) / 10000;
    if (s) {
        var gps = coor_getGpsAbsolute(s, x_toCenter, y_toCenter);
        if (gps) {
            data.coordX_toCenter = data.coordX_toCoor;
            data.coordY_toCenter = data.coordY_toCoor;
            data.coordX_toCoor   = gps.lng;
            data.coordY_toCoor   = gps.lat;
        }
    }

    /// 过滤目标
    if (!radar_ruda_filter_target(data, node.ctrl)) {
        if (dump_switch == "radar_all" || dump_switch == "radar_target") {
            print_obj_member(data, printlog, "radar_ruda_filter_target false");
            printlog("radar(ch:" + data.ch + ",devid:" + data.id + ",target:" + data.target + ") dropped!");
        }

        return false;
    }

    /// 上报目标 (可以返回 undefined 或者 对象 或者 true)
    return true;
}


/**
 * 雷达配置命令
 * @param {Object} o 命令对象: {
        command: "config-radar",
        arg: {
            uuid: "XXXX-YYYY-0001",     // 设备uuid
            device: ...,                // 设备配置
            ...: ...                    // ...
        }
 * @param {Object} data 响应对象
 * @param {String} dump_switch DUMP开关
 */
function radar_config(o, data, dump_switch) {
    if (dump_switch == "all" || dump_switch == "radar_config") {
        print_obj_member(o, printlog, 'radar_config');
    }

    /// 检查参数
    if (!o || !o.arg) {
        data.error = "radar config command arg error";
        return false;
    }

    /// 获取UUID
    var uuid = (o.uuid)? o.uuid : o.arg.uuid;
    if (!uuid) {
        data.error = "radar config command uuid error";
        return false;
    }

    /// 根据设备UUID查找设备节点
    var node;
    var list = device_node();
    for (var i = 0; i < list.length; ++i) {
        node = list[i];
        if (node && node.fixs && node.fixs.uuid && 
            uuid == node.fixs.uuid) break;
        node = null;
    }
    if (!node) {
        data.error = "radar config command no uuid's device";
        return false;
    }

    /// 保存配置到设备节点中
    node.config = o.arg;
    node.proc = radar_ruda_proc;
    return true;
}


/**
 * 雷达设置处理函数
 */
function radar_set_proc() {
    var list = device_node();
    for (var i = 0; i < list.length; ++i) {
        var node = list[i];
        if (node && node.fixs && node.fixs.type && 
            node.fixs.type == "radar") {
            node.proc = radar_ruda_proc;
        }
    }
}


/**
 * 雷达播放声音
 * @param {Object} o 命令对象: {
        command: "radar_play_sound",
        arg: {
            file: "告警.wav",           // 默认为"告警.wav"
            switch: "play" | "stop",
            repeat: true                // 默认为不重复 (不重复就不用下发"stop"了)
        }
    }
 * @param {Object} data 响应对象
 * @param {String} dump_switch DUMP开关
 */
var radar_sound_dll;
function radar_play_sound(o, data, dump_switch) {
    if (dump_switch == "all" || dump_switch == "play_sound") {
        print_obj_member(o, printlog, 'radar_play_sound');
    }

    /// 检查参数
    if (!o || !o.arg) {
        data.error = "radar play sound command arg error";
        return false;
    }

    /// 加载动态库
    var dll = radar_sound_dll;
    if (!dll) {
        dll = dlls.create();
        printlog('dll create: ' + dll + ' ' + typeof(dll));
        print_obj_member(dll, printlog, 'dll create');
        if (!dll.ptr) return false;
        var r = dll.load('mci.dll');
        printlog('load dll r:' + r);
        if (r != 0) return false;
        print_obj_member(dll, printlog, 'dll load');
        radar_sound_dll = dll;
    }

    /// 获取文件
    var file = o.arg.file;
    if (!file) file = "告警.wav";
    var alias = o.arg.alias;
    if (!alias) alias = file;

    /// 播放声音
    if (o.arg.switch == "play") {
        var open = "open " + file + " alias " + alias;
        if (file.endsWith(".wav")) open += " type mpegvideo";
        dll.mciSendString("close " + alias, 0, 0);
        var r = dll.mciSendString(open, 0, 0);
        if (dump_switch == "all" || dump_switch == "play_sound") {
            printlog("mciSendString open r:" + r);
        }
        if (r) return false;
        var play = "play " + alias;
        if (o.arg.repeat) play += " repeat";
        var r = dll.mciSendString(play, 0, 0);
        if (dump_switch == "all" || dump_switch == "play_sound") {
            printlog("mciSendString play r:" + r);
        }
        return (r)? false : true;
    }

    /// 停止声音
    if (o.arg.switch == "stop") {
        dll.mciSendString("stop "  + alias, 0, 0);
        dll.mciSendString("close " + alias, 0, 0);
        return true;
    }

    data.error = "radar play sound command switch error";
    return false;
}


/**
 * 雷达截取视频 - 开始
 * @param {Object} o 命令对象: {
        command: "radar_fetch_video",
        arg: {
            file: "服务器端绝对路径+文件名", // 会根据类型添加后缀，比如:_normal.mp4
            switch: "start", | "end",
            type: ["normal","thermal"]   // 不指明的话，默认为normal，文件不会添加后缀
        }
    }
 * @param {Object} data 响应对象
 * @param {String} dump_switch DUMP开关
 */
var radar_video_dll;
var radar_video_userid;
var radar_video_channel;
var radar_video_status;
var radar_video_trans;
var radar_video_count;
function radar_fetch_video(o, data, dump_switch) {
    if (dump_switch == "all" || dump_switch == "fetch_video") {
        print_obj_member(o, printlog, 'radar_fetch_video');
    }

    var error = function(info) {
        if (dump_switch == "all" || dump_switch == "fetch_video") {
            printlog("radar_fetch_video | " + 
                ((o && o.arg && o.arg.switch)? o.arg.switch : "") + 
                " : " + info);
        }
        data.error = info;
        return false;
    }

    /// 检查参数
    if (!o || !o.arg) {
        return error("radar fetch video command arg error");
    }

    /// 查找视频设备节点
    var node;
    var list = device_node();
    for (var i = 0; i < list.length; ++i) {
        node = list[i];
        if (node && node.fixs && node.fixs.type && 
            node.fixs.type == "video") break;
        node = null;
    }
    if (!node || !node.hard || 
        !node.hard.ip || !node.hard.port || 
        !node.hard.user || !node.hard.pass) {
        return error("radar fetch video command no video device");
    }

    /// 加载动态库
    var dll = radar_video_dll;
    if (!dll) {
        dll = dlls.create();
        printlog('dll create: ' + dll + ' ' + typeof(dll));
        print_obj_member(dll, printlog, 'dll create');
        if (!dll.ptr) return error("dll create failed");
        var r = dll.load('haik.dll');
        printlog('load dll r:' + r);
        if (r != 0) return error("load haik.dll failed");
        print_obj_member(dll, printlog, 'dll load');

        /// 初始化驱动
        var r = dll.NET_DVR_Init();
        printlog('NET_DVR_Init rc:' + r);
        var r = dll.NET_DVR_SetConnectTime(2000, 1);
        printlog('NET_DVR_SetConnectTime rc:' + r);
        var r = dll.NET_DVR_SetReconnect(10000, true);
        printlog('NET_DVR_SetReconnect rc:' + r);

        radar_video_dll = dll;
    }

    /// 失败处理
    fail = function(info, rc) {
        var err = dll.NET_DVR_GetLastError();
        var msg = dll.NET_DVR_GetErrorMsg(err);
        return error("radar fetch video failed(" + rc + "):" + info + " " + msg + "(" + err + ")");
    }

    /// 登录设备
    if (typeof(radar_video_userid) == "undefined") {
        var len = dll.NET_DVR_DEVICEINFO_V40_LEN();
        var out = bytes.create(len);
        var uid = dll.NET_DVR_Login_V40(node.hard.ip, node.hard.port, node.hard.user, node.hard.pass, out.buf);
        bytes.dump(out.buf, out.len);
        if (dump_switch == "all" || dump_switch == "fetch_video")
            printlog('NET_DVR_Login_V40 id: ' + uid);
        if (uid < 0) return fail("NET_DVR_Login_V40", uid);

        radar_video_userid = uid;
    }

    /// 获取当前设备
    var dir = files.dircur() + files.dirsplit();
    if (dump_switch == "all" || dump_switch == "fetch_video")
        printlog("cur dir: " + dir);

    /// 录制视频开始
    if (o.arg.switch == "start") {
        if (radar_video_status) {
            return error("radar fetch video already started");
        }
        if (dump_switch == "all" || dump_switch == "fetch_video")
            printlog("start fetch video ...");
        radar_video_channel = [];
        if (!o.arg.type || !o.arg.type.length) o.arg.type = [null];
        for (var i = 0; i < o.arg.type.length; ++i) {
            var type = o.arg.type[i];
            var handle = dll.NET_DVR_RealPlay_V40(radar_video_userid, i, 0, 4, 0, 1);
            if (dump_switch == "all" || dump_switch == "fetch_video")
                printlog("NET_DVR_RealPlay_V40(" + radar_video_userid + "," + i + "): " + handle);
            if (handle < 0) return fail("NET_DVR_RealPlay_V40(" + radar_video_userid + "," + i + ")", handle);
            var file = (type)? (dir + "video_" + type + ".mp4") : (dir + "video.mp4");
            var rc = dll.NET_DVR_SaveRealData(handle, file);
            if (dump_switch == "all" || dump_switch == "fetch_video")
                printlog("NET_DVR_SaveRealData(" + handle + "," + file + "): " + rc);
            if (rc == 0) return fail("NET_DVR_SaveRealData(" + handle + "," + file + ")", rc);
            radar_video_channel[i] = {type:type,handle:handle,file:file};
        }

        radar_video_status = "recording";

        if (dump_switch == "all" || dump_switch == "fetch_video")
            printlog("start fetch video ok");
        return true;
    }

    /// 本地转码
    var video_format = function(src, dst, done) {
        var path, file, args;
        if (dcop.os == "windows") {
            path = "./";
            file = "video_format.bat";
            args = "video_format.bat " + src + " " + dst;
        } else {
            path = "/bin/sh";
            file = "sh";
            args = "video_format.sh " + src + " " + dst;
        }
        files.remove(dst);
        var r = dcop.process_async(path, file, args, function(r) {
            if (dump_switch == "all" || dump_switch == "fetch_video")
                printlog("format video r:" + r);
            if (done) done(r);
        }, 0xffffffff, 0);
    }

    /// 文件上传
    var video_upload = function(remote, type, file, done) {
        if (!radar_video_trans) {
            radar_video_trans = filetrans.create(function(index, node, server, remote, local) {
                if (dump_switch == "all" || dump_switch == "fetch_video") {
                    var s;
                    if (node.op == "download") s = "'" + server + "'|'" + remote + "' -> '" + local + "'";
                    else if (node.op == "upload") s = "'" + local + "' -> '" + server + "'|'" + remote + "'";
                    else s = "'" + server + "'|'" + remote + "'|'" + local + "'";
                    printlog("index: " + index, s, node.state, node.progress + "|" + node.offset + "|" + 
                        node.fileLen + "|" + node.sendLen + "|" + node.sendIdx + "|" + node.mtu  + "|" + 
                        node.err + "(" + node.rc + ")");
                }
                if (node.state == "finish" || node.state == "error") {
                    if (dump_switch == "all" || dump_switch == "fetch_video")
                        printlog("upload video r:" + node.rc);
                    if (done) done(node.rc, node);
                }
            });
        }
        var remote_file = (type)? (remote + "_" + type + ".mp4") : (remote + ".mp4");
        var r = filetrans.upload(radar_video_trans, "tcp.server", remote_file, file);
        if (dump_switch == "all" || dump_switch == "fetch_video")
            printlog("start upload video r:" + r);
    }

    /// 录制视频结束
    if (o.arg.switch == "end") {
        if (!radar_video_status) {
            return error("radar fetch video already stopped");
        }
        if (!radar_video_channel || !radar_video_channel.length) {
            return error("radar fetch video no started video");
        }
        if (dump_switch == "all" || dump_switch == "fetch_video")
            printlog("end fetch video ...");
        radar_video_count = 0;
        for (var i = 0; i < radar_video_channel.length; ++i) {
            var type = radar_video_channel[i].type;
            var handle = radar_video_channel[i].handle;
            dll.NET_DVR_StopSaveRealData(handle);
            dll.NET_DVR_StopRealPlay(handle);
            var src = radar_video_channel[i].file;
            var dst = (type)? (dir + "video_" + type + "_format.mp4") : (dir + "video_format.mp4");
            video_format(src, dst, function(r) {
                if (!r) video_upload(o.arg.file, type, dst, function(r) {
                    if (++radar_video_count == radar_video_channel.length) {
                        /// 这里是都返回了，可以把状态复原了
                        radar_video_count = 0;
                        radar_video_status = null;
                        if (dump_switch == "all" || dump_switch == "fetch_video")
                            printlog("end upload video(count:" + radar_video_count + ") r:" + r);
                    }
                });
            });
        }

        if (dump_switch == "all" || dump_switch == "fetch_video")
            printlog("end fetch video ok");
        return true;
    }

    return error("radar fetch video command switch error");
}


/**
 * dump目标信息
 */
function radar_target_dump() {
    print_obj_member(radar_ruda_targets, printlog, "radar target list");
}


/**
 * 初始化时给通道设置协议格式
 */
(function() {
    var oninit = function() {
        if (typeof(format_rsp) != "undefined") {
            format_rsp('radar_ruda', radar_ruda_recv);
        }
        if (typeof(control_command) != "undefined") {
            control_command('config-radar', {
                process: radar_config
            });
            control_command('radar_play_sound', {
                process: radar_play_sound
            });
            control_command('radar_fetch_video', {
                process: radar_fetch_video
            });
        }
        
        if (typeof(dump_switch_command) != "undefined") {
            dump_switch_command("radar_target_list", radar_target_dump);
        }

        radar_set_proc();
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('radar', {oninit: oninit});
    }
}) ();

