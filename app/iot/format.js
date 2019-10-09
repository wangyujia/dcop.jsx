/// js/app/iot/format.js
/**
 * 集中管理设备协议格式，供通道管理使用
 */



/**
 * 协议格式全局列表
 */
var format_all = function() {
    var all = {};

    return function() {
        return all;
    };
} ();


/**
 * 设置和获取协议格式属性
 * @param {String} format 协议格式
 * @param {String} name 属性名
 * @param {Object} value 属性值
 */
function format_attr(format, name, value) {
    var o = format_all();
    var f = o[format];

    if (typeof(value) == "undefined") {
        if (f) return f[name];
        return;
    }

    if (!f) f = o[format] = {};
    f[name] = value;
}


/**
 * 按协议格式设置和获取请求函数
 * @param {String} format 协议格式名称
 * @param {Function} req 获取请求函数
 *  req函数原型为:
 *      function(reqs, index) { return ins; }
 */
function format_req(format, req) {
    return format_attr(format, "req", req);
}


/**
 * 按格式设置和获取响应函数
 * @param {String} format 协议格式名称
 * @param {Function} rsp 解析响应函数
 *  rsp函数原型:
 *      1. function(buf, len, extra_buf_save) { return data; }
 *      2. function(buf, len, extra_buf_save, ch_recv_para) {}
 *          extra_buf_save : 是额外数据保存函数 (接收剩下的数据)
 *          ch_recv_para: {
 *              ch: {Number} 通道ID
 *              ip: {String} IP
 *              port: {Number} 端口
 *              proto: {String} 协议
 *              find: {Function} 查找节点函数 function(rsp)
 *              ack: {Function} 应答函数 function(rsp)
 *              dump: {String} DUMP开关
 *          }
 */
function format_rsp(format, rsp) {
    return format_attr(format, "rsp", rsp);
}


/**
 * dump协议格式
 */
function format_dump() {
    var o = format_all();
    print_obj_member(o, printlog, "format list");
}



/**
 * 初始化时加载
 */
(function() {
    var oninit = function() {
        if (typeof(dump_switch_command) != "undefined") {
            dump_switch_command("format", format_dump);
        }
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('format', {oninit: oninit});
    }
}) ();


