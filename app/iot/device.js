/// js/app/iot/device.js
/**
 * 管理物联网设备类型
 */



/**
 * 1）设置设备对应的类型的创建器
 * 2）根据设备配置创建对应的设备对象，
 *      如果创建设备对象成功，则将新的设备对象保存到设备列表中
 *      如果没有创建设备对象，则将原有设备配置保存到设备列表中
 */



/**
 * 设备类型列表
 */
var device_type_list = {};

/**
 * 和设备列表
 */
var device_list = [];



/**
 * 添加或者获取设备类型
 * @param {String} type 设备类型名
 * @param {Object} creator 设备类型值
 */
function device_type(type, creator) {
    if (typeof(type) == "undefined") {
        return device_type_list;
    }

    /// 返回设备类型列表
    if (typeof(creator) == "undefined") {
        return device_type_list[type];
    }

    /// 添加设备类型
    device_type_list[type] = creator;
    return device_type_list[type];
}


/**
 * 添加或者获取设备
 * @param {Object} node 设备节点
 */
function device_node(node) {
    if (typeof(node) == "undefined") {
        return device_list;
    }

    /// 创建设备对象
    var object;
    if (node.device) {
        var creator = device_type(node.device);
        if (creator) {
            object = creator(node);
        }
    }

    /// 添加设备对象
    node = object || node;
    device_list.push(node);
    return node;
}


/**
 * 设备配置命令
 * @param {Object} o 命令对象: {
        command: "device-config",
        arg: {
            uuid: "XXXX-YYYY-0001",     // 设备uuid
            device: ...,                // 设备配置
            ...: ...                    // ...
        }
 * @param {Object} data 响应对象
 * @param {String} dump_switch DUMP开关
 */
function device_config(o, data, dump_switch) {
    if (dump_switch == "all" || dump_switch == "device_config") {
        print_obj_member(o, printlog, 'device_config');
    }

    /// 检查参数
    if (!o || !o.arg) {
        data.error = "device config command arg error";
        return false;
    }

    /// 获取UUID
    var uuid = (o.uuid)? o.uuid : o.arg.uuid;
    if (!uuid) {
        data.error = "device config command uuid error";
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
        data.error = "device config command no uuid's device";
        return false;
    }

    /// 保存配置到设备节点中
    node.config = o.arg;
    return true;
}


/**
 * 设备控制等待数据
 * @param {Object} data 要处理的数据
 * @param {Object} rsp 设备的响应
 * @param {Object} node 设备节点
 */
function device_control_wait(data, rsp, node) {
    var wait = node.wait;
    if (!wait) return;
    var r = wait(data);
    if (r) {
        node.wait = null;
        node.proc = null;
        node.loop = 10;
    }
}


/**
 * 设备控制命令请求
 * @param {Object} o 命令对象: {
        command: "device-control",
        arg: {
            uuid: "XXXX-YYYY-0001",     // 设备uuid
            state: ...,                 // 设备状态 (见设备配置项)
            wait: 2000                  // 等待时间
        }
 * @param {Object} data 响应对象
 * @param {String} dump_switch DUMP开关
 */
