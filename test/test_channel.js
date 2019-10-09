/// js/test/test_channel.js


load('js/app/iot/channel.js');


/*
dump-script.js: -p, -f, main.js, -e, test_channel
dump-script.js: -p, -f, main.js, -e, test_channel_dynamic
*/
function test_channel() {
    return test(
        'test_channel_modbus_rtu',
        'test_channel_modbus_rtu_more',
        'test_channel_modbus_tcp',
        'test_channel_modbus_tcp_more'
    );
}

function test_channel_dynamic() {
    return test(
        'test_channel_dynamic'
    );
}



TEST_CASE('test_channel_modbus_rtu', function() {
    var o = bytes.create(7);
    bytes.byte(o.buf, o.len, 0, 1);
    bytes.byte(o.buf, o.len, 1, 4);
    bytes.byte(o.buf, o.len, 2, 2);
    bytes.word(o.buf, o.len, 3, 12345);
    var crc = bytes.crc16(o.buf, o.len-2);
    bytes.crc16(o.buf, o.len, o.len-2, crc);
    bytes.dump(o.buf, o.len);
    var r = ins_modbus_rtu_rsp(o.buf, o.len);
    print_obj_member(r, printlog, "create buf");
    var ch = 1;
    channel_format(ch, "modbus_rtu");
    var node;
    channel_notify(function(data) {
        node = data.value;
        print_obj_member(data, printlog, "channel notify");
    });
    channel_node(ch, {
        uuid: "ABCD",
        info: "test channel",
        dump: "test"
    });
    channel_recv(ch, "127.0.0.1", 12212, "tcp", o.buf, o.len);
    if (node != 12345) return false;
});


TEST_CASE('test_channel_modbus_rtu_more', function() {
    var o = bytes.create(14);
    bytes.byte(o.buf, o.len, 0, 1);
    bytes.byte(o.buf, o.len, 1, 4);
    bytes.byte(o.buf, o.len, 2, 2);
    bytes.word(o.buf, o.len, 3, 12345);
    var crc = bytes.crc16(o.buf, 5);
    bytes.crc16(o.buf, o.len, 5, crc);
    bytes.byte(o.buf, o.len, 7, 5);
    bytes.byte(o.buf, o.len, 8, 4);
    bytes.byte(o.buf, o.len, 9, 2);
    bytes.word(o.buf, o.len, 10, 6789);
    crc = bytes.crc16(o.buf, 12, 7);
    bytes.crc16(o.buf, o.len, o.len-2, crc);
    bytes.dump(o.buf, o.len);
    var ch = 1;
    channel_format(ch, "modbus_rtu");
    channel_notify(function(data) {
        print_obj_member(data, printlog, "channel notify");
    });
    var node1;
    channel_node(ch, {
        uuid: "ABCD",
        info: "test channel",
        dump: "test",
        keys: ['data'],
        hard: {addr:1},
        notify: function(data) {
            node1 = data.value;
            printlog("node1: " + node1);
            print_obj_member(data, printlog, "node1 data");
        }
    });
    var node2;
    channel_node(ch, {
        uuid: "efgh",
        info: "wqerqewr",
        dump: "test",
        hard: {addr:5},
        proc: "function(data, rsp, node) {" + 
            "data.value = rsp.value / 10;" + 
        "}",
        notify: function(data) {
            node2 = data.value;
            printlog("node2: " + node2);
            print_obj_member(data, printlog, "node2 data");
        }
    });
    channel_recv(ch, "127.0.0.1", 12212, "tcp", o.buf, 12);
    channel_dump();
    channel_recv(ch, "127.0.0.1", 12212, "tcp", bytes.shift(o.buf, o.len, 12), 2);
    channel_dump();
    if (node1 != 12345 || node2 != 678.9) return false;
});


