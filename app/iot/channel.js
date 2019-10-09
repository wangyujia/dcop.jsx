/// js/app/iot/channel.js
/**
 * 管理物联网通信通道 (包括：与数据中心的对接协议、与边缘侧设备的对接协议)
 */



/**
 * 物联网注册通道信息说明
 * 1. 设置通道函数接口 - channel_func (不分通道,在通道发送时会调用)
 * 2. 设置通道上报接口 - channel_notify (不分通道,在通道接收时会调用)
 * 3. 注册通道数据格式 - channel_format (分通道,每通道设置一次)
 * 4. 注册通道节点信息 - channel_node (分通道,多个节点)
 * 5. 定时调用通道发送 - channel_send (不分通道,定时器中自己回调用,只需要启动定时器)
 * 6. 有数据时调用接收 - channel_recv (分通道,需要在通道接收中调用)
 * 7. 设置通道调试开关 - channel_dump_switch (不分通道,需要在dump开关事件中调用)
 * 8. 打印通道调试信息 - channel_dump (一次性打印所有通道)
 */



/**
 * [定时发送采集指令]
 * 
 *      +------------+            +--------------+
 *      | timer proc | ---------> | channel send | ----> + [循环需要发送请求的通道]
 *      +------------+            +----+----+----+       |
 *                                |    |    |            |
 *                                |    |    |    + <-----+
 *                      +---------+    |    |    |
 *                      | collect | <--+    |    |       +------------+
 *                      +---------+         |    +-----> | format req |
 *                                |         |            +------------+
 *                                |         |            |
 *                                |         + <----------+ [通过format_req获取的指令函数处理结果后由通道采集发送]
 *      +-------------+           |
 *      | socket send | <---------+
 *      +-------------+     
 * 
 * 
 * 
 * [从网络通道中获取到数据]
 *                                               [从缓冲区获取之前缓冲的数据]
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
 *                         +------+    |    |            +------------+ [把处理剩下的数据放入缓冲区]
 *                                |    |    |            |
 *                                |    |    + <--------- + [通过format_rsp获取的解析函数处理结果后由通道接收上报]
 *      +-------------+           |    |                 |
 *      | socket send | <---------+    + <---------------+ [也可自己主动调用ack函数进行上报]
 *      +-------------+
 *      [从上报通道发送]
 * 
 * 
 * 
 * [各个IOT边缘协议模块设置指令函数和解析函数]
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
 * 通道全局列表
 */
var channel_all = function() {
    var all = {};

    return function() {
        return all;
    };
} ();



/**
 * 发送通道采集指令
 */
function channel_send() {
    var o = channel_all();
    /// 处理设备 (下发采集数据)
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
    /// 处理通道
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

    /// 轮询所有通道进行处理
    for (var ch in o) {
        var channel = o[ch];
        proc_channel(channel);
    }
}


/**
 * 接收通道缓冲区数据
 * @param {Number} ch 通道ID
 * @param {String} ip IP
 * @param {Number} port 端口
 * @param {String} proto 协议
 * @param {Pointer} buf 缓冲区指针
 * @param {number} len 缓冲区长度
 */
