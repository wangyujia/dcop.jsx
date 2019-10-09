/// js/app/iot/config.js
/**
 * 从配置中心下载和解析边缘侧设备相关配置
 */



/**
 * 物联网获取配置信息
 */
/// ... (联网配置同步) 



/**
 * 系统配置
 */
var config_system = {};


/**
 * 配置通道列表
 */
var config_channel_list = {};


/**
 * 读取配置对象
 * @param {Object} o 配置对象
 */
function config_read(o) {
    if (!o) return;

    /// 读取系统信息
    var sys_info = o.system;
    if (sys_info) config_system = sys_info;

    /// 添加通道配置
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

    /// 添加设备配置
    var dev_list = o.devices || o.device;
    if (dev_list) {
        for (var i in dev_list) {
            var node = dev_list[i];
            if (!node) continue;

            /// 添加到设备列表
            if (typeof(device_node) != "undefined") {
                device_node(node);
            }

            /// 设置通讯通道ID
            var ch = node.channel;
            if (!ch || typeof(channel_node) == "undefined") continue;
            if (typeof(ch) == "string") {
                var ch_node = config_channel_list[ch];
                if (!ch_node) continue;
                ch = ch_node.ch;
            }
            channel_node(ch, node);
            node.chid = ch;

            /// 收集设备uuid到系统设备列表中
            if (node.fixs && node.fixs.uuid) {
                var config_devices = config_system.devices;
                if (!config_devices) config_devices = config_system.devices = [];
                config_devices.push(node.fixs.uuid);
            }
        }
    }
}


/**
 * dump配置信息
 */
function config_dump() {
    print_obj_member(config_system, printlog, "config system");
    print_obj_member(config_channel_list, printlog, "config list");
}



/**
 * 加载配置
 * @param {String} path 配置文件路径
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
 * 初始化时加载
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


