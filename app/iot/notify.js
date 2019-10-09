/// js/app/iot/notify.js
/**
 * ���������Ľ����ϱ�ͨ�����ṩ�豸�����ϱ��ӿ�
 */



/**
 * �������ϱ���Ϣ (�ϱ��¼�) ˵��
 *  notify_http : HTTP(������)�ϱ�
 *      notify_channels('http', {ids}) (����HTTPͨ���б�)
 *  notify_pack : PACK(������)�ϱ�
 *      notify_channels('pack', {ids}) (����PACKͨ���б�)
 */



/**
 * �ϱ�ͨ���б�
 *  �ṹʾ����
 *  {
 *      http: {
 *          list: [
 *              [[o1,0],[o2,0],[o3,0],[o4,0]],
 *              [[o5,0],[o6,0],[o7,0],[o8,0]]
 *          ],
 *          index: 0
 *      },
 *      pack: {
 *          list: [
 *              [[1,0],[2,0],[3,0],[4,0]],
 *              [[5,0],[6,0],[7,0],[8,0]]
 *          ],
 *          index: 0
 *      }
 *  }
 */
var notify_channel_list = {};


/**
 * �����ϱ�ͨ���б�
 * @param {String} type �ϱ����� ('http'|'pack')
 * @param {Array<Number>} ch_list ͨ��ID�б�
 *  ch_list�ṹʾ����
 *  [
 *      [1,2,3,4],  // ���ڷ���ʧ�ܺ��������һ��
 *      [5,6,7,8]   // ����һ��֮�以Ϊͬʱ����
 *  ]
 */
function notify_channels(type, ch_list) {
    if (!type) return notify_channel_list;
    if (!ch_list) return notify_channel_list[type];

    var node = notify_channel_list[type];
    if (!node) node = notify_channel_list[type] = {};
    var list = node.list;
    if (!list) list = node.list = [];

    /// ѭ�����ͨ��
    for (var i in ch_list) {
        var chs = ch_list[i];
        if (!chs) continue;

        var one = [];
        for (var j in chs) {
            var ch = chs[j];
            if (!ch) continue;
            if (type == 'http' && httpclient) {
                var co = httpclient().channel(ch);
                one.push([co, 0]);
            } else {
                one.push([ch, 0]);
            }

            if (this.channel_format) {
                channel_format(ch, "notify_" + type);
            }
        }

        list.push(one);
    }

    /// ����ͨ��ȫ���ϱ�����
    if (this.channel_notify) {
        channel_notify((type == 'http')? 
            notify_http_report : 
            notify_pack_report
        );
    }
}


/**
 * HTTP��ʽ����
 * @param {Array} channels ͨ���б�
 * @param {String} type HTTPЭ������
 * @param {String} path ·��
 * @param {String} str ����
 * @param {String} dump DUMP
 * @param {String} dump_switch DUMP����
 */
function notify_http_send(channels, type, path, str, dump, dump_switch) {
    var i = 0;
    for (i = 0; i < channels.length; ++i) {
        var node = channels[i];
        var chan = node[0];
        var r = chan.send(type, path, str);
        if (r) {
            node[1]++;
            channels.sort(function(a,b) {
                return (a[1] - b[1]);
            });
            if ((dump_switch == "all") || (dump_switch == "notify_send") || 
                (dump_switch && dump && dump == dump_switch)) {
                printlog('-----> http_notify('+dump+') send('+str+') by channel['+i+']:' + 
                    chan.channel() + ' ret:' + r);
            }
            return r;
        }
    }
    
    if ((dump_switch == "all") || (dump_switch == "notify_send") || 
        (dump_switch && dump && dump == dump_switch)) {
        printlog('-----> http_notify('+dump+') send('+str+') try channel count:' + i + 
            ' ret:false');
    }
    
    return false;
}


