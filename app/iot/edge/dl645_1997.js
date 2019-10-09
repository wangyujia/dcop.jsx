/// js/app/iot/edge/dl645_1997.js
/**
 * ��������Ե��dl645_1997Э��(���ܵ��)�ĶԽӺͼ���
 */



/**
 * DL/T 645 1997 ��� ����
 * @param {Number} addr ��ַ��
 * @param {Number} ctrl ������
 * @param {Number} data ������
 * @param {Number} size ������
 */
function ins_dl645_1997_req(addr, ctrl, data, size, prefix) {
    if (!prefix) prefix = 0;

    /// ����������
    var o = bytes.create(prefix + 12 + size);
    for (var i = 0; i < prefix; ++i) {
        bytes.byte(o.buf, o.len, i, 0xfe);
    }
    bytes.byte(o.buf, o.len, prefix, 0x68);
    
    /// ���õ�ַ��
    var tmp_addr = addr;
    for (var i = 0; i < 6; ++i) {
        bytes.byte(o.buf, o.len, prefix + 1 + i, tmp_addr & 0xff);
        tmp_addr /= 256;
    }
    
    /// ���ÿ����롢����
    bytes.byte(o.buf, o.len, prefix + 7, 0x68);
    bytes.byte(o.buf, o.len, prefix + 8, ctrl);
    bytes.byte(o.buf, o.len, prefix + 9, size);
    
    /// ��������
    var tmp_data = data;
    for (var i = 0; i < size; ++i) {
        bytes.byte(o.buf, o.len, prefix + 10 + i, (tmp_data & 0xff) + 0x33);
        tmp_data /= 256;
    }
    
    /// ����У���
    var crc = bytes.crc8(o.buf, prefix + 10 + size, prefix);
    bytes.crc8(o.buf, o.len, prefix + 10 + size, crc);
    bytes.byte(o.buf, o.len, prefix + 11 + size, 0x16);
    return o;
}


/**
 * DL/T 645 1997 ��� ��Ӧ
 * @param {Pointer} buf ��������ַ
 * @param {Number} len ����������
 * @param {Number} extra_buf_save �������ݱ��溯��
 */
function ins_dl645_1997_rsp(buf, len, extra_buf_save) {
    /// ƫ�ƿ�ʼ�ֽ�
    var pos = 0;
    var tmp = bytes.byte(buf, len, pos);
    while (tmp != 0x68) {
        if (tmp != 0xfe) return;
        tmp = bytes.byte(buf, len, ++pos);
    }
    if (pos >= len) return;
    if (pos > 0) {
        buf = bytes.shift(buf, len, pos);
        len = len - pos;
    }

    /// ��ȡʵ�����ݳ��Ⱥ�У���
    var req_data_size = 2;
    if (bytes.zero(buf) || len < (12 + req_data_size)) {
        /// ���ݲ��㣬�����ⲿ���պ�����������
        if (extra_buf_save) extra_buf_save(buf, len);
        return;
    }
    var size = bytes.byte(buf, len, 9);
    if (len < (12 + size)) {
        /// ���ݲ��㣬�����ⲿ���պ�����������
        if (extra_buf_save) extra_buf_save(buf, len);
        return;
    }
    var crc_computed = bytes.crc8(buf, 10 + size);
    var crc_response = bytes.byte(buf, len, 10 + size);

    /// ��ȡ��ַ��
    var tmp_addr = 1;
    var addr = 0;
    for (var i = 0; i < 6; ++i) {
        addr += bytes.byte(buf, len, 1 + i) * tmp_addr;
        tmp_addr *= 256;
    }
    
    /// ��ȡ������
    var ctrl = bytes.byte(buf, len, 8);

    /// ��ȡ��������
    var tmp_req = 1;
    var req = 0;
    if (req_data_size < 0) req_data_size = 0;
    if (req_data_size > size) req_data_size = size;
    if (req_data_size > 0) {
        for (var i = 0; i < req_data_size; ++i) {
            var byte = bytes.byte(buf, len, 10 + i);
            req += (byte - 0x33) * tmp_req;
            tmp_req *= 256;
        }
    }

    /// ��ȡ��Ӧ���� (��ʹ��BCD��ת��Ϊʮ����)
    var tmp_data = 1;
    var data = 0;
    if (size > req_data_size) {
        for (var i = 0; i < (size - req_data_size); ++i) {
            var byte = bytes.byte(buf, len, 10 + req_data_size + i);
            data += (byte - 0x33) * tmp_data;
            tmp_data *= 256;
        }
    }
    data = bcd_code_to_dec(data);

    /// �������ݶ���
    return {
        addr:   addr,
        ctrl:   ctrl,
        req:    req,
        data:   data,
        size:   size - req_data_size,
        value:  data,
        offset: 12 + size,
        crc_computed: crc_computed,
        crc_response: crc_response
    };
}


/**
 * ��BCD����ֵת��Ϊ10������
 * @param {Number} value BCD�����ֵ
 */
function bcd_code_to_dec(value) {
    var i = 1;
    var tmp = 0;
    while (value >= 1) {
        var byte = value & 0xff;
        var byte_h = (byte >> 4) & 0x0f;
        var byte_l = (byte & 0x0f);
        if ((byte_h > 9) || (byte_l > 9)) return;
        tmp += (byte_h * 10 + byte_l) * i;
        value /= 256;
        i *= 100;
    }

    return tmp;
}


/**
 * ��10������ת��ΪBCD����ֵ
 * @param {Number} value 10������
 */
function bcd_code_from_dec(value) {
    var i = 1;
    var tmp = 0;
    while (value >= 1) {
        var byte = value % 100;
        var byte_h = parseInt(byte / 10);
        var byte_l = byte % 10;
        tmp += ((byte_h << 4) + byte_l) * i;
        value = parseInt(value / 100);
        i *= 256;
    }

    return tmp;
}



/**
 * ��ʼ��ʱ��ͨ������Э���ʽ
 */
(function() {
    var oninit = function() {
        if (!format_req || !format_rsp) return;
        format_req('dl645_1997', function(reqs) {
            var addr = 0;
            var ctrl = 0;
            var data = 0;
            var size = 0;
            var prefix = 0;
            if (reqs && reqs.addr) addr = reqs.addr;
            if (reqs && reqs.ctrl) ctrl = reqs.ctrl;
            if (reqs && reqs.data) data = reqs.data;
            if (reqs && reqs.size) size = reqs.size;
            if (reqs && reqs.prefix) prefix = reqs.prefix;
            return ins_dl645_1997_req(addr, ctrl, data, size, prefix);
        });
        format_rsp('dl645_1997', ins_dl645_1997_rsp);
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('dl645_1997', {oninit: oninit});
    }
}) ();


