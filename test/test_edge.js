/// js/test/test_edge.js


load('js/app/iot/format.js');
load('js/app/iot/edge/modbus.js');
load('js/app/iot/edge/dl645_1997.js');


/*
dump-script.js: -p, -f, main.js, -e, test_edge
dump-script.js: -p, -f, main.js, -e, test_edge_modbus
dump-script.js: -p, -f, main.js, -e, test_edge_dl645
*/
function test_edge() {
    return test(
        'test_edge_modbus_rtu',
        'test_edge_modbus_tcp',
        'test_edge_dl645_req',
        'test_edge_dl645_rsp',
        'test_edge_dl645_err',
        'bcd_code_to_dec',
        'bcd_code_from_dec',
        'bcd_code_buf_cache'
    );
}
function test_edge_modbus() {
    return test(
        'test_edge_modbus_rtu',
        'test_edge_modbus_tcp'
    );
}
function test_edge_dl645() {
    return test(
        'test_edge_dl645_req',
        'test_edge_dl645_rsp',
        'test_edge_dl645_err',
        'bcd_code_to_dec',
        'bcd_code_from_dec',
        'bcd_code_buf_cache'
    );
}



TEST_CASE('test_edge_modbus_rtu', function() {
    var o = bytes.create(7);
    bytes.byte(o.buf, o.len, 0, 1);
    bytes.byte(o.buf, o.len, 1, 4);
    bytes.byte(o.buf, o.len, 2, 2);
    bytes.word(o.buf, o.len, 3, 12345);
    var crc = bytes.crc16(o.buf, o.len-2);
    bytes.crc16(o.buf, o.len, o.len-2, crc);
    bytes.dump(o.buf, o.len);
    var r = ins_modbus_rtu_rsp(o.buf, o.len);
    print_obj_member(r, printlog);
    if (r.value != 12345) return false;
});


TEST_CASE('test_edge_modbus_tcp', function() {
    var o = bytes.create(11);
    bytes.word(o.buf, o.len, 0, 1);
    bytes.word(o.buf, o.len, 4, 5);
    bytes.byte(o.buf, o.len, 6, 1);
    bytes.byte(o.buf, o.len, 7, 4);
    bytes.byte(o.buf, o.len, 8, 2);
    bytes.word(o.buf, o.len, 9, 12345);
    bytes.dump(o.buf, o.len);
    var r = ins_modbus_tcp_rsp(o.buf, o.len);
    print_obj_member(r, printlog);
    if (r.value != 12345) return false;
});


TEST_CASE('test_edge_dl645_req', function() {
    var addr = 0x18059266;
    printlog("addr: 0x18059266 | " + addr);
    var data = 0x9010;
    printlog("data: 0x9010 | " + data);
    var o = ins_dl645_1997_req(addr, 0x01, data, 2);
    bytes.dump(o.buf, o.len);
    var value = bytes.word(o.buf, o.len, 10);
    printlog("value: " + value + " | " + 0x43c3);
    if (value != 0x43c3) return false;
});


TEST_CASE('test_edge_dl645_rsp', function() {
    var addr = 0x18059266;
    var data = 0x15059010;
    printlog("data: 0x1505 | " + 0x1505);
    var o = ins_dl645_1997_req(addr, 0x81, data, 6);
    bytes.dump(o.buf, o.len);
    var r = ins_dl645_1997_rsp(o.buf, o.len, null, 2);
    print_obj_member(r, printlog);
    if (r.value != 1505) return false;
});


TEST_CASE('test_edge_dl645_err', function() {
    var addr = 0x18059266;
    var data = 2;
    var o = ins_dl645_1997_req(addr, 0xc1, data, 1, 2);
    bytes.dump(o.buf, o.len);
    var r = ins_dl645_1997_rsp(o.buf, o.len, null, 0);
    print_obj_member(r, printlog);
    if (r) return false;
});


TEST_CASE('bcd_code_to_dec', function() {
    var value;
    value = bcd_code_to_dec(0x12345678);
    printlog("" + value + " bcd to dec: " + value);
    if (value != 12345678) return false;
    value = bcd_code_to_dec(0x1520);
    printlog("" + value + " bcd to dec: " + value);
    if (value != 1520) return false;
});


TEST_CASE('bcd_code_from_dec', function() {
    var value;
    value = bcd_code_from_dec(12345678);
    printlog("" + value + " bcd from dec: " + value);
    if (value != 0x12345678) return false;
    value = bcd_code_from_dec(1520);
    printlog("" + value + " bcd from dec: " + value);
    if (value != 0x1520) return false;
});


TEST_CASE('bcd_code_buf_cache', function() {
    var o1 = bytes.create(7);
    var i1 = 0;
    bytes.byte(o1.buf, o1.len, i1++, 0xfe);
    bytes.byte(o1.buf, o1.len, i1++, 0xfe);
    bytes.byte(o1.buf, o1.len, i1++, 0x68);
    bytes.byte(o1.buf, o1.len, i1++, 0x66);
    bytes.byte(o1.buf, o1.len, i1++, 0x92);
    bytes.byte(o1.buf, o1.len, i1++, 0x05);
    bytes.byte(o1.buf, o1.len, i1++, 0x18);
    bytes.dump(o1.buf, o1.len);
    var o2 = bytes.create(13);
    var i2 = 2;
    bytes.byte(o2.buf, o2.len, i2++, 0x68);
    bytes.byte(o2.buf, o2.len, i2++, 0x81);
    bytes.byte(o2.buf, o2.len, i2++, 0x06);
    bytes.byte(o2.buf, o2.len, i2++, 0x43);
    bytes.byte(o2.buf, o2.len, i2++, 0xc3);
    bytes.byte(o2.buf, o2.len, i2++, 0x93);
    bytes.byte(o2.buf, o2.len, i2++, 0x4a);
    bytes.byte(o2.buf, o2.len, i2++, 0x33);
    bytes.byte(o2.buf, o2.len, i2++, 0x33);
    bytes.byte(o2.buf, o2.len, i2++, 0xb5);
    bytes.byte(o2.buf, o2.len, i2++, 0x16);
    bytes.dump(o2.buf, o2.len);
    var channel_energy_buf = {};
    function channel_energy_buf_get(ch, buf, len) {
        var node = channel_energy_buf[ch];
        if (!node || !node.len || bytes.zero(node.buf)) return;
        var o = {
            "buf": bytes.append(node.buf, node.len, buf, len),
            "len": node.len + len
        };
        delete channel_energy_buf[ch];
        return o;
    }
    function channel_energy_buf_set(ch, buf, len) {
        var node = channel_energy_buf[ch];
        if (node) {
            bytes.free(node.buf);
            delete channel_energy_buf[ch];
        }
        if (len && !bytes.zero(buf)) {
            channel_energy_buf[ch] = {
                "buf": bytes.alloc(buf, len),
                "len": len
            };
        }
    }
    var r = ins_dl645_1997_rsp(o1.buf, o1.len, function(b, l) {
        channel_energy_buf_set("ch", b, l);
    }, 2);
    if (r) return;
    var o = channel_energy_buf_get("ch", o2.buf, o2.len);
    bytes.dump(o.buf, o.len);
    r = ins_dl645_1997_rsp(o.buf, o.len, null, 2);
    print_obj_member(r, printlog);
    bytes.free(o.buf);
    if (!r || r.value != 1760) return false;    
});

