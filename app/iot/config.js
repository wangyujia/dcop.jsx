/// js/app/iot/config.js
/**
 * �������������غͽ�����Ե���豸�������
 */



/**
 * ��������ȡ������Ϣ
 */
/// ... (��������ͬ��) 



/**
 * ϵͳ����
 */
var config_system = {};


/**
 * ����ͨ���б�
 */
var config_channel_list = {};


/**
 * ��ȡ���ö���
 * @param {Object} o ���ö���
 */
function config_read(o) {
    if (!o) return;

    /// ��ȡϵͳ��Ϣ
    var sys_info = o.system;
    if (sys_info) config_system = sys_info;

    /// ���ͨ������
    var ch_list = o.channels || o.channel;
    if (ch_list && typeof(channel) != "undefined") {
        for (var i in ch_list) {
            var node = ch_list[i];
            if (!node) continue;
            var name = node.name;
            if (!name) continue;
            if (config_channel_list[name]) continue;
            var ch = channel.add(node);
            config_channel_list[name] = {ch:ch};
            var format = node.format;
            if (format && typeof(channel_format) != "undefined") {
                channel_format(ch, format);
            }
        }
    }

    /// ����豸����
    var dev_list = o.devices || o.device;
    if (dev_list) {
        for (var i in dev_list) {
            var node = dev_list[i];
            if (!node) continue;

            /// ��ӵ��豸�б�
            if (typeof(device_node) != "undefined") {
                device_node(node);
            }

            /// ����ͨѶͨ��ID
            var ch = node.channel;
            if (!ch || typeof(channel_node) == "undefined") continue;
            if (typeof(ch) == "string") {
                var ch_node = config_channel_list[ch];
                if (!ch_node) continue;
                ch = ch_node.ch;
            }
            channel_node(ch, node);
            node.chid = ch;

            /// �ռ��豸uuid��ϵͳ�豸�б���
            if (node.fixs && node.fixs.uuid) {
                var config_devices = config_system.devices;
                if (!config_devices) config_devices = config_system.devices = [];
                config_devices.push(node.fixs.uuid);
            }
        }
    }
}


/**
 * dump������Ϣ
 */
function config_dump() {
    print_obj_member(config_system, printlog, "config system");
    print_obj_member(config_channel_list, printlog, "config list");
}



/**
 * ��������
 * @param {String} path �����ļ�·��
 */
function config_load(path) {
    if (!this.files) return;

    var src = 'iot.edge.config.json';
    var len = files.size(src);
    if (!len) return;
    var buf = bytes.alloc(len);
    files.load(src, buf, len);
    var s = bytes.str(buf, len);
    var o = Duktape.dec('jc', s);
    if (o) config_read(o);
    bytes.free(buf);
}



/**
 * ��ʼ��ʱ����
 */
(function() {
    var oninit = function() {
        if (typeof(dump_switch_command) != "undefined") {
            dump_switch_command("config", config_dump);
        }
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('config', {oninit: oninit});
    }
}) ();


