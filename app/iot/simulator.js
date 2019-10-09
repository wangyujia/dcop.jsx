/// js/app/iot/simulator.js
/**
 * ģ���豸����
 */



/**
 * ģ����ͨ���б�
 */
var simulator_channel_list = {};
var simulator_channel_last = 0;


/**
 * ģ��������
 * @param {Array} args �����ҵ�����
 * @param {String} str ��Ҫ�ҵ����ַ���
 */
function simulator_args_find(args, str) {
    for (var i in args) {
        if (str == args[i]) return parseInt(i);
    }
}

/**
 * ģ�������ͨ������
 * @param {Array} args ��ӵ�ͨ���ڵ�����б�
 * @param {Object} node ��ӵ�ͨ���ڵ����
 * @param {String} type ��ӵ�ͨ����������
 * @param {String} name ��ӵ�ͨ����������
 * @param {Boolean} value ��ӵ�ͨ������ֵ
 */
function simulator_channel_config(args, node, type, name, value) {
    var find = function(n) {
        var r = simulator_args_find(args, n);
        if (typeof(r) != "undefined") {
            if (value) {
                node[type] = args[r+1];
            } else {
                node[type] = n;
            }
            return r;
        }
    };

    if (Object.prototype.toString.call(name) == "[object Array]") {
        for (var i in name) {
            var n = name[i];
            var r = find(n);
            if (typeof(r) != "undefined") {
                return true;
            }
        }
    } else {
        var r = find(name);
        if (typeof(r) != "undefined") {
            return true;
        }
    }
}

/**
 * ģ�������ͨ��
 * @param {Array} args ��ӵ�ͨ���ڵ�����б�
 */
function simulator_channel_add(args) {
    var id = simulator_channel_last+1;
    var node = {
        "name": "simu"+id,
        "info": "lato"+id,
        "autohello": false,
        "autocheck": false
    };

    if (!simulator_channel_config(args, node, "type", ["local", "remote"])) {
        printlog('simulator_channel_add get "type" config failed!');
        return;
    }

    if (!simulator_channel_config(args, node, "sock", ["tcp", "udp"])) {
        printlog('simulator_channel_add get "sock" config failed!');
        return;
    }

    if (node.type == "remote") {
        if (!simulator_channel_config(args, node, "addr", "addr", true)) {
            printlog('simulator_channel_add get "addr" config failed!');
            return;
        }
    }

    if (!simulator_channel_config(args, node, "port", "port", true)) {
        printlog('simulator_channel_add get "port" config failed!');
        return;
    }

    var ch = channel.add(node);
    if (this.channel_format) channel_format(ch, "simulator");
    simulator_channel_last++;
    simulator_channel_list[id] = {ch:ch,node:node};
    printlog('simulator_channel_add ch:' + ch + ' id:' + id);
    print_obj_member(node, printlog, "simulator_channel_add node");
}


/**
 * ģ����ɾ��ͨ��
 * @param {Array} args ��ӵ�ͨ���ڵ�����б�
 */
function simulator_channel_del(id) {
    var sim = simulator_channel_list[id];
    if (!sim) return;
    channel.del(sim.id);
    if (this.channel_clear) channel_clear(sim.id);
    delete simulator_channel_list[id];
}


/**
 * ģ������Ϣ��Ӧ
 * @param {Pointer} buf ��������ַ
 * @param {Number} len ����������
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
function simulator_channel_recv(buf, len, extra_buf_save, ch_recv_para) {
    bytes.dump(buf, len);
    printlog('simulator_channel_recv from ch[' + ch_recv_para.ch + ']');
}


/**
 * dumpģ������Ϣ
   dump-iot.edge:sim,add,remote,tcp,addr=127.0.0.1,port=8151
 */
function simulator_channel_dump(arglist) {
    if (!arglist || !arglist.length) {
        print_obj_member(simulator_channel_list, printlog, "simulator channel list");
        return;
    }

    if (arglist.length && arglist[0] == 'add') {
        simulator_channel_add(arglist.slice(1));
    }
    else if (arglist.length && arglist[0] == 'del') {
        simulator_channel_del(arglist.slice(1));
    }
}


/**
 * ��ʼ��ʱ���ؾ�̬����
 */
(function() {
    var oninit = function() {
        if (typeof(dump_switch_command) != "undefined") {
            dump_switch_command("simulator", simulator_channel_dump);
            dump_switch_command("sim", simulator_channel_dump);
        }
        if (typeof(format_rsp) != "undefined") {
            format_rsp('simulator', simulator_channel_recv);
        }
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('simulator', {oninit: oninit});
    }
}) ();


