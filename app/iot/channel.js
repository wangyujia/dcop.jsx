/// js/app/iot/channel.js
/**
 * ����������ͨ��ͨ�� (���������������ĵĶԽ�Э�顢���Ե���豸�ĶԽ�Э��)
 */



/**
 * ������ע��ͨ����Ϣ˵��
 * 1. ����ͨ�������ӿ� - channel_func (����ͨ��,��ͨ������ʱ�����)
 * 2. ����ͨ���ϱ��ӿ� - channel_notify (����ͨ��,��ͨ������ʱ�����)
 * 3. ע��ͨ�����ݸ�ʽ - channel_format (��ͨ��,ÿͨ������һ��)
 * 4. ע��ͨ���ڵ���Ϣ - channel_node (��ͨ��,����ڵ�)
 * 5. ��ʱ����ͨ������ - channel_send (����ͨ��,��ʱ�����Լ��ص���,ֻ��Ҫ������ʱ��)
 * 6. ������ʱ���ý��� - channel_recv (��ͨ��,��Ҫ��ͨ�������е���)
 * 7. ����ͨ�����Կ��� - channel_dump_switch (����ͨ��,��Ҫ��dump�����¼��е���)
 * 8. ��ӡͨ��������Ϣ - channel_dump (һ���Դ�ӡ����ͨ��)
 */



/**
 * [��ʱ���Ͳɼ�ָ��]
 * 
 *      +------------+            +--------------+
 *      | timer proc | ---------> | channel send | ----> + [ѭ����Ҫ���������ͨ��]
 *      +------------+            +----+----+----+       |
 *                                |    |    |            |
 *                                |    |    |    + <-----+
 *                      +---------+    |    |    |
 *                      | collect | <--+    |    |       +------------+
 *                      +---------+         |    +-----> | format req |
 *                                |         |            +------------+
 *                                |         |            |
 *                                |         + <----------+ [ͨ��format_req��ȡ��ָ�������������ͨ���ɼ�����]
 *      +-------------+           |
 *      | socket send | <---------+
 *      +-------------+     
 * 
 * 
 * 
 * [������ͨ���л�ȡ������]
 *                                               [�ӻ�������ȡ֮ǰ���������]
 *      +-------------+           +--------------+ <----------+       +-------+
 *      | socket recv | --------> | channel recv |            |       | cache | <----+
 *      +-------------+           +----+----+----+ ----> +    + <---- +-------+      |
 *                                |    |    |            |                           |
 *                                |    |    |            |                           |
 *                          +-----+ <--+    |    + <-----+                           |
 *                          | ack |         |    |                                   |
 *                          +-----+ <--+    |    |                                   |
 *                                |    |    |    |                                   |
 *                         +------+    |    |    |       +------------+              |
 *                         | proc |    |    |    +-----> | format rsp | -----------> +
 *                         +------+    |    |            +------------+ [�Ѵ���ʣ�µ����ݷ��뻺����]
 *                                |    |    |            |
 *                                |    |    + <--------- + [ͨ��format_rsp��ȡ�Ľ�����������������ͨ�������ϱ�]
 *      +-------------+           |    |                 |
 *      | socket send | <---------+    + <---------------+ [Ҳ���Լ���������ack���������ϱ�]
 *      +-------------+
 *      [���ϱ�ͨ������]
 * 
 * 
 * 
 * [����IOT��ԵЭ��ģ������ָ����ͽ�������]
 *                                                        +------------+
 *                 +------+                    +--------> | format req |
 *                 | send | (req ins getter)   |          +------------+
 *      +----------+------+------------------> +
 *      | IOT EDGE |
 *      +----------+------+------------------> +
 *                 | recv | (rsp buf parser)   |          +------------+
 *                 +------+                    +--------> | format rsp |
 *                 |                                      +------------+
 *                 +------+
 *                 | proc |
 *                 +------+--------------------+
 *                                             |          +-------------------+
 *                                             +--------> | channel node proc |
 *                                                        +-------------------+
 * 
 */



/**
 * ͨ��ȫ���б�
 */
var channel_all = function() {
    var all = {};

    return function() {
        return all;
    };
} ();



/**
 * ����ͨ���ɼ�ָ��
 */
