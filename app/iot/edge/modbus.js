/// js/app/iot/edge/modbus.js
/**
 * ��������Ե��modbusЭ��ĶԽӺͼ���
 */



/**
 * Modbus RTU ����
 * @param {Number} addr ��ַ��
 * @param {Number} func ���ܺ�
 * @param {Number} reg �Ĵ�����ַ
 * @param {Number} count �Ĵ�������
 * @returns {Object} ����������
 */
function ins_modbus_rtu_req(addr, func, reg, count) {
    var o = bytes.create(8);
    bytes.byte(o.buf, o.len, 0, addr);
    bytes.byte(o.buf, o.len, 1, func);
    bytes.word(o.buf, o.len, 2, reg);
    bytes.word(o.buf, o.len, 4, count);
    var crc = bytes.crc16(o.buf, o.len-2);
    bytes.crc16(o.buf, o.len, o.len-2, crc);
    return o;
}


/**
 * Modbus RTU ��Ӧ
 * @param {Pointer} buf ��������ַ
 * @param {Number} len ����������
 * @param {Function} extra_buf_save �������ݱ��溯��
 */
function ins_modbus_rtu_rsp(buf, len, extra_buf_save) {
    if (bytes.zero(buf) || len < 5) {
        /// ���ݲ��㣬�����ⲿ���պ�����������
        if (extra_buf_save) extra_buf_save(buf, len);
        return;
    }
    var size = bytes.byte(buf, len, 2);
    if (len < (5 + size)) {
        /// ���ݲ��㣬�����ⲿ���պ�����������
        if (extra_buf_save) extra_buf_save(buf, len);
        return;
    }
    var crc = bytes.crc16(buf, 5 + size);
    if (crc) return;

    var addr = bytes.byte(buf, len, 0);
    var func = bytes.byte(buf, len, 1);

    var value = 0;
    if (size == 1) {
        value = bytes.byte(buf, len, 3);
    } else if (size == 2) {
        value = bytes.word(buf, len, 3);
    } else if (size == 4) {
        value = bytes.dword(buf, len, 3);
    } else {
        var tmp = 1;
        for (var i = 0; i < size; ++i) {
            var byte = bytes.byte(buf, len, 3 + i);
            value += byte * tmp;
            tmp *= 256;
        }
    }

    /// �������ݶ���
    return {
        addr:   addr,
        func:   func,
        data:   value,
        size:   size,
        value:  value,
        offset: 5 + size
    };
}


/**
 * Modbus TCP ����
 * @param {Number} head ��ʶͷ
 * @param {Number} addr ��ַ��
 * @param {Number} func ���ܺ�
 * @param {Number} reg �Ĵ�����ַ
 * @param {Number} count �Ĵ�������
 */
function ins_modbus_tcp_req(head, addr, func, reg, count) {
    var o = bytes.create(12);
    bytes.word(o.buf, o.len, 0,  head);
    bytes.byte(o.buf, o.len, 5,  0x06);
    bytes.byte(o.buf, o.len, 6,  addr);
    bytes.byte(o.buf, o.len, 7,  func);
    bytes.word(o.buf, o.len, 8,  reg);
    bytes.word(o.buf, o.len, 10, count);
    return o;
}


/**
 * Modbus TCP ��Ӧ
 * @param {Pointer} buf ��������ַ
 * @param {Number} len ����������
 * @param {Number} extra_buf_save �������ݱ��溯��
 */
function ins_modbus_tcp_rsp(buf, len, extra_buf_save) {
    if (bytes.zero(buf) || len < 9) {
        /// ���ݲ��㣬�����ⲿ���պ�����������
        if (extra_buf_save) extra_buf_save(buf, len);
        return;
    }
    var size = bytes.byte(buf, len, 8);
    if (len < (9 + size)) {
        /// ���ݲ��㣬�����ⲿ���պ�����������
        if (extra_buf_save) extra_buf_save(buf, len);
        return;
    }

    var total = bytes.word(buf, len, 4);
    var head  = bytes.word(buf, len, 0);
    var addr  = bytes.byte(buf, len, 6);
    var func  = bytes.byte(buf, len, 7);

    var value = 0;
    if (!size) return;
    else if (size == 1) {
        value = bytes.byte(buf, len, 9);
    } else if (size == 2) {
        value = bytes.word(buf, len, 9);
    } else if (size == 4) {
        value = bytes.dword(buf, len, 9);
    } else {
        var tmp = 1;
        for (var i = 0; i < size; ++i) {
            var byte = bytes.byte(buf, len, 9 + i);
            value += byte * tmp;
            tmp *= 256;
        }
    }

    /// �������ݶ���
    return {
        total:  total,
        head:   head,
        addr:   addr,
        func:   func,
        data:   value,
        size:   size,
        value:  value,
        offset: 9 + size
    };
}



/**
 * ��ʼ��ʱ��ͨ������Э���ʽ
 */
(function() {
    var oninit = function() {
        if (!format_req || !format_rsp) return;
        format_req('modbus_rtu', function(reqs) {
            var addr = 0;
            var func = 0;
            var reg = 0;
            var count = 0;
            if (reqs && reqs.addr) addr = reqs.addr;
            if (reqs && reqs.func) func = reqs.func;
            if (reqs && reqs.reg) reg = reqs.reg;
            if (reqs && reqs.count) count = reqs.count;
            return ins_modbus_rtu_req(addr, func, reg, count);
        });
        format_req('modbus_tcp', function(reqs, index) {
            var addr = 0;
            var func = 0;
            var reg = 0;
            var count = 0;
            if (reqs && reqs.addr) addr = reqs.addr;
            if (reqs && reqs.func) func = reqs.func;
            if (reqs && reqs.reg) reg = reqs.reg;
            if (reqs && reqs.count) count = reqs.count;
            var head = 0;
            if (index) head = index;
            return ins_modbus_tcp_req(head, addr, func, reg, count);
        });
        format_rsp('modbus_rtu', ins_modbus_rtu_rsp);
        format_rsp('modbus_tcp', ins_modbus_tcp_rsp);
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('modbus', {oninit: oninit});
    }
}) ();


