/// js/app/proxy/trans.js


/// 创建代理云端对象
function proxycloud(svc_channel, pool_count) {
    var svc_index = 0;
    var svc = {};
    var app = {};

    /// 打印HTTP头部
    var print_http_head = function(buf, len) {
        var head_str;
        var head_end = bytes.find(buf, len, 0, '\r\n\r\n');
        if (head_end < 0) head_end = (len > 256)? 256 : len;
        head_str = bytes.str(buf, head_end);
        printlog(head_str);
    };

    /// 查找空闲的服务端 (通道索引)
    var svc_idle = function() {
        if (!pool_count) {
            if (channel.connected(svc_channel)) return 0;
            return;
        }
        var cnt = 0;
        var tmp = svc_index;
        while (cnt < pool_count) {
            cnt++;
            if (channel.connected(svc_channel, tmp)) {
                svc_index = tmp + 1;
                return tmp;
            }
            tmp++;
            if (tmp >= pool_count) {
                tmp = 0;
            }
        }
    };

    /// 加载服务端缓冲节点
    var svc_load = function(ch, ip, port, proto) {
        var name = '' + ch + ':' + ip + ':' + port + ':' + proto;
        return svc[name];
    };

    /// 保存服务端缓冲节点
    var svc_save = function(ch, ip, port, proto) {
        var name = '' + ch + ':' + ip + ':' + port + ':' + proto;
        var node = svc[name];
        if (node) return node;
        node = svc[name] = {
            trans_o: proxytrans(function(buf, len) {
                var app_node = app_load(
                    this.channel,
                    this.ip,
                    this.port,
                    this.proto
                );
                if (!app_node) return;
                // app_send(app_node, buf, len);
                if (app_node.app_state == "request") {
                    print_http_head(buf, len);
                }
                app_node.app_state = "response";
                app_node.app_count = 0;
                return channel.send(app_node.app_channel, 
                    app_node.app_ip, app_node.app_port, app_node.app_proto, 
                    buf, len);
            })
        };
        return node;
    };

    /// 加载应用端缓冲节点
    var app_load = function(ch, ip, port, proto) {
        var name = '' + ch + ':' + ip + ':' + port + ':' + proto;
        return app[name];
    };

    /// 保存应用端缓冲节点
    var app_save = function(ch, ip, port, proto) {
        var name = '' + ch + ':' + ip + ':' + port + ':' + proto;
        var node = app[name];
        if (node && channel.connected(node.svc_channel, node.svc_ip, 
            node.svc_port, node.svc_proto)) return node;

        var i = svc_idle();
        if (typeof(i) == "undefined") return;
        if (!i) i = 0;
        var svc_ip = channel.ip(svc_channel, i);
        var svc_port = channel.port(svc_channel, i);
        var svc_proto = channel.proto(svc_channel, i);

        if (!node) node = app[name] = {
            app_channel: ch,
            app_ip: ip,
            app_port: port,
            app_proto: proto
        };
        node.svc_o = svc_save(svc_channel, svc_ip, svc_port, svc_proto);
        node.svc_channel = svc_channel;
        node.svc_ip = svc_ip;
        node.svc_port = svc_port;
        node.svc_proto = svc_proto;
        
        return node;
    };

    /// 返回缓冲池对象
    var o = {
        dump: ""
    };

    /// 应用端接收接口
    add_obj_method(o, 'on_app_recv', function(ch, ip, port, proto, buf, len) {
        if (!buf || !len) return;
        if ((this.dump == "all") || (this.dump == "trans") || (this.dump == "app")) {
            printlog('app data(' + len + ') recved! [from channel(' + ch + ') ' + 
                ip + ':' + port + '(' + proto + ')]');
            print_http_head(buf, len);
        }

        var node = app_save(ch, ip, port, proto);
        if (!node) return;
        
        node.app_state = "request";
        node.app_count = 0;
        if (!node.app_index) node.app_index = 0;
        else node.app_index++;
        
        // var r = svc_send(node, buf, len);
        var svc_o = node.svc_o;
        if (!svc_o) return;
        var trans_o = svc_o.trans_o;
        if (!trans_o) return;

        var send_o = trans_o.send(node.app_channel, 
            node.app_ip, node.app_port, node.app_proto, 
            buf, len, node.app_index);
        if (!send_o) return;
        // bytes.dump(send_o.buf, send_o.len, printlog);

        var r = channel.send(node.svc_channel, 
            node.svc_ip, node.svc_port, node.svc_proto, 
            send_o.buf, send_o.len);
        if ((this.dump == "all") || (this.dump == "trans") || (this.dump == "app")) {
            printlog('trans to svc(' + 
                node.svc_channel + ':' + 
                node.svc_ip + ':' + 
                node.svc_port + ':' + 
                node.svc_proto + ') ret: ' + r);
        }
    });

    /// 服务端接收接口
    add_obj_method(o, 'on_svc_recv', function(ch, ip, port, proto, buf, len) {
        if (!buf || !len) return;
        if ((this.dump == "all") || (this.dump == "trans") || (this.dump == "svc")) {
            printlog('svc data(' + len + ') recved! [from channel(' + ch + ') ' + 
                ip + ':' + port + '(' + proto + ')]');
        }

        var node = svc_load(ch, ip, port, proto);
        if (!node) return;

        var trans_o = node.trans_o;
        if (!trans_o) return;

        var r = trans_o.recv(buf, len);
        if ((this.dump == "all") || (this.dump == "trans") || (this.dump == "svc")) {
            printlog('trans to svc(' + 
                trans_o.channel + ':' + 
                trans_o.ip + ':' + 
                trans_o.port + ':' + 
                trans_o.proto + ') index:' + 
                trans_o.index + ' length:' + 
                trans_o.length + ' ret: ' + r);
        }
    });

    /// 定时器入口
    add_obj_method(o, 'on_timer', function() {
        for (var i in app) {
            var node = app[i];
            if (!channel.connected(node.app_channel, node.app_ip, 
                node.app_port, node.app_proto)) {
                delete app[i];
            }
            node.app_count++;
        }
    });

    return o;
}