function channel_send() {
    var o = channel_all();
    /// �����豸 (�·��ɼ�����)
    var proc_node = function(channel, node, ins) {
        if (!channel || !node || !ins) return;
        var ch = channel.id;
        if (!ch) return;
        var send = node.send;
        if (!send) send = channel.send;
        if (!send) send = o.send;
        if (!send) return;
        var interval = node.loop;
        if (!interval) interval = node.loop = 10;
        if (!node.__counter__) node.__counter__ = 0;
        node.__counter__++;
        if (node.__counter__ < interval) return;
        node.__counter__ = 0;
        var uuid = node.uuid;
        var info = node.info;
        var dump = node.dump;
        var r = send(ch, ins.buf, ins.len);
        if (o.dump && (o.dump == "all" || o.dump == "channel_send" || 
            o.dump == dump)) {
            printlog("[channel(" + ch + ") send msg  to  " + 
                o.ip(ch) + ":" + o.port(ch) + "(" + o.proto(ch) + ")] " + "'" + node.info + "'");
            bytes.dump(ins.buf, ins.len);
            printlog("send[ch:" + ch + "] collect '" + info + "' ret: " + r);
        }
        if (!r) {
            var error = node.error;
            if (error) error = channel_data_notify_error;
            if (error) error(uuid, "collect failed", info, dump);
        }
    };
    /// ����ͨ��
    var proc_channel = function(channel) {
        if (!channel) return;
        var format = channel.format;
        if (!format) return;
        var list = channel.nodes;
        if (!list) return;
        for (var i in list) {
            var node = list[i];
            if (!node || !node.reqs) continue;
            var req = format_req(format);
            if (!req) continue;
            var ins = req(node.reqs, i);
            if (!ins) continue;
            proc_node(channel, node, ins);
        }
    };

    /// ��ѯ����ͨ�����д���
    for (var ch in o) {
        var channel = o[ch];
        proc_channel(channel);
    }
}


/**
 * ����ͨ������������
 * @param {Number} ch ͨ��ID
 * @param {String} ip IP
 * @param {Number} port �˿�
 * @param {String} proto Э��
 * @param {Pointer} buf ������ָ��
 * @param {number} len ����������
 */
function channel_recv(ch, ip, port, proto, buf, len) {
    var o = channel_all();
    if (o.dump == "all" || o.dump == "channel_recv") {
        printlog("[channel(" + ch + ") recv msg from " + 
            ip + ":" + port + "(" + proto + ")] ");
        bytes.dump(buf, len);
    }
    /// ����ڵ� (�ϱ���Ӧ����)
    var proc_node = function(channel, node, rsp) {
        if (!channel || !node || !rsp) return;
        var notify = node.notify;
        if (!notify) notify = channel.notify;
        if (node.list && node.list.length) {
            /// node.listΪ�����Ӧ�ڵ�
            for (var i = 0; i < node.list.length; ++i) {
                channel_report(node.list[i], rsp, notify, {
                    "channel": ch, 
                    "ip": ip, 
                    "port": port, 
                    "proto": proto
                });
            }
        } else {
            /// nodeΪ������Ӧ�ڵ�
            channel_report(node, rsp, notify, {
                "channel": ch, 
                "ip": ip, 
                "port": port, 
                "proto": proto
            });
        }
    };
    /// �����豸 (������Ӧ���)
    var find_node = function(channel, rsp) {
        if (!channel) return;
        var list = channel.nodes;
        if (!list) return;
        var first = null;
        for (var i in list) {
            var node = list[i];
            /// �ȼ�¼�µ�һ����û���ҵ��Ļ���ֱ�ӷ��ص�һ��
            if (!first) first = node;
            var hard = node.hard;
            if (!hard) continue;
            var title = null;
            var value = null;
            /// ����Ӳ���������Ҷ�Ӧ�Ľڵ� (Ŀǰֻ֧���趨һ������)
            for (var key in hard) {
                title = key;
                value = hard[key];
                break;
            }
            if (!title || !value) continue;
            if (rsp && rsp[title] == value) return node;
        }
        return first;
    };
    /// ����ͨ��
    var proc_channel = function(channel) {
        if (!channel) return;
        var format = channel.format;
        if (!format) return;
        var parser = format_rsp(format);
        if (o.dump == "all") {
            printlog("get parser:" + parser + " from format:" + format);
        }
        if (!parser) return;

        /// ��ȡ��һ�ν���ʣ��Ļ��� (append���ͷ�֮ǰ���ڴ�)
        var free = null;
        var cache = channel.cache;
        if (cache && cache.buf && cache.len && !bytes.zero(cache.buf)) {
            buf = bytes.append(cache.buf, cache.len, buf, len);
            len = cache.len + len;
            cache.buf = bytes.zero();
            cache.len = 0;
            free = buf;
        }

        /// �ϱ���ǰ��Ӧ (δ�������Ӧ�����ݻ��͸����õĻص�)
        var ack = function(rsp) {
            var node = find_node(channel, rsp);
            if (node)  proc_node(channel, node, rsp);
            return node;
        };
        var rsp = null;
        while (rsp = parser(buf, len, function(buf, len) {
            /// ������������ʣ�����ݴ�����
            if (!cache) cache = channel.cache = {buf:bytes.zero(),len:0};
            else if (cache.buf) bytes.free(cache.buf);
            if (buf && len && !bytes.zero(buf)) {
                cache.buf = bytes.alloc(buf, len);
                cache.len = len;
            } else {
                cache.buf = bytes.zero();
                cache.len = 0;
            }
        }, {
            /// ������������ͨ������
            ch:ch, ip:ip, port:port, proto:proto, find:function(rsp) {
                return find_node(channel, rsp);
            }, ack:ack, dump:o.dump
        })) {
            /// ������Ӧ����������豸�ڵ㣬������
            var node = find_node(channel, rsp);
            if (node && node.dump == o.dump) {
                printlog("[channel(" + ch + ") recv msg from " + 
                    ip + ":" + port + "(" + proto + ")] " + "'" + node.info + "'");
                bytes.dump(buf, len);
            }
            if (node)  proc_node(channel, node, rsp);
            /// ƫ�Ƶ�ʣ������ݣ������´δ���
            var offset = rsp.offset;
            if (!offset || (len <= offset)) break;
            buf = bytes.shift(buf, len, offset);
            len = len - offset;
        }
        if (free) bytes.free(free);
    };

    /// ����ָ��ͨ�����д���
    proc_channel(o[ch]);
}


