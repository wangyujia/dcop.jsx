/// js/app/iot/edge/radar.js
/**
 * ��������Ե���״�Э��ĶԽӺͼ���
 */


/**
 * �״�Ŀ�껺���б�
 */
var radar_ruda_targets;


/**
 * �״����ݽ���
 * @param {Pointer} buf ��������ַ
 * @param {Number} len ����������
 * @param {Function} extra_buf_save �������ݱ��溯��
 * @param {Object} ch_recv_para ͨ�����ղ���
 *  ch_recv_para: {
 *      ch: {Number} ͨ��ID
 *      ip: {String} IP
 *      port: {Number} �˿�
 *      proto: {String} Э��
 *      find: {Function} ���ҽڵ㺯�� function(rsp)
 *      ack: {Function} Ӧ���� function(rsp)
 *      dump: {String} DUMP����
 *  }
 */
function radar_ruda_recv(buf, len, extra_buf_save, ch_recv_para) {
    var dump_switch = ch_recv_para.dump;
    if (dump_switch == "radar_all") {
        printlog("recv radar data:");
        bytes.dump(buf, len);
    }

    /// ���ݲ��㣬�����ⲿ���պ����������� (ͷ����β����8���ֽ�)
    if (bytes.zero(buf) || len < 8) {
        if (extra_buf_save) extra_buf_save(buf, len);
        return;
    }

    var pos = 0;
    while (pos <= (len - 9)) {
        /// ����ͷ��
        var head = radar_ruda_magic(buf, len, pos, 0xca, 0xcb, 0xcc, 0xcd);
        if (head > (len - 4)) {
            /// �Ҳ���ͷ����ֻ�ж������������
            return;
        }

        /// ����β��
        var tail = radar_ruda_magic(buf, len, head + 4, 0xea, 0xeb, 0xec, 0xed);
        if (tail > (len - 4)) {
            /// �Ҳ���β����ֻ�л���������ݣ��ȴ��´δ���
            if (extra_buf_save) extra_buf_save(bytes.shift(buf, len, head), len - head);
            return;
        }

        /// ����У��ͣ�����������
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
 * �״����ħ����
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
 * �״����У���
 * @param {Pointer} buf ��������ַ
 * @param {Number} len ����������
 * @param {Number} pos ������ƫ��
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
 * �״��ȡ����
 * @param {Object} para ͨ������
 * @param {Pointer} buf ��������ַ
 * @param {Number} len ����������
 * @param {Number} pos ������ƫ��
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
 * �״��ȡ��������
 * @param {Object} para ͨ������
 * @param {Pointer} buf ��������ַ
 * @param {Number} len ����������
 * @param {Number} pos ������ƫ��
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

    /// ��Ŀ��ʱ�����Ŀ�껺��
    if (!count && radar_ruda_targets && radar_ruda_targets[ch]) radar_ruda_targets[ch] = {};

    return basic;
}


/**
 * �״��ȡĿ������
 * @param {Object} para ͨ������
 * @param {Object} basic ��������
 * @param {Number} id ��ʶ��
 * @param {Pointer} buf ��������ַ
 * @param {Number} len ����������
 * @param {Number} pos ������ƫ��
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
 * ����Ŀ��
 * @param {Object} o Ŀ��
 * @description ��Ҫ�ͻ����ͬһĿ������жϣ����ط��Ŀ����Ҫ�����˵�
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

    /// Ŀ��û�н��л���Ļ�������󷵻ط� (�Ȳ��ϱ�)
    if (!radar_ruda_targets) radar_ruda_targets = {};
    if (!radar_ruda_targets[o.ch]) radar_ruda_targets[o.ch] = {};
    if (!radar_ruda_targets[o.ch][o.id]) radar_ruda_targets[o.ch][o.id] = {};
    if (!radar_ruda_targets[o.ch][o.id][o.target]) {
         radar_ruda_targets[o.ch][o.id][o.target] = o;
         o.dropped = "dropped cause buffered first time!";
        return false;
    }

    /// �ж�Ŀ���X���ƶ��ٶ� (km/s)
    var prev = radar_ruda_targets[o.ch][o.id][o.target];
    var time = Math.abs(o.timer - prev.timer) * o.period;
    /// ��Ҫ�ϲ��¼�: 2���ϱ�һ�Σ�Ŀ��Ҫ����2��ʱ��
    if (ctrl && ctrl.merge && time < 2000) {
        o.dropped = "dropped cause merged within 2s!";
        return false;
    }

    /// ��Ҫ���й���: X������ٶȳ���Y������ٶ�+20km/s
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
 * �״����ݴ���
 * @param {Object} data Ҫ���������
 * @param {Object} rsp �豸����Ӧ
 * @param {Object} node �豸�ڵ�
 * ��Լ�������÷�ʽ�У�
 * 1���豸��������꣬�ཻ���������
        config: {
            device: �豸���������,
            node:   �ཻ���������
        }
 * 2����ʼ��GPS���豸��GPS���ཻ��GPS
        config: {
            start:  ��ʼ��GPS,
            device: �豸��GPS,
            node:   �ཻ��GPS
        }
 * 3����ʼ��GPS���豸��������꣬�ཻ���������
        config: {
            start:  ��ʼ��GPS,
            device: �豸���������,
            node:   �ཻ���������
        }
 * 4����ʼ��GPS���豸�㱱�����꣬��ʼ�㱱������(����ŵ�'�߶�'�����У��߶�Զ��û�еĻ���ʹ���ཻ��)���ཻ�㱱������
        config: {
            start: ��ʼ��GPS,
            device: �豸�㱱������,
            line: [��ʼ�㱱������, ...(û�еĻ���ʹ���ཻ��)],
            node: �ཻ�㱱������
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

    /// ��ȡ�豸�ڲ����꣺X��ͬ��Y�ᷴ��
    var x = data.coordX;
    var y = 0 - data.coordY;
    if (typeof(node.config.angle) == "number") x *= Math.cos(node.config.angle * Math.PI / 180);
    /// ��ȡ�������
    var s = node.config.start;
    // if (!s) s = {lng:104.060867,lat:30.594687};
    if (s) { data.startLng = s.lng; data.startLat = s.lat; }
    /// ��ȡ�豸����
    var d = node.config.device;
    if (typeof(d.lng) != "undefined" && typeof(d.lat) != "undefined" && s) d = coor_getGpsRelative(s, d);
    data.deviceX = d.x;
    data.deviceY = d.y;
    /// ��ȡ��������
    var o = node.config.node;
    if (typeof(o.lng) != "undefined" && typeof(o.lat) != "undefined" && s) o = coor_getGpsRelative(s, o);
    data.nodeX = o.x;
    data.nodeY = o.y;
    /// ��ȡ��������������
    var c; // ����������ԭ��
    var e; // �����������յ�
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
    /// ��ȡ�豸�������ڵ��������
    var q = coor_getLineRelative(c, l, d);
    data.deviceX_toLine = q.x;
    data.deviceY_toLine = q.y;
    /// ��ȡĿ�������������ȫ������
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

    /// ����Ŀ��
    if (!radar_ruda_filter_target(data, node.ctrl)) {
        if (dump_switch == "radar_all" || dump_switch == "radar_target") {
            print_obj_member(data, printlog, "radar_ruda_filter_target false");
            printlog("radar(ch:" + data.ch + ",devid:" + data.id + ",target:" + data.target + ") dropped!");
        }

        return false;
    }

    /// �ϱ�Ŀ�� (���Է��� undefined ���� ���� ���� true)
    return true;
}


/**
 * �״���������
 * @param {Object} o �������: {
        command: "config-radar",
        arg: {
            uuid: "XXXX-YYYY-0001",     // �豸uuid
            device: ...,                // �豸����
            ...: ...                    // ...
        }
 * @param {Object} data ��Ӧ����
 * @param {String} dump_switch DUMP����
 */
function radar_config(o, data, dump_switch) {
    if (dump_switch == "all" || dump_switch == "radar_config") {
        print_obj_member(o, printlog, 'radar_config');
    }

    /// ������
    if (!o || !o.arg) {
        data.error = "radar config command arg error";
        return false;
    }

    /// ��ȡUUID
    var uuid = (o.uuid)? o.uuid : o.arg.uuid;
    if (!uuid) {
        data.error = "radar config command uuid error";
        return false;
    }

    /// �����豸UUID�����豸�ڵ�
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

    /// �������õ��豸�ڵ���
    node.config = o.arg;
    node.proc = radar_ruda_proc;
    return true;
}


/**
 * �״����ô�����
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
 * �״ﲥ������
 * @param {Object} o �������: {
        command: "radar_play_sound",
        arg: {
            file: "�澯.wav",           // Ĭ��Ϊ"�澯.wav"
            switch: "play" | "stop",
            repeat: true                // Ĭ��Ϊ���ظ� (���ظ��Ͳ����·�"stop"��)
        }
    }
 * @param {Object} data ��Ӧ����
 * @param {String} dump_switch DUMP����
 */
var radar_sound_dll;
function radar_play_sound(o, data, dump_switch) {
    if (dump_switch == "all" || dump_switch == "play_sound") {
        print_obj_member(o, printlog, 'radar_play_sound');
    }

    /// ������
    if (!o || !o.arg) {
        data.error = "radar play sound command arg error";
        return false;
    }

    /// ���ض�̬��
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

    /// ��ȡ�ļ�
    var file = o.arg.file;
    if (!file) file = "�澯.wav";
    var alias = o.arg.alias;
    if (!alias) alias = file;

    /// ��������
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

    /// ֹͣ����
    if (o.arg.switch == "stop") {
        dll.mciSendString("stop "  + alias, 0, 0);
        dll.mciSendString("close " + alias, 0, 0);
        return true;
    }

    data.error = "radar play sound command switch error";
    return false;
}


/**
 * �״��ȡ��Ƶ - ��ʼ
 * @param {Object} o �������: {
        command: "radar_fetch_video",
        arg: {
            file: "�������˾���·��+�ļ���", // �����������Ӻ�׺������:_normal.mp4
            switch: "start", | "end",
            type: ["normal","thermal"]   // ��ָ���Ļ���Ĭ��Ϊnormal���ļ�������Ӻ�׺
        }
    }
 * @param {Object} data ��Ӧ����
 * @param {String} dump_switch DUMP����
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

    /// ������
    if (!o || !o.arg) {
        return error("radar fetch video command arg error");
    }

    /// ������Ƶ�豸�ڵ�
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

    /// ���ض�̬��
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

        /// ��ʼ������
        var r = dll.NET_DVR_Init();
        printlog('NET_DVR_Init rc:' + r);
        var r = dll.NET_DVR_SetConnectTime(2000, 1);
        printlog('NET_DVR_SetConnectTime rc:' + r);
        var r = dll.NET_DVR_SetReconnect(10000, true);
        printlog('NET_DVR_SetReconnect rc:' + r);

        radar_video_dll = dll;
    }

    /// ʧ�ܴ���
    fail = function(info, rc) {
        var err = dll.NET_DVR_GetLastError();
        var msg = dll.NET_DVR_GetErrorMsg(err);
        return error("radar fetch video failed(" + rc + "):" + info + " " + msg + "(" + err + ")");
    }

    /// ��¼�豸
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

    /// ��ȡ��ǰ�豸
    var dir = files.dircur() + files.dirsplit();
    if (dump_switch == "all" || dump_switch == "fetch_video")
        printlog("cur dir: " + dir);

    /// ¼����Ƶ��ʼ
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

    /// ����ת��
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

    /// �ļ��ϴ�
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

    /// ¼����Ƶ����
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
                        /// �����Ƕ������ˣ����԰�״̬��ԭ��
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
 * dumpĿ����Ϣ
 */
function radar_target_dump() {
    print_obj_member(radar_ruda_targets, printlog, "radar target list");
}


/**
 * ��ʼ��ʱ��ͨ������Э���ʽ
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

