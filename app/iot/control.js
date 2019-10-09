/// js/app/iot/control.js
/**
 * ���������Ľ�������ͨ������������Э�� (�������Ӧ)
 */



/**
 * ��������ȡ������Ϣ (�������󣬲�������Ӧ)
 * ������"request","response","event","hello"
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
 * ����ͨ���б�
 */
var control_channel_list = [];


/**
 * ����ͨ������
 * @param {Array<Number>} ch_list ͨ��ID�б�
 *  ch_list����ʾ����
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
 * ���������б�
 *  �ṹʾ����
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
 * ��������
 * @param {String} command ��������
 * @param {Object} o �������
 *  o�ṹʾ����
 *  {
 *      process:  function(o, data, dump_switch) {return true;}, // ���������
 *      result:   function(o, data, dump_switch) {return true;}, // �����ȡ����
 *      waittime: 3000 // �ȴ�ʱ�� (��λ:����)
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
 * ����ͨ�����ͺ���
 */
var control_channel_send = null;


/**
 * ���ÿ���ͨ�����ͺ���
 */
function control_send(send) {
    if (typeof(send) == "undefined") {
        return control_channel_send;
    }

    control_channel_send = send;
}


/**
 * ��������
 * @param {Number} ch ͨ��ID
 * @param {String} ip IP
 * @param {Number} port �˿�
 * @param {String} proto Э��
 * @param {Object} o �������
 * @param {Object} data ��Ӧ����
 * @param {String} dump_switch DUMP����
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

    /// ��Ӧ����ϱ����� (���������Ӧ���ɰ�Ϊo.respond�ÿ�)
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

    /// ���д���ʧ�ܺ����̷���
    o.respond = respond;
    var r = process(o, data, dump_switch);
    if (!r) {
        if (!data.error) data.error = "process '" + command + "' fail";
        o.respond = null;
        return false;
    }

    /// ����ȴ���ֱ����Ӧ���
    var waittime = node.waittime;
    if (!waittime) waittime = o.waittime;
    if (!waittime || typeof(timer_add) == "undefined") {
        return respond(true);
    }

    /// ��ʱ����Ӧ���
    var timer = timer_add(function() {
        respond(true);
    }, waittime);

    return true;
}


/**
 * PACK��ʽ����
 * @param {Number} ch ͨ��ID
 * @param {String} ip IP
 * @param {Number} port �˿�
 * @param {String} proto Э��
 * @param {Object} o �������
 * @param {String} rc "success"|"failure"
 * @param {Object} data ��Ӧ����
 * @param {String} dump_switch DUMP����
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
 * dump������Ϣ
 */
function control_dump() {
    print_obj_member(control_channel_list, printlog, "control channel list");
    print_obj_member(control_command_list, printlog, "control command list");
}


/**
 * ��ʼ��ʱ��ͨ������Э���ʽ
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


