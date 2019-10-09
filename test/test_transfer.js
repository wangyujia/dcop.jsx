/// js/test/test_buf.js



var channel = {};
load('js/app/proxy/cloud.js');
load('js/app/proxy/local.js');
load('js/app/proxy/transfer.js');



/*
dump-script.js: -p, -f, main.js, -e, test_trans
*/
function test_trans() {
    return test(
        'test_trans_send',
        'test_trans_recv',
        'test_trans_recv_more',
        'test_trans_cloud_local'
    );
}


TEST_CASE('test_trans_send', function() {
    var ch = 1;
    var ip = "127.0.0.1";
    var port = 3456;
    var proto = "tcpaccept";
    var o_buf = bytes.create('hello world');
    var o_trans = proxytrans();
    var o = o_trans.send(ch, ip, port, proto, o_buf.buf, o_buf.len);
    bytes.dump(o.buf, o.len);
    if (o.len != 100) return false;
});


TEST_CASE('test_trans_recv', function() {
    var ch = 1;
    var ip = "127.0.0.1";
    var port = 3456;
    var proto = "tcpaccept";
    var o_buf = bytes.create('hello world');
    var o_trans = proxytrans(function(buf, len) {        
        printlog('on data(len:' + len + ')');
        bytes.dump(buf, len);
        print_obj_member(this, printlog);
    });
    var o = o_trans.send(ch, ip, port, proto, o_buf.buf, o_buf.len);
    var r = o_trans.recv(o.buf, o.len);
    printlog('recv ret: ' + r);
    print_obj_member(o_trans, printlog);
    print_obj_member(o_trans.headers(), printlog);
    if (!r) return false;
});


TEST_CASE('test_trans_recv_more', function() {
    var ch = 1;
    var ip = "127.0.0.1";
    var port = 3456;
    var proto = "tcpaccept";
    var o_buf = bytes.create('hello world');
    var o_trans = proxytrans(function(buf, len) {
        printlog('on data(len:' + len + ')');
        bytes.dump(buf, len);
    });
    var o = o_trans.send(ch, ip, port, proto, o_buf.buf, o_buf.len);
    var r = o_trans.recv(o.buf, 7);
    printlog('recv1 ret: ' + r);
    if (r) return false;
    var r = o_trans.recv(bytes.shift(o.buf, o.len, 7), 20);
    printlog('recv2 ret: ' + r);
    if (r) return false;
    var r = o_trans.recv(bytes.shift(o.buf, o.len, 27), 50);
    printlog('recv3 ret: ' + r);
    if (r) return false;
    var r = o_trans.recv(bytes.shift(o.buf, o.len, 77), 3);
    printlog('recv4 ret: ' + r);
    if (r) return false;
    var r = o_trans.recv(bytes.shift(o.buf, o.len, 80), o.len - 80);
    printlog('recv5 ret: ' + r);
    if (!r) return false;
    print_obj_member(o_trans, printlog);
    print_obj_member(o_trans.headers(), printlog);
    if (o_trans.length != 11) return false;
});


TEST_CASE('test_trans_cloud_local', function() {
    channel = {};
    var channel_app = 1;
    var channel_svc = 2;
    var channel_cloud = 30;
    var channel_local = 40;
    var proxy_cloud = proxycloud(channel_svc, 10);
    proxy_cloud.dump = "all";
    var proxy_local = proxylocal(channel_local, 10);
    proxy_local.dump = "all";
    add_obj_method(channel, 'send', function(ch, ip, port, proto, buf, len) {
        printlog("SENDING TO channel:" + ch + ":" + ip + ":" + port + ":" + proto);
        bytes.dump(buf, len, printlog);
        if (ch == channel_svc) {
            proxy_local.on_cloud_recv(channel_cloud + (port-22220), 
                ip, port, proto, buf, len);
        }
        return true;
    });
    add_obj_method(channel, 'send', function(ch, buf, len) {
        printlog("SENDING TO channel:" + ch);
        bytes.dump(buf, len, printlog);
        if (ch == channel_cloud) {
            proxy_cloud.on_svc_recv(channel_svc, "127.0.0.1", 22220, 
                "tcpaccept", buf, len);
        }
        return true;
    });
    channel.connected = function() {
        return true;
    };
    channel.ip = function() {
        return "127.0.0.1";
    };
    channel.port = function(ch, i) {
        var ports = [
            22220,
            22221,
            22222,
            22223,
            22224,
            22225,
            22226,
            22227,
            22228,
            22229,
            22230
        ];
        if (ch != channel_svc) return;
        if (i >= ports.length) return;
        return ports[i];
    };
    channel.proto = function() {
        return "tcpaccept";
    };
    channel.connected = function() {
        return true;
    };
    print_obj_member(channel, printlog, 'channel');
    var buf_o = bytes.create('hello world req');
    proxy_cloud.on_app_recv(channel_app, "127.0.0.1", 12345, "tcpaccept", 
        buf_o.buf, buf_o.len);
    printlog("--------------------------------------------");
    var buf_o = bytes.create('hello world rsp 1');
    proxy_local.on_local_recv(channel_local, "127.0.0.1", 12345, "tcpaccept", 
        buf_o.buf, buf_o.len);
    printlog("--------------------------------------------");
    var buf_o = bytes.create('hello world rsp 2');
    proxy_local.on_local_recv(channel_local, "127.0.0.1", 12345, "tcpaccept", 
        buf_o.buf, buf_o.len);
});