/**
 * HTTP��ʽ����
 * @param {Pointer} buf ������ָ��
 * @param {number} len ����������
 * @param {Function} extra_buf_save �������ݱ��溯��
 * @param {Object} ch_recv_para ͨ�����ղ���
 *  ch_recv_para: {
 *      ch: {Number} ͨ��ID
 *      ip: {String} IP
 *      port: {Number} �˿�
 *      proto: {String} Э��
 *      ack: {Function} Ӧ���� function(rsp)
 *      dump: {String} DUMP����
 *  }
 */
function notify_http_recv(buf, len, extra_buf_save, ch_recv_para) {
    var ch = ch_recv_para.ch;
    var ip = ch_recv_para.ip;
    var port = ch_recv_para.port;
    var proto = ch_recv_para.proto;
    var dump_switch = ch_recv_para.dump;

    if ((dump_switch == "all") || (dump_switch == "notify_recv") || 
        (dump_switch && bytes.find(buf, len, 0, '"dump":"' + dump_switch + '"') >= 0) || 
        (dump_switch && bytes.find(buf, len, 0, '\\"dump\\":\\"' + dump_switch + '\\"') >= 0)) {
        printlog(bytes.str(buf, len) + ' notify recved! [from channel(' + ch + ') ' + 
            ip + ':' + port + '(' + proto + ')]');
    }
}


/**
 * HTTP��ʽ�ϱ�·��
 */
var notify_http_path = '/dataCollect/putData';


/**
 * HTTP��ʽ�ϱ�����
 * @param {Object} o DATA����
 * @param {String} dump_switch DUMP����
 */
function notify_http_report(o, dump_switch) {
    var path = notify_http_path;
    var node = notify_channels('http');
    if (!node) return false;
    var list = node.list;
    if (!list) return false;

    /// ѭ������
    var loop_send = function(s, dump) {
        var r = false;
        for (var i in list) {
            var chs = list[i];
            if (!chs) continue;
            r = notify_http_send(chs, 'POST', path, s, dump, dump_switch);
        }
        return r;
    }

    /// �ַ�������ֱ�ӷ���
    if (Object.prototype.toString.call(o) == "[object String]") {
        var r = loop_send(o);
        if ((dump_switch == "all") || (dump_switch == "notify_send")) {
            printlog(o + ' string send ret: ' + r);
        }
        return r;
    }

    /// ��������������ź�ʱ��
    if (!node.index) node.index = 0;
    var t = new Date().getTime();
    var dump;
    if (Object.prototype.toString.call(o) == "[object Object]") {
        dump = o["dump"];
        o["index"] = ++(node.index);
        o["time"]  = t;
    } else if (Object.prototype.toString.call(o) == "[object Array]") {
        dump = o[0]["dump"];
        for (var i = 0; i < o.length; ++i) {
            o[i]["index"] = ++(node.index);
            o[i]["time"]  = t;
        }
    }

    /// ת��Ϊ�ַ�������
    var s = Duktape.enc('jc', o);
    var r = loop_send(s, dump);
    if ((dump_switch == "all") || (dump_switch == "notify_send") || 
        (dump_switch && dump && dump == dump_switch)) {
        print_obj_member(o, printlog, o.info);
        printlog(s + ' event('+dump+') send ret: ' + r);
    }
    return r;
}


/**
 * PACK��ʽ����
 * @param {Array} channels ͨ���б�
 * @param {String} str ����
 * @param {String} dump DUMP
 * @param {String} dump_switch DUMP����
 */
function notify_pack_send(channels, str, dump, dump_switch) {
    if (!channel) return false;

    var i = 0;
    for (i = 0; i < channels.length; ++i) {
        var node = channels[i];
        var ch = node[0];
        var r = channel.send(ch, str);
        if (r) {
            node[1]++;
            channels.sort(function(a,b) {
                return (a[1] - b[1]);
            });
            if ((dump_switch == "all") || (dump_switch == "notify_send") || 
                (dump_switch && dump && dump == dump_switch)) {
                printlog('-----> pack_notify('+dump+') send('+str+') by channel['+i+']:' + 
                    ch + ' ret:' + r);
            }
            return r;
        }
    }
    
    if ((dump_switch == "all") || (dump_switch == "notify_send") || 
        (dump_switch && dump && dump == dump_switch)) {
        printlog('-----> pack_notify('+dump+') send('+str+') try channel count: ' + i + 
            ' ret:false');
    }
    
    return false;
}