/**
 * ����ͨ�����ݸ�ʽ
 * @param {Number} ch ͨ��ID
 * @param {String} format ��ʽ
 */
function channel_format(ch, format) {
    var o = channel_all();
    var c = o[ch];

    if (typeof(format) == "undefined") {
        if (c) return c.format;
        return;
    }

    if (!c) o[ch] = {id:ch,format:format};
    else {c.format = format; c.id = ch;}
}


/**
 * ����ͨ�����͵Ⱥ���
 * @param {Function} send ���ͺ���
 *  sendԭ�ͣ�
 *      function send(ch, buf, len) { return rc; }
 */
function channel_func(send, ip, port, proto, type, connected) {
    var o = channel_all();

    if (typeof(send) == "undefined") {
        return {
            send: o.send,
            ip: o.ip,
            port: o.port,
            proto: o.proto,
            type: o.type,
            connected: o.connected
        };
    }

    o.send = send;
    o.ip = ip;
    o.port = port;
    o.proto = proto;
    o.type = type;
    o.connected = connected;
}


/**
 * ����ͨ��֪ͨ����
 * @param {Function} notify ֪ͨ����
 *  notifyԭ�ͣ�
 *      function notify(data, dump) { return rc; }
 */
function channel_notify(notify) {
    var o = channel_all();

    if (typeof(notify) == "undefined") {
        return o.notify;
    }

    o.notify = notify;
}


/**
 * ����ͨ���������ڵ�
 * @param {Number} ch ͨ��ID
 * @param {Object} node ����������
 *  node�ڵ�ĳ�Ա���£�
 *  node = {
 *      uuid: "uuid",                           // ���ʶ��
 *      info: "info",                           // �豸��Ϣ
 *      dump: "dump",                           // ���Ա�ʶ
 *      hard: {addr:1},                         // Ӳ������
 *      reqs: {addr:1,func:4,                   // �������
 *          reg:10001,count:2},
 *      rsps: ['data','x','y','z'],             // ��Ӧ����
 *      fixs: {type:'Y'},                       // �̶�����
 *      loop: 5,                                // ѭ�����
 *      proc: "function(data, rsp, node) {      // ������
 *          data.value = rsp.value / 10;
 *      }"
 *  }
 */
