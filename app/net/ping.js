/// js/app/net/ping.js
/**
 * 实现ping协议
 */


var PING_ICMP_DEF_DATA_SIZE      = 32;      // ICMP报文默认数据字段长度
var PING_ICMP_ECHO_REQUEST       = 8;       // ICMP类型字段，8表示请求回显


/**
 * ping的索引
 */
var ping_index = 0;



/**
 * 组装ping的请求包
 * @param {Number} data_len 数据长度
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
 * 解析ping的响应包
 * @param {Pointer} buf 缓冲区收地址
 * @param {Number} len 缓冲区产股
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
