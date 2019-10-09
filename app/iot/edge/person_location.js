/// js/app/iot/edge/person_location.js
/**
 * 物联网边缘侧人员定位对接
 */



/**
 * 人员定位缓冲信息
 */
var person_location_que = {};       // 需要发送的队列
var person_location_tmp = {};       // 缓存的上次信息
var person_current_count = 0;       // 当前定时器计数


/**
 * 人员定位信息响应
 * @param {Pointer} buf 缓冲区地址
 * @param {Number} len 缓冲区长度
 * @param {Function} extra_buf_save 额外数据保存函数
 * @param {Object} ch_recv_para 通道接收参数
 *  ch_recv_para: {
 *      ch: {Number} 通道ID
 *      ip: {String} IP
 *      port: {Number} 端口
 *      proto: {String} 协议
 *      ack: {Function} 应答函数 function(rsp)
 *      dump: {String} DUMP开关
 *  }
 */
function person_location_recv(buf, len, extra_buf_save, ch_recv_para) {
    var s = bytes.str(buf, len);

    var dump_switch = ch_recv_para.dump;
    if (dump_switch == "all" || dump_switch == "person") {
        printlog("recv person info: " + s);
    }

    if (s.startsWith('warning:')) {
        return person_location_warning_recv(s, ch_recv_para);
    }

    if (!s.startsWith('display:')) return;

    var a = s.trim().split(',');
    if (a.length < 7) return;

    var devid = a[1];
    var pos_x = parseFloat(a[a.length-3]);
    var o = {
        devid: a[1], 
        seq: a[2], 
        updateTime: a[3], 
        generateCounter: person_current_count, 
        rgnid: a[a.length-4], 
        x: a[a.length-3], 
        y: a[a.length-2], 
        z: a[a.length-1]
    };

    /// 达到条件，立刻上报，否则添加到队列 (1.第一次出现信息;2.计数差值达到5个周期;3.距离差值达到0.2米)
    if (!person_location_tmp[devid] || 
        (Math.abs(person_location_tmp[devid]["count"] - person_current_count) >= 5) || 
        (Math.abs(person_location_tmp[devid]["pos_x"] - pos_x) >= 0.2)) {
        /// 立刻上报
        o.reportCounter = person_current_count;
        o.reportStyle = "immediately";
        ch_recv_para.ack(o);
        /// 更新上报后的信息缓存
        person_location_tmp[devid] = {
            count: person_current_count,
            pos_x: pos_x,
            ack_f: ch_recv_para.ack
        };
        /// 如果在队列中，立刻删除
        if (person_location_que[devid]) {
            delete person_location_que[devid];
        }
    } else {
        person_location_que[devid] = o;
    }
}


var person_locates = {};
var person_insides = {};
function person_location_inside_proc(rgnid, devid, gateseq, value, time) {
    var e,f;
    e = function(rgn_id, in_out) {
        var person = person_locates[devid];
        if (person && person.rgn_id && person.rgn_id != rgn_id) {
            f(person.rgn_id, 0, true);
        }
        if (in_out == 1) {
            person_locates[devid] = {rgn_id:rgn_id,in_out:in_out};
        } else {
            if (person) delete person_locates[devid];
        }
    }
    f = function(rgn_id, in_out, repeat) {
        var rgn = person_insides[rgn_id];
        if (!rgn || !rgn.count || !rgn.lists) rgn = person_insides[rgn_id] = {count:0,lists:{}};
        var person = rgn.lists[devid];
        if (!person && in_out == 1) {
            rgn.lists[devid] = {time:time,rgnid:rgnid,gateseq:gateseq};
            rgn.count++;
        } else if (person && in_out == 0) {
            delete rgn.lists[devid];
            rgn.count--;
        }
        if (!repeat) e(rgn_id, in_out);
    }

    f(rgnid, value);

    var in_out = (value == 0)? 1 : 0;
    if (gateseq == '1') {
        f(rgnid+'*', in_out);
    } else if (gateseq == '0' && rgnid == '2') {
        f('1*',      in_out);
    } else if (gateseq == '0' && rgnid == '4') {
        f('3*',      in_out);
    }
}
function person_location_warning_recv(s, ch_recv_para) {
    var a = s.trim().split(',');
    if (a.length < 7) return;

    var state = a[1];
    if (state != 'GATE_IN' && state != 'GATEOUT') return;
    var value = (state == 'GATE_IN')? 1 : 0;
    var o = {
        devid: a[2], 
        state: state, 
        value: value, 
        updateTime: a[3], 
        rgnid: a[4], 
        gateseq: a[5], 
        layid: a[6]
    };

    person_location_inside_proc(a[4], a[2], a[5], value, a[3]);
    ch_recv_para.ack(o);

    var dump_switch = ch_recv_para.dump;
    if (dump_switch == "person_warning") {
        print_obj_member(o, printlog, "person location warning");
    }
}


var person_location_timer = function() {
    if (!this.timer_add) return;

    /// 添加1秒循环定时器
    return timer_add(function() {
        person_current_count++;

        for (var i in person_location_que) {
            if (Math.abs(person_location_tmp[i]["count"] - person_current_count) >= 5) {
                var o = person_location_que[i];
                o.reportCounter = person_current_count;
                o.reportStyle = "buffered";
                person_location_tmp[i].ack_f(o);
                person_location_tmp[i]["count"] = person_current_count;
                person_location_tmp[i]["pos_x"] = parseFloat(o.x);
                delete person_location_que[i];
            }
        }

    }, 2000, true, 'person location');
} ();


/**
 * 初始化时给通道设置协议格式
 */
(function() {
    var oninit = function() {
        if (typeof(format_rsp) != "undefined") {
            format_rsp('person_location', person_location_recv);
        }

        if (typeof(dump_switch_command) != "undefined") {
            dump_switch_command("person_locate", function(arglist) {
                print_obj_member(person_locates, printlog, "person locates");
            });
            dump_switch_command("person_inside", function(arglist) {
                print_obj_member(person_insides, printlog, "person insides");
            });
        }
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('person_location', {oninit: oninit});
    }
}) ();


