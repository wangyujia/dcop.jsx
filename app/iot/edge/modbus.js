/// js/app/iot/edge/modbus.js
/**
 * 物联网边缘侧modbus协议的对接和计算
 */



/**
 * Modbus RTU 请求
 * @param {Number} addr 地址码
 * @param {Number} func 功能号
 * @param {Number} reg 寄存器地址
 * @param {Number} count 寄存器数量
 * @returns {Object} 缓冲区对象
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
 * Modbus RTU 响应
 * @param {Pointer} buf 缓冲区地址
 * @param {Number} len 缓冲区长度
 * @param {Function} extra_buf_save 额外数据保存函数
 */
function ins_modbus_rtu_rsp(buf, len, extra_buf_save) {
    if (bytes.zero(buf) || len < 5) {
        /// 数据不足，调用外部接收函数保存数据
        if (extra_buf_save) extra_buf_save(buf, len);
        return;
    }
    var size = bytes.byte(buf, len, 2);
    if (len < (5 + size)) {
        /// 数据不足，调用外部接收函数保存数据
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

    /// 返回数据对象
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
 * Modbus TCP 请求
 * @param {Number} head 标识头
 * @param {Number} addr 地址码
 * @param {Number} func 功能号
 * @param {Number} reg 寄存器地址
 * @param {Number} count 寄存器数量
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
 * Modbus TCP 响应
 * @param {Pointer} buf 缓冲区地址
 * @param {Number} len 缓冲区长度
 * @param {Number} extra_buf_save 额外数据保存函数
 */
function ins_modbus_tcp_rsp(buf, len, extra_buf_save) {
    if (bytes.zero(buf) || len < 9) {
        /// 数据不足，调用外部接收函数保存数据
        if (extra_buf_save) extra_buf_save(buf, len);
        return;
    }
    var size = bytes.byte(buf, len, 8);
    if (len < (9 + size)) {
        /// 数据不足，调用外部接收函数保存数据
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

    /// 返回数据对象
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
 * 初始化时给通道设置协议格式
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