function channel_node(ch, node) {
    var o = channel_all();
    var c = o[ch];

    if (typeof(node) == "undefined") {
        if (c) return c.nodes;
        return;
    }

    if (!c) o[ch] = {id:ch,nodes:[node]};
    else if (!c.nodes) c.nodes = [node];
    else c.nodes.push(node);
}


/**
 * ͨ���ϱ�
 * @param {Object} node �ڵ����
 * @param {Object} rsp �ϱ�����Ӧ
 * @param {Function} notify �ϱ�����
 * @param {Object} data ��������
 */
function channel_report(node, rsp, notify, data) {
    notify = notify || channel_notify();
    if (!notify) return;
    node = node || {};
    rsp  = rsp  || {};
    data = data || {};
    if (node.uuid) data.uuid = node.uuid;
    if (node.info) data.info = node.info;
    if (node.dump) data.dump = node.dump;
    /// ��Ӧ���� (��������Ӧֵ�б���)
    var alls = true;
    var rsps = node.rsps;
    if (rsps) {
        for (var i in rsps) {
            var key = rsps[i];
            if (key in rsp) {
                data[key] = rsp[key];
                alls = false;
            }
        }
    }
    /// ȫ������ (û��ָ�����ֲ���)
    if (alls) {
        for (var i in rsp) {
            data[i] = rsp[i];
        }
    }
    /// �̶����� (ÿ����Ϊ�̶���Ӧֵ)
    var fixs = node.fixs;
    if (fixs) {
        for (var i in fixs) {
            data[i] = fixs[i];
        }
    }
    /// ���ýڵ��Լ��Ĵ��������н������
    var proc = node.proc;
    if (proc) {
        var r;
        if (typeof(proc) == "string") r = eval('(' + proc + ')(data, rsp, node);');
        else if (typeof(proc) == "function") r = (proc)(data, rsp, node);
        if (typeof(r) != "undefined") {
            if (!r) return;
            if (typeof(r) == "object") data = r;
        }
    }
    var dump_switch = channel_dump_switch();
    if (!dump_switch) dump_switch = "";
    var rc = notify(data, dump_switch);
    var dump = (data.dump)? data.dump : "";
    if (dump_switch && (dump_switch == "all" || dump_switch == dump)) {
        var info = (data.info)? data.info : "";
        if (dump_switch == "channel_report") print_obj_member(data, printlog, info);
        printlog(info + ' notify ret: ' + rc);
    }
}


/**
 * ͨ�����ݻ���
 */
var channel_buff_list = [];
function channel_buff(name, data) {
    if (typeof(name) == "undefined") {
        return channel_buff_list;
    }

    if (typeof(data) == "undefined") {
        return channel_buff_list[name];
    }

    channel_buff_list[name] = data;
    return channel_buff_list[name];
}


/**
 * ���ͨ��
 * @param {Number} ch ͨ��
 */
function channel_clear(ch) {
    var o = channel_all();

    if (ch) {
        if (ch in o) delete o[ch];
        return;
    }

    for (var ch in o) {
        delete o[ch];
    }
}


/**
 * ����ͨ��DUMP����
 * @param {String} dump_switch DUMP����ֵ
 */
function channel_dump_switch(dump_switch) {
    var o = channel_all();

    if (typeof(dump_switch) == "undefined") {
        return o.dump;
    }

    o.dump = dump_switch;
}


/**
 * DUMPͨ��
 */
function channel_dump() {
    var o = channel_all();
    print_obj_member(o, printlog, "channel list");
}



/**
 * ͨ��ȫ�ֶ�ʱ��
 */
var channel_timer = function() {
    if (!this.timer_add) return;
    
    /// ���1��ѭ����ʱ��
    return timer_add(function() {
        channel_send();
    }, 1000, true, 'channel send');
} ();



/**
 * ��ʼ��ʱ����
 */
(function() {
    var oninit = function() {
        if (typeof(dump_switch_command) != "undefined") {
            dump_switch_command("channel", channel_dump);
        }

        if (typeof(channel) != "undefined") {
            channel_func(channel.send, 
                channel.ip, 
                channel.port, 
                channel.proto, 
                channel.type, 
                channel.connected);
        }
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('channel', {oninit: oninit});
    }
}) ();

