/// js/base/timer.js
/**
 * 定时器管理
 */



/**
 * 定时器说明
 *  添加一次定时器 (运行后定时器自动删除)
 *      timer_add(func, time)
 *  添加循环定时器
 *      timer_add(func, time, true)
 */



/**
 * 定时器全局对象
 */
var timer_idx = 0;
var timer_all = function() {
    var all = {};

    return function() {
        return all;
    };
} ();


/**
 * 单位时间内更新定时器
 * @param {Number} time 单位时间 (毫秒)
 */
function timer_tick(time) {
    var o = timer_all();
    var x = function(id) {
        var node = o[id];
        if (!node) return 0;
        if (!node.func) return 0;

        /// 定时器暂停状态直接返回 (运行前时间<=0)
        if (node.time <= 0) return 1;

        /// 运行时间增加
        node.run += time;
        if (node.run < node.time) return (node.time - node.run);
        node.count++;
        node.run = 0;
        
        /// 循环定时器直接调用，并返回超时时间
        if (node.loop) {
            node.func(id);
            return node.time;
        }
        
        /// 超时定时器返回重设后的下次超时时间
        var r = node.func(id);
        if (!r) r = 0;
        return (node.time = r);
    };

    /// 循环所有定时器 (删除已经结束的定时器)
    for (var id in o) {
        if (x(id) <= 0) delete o[id];
    }
}


/**
 * 添加定时器
 * @param {Function} func 定时器处理函数
 * @param {Number} time 定时器超时时间
 * @param {Boolean} loop 定时器是否循环 (默认:'否')
 * @param {String} name 定时器名称
 */
function timer_add(func, time, loop, name) {
    if (!func) return 0;
    if (!time) time = 0;
    if (!loop) loop = false;
    var o = timer_all();
    if (!(++timer_idx)) timer_idx = 1;
    o[timer_idx] = {
        "name": name,
        "id": timer_idx,
        "func": func,
        "time": time,
        "loop": loop,
        "count": 0,
        "run": 0
    };
    return timer_idx;
}


/**
 * 删除定时去
 * @param {Object} id 定时器索引
 */
function timer_del(id) {
    var o = timer_all();
    if (o[id]) delete o[id];
}


/**
 * 删除所有定时器
 */
function timer_clr() {
    var o = timer_all();
    for (var id in o) {
        delete o[id];
    }
}


/**
 * 设置定时器 (时间)
 * @param {Object} id 定时器索引
 * @param {Number} time 定时器超时时间
 */
function timer_set(id, time, loop) {
    var o = timer_all();
    if (o[id]) {
        if (!time) time = 0;
        if (!loop) loop = false;
        o[id].time = time;
    }
}


/**
 * 设置定时器 (节点 {"func":func,"time":time,"loop":loop})
 * @param {Object} id 
 */
function timer_get(id) {
    var o = timer_all();
    return o[id];
}


/**
 * dump定时器
 */
function timer_dump() {
    var o = timer_all();
    print_obj_member(o, printlog, "timer list");
}

