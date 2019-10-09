/// js/app/proxy/local.js



/// 创建代理内网对象
function proxylocal(local_channel_base, pool_count) {
    var local = {};
    var cloud = {};
    var buff = [];
    var app = {};

    /// 查找空闲的本端 (缓冲池是固定数量的本地服务连接，但是客户远程连接是动态的多个)
    var local_idle = function() {
        /// 找到空闲连接
        for (var i = 0; i < pool_count; ++i) {
            var node = local[i];
            if (!node || node.state == "idle") {
                if (!node) node = local[i] = {state: "idle"};
                return i;
            }
        }

        /// 如果没有空闲连接，接下来查找超时连接
        for (var i = 0; i < pool_count; ++i) {
            var node = local[i];
            if (((node.state == "reqd") && (node.count > 120)) || 
                ((node.state == "rspd") && (node.count > 30))) {
                node.state = "idle";
                return i;
            }
        }
    };

    /// 保存云端缓冲节点 (用于从云端接收的数据包，拆分数据净负荷，和云连接通道一比一)
    var cloud_save = function(ch) {
        /// 获已有云通道
        var node = cloud[ch];
        if (node) return node;
        node = cloud[ch] = {
            /// 没有对应云通道，新建的同时需要新建一个转发对象 (拆包组包)
            trans_o: proxytrans(function(buf, len) {
                var cloud_ch = ch;
                var app_channel = this.channel;
                var app_ip = this.ip;
                var app_port = this.port;
                var app_proto = this.proto;
                var app_req_index = this.index;
                var trans = function(buf, len) {
                    bytes.dump(buf, len, printlog);
                    /// 收到云端数据后，调用保存的应用节点 (里面会自动新建)
                    var app_node = app_save(
                        app_channel,
                        app_ip,
                        app_port,
                        app_proto,
                        app_req_index,
                        cloud_ch);
                    print_obj_member(app_node, printlog, "app save node");
                    /// 无对应应用节点，说明可能是无空闲本地连接池，只有保存应用数据
                    if (!app_node) return false;
                    var local_channel = app_node.local_channel;
                    if (!local_channel) return false;
                    var r = channel.send(local_channel_base + local_channel, buf, len);
                    if (!r) delete local[local_channel];
                    return r;
                };
                if (!trans(buf, len)) return buff_save(trans, buf, len);
            })
        };
        return node;
    };

    /// 缓存加载
    var buff_load = function() {
        if (!buff.length) return false;
        var node = buff[0];
        if (!node) return false;
        var trans = node.trans;
        if (!trans) return false;
        var buf_o = node.buf_o;
        if (!trans(buf_o.buf, buf_o.len)) return false;
        buff.shift();
        return true;
    };

    /// 缓存保存
    var buff_save = function(trans, buf, len) {
        buff.push({
            trans: trans,
            buf_o: bytes.create(buf, len)
        });
    };

    /// 加载应用端缓冲节点
    var app_load = function(ch, ip, port, proto) {
        var name = '' + ch + ':' + ip + ':' + port + ':' + proto;
        return app[name];
    };

    /// 保存应用端缓冲节点
    var app_save = function(ch, ip, port, proto, req_index, cloud_channel) {
        var name = '' + ch + ':' + ip + ':' + port + ':' + proto;
        var node = app[name];
        if (node) {
            node.app_req_index = req_index;
            node.app_rsp_index = 0;
            node.cloud_channel = cloud_channel;
            return node;
        }

        var i = local_idle();
        if (typeof(i) == "undefined") return;
        var local_node = local[i];
        if (!local_node) return;
        
        local_node.state = "reqd";
        local_node.count = 0;
        local_node.app_channel = ch;
        local_node.app_ip = ip;
        local_node.app_port = port;
        local_node.app_proto = proto;

        node = app[name] = {
            app_channel: ch,
            app_ip: ip,
            app_port: port,
            app_proto: proto,
            app_req_index: req_index,
            app_rsp_index: 0,
            cloud_channel: cloud_channel,
            local_channel: i
        };

        return node;
    };

    /// 返回缓冲池对象
    var o = {
        dump: ""
    };

    /// 云端接收接口
    add_obj_method(o, 'on_cloud_recv', function(ch, ip, port, proto, buf, len) {
        var node = cloud_save(ch);
        if (!node) return;

        var trans_o = node.trans_o;
        if (!trans_o) return;

        var r = trans_o.recv(buf, len);
        if ((this.dump == "all") || (this.dump == "trans") || (this.dump == "cloud")) {
            printlog('trans to local(app:' + 
                trans_o.channel + ':' + 
                trans_o.ip + ':' + 
                trans_o.port + ':' + 
                trans_o.proto + ') index:' + 
                trans_o.index + ' length:' + 
                trans_o.length + ' ret: ' + r);
        }
    });
    
    /// 本地接收接口
    add_obj_method(o, 'on_local_recv', function(ch, ip, port, proto, buf, len) {
        var loca_node = local[ch - local_channel_base];
        if (!loca_node) return;
        loca_node.state = "rspd";
        loca_node.count = 0;

        var app_node = app_load(loca_node.app_channel, 
            loca_node.app_ip, loca_node.app_port, loca_node.app_proto);
        print_obj_member(app_node, printlog, "app load node");
        if (!app_node) return;

        var cloud_channel = app_node.cloud_channel;
        if (!cloud_channel) return;
        var cloud_node = cloud[cloud_channel];
        if (!cloud_node) return;
        var trans_o = cloud_node.trans_o;
        if (!trans_o) return;

        var send_o = trans_o.send(app_node.app_channel, 
            app_node.app_ip, app_node.app_port, app_node.app_proto, 
            buf, len, app_node.app_rsp_index);
        if (!send_o) return;

        app_node.app_rsp_index++;
        var r = channel.send(cloud_channel, send_o.buf, send_o.len);
        if ((this.dump == "all") || (this.dump == "trans") || (this.dump == "local")) {
            printlog('trans to cloud(app:' + 
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
        for (var i = 0; i < pool_count; ++i) {
            var node = local[i];
            if (!node) continue;
            if (!node.count) node.count = 0;
            else node.count++;
        }
        var r = false;
        while (r = buff_load()) {}
    });

    return o;
}