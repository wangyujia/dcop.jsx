/// js/app/net/ping.js
/**
 * ʵ��pingЭ��
 */


var PING_ICMP_DEF_DATA_SIZE      = 32;      // ICMP����Ĭ�������ֶγ���
var PING_ICMP_ECHO_REQUEST       = 8;       // ICMP�����ֶΣ�8��ʾ�������


/**
 * ping������
 */
var ping_index = 0;



/**
 * ��װping�������
 * @param {Number} data_len ���ݳ���
 */
function ping_req(data_len) {
    if (!data_len) data_len = PING_ICMP_DEF_DATA_SIZE;
    var o = bytes.create(12 + data_len);
    bytes.byte(o.buf, o.len, 0, PING_ICMP_ECHO_REQUEST);
    bytes.word(o.buf, o.len, 4, ++ping_index);
    bytes.dword(o.buf, o.len, 8, new Date().getTime() / 1000);
    bytes.memset(o.buf, o.len, 12, 'E', data_len);
    var checksum = bytes.checksum(o.buf, o.len, 0);
    bytes.checksum(o.buf, o.len, 2, checksum);
    return o;
}


/**
 * ����ping����Ӧ��
 * @param {Pointer} buf �������յ�ַ
 * @param {Number} len ����������
 */
function ping_rsp(buf, len) {
    if (!buf || !len) return;
    var ip_head_len = bytes.byte(buf, len, 0);
    ip_head_len = (ip_head_len & 0x0F) * 4;
    if (ip_head_len > len) return;
    var ip_version = bytes.byte(buf, len, 1);
    var ip_tos = bytes.byte(buf, len, 2);
    var ip_total_len = bytes.byte(buf, len, 2);
}
