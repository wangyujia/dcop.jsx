/// js/app/iot/device.js
/**
 * �����������豸����
 */



/**
 * 1�������豸��Ӧ�����͵Ĵ�����
 * 2�������豸���ô�����Ӧ���豸����
 *      ��������豸����ɹ������µ��豸���󱣴浽�豸�б���
 *      ���û�д����豸������ԭ���豸���ñ��浽�豸�б���
 */



/**
 * �豸�����б�
 */
var device_type_list = {};

/**
 * ���豸�б�
 */
var device_list = [];



/**
 * ��ӻ��߻�ȡ�豸����
 * @param {String} type �豸������
 * @param {Object} creator �豸����ֵ
 */
function device_type(type, creator) {
    if (typeof(type) == "undefined") {
        return device_type_list;
    }

    /// �����豸�����б�
    if (typeof(creator) == "undefined") {
        return device_type_list[type];
    }

    /// ����豸����
    device_type_list[type] = creator;
    return device_type_list[type];
}


/**
 * ��ӻ��߻�ȡ�豸
 * @param {Object} node �豸�ڵ�
 */
function device_node(node) {
    if (typeof(node) == "undefined") {
        return device_list;
    }

    /// �����豸����
    var object;
    if (node.device) {
        var creator = device_type(node.device);
        if (creator) {
            object = creator(node);
        }
    }

    /// ����豸����
    node = object || node;
    device_list.push(node);
    return node;
}


/**
 * �豸��������
 * @param {Object} o �������: {
        command: "device-config",
        arg: {
            uuid: "XXXX-YYYY-0001",     // �豸uuid
            device: ...,                // �豸����
            ...: ...                    // ...
        }
 * @param {Object} data ��Ӧ����
 * @param {String} dump_switch DUMP����
 */
function device_config(o, data, dump_switch) {
    if (dump_switch == "all" || dump_switch == "device_config") {
        print_obj_member(o, printlog, 'device_config');
    }

    /// ������
    if (!o || !o.arg) {
        data.error = "device config command arg error";
        return false;
    }

    /// ��ȡUUID
    var uuid = (o.uuid)? o.uuid : o.arg.uuid;
    if (!uuid) {
        data.error = "device config command uuid error";
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
        data.error = "device config command no uuid's device";
        return false;
    }

    /// �������õ��豸�ڵ���
    node.config = o.arg;
    return true;
}


/**
 * �豸���Ƶȴ�����
 * @param {Object} data Ҫ���������
 * @param {Object} rsp �豸����Ӧ
 * @param {Object} node �豸�ڵ�
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
 * �豸������������
 * @param {Object} o �������: {
        command: "device-control",
        arg: {
            uuid: "XXXX-YYYY-0001",     // �豸uuid
            state: ...,                 // �豸״̬ (���豸������)
            wait: 2000                  // �ȴ�ʱ��
        }
 * @param {Object} data ��Ӧ����
 * @param {String} dump_switch DUMP����
 */
function device_control_proc(o, data, dump_switch) {
    if (dump_switch == "all" || dump_switch == "device_control") {
        print_obj_member(o, printlog, 'device_control');
    }

    /// ������
    if (!o || !o.arg) {
        data.error = "device control command arg error";
        return false;
    }

    /// ��ȡUUID
    var uuid = (o.uuid)? o.uuid : o.arg.uuid;
    if (!uuid) {
        data.error = "device control command uuid error";
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

    /// ����ָ��
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

    /// ���ݵȴ�ʱ�������ʱ
    var delay = o.arg.wait;
    if (!delay) delay = para.wait;
    if (!delay && (!para.pulse || !para.pulse.length)) {
        return ctrl();
    }

    /// ���巢��
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
 * dump�豸��Ϣ
 */
function device_type_dump() {
    print_obj_member(device_type_list, printlog, "device type list");
}
function device_dump() {
    print_obj_member(device_list, printlog, "device list");
}



/**
 * ��ʼ��ʱ����
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
