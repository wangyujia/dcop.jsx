/// js/app/iot/format.js
/**
 * ���й����豸Э���ʽ����ͨ������ʹ��
 */



/**
 * Э���ʽȫ���б�
 */
var format_all = function() {
    var all = {};

    return function() {
        return all;
    };
} ();


/**
 * ���úͻ�ȡЭ���ʽ����
 * @param {String} format Э���ʽ
 * @param {String} name ������
 * @param {Object} value ����ֵ
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
 * ��Э���ʽ���úͻ�ȡ������
 * @param {String} format Э���ʽ����
 * @param {Function} req ��ȡ������
 *  req����ԭ��Ϊ:
 *      function(reqs, index) { return ins; }
 */
function format_req(format, req) {
    return format_attr(format, "req", req);
}


/**
 * ����ʽ���úͻ�ȡ��Ӧ����
 * @param {String} format Э���ʽ����
 * @param {Function} rsp ������Ӧ����
 *  rsp����ԭ��:
 *      1. function(buf, len, extra_buf_save) { return data; }
 *      2. function(buf, len, extra_buf_save, ch_recv_para) {}
 *          extra_buf_save : �Ƕ������ݱ��溯�� (����ʣ�µ�����)
 *          ch_recv_para: {
 *              ch: {Number} ͨ��ID
 *              ip: {String} IP
 *              port: {Number} �˿�
 *              proto: {String} Э��
 *              find: {Function} ���ҽڵ㺯�� function(rsp)
 *              ack: {Function} Ӧ���� function(rsp)
 *              dump: {String} DUMP����
 *          }
 */
function format_rsp(format, rsp) {
    return format_attr(format, "rsp", rsp);
}


/**
 * dumpЭ���ʽ
 */
function format_dump() {
    var o = format_all();
    print_obj_member(o, printlog, "format list");
}



/**
 * ��ʼ��ʱ����
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