function channel_recv(ch, ip, port, proto, buf, len) {
    var o = channel_all();
    if (o.dump == "all" || o.dump == "channel_recv") {
        printlog("[channel(" + ch + ") recv msg from " + 
            ip + ":" + port + "(" + proto + ")] ");
        bytes.dump(buf, len);
    }
    /// 处理节点 (上报响应数据)
    var proc_node = function(channel, node, rsp) {
        if (!channel || !node || !rsp) return;
        var notify = node.notify;
        if (!notify) notify = channel.notify;
        if (node.list && node.list.length) {
            /// node.list为多个响应节点
            for (var i = 0; i < node.list.length; ++i) {
                channel_report(node.list[i], rsp, notify, {
                    "channel": ch, 
                    "ip": ip, 
                    "port": port, 
                    "proto": proto
                });
            }
        } else {
            /// node为单个响应节点
            channel_report(node, rsp, notify, {
                "channel": ch, 
                "ip": ip, 
                "port": port, 
                "proto": proto
            });
        }
    };
    /// 查找设备 (根据响应结果)
    var find_node = function(channel, rsp) {
        if (!channel) return;
        var list = channel.nodes;
        if (!list) return;
        var first = null;
        for (var i in list) {
            var node = list[i];
            /// 先记录下第一个，没有找到的话，直接返回第一个
            if (!first) first = node;
            var hard = node.hard;
            if (!hard) continue;
            var title = null;
            var value = null;
            /// 根据硬件参数查找对应的节点 (目前只支持设定一个参数)
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
    /// 处理通道
    var proc_channel = function(channel) {
        if (!channel) return;
        var format = channel.format;
        if (!format) return;
        var parser = format_rsp(format);
        if (o.dump == "all") {
            printlog("get parser:" + parser + " from format:" + format);
        }
        if (!parser) return;

        /// 获取上一次接收剩余的缓存 (append会释放之前的内存)
        var free = null;
        var cache = channel.cache;
        if (cache && cache.buf && cache.len && !bytes.zero(cache.buf)) {
            buf = bytes.append(cache.buf, cache.len, buf, len);
            len = cache.len + len;
            cache.buf = bytes.zero();
            cache.len = 0;
            free = buf;
        }

        /// 上报当前响应 (未处理成响应的数据会送给设置的回调)
        var ack = function(rsp) {
            var node = find_node(channel, rsp);
            if (node)  proc_node(channel, node, rsp);
            return node;
        };
        var rsp = null;
        while (rsp = parser(buf, len, function(buf, len) {
            /// 给解析函数的剩余数据处理函数
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
            /// 给解析函数的通道参数
            ch:ch, ip:ip, port:port, proto:proto, find:function(rsp) {
                return find_node(channel, rsp);
            }, ack:ack, dump:o.dump
        })) {
            /// 根据响应结果，查找设备节点，并处理
            var node = find_node(channel, rsp);
            if (node && node.dump == o.dump) {
                printlog("[channel(" + ch + ") recv msg from " + 
                    ip + ":" + port + "(" + proto + ")] " + "'" + node.info + "'");
                bytes.dump(buf, len);
            }
            if (node)  proc_node(channel, node, rsp);
            /// 偏移到剩余的数据，继续下次处理
            var offset = rsp.offset;
            if (!offset || (len <= offset)) break;
            buf = bytes.shift(buf, len, offset);
            len = len - offset;
        }
        if (free) bytes.free(free);
    };

    /// 根据指定通道进行处理
    proc_channel(o[ch]);
}


/**
 * 设置通道数据格式
 * @param {Number} ch 通道ID
 * @param {String} format 格式
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
 * 设置通道发送等函数
 * @param {Function} send 发送函数
 *  send原型：
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
 * 设置通道通知函数
 * @param {Function} notify 通知函数
 *  notify原型：
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
 * 设置通道传感器节点
 * @param {Number} ch 通道ID
 * @param {Object} node 传感器对象
 *  node节点的成员如下：
 *  node = {
 *      uuid: "uuid",                           // 身份识别
 *      info: "info",                           // 设备信息
 *      dump: "dump",                           // 调试标识
 *      hard: {addr:1},                         // 硬件号码
 *      reqs: {addr:1,func:4,                   // 请求参数
 *          reg:10001,count:2},
 *      rsps: ['data','x','y','z'],             // 响应参数
 *      fixs: {type:'Y'},                       // 固定参数
 *      loop: 5,                                // 循环间隔
 *      proc: "function(data, rsp, node) {      // 处理函数
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
 * 通道上报
 * @param {Object} node 节点对象
 * @param {Object} rsp 上报的响应
 * @param {Function} notify 上报函数
 * @param {Object} data 已有数据
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
    /// 响应参数 (必须在响应值列表中)
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
    /// 全部参数 (没有指定部分参数)
    if (alls) {
        for (var i in rsp) {
            data[i] = rsp[i];
        }
    }
    /// 固定参数 (每次作为固定响应值)
    var fixs = node.fixs;
    if (fixs) {
        for (var i in fixs) {
            data[i] = fixs[i];
        }
    }
    /// 调用节点自己的处理函数进行结果计算
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
 * 通道数据缓冲
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
 * 清除通道
 * @param {Number} ch 通道
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
 * 设置通道DUMP开关
 * @param {String} dump_switch DUMP开关值
 */
function channel_dump_switch(dump_switch) {
    var o = channel_all();

    if (typeof(dump_switch) == "undefined") {
        return o.dump;
    }

    o.dump = dump_switch;
}


/**
 * DUMP通道
 */
function channel_dump() {
    var o = channel_all();
    print_obj_member(o, printlog, "channel list");
}



/**
 * 通道全局定时器
 */
var channel_timer = function() {
    if (!this.timer_add) return;
    
    /// 添加1秒循环定时器
    return timer_add(function() {
        channel_send();
    }, 1000, true, 'channel send');
} ();



/**
 * 初始化时加载
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