TEST_CASE('test_channel_modbus_tcp', function() {
    var o = bytes.create(7);
    bytes.byte(o.buf, o.len, 0, 1);
    bytes.byte(o.buf, o.len, 1, 4);
    bytes.byte(o.buf, o.len, 2, 2);
    bytes.word(o.buf, o.len, 3, 12345);
    var crc = bytes.crc16(o.buf, o.len-2);
    bytes.crc16(o.buf, o.len, o.len-2, crc);
    bytes.dump(o.buf, o.len);
    var r = ins_modbus_rtu_rsp(o.buf, o.len);
    print_obj_member(r, printlog, "modbus rtu rsp");
    var ch = 2;
    channel_format(ch, "modbus_rtu");
    var node;
    channel_notify(function(data) {
        node = data.value;
        print_obj_member(data, printlog, "channel notify");
    });
    channel_node(ch, {
        uuid: "ABCD",
        info: "test channel",
        dump: "test"
    });
    channel_recv(ch, "127.0.0.1", 12212, "tcp", o.buf, o.len);
    if (node != 12345) return false;
});


TEST_CASE('test_channel_modbus_tcp_more', function() {
    var o = bytes.create(14);
    bytes.byte(o.buf, o.len, 0, 1);
    bytes.byte(o.buf, o.len, 1, 4);
    bytes.byte(o.buf, o.len, 2, 2);
    bytes.word(o.buf, o.len, 3, 12345);
    var crc = bytes.crc16(o.buf, 5);
    bytes.crc16(o.buf, o.len, 5, crc);
    bytes.byte(o.buf, o.len, 7, 5);
    bytes.byte(o.buf, o.len, 8, 4);
    bytes.byte(o.buf, o.len, 9, 2);
    bytes.word(o.buf, o.len, 10, 6789);
    crc = bytes.crc16(o.buf, 12, 7);
    bytes.crc16(o.buf, o.len, o.len-2, crc);
    bytes.dump(o.buf, o.len);
    var ch = 2;
    channel_format(ch, "modbus_rtu");
    channel_notify(function(data) {
        print_obj_member(data, printlog, "channel notify");
    });
    var node1;
    channel_node(ch, {
        uuid: "ABCD-abc-0012",
        info: "test channel",
        dump: "test",
        hard: {addr:1},
        notify: function(data) {
            node1 = data.value;
            printlog("node1: " + node1);
            print_obj_member(data, printlog, "node1 data");
        }
    });
    var node2;
    channel_node(ch, {
        uuid: "EFGH-def-0034",
        info: "wqerqewr",
        dump: "test",
        keys: ['data','addr'],
        hard: {addr:5},
        proc: "function(data, rsp, node) {" + 
            "data.value = rsp.value / 10;" + 
        "}",
        notify: function(data) {
            node2 = data.value;
            printlog("node2: " + node2);
            print_obj_member(data, printlog, "node2 data");
        }
    });
    format_dump();
    channel_recv(ch, "127.0.0.1", 12212, "tcp", o.buf, 12);
    channel_dump();
    channel_recv(ch, "127.0.0.1", 12212, "tcp", bytes.shift(o.buf, o.len, 12), 2);
    channel_dump();
    if (node1 != 12345 || node2 != 678.9) return false;
});


TEST_CASE('test_channel_dynamic', function() {
    printlog('channel type: ' + typeof(channel));
    if (!channel) return;
    print_obj_member(channel, printlog, 'channel');
    if (!channel.add) return;
    var r = channel.add({
        "name": "dynamic",
        "info": "test1",
        "type": "remote",
        "sock": "tcp",
        "addr": "127.0.0.1",
        "port": 80,
        "autohello": false,
        "autocheck": false
    });
    printlog("dynamic test1 add ret:" + r);
    var r = channel.add({
        "name": "dynamic",
        "info": "test2",
        "type": "remote",
        "sock": "tcp",
        "addr": "127.0.0.1",
        "port": 80,
        "autohello": false,
        "autocheck": false
    });
    printlog("dynamic test2 add ret:" + r);
});