function device_control_proc(o, data, dump_switch) {
    if (dump_switch == "all" || dump_switch == "device_control") {
        print_obj_member(o, printlog, 'device_control');
    }

    /// 检查参数
    if (!o || !o.arg) {
        data.error = "device control command arg error";
        return false;
    }

    /// 获取UUID
    var uuid = (o.uuid)? o.uuid : o.arg.uuid;
    if (!uuid) {
        data.error = "device control command uuid error";
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
    var state = (typeof(o.arg.state) == "undefined")? '' : o.arg.state;
    if (!node || !node.ctrl) {
        data.error = "device control command no uuid's device";
        return false;
    }
    var para = node.ctrl[state];
    if (!para) para = node.ctrl[''];
    if (!para) {
        data.error = "device control command no ctrl's device";
        return false;
    }

    /// 发送指令
    var func = channel_func();
    var ch = node.chid;
    var format = channel_format(ch);
    var req = format_req(format);
    var ctrl = function() {
        var r = false;
        var ins = req(para);
        if (!ins || !func || !func.send) {
            r = false;
            data.error = "device control command no req ins";
        } else {
            r = func.send(ch, ins.buf, ins.len);
            if (!r) data.error = "device control command send error";
        }
        if (dump_switch && (dump_switch == "all" || dump_switch == "device_control" || 
            dump_switch == node.dump)) {
            bytes.dump(ins.buf, ins.len);
            printlog("[channel(" + ch + ") send ctrl to " + 
                func.ip(ch) + ":" + func.port(ch) + "(" + func.proto(ch) + ")] " + 
                "'" + node.info + "' ret: " + r + 
                ((data.error)? ('(' + data.error + ')'):''));
        }
        return r;
    };

    /// 根据等待时间进行延时
    var delay = o.arg.wait;
    if (!delay) delay = para.wait;
    if (!delay && (!para.pulse || !para.pulse.length)) {
        return ctrl();
    }

    /// 脉冲发送
    if (node.wait) {
        data.error = "device control command has been waitting";
        return false;
    }
    var respond = o.respond;
    var wait = function() {
        var check = function(data) {
            if (!data) return false;
            var proc = para.check;
            if (!proc) return (state == data.value)? true : false;
            var r;
            if (typeof(proc) == "string") r = eval('(' + proc + ')(data);');
            else if (typeof(proc) == "function") r = (proc)(data);
            if (typeof(r) != "undefined") return (r)? true : false;
            return false;
        };
        var index = 0;
        return function(data, nowait) {
            index++;
            var r = check(data);
            if (dump_switch && (dump_switch == "all" || dump_switch == "device_control" || 
                dump_switch == node.dump)) {
                printlog("device_control[ch:" + ch + "] wait index:" + index + " check:" + r);
            }
            if (r || nowait) { respond(r); return true; }
            if (index >= 3)  { respond(r); return true; }
            return false;
        };
    };
    node.wait = wait();
    o.waittime = (delay)? delay : 5000;
    timer_add(function() {
        if (dump_switch && (dump_switch == "all" || dump_switch == "device_control" || 
            dump_switch == node.dump)) {
            printlog("device_control[ch:" + ch + "] timer_proc count:" + this.count);
        }
        var i = this.count - 1;
        var t = (delay)? delay : 5000;
        if (i < para.pulse.length) {
            var pulse = para.pulse[i];
            para[pulse.arg] = pulse.val;
            t = pulse.time;
            if (!t) t = 0;
            if (!t && i < (para.pulse.length - 1)) t = 1000;
            var r = ctrl();
            if (!r) t = 0;
            else if (i == (para.pulse.length - 1) && para.check) {
                t += (delay)? delay : 1000;
                node.loop_bak = node.loop;
                node.proc = device_control_wait;
                node.loop = 1;
            }
        }
        // else if (node.wait) {
        //     wait(null, true);
        //     node.wait = null;
        //     node.proc = null;
        //     node.loop = node.loop_bak;
        // }
        if (i >= (para.pulse.length + 1)) t = 0;
        if (!t && node.wait && !para.check) {
            wait(null, true);
            node.wait = null;
            node.proc = null;
            node.loop = node.loop_bak;
        }
        if (dump_switch && (dump_switch == "all" || dump_switch == "device_control" || 
            dump_switch == node.dump)) {
            printlog("node.wai:" + node.wait, "para.check:" + para.check);
            printlog("device_control[ch:" + ch + "] timer_proc index:" + i + " time:" + t);
        }
        return t;
    }, 1000);

    if (dump_switch && (dump_switch == "all" || dump_switch == "device_control" || 
        dump_switch == node.dump)) {
        printlog("device_control[ch:" + ch + "] timer_add");
    }

    return true;
}


/**
 * dump设备信息
 */
function device_type_dump() {
    print_obj_member(device_type_list, printlog, "device type list");
}
function device_dump() {
    print_obj_member(device_list, printlog, "device list");
}



/**
 * 初始化时加载
 */
(function() {
    var oninit = function() {
        if (typeof(dump_switch_command) != "undefined") {
            dump_switch_command("device_type", device_type_dump);
            dump_switch_command("device", device_dump);
        }
        if (typeof(control_command) != "undefined") {
            control_command('device-config', {
                process: device_config
            });
            control_command('device-control', {
                process: device_control_proc
            });
        }
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('device', {oninit: oninit});
    }
}) ();
