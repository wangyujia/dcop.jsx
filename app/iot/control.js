/// js/app/iot/control.js
/**
 * 和数据中心建立控制通道、解析控制协议 (请求和响应)
 */



/**
 * 物联网获取控制信息 (接收请求，并返回响应)
 * 类型有"request","response","event","hello"
    "request": 
    {
        "type": "request",
        "command": "control-fengji",
        "arg": {
            "state": 1
        },
        "uuid": "asd-fengji-123",
        "info": "yyy",
        "index": 1,
        "time":1565600976273
    },
    "response":
    {
        "type": "response",
        "command": "control-fengji",
        "rc": "success",
        "data": {
            "state": 1
        }
        "uuid": "asd-fengji-123",
        "info": "yyy",
        "index": 1,
        "time":1565600976273
    },
    "event":
    {
        "type": "event",
        "name": "was-energy-status",
        "data": {
            "state": 1,
            "value_a": 0,
            "value_a": 0
        }
        "uuid": "asd-fengji-123",
        "info": "yyy",
        "index": 10,
        "time":1565600976273
    },
    "hello":
    {
        "type": "hello",
        "name": "xxx",
        "info": "yyy",
        "index": 10,
        "time":1565600976273
    }
 */


/**
 * 控制通道列表
 */
var control_channel_list = [];


/**
 * 控制通道设置
 * @param {Array<Number>} ch_list 通道ID列表
 *  ch_list基本示例：
 *  [1,2,3,4]
 */
function control_channels(ch_list) {
    if (!ch_list) return control_channel_list;
    for (var i in ch_list) {
        var ch = ch_list[i];
        if (!ch) continue;

        control_channel_list.push(ch);

        if (this.channel_format) {
            channel_format(ch, "control_pack");
        }
    }
}


/**
 * 控制命令列表
 *  结构示例：
 *  {
 *      control_xxx: {
 *          process: <Function>,
 *          result: <Function>,
 *          waittime: 3,
 *          loopindex: 0
 *      },
 *      control_yyy: {
 *          
 *      }
 *  }
 */
var control_command_list = {};


/**
 * 设置命令
 * @param {String} command 命令名称
 * @param {Object} o 命令对象
 *  o结构示例：
 *  {
 *      process:  function(o, data, dump_switch) {return true;}, // 处理命令函数
 *      result:   function(o, data, dump_switch) {return true;}, // 结果获取函数
 *      waittime: 3000 // 等待时间 (单位:毫秒)
 *  }
 */
function control_command(command, o) {
    if (typeof(o) == "undefined") {
        return control_command_list[command];
    }

    var node = control_command_list[command];
    if (!node) node = control_command_list[command] = {};
    node.process = o.process;
    node.result = o.result;
    node.waittime = o.waittime;
}


/**
 * 控制通道发送函数
 */
var control_channel_send = null;


/**
 * 设置控制通道发送函数
 */
function control_send(send) {
    if (typeof(send) == "undefined") {
        return control_channel_send;
    }

    control_channel_send = send;
}


/**
 * 处理命令
 * @param {Number} ch 通道ID
 * @param {String} ip IP
 * @param {Number} port 端口
 * @param {String} proto 协议
 * @param {Object} o 命令对象
 * @param {Object} data 响应对象
 * @param {String} dump_switch DUMP开关
 */
function control_process(ch, ip, port, proto, o, data, dump_switch) {
    if (!o) return false;
    var command = o.command;
    if (!command) return false;
    var node = control_command(command);
    if (!node) {
        data.error = "no '" + command + "' command";
        return false;
    }
    var process = node.process;
    if (!process) {
        data.error = "no '" + command + "' process";
        return false;
    }

    /// 响应结果上报函数 (如果无需响应，可把为o.respond置空)
    var result = node.result;
    var respond = function(r) {
        if (result) r = result(o, data, dump_switch);
        if (!r && !data.error) data.error = "'" + command + "' respond fail";
        if (o.respond) {
            control_pack_send(ch, ip, port, proto, o, 
                "response", (r)?"success":"failure", data, dump_switch);
            o.respond = null;
        }
        return r;
    };

    /// 进行处理，失败后立刻返回
    o.respond = respond;
    var r = process(o, data, dump_switch);
    if (!r) {
        if (!data.error) data.error = "process '" + command + "' fail";
        o.respond = null;
        return false;
    }

    /// 无需等待，直接响应结果
    var waittime = node.waittime;
    if (!waittime) waittime = o.waittime;
    if (!waittime || typeof(timer_add) == "undefined") {
        return respond(true);
    }

    /// 延时后响应结果
    var timer = timer_add(function() {
        respond(true);
    }, waittime);

    return true;
}