/**
 * PACK��ʽ����
 * @param {Pointer} buf ������ָ��
 * @param {number} len ����������
 * @param {Function} extra_buf_save �������ݱ��溯��
 * @param {Object} ch_recv_para ͨ�����ղ���
 *  ch_recv_para: {
 *      ch: {Number} ͨ��ID
 *      ip: {String} IP
 *      port: {Number} �˿�
 *      proto: {String} Э��
 *      ack: {Function} Ӧ���� function(rsp)
 *      dump: {String} DUMP����
 *  }
 */
function notify_pack_recv(buf, len, extra_buf_save, ch_recv_para) {
    var ch = ch_recv_para.ch;
    var ip = ch_recv_para.ip;
    var port = ch_recv_para.port;
    var proto = ch_recv_para.proto;
    var dump_switch = ch_recv_para.dump;

    var s = bytes.str(buf, len);
    if ((dump_switch == "all") || (dump_switch == "notify_recv") || 
        (dump_switch && bytes.find(buf, len, 0, '"dump":"' + dump_switch + '"') >= 0) || 
        (dump_switch && bytes.find(buf, len, 0, '\\"dump\\":\\"' + dump_switch + '\\"') >= 0)) {
        printlog(s + ' notify recved! [from channel(' + ch + ') ' + 
            ip + ':' + port + '(' + proto + ')]');
    }
}


/**
 * PACK��ʽ�ϱ�����
 * @param {Object} o DATA����
 * @param {String} dump_switch DUMP����
 */
function notify_pack_report(o, dump_switch) {
    var node = notify_channels('pack');
    if (!node) return false;
    var list = node.list;
    if (!list) return false;

    /// ѭ������
    var loop_send = function(s, dump) {
        var r = false;
        for (var i in list) {
            var chs = list[i];
            if (!chs) continue;
            r = notify_pack_send(chs, s, dump, dump_switch);
        }
        return r;
    }

    /// �ַ�������ֱ�ӷ���
    if (Object.prototype.toString.call(o) == "[object String]") {
        var r = loop_send(o);
        if ((dump_switch == "all") || (dump_switch == "notify_send")) {
            printlog(o + ' string send ret: ' + r);
        }
        return r;
    }

    /// ��������������ź�ʱ��
    if (!node.index) node.index = 0;
    var t = new Date().getTime();
    var e = {
        "type": "event",
        "data": o,
        "index": ++(node.index),
        "time": t
    };
    var dump;
    if (Object.prototype.toString.call(o) == "[object Object]") {
        dump = o["dump"];
        o["index"] = node.index;
        o["time"]  = t;
    } else if (Object.prototype.toString.call(o) == "[object Array]") {
        dump = o[0]["dump"];
        for (var i = 0; i < o.length; ++i) {
            o[i]["index"] = node.index;
            o[i]["time"]  = t;
        }
    }

    /// ת��Ϊ�ַ�������
    var s = Duktape.enc('jc', e);
    var r = loop_send(s, dump);
    if ((dump_switch == "all") || (dump_switch == "notify_send") || 
        (dump_switch && dump && dump == dump_switch)) {
        print_obj_member(e, printlog, o.info);
        printlog(s + ' event('+dump+') send ret: ' + r);
    }
    return r;
}


/**
 * dump�ϱ�ͨ��
 */
function notify_dump() {
    print_obj_member(notify_channel_list, printlog, "notify list");
}


/**
 * ��ʼ��ʱ��ͨ������Э���ʽ
 */
(function() {
    var oninit = function() {
        if (typeof(dump_switch_command) != "undefined") {
            dump_switch_command("notify", notify_dump);
        }

        if (typeof(format_rsp) != "undefined") {
            format_rsp('notify_http', notify_http_recv);
            format_rsp('notify_pack', notify_pack_recv);
        }
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('notify', {oninit: oninit});
    }
}) ();