/**
 * PACK方式发送
 * @param {Number} ch 通道ID
 * @param {String} ip IP
 * @param {Number} port 端口
 * @param {String} proto 协议
 * @param {Object} o 命令对象
 * @param {String} rc "success"|"failure"
 * @param {Object} data 响应对象
 * @param {String} dump_switch DUMP开关
 */
function control_pack_send(ch, ip, port, proto, o, type, rc, data, dump_switch) {
    if (!type) return;
    var pack = {type:type};
    if (o && o.command) pack.command = o.command;
    if (o && o.name) pack.name = o.name;
    if (o && o.info) pack.info = o.info;
    if (o && o.devices) pack.devices = o.devices;
    if (rc) pack.rc = rc;
    if (data) pack.data = data;
    if (o && o.index) pack.index = o.index;
    if (o && o.arg && o.arg.uuid) {
        if (!pack.data) pack.data = {};
        pack.data.uuid = o.arg.uuid;
    }

    pack.time = new Date().getTime();
    var s = Duktape.enc('jc', pack);
    var send = control_send();
    if (!send) send = channel.send;
    var r = (ip)? send(ch, ip, port, proto, s) : send(ch, s);
    var dump = (o.dump)? o.dump : "";
    if (dump_switch && (dump_switch == "all" || 
        dump_switch == "control_send" || dump_switch == dump)) {
        printlog(s + " send[ch:" + ch + "] control '" + type + "' ret: " + r);
    }
    return r;
}


/**
 * PACK方式接收
 * @param {Pointer} buf 缓冲区指针
 * @param {number} len 缓冲区长度
 * @param {Function} extra_buf_save 额外数据保存函数
 * @param {Object} ch_recv_para 通道接收参数
 *  ch_recv_para: {
 *      ch: {Number} 通道ID
 *      ip: {String} IP
 *      port: {Number} 端口
 *      proto: {String} 协议
 *      ack: {Function} 应答函数 function(rsp)
 *      dump: {String} DUMP开关
 *  }
 */
function control_pack_recv(buf, len, extra_buf_save, ch_recv_para) {
    var ch = ch_recv_para.ch;
    var ip = ch_recv_para.ip;
    var port = ch_recv_para.port;
    var proto = ch_recv_para.proto;
    var dump_switch = ch_recv_para.dump;

    var s = bytes.str(buf, len);
    if ((dump_switch == "all") || (dump_switch == "control_recv") || 
        (dump_switch && bytes.find(buf, len, 0, '"dump":"' + dump_switch + '"') >= 0) || 
        (dump_switch && bytes.find(buf, len, 0, '\\"dump\\":\\"' + dump_switch + '\\"') >= 0)) {
        printlog("'" + s + "' control recved! [from channel(" + ch + ') ' + 
            ip + ':' + port + '(' + proto + ')]');
    }

    var o = Duktape.dec('jc', s);
    if (!o) return;
    if (o.type == "request") {
        var data = {};
        var r = control_process(ch, ip, port, proto, o, data, dump_switch);
        if (!r) {
            if (!data.error) data.error = "unkown reason fail";
            control_pack_send(ch, ip, port, proto, o, 
                "response", "failure", data, dump_switch);
        }
    }
}


/**
 * dump控制信息
 */
function control_dump() {
    print_obj_member(control_channel_list, printlog, "control channel list");
    print_obj_member(control_command_list, printlog, "control command list");
}


/**
 * 初始化时给通道设置协议格式
 */
(function() {
    var index = 0;
    var hello = function() {
        var dump_switch = (typeof(channel_dump_switch) != "undefined")? channel_dump_switch() : "";
        for (var i in control_channel_list) {
            var ch = control_channel_list[i];
            if (!ch) continue;
            var o = {index:index,dump:'hello'};
            if (typeof(config_system) != "undefined") {
                if (config_system.name) o.name = config_system.name;
                if (config_system.info) o.info = config_system.info;
                if (config_system.devices) o.devices = config_system.devices;
            }
            control_pack_send(ch, null, null, null, o, 
                "hello", null, null, dump_switch);
        }
        index++;
    };

    var oninit = function() {
        if (typeof(dump_switch_command) != "undefined") {
            dump_switch_command("control", control_dump);
        }
    
        if (typeof(format_rsp) != "undefined") {
            format_rsp('control_pack', control_pack_recv);
        }

        hello();

        if (typeof(timer_add) != "undefined") {
            var timer = timer_add(function() {
                hello();
            }, 5000, true, 'hello');
        }
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('control', {oninit: oninit});
    }
}) ();


