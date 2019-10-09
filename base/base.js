/// js/base/base.js : 基础封装


/**
 * 为对象添加函数 (利用闭包对参数数量不同的函数进行重载)
 * var x = 1;
 * var o = {};
 * 如果成员函数有返回(非undefined)，则返回具体返回值
 * add_obj_method(o, 'value', function() {
 *     return x;
 * });
 * 如果成员函数没有返回(undefined)，则返回对象o本身(this);
 * add_obj_method(o, 'value', function(y) {
 *     x = y;
 * });
 * o.value(100).value();
 * @param {Object} o 目的对象
 * @param {String} a 方法名称
 * @param {Function} f 方法函数
 * @returns {undefined} 无返回值
 */
function add_obj_method(o, a, f) {
    var t = o[a];

    o[a] = function() {
        var r;
        if (f.length === arguments.length) {
            r = f.apply(this, arguments);
        } else if (typeof(t) === 'function') {
            r = t.apply(this, arguments);
        } else {
            r = f.apply(this, arguments);
        }

        return (typeof(r) == 'undefined')? this : r;
    }
}


/**
 * 获取函数名称
 * @param {Function} f 函数
 */
function get_func_name(f) {
    if (typeof(f) == 'function' || typeof(f) == 'object') {
        var name = ('' + f).match(/function\s*([\w\$]*)\s*\(/);
    }

    return name && name[1];
}


/**
 * 获取函数调用栈
 */
function get_call_stack() {
    var s = [];
    var caller = arguments.callee.caller;
    // printlog('callee: ' + arguments.callee);
    // printlog('caller: ' + get_call_stack.caller);

    while (caller) {
        s.unshift(get_func_name(caller));
        caller = caller && caller.caller;
    }

    return s;
}


/**
 * 获取保留指定位数的浮点数
 * @param {Number} number 被处理的浮点数
 * @param {Number} n 要保留的小数位数
 */
function get_float_fixed(number, n) {
    n = n ? parseInt(n) : 0;
    if (n <= 0) return Math.round(number);
    number = Math.round(number * Math.pow(10, n)) / Math.pow(10, n);
    return number;
};


/**
 * 打印对象
 * @param {Object} o 对象
 * @param {Function} f 打印
 * @param {String} a 名称
 * @param {Stirng} p 前缀
 */
function print_obj_member(o, f, a, p) {
    var type = function(o) {
        if (Object.prototype.toString.call(o) == "[object Object]") return '<object>';
        if (Object.prototype.toString.call(o) == "[object Array]")  return '<array>';
        return '<' + typeof(o) + '>';
    };
    if (!f) f = print;
    if (!p) p = '';
    if (!a) a = '';
    else    a = '' + a + ': ';
    if (typeof(o) != 'object') {
        if (Object.prototype.toString.call(o) == "[object String]") {
            return f(p + a + "'" + o + "'  " + type(o));
        }
        return f(p + a + o + '  ' + type(o));
    }

    f(p + a + type(o));
    for (var a in o) {
        print_obj_member(o[a], f, a, p + '    ');
    }

    if (typeof(Duktape) != "undefined" && o) {
        var fin = Duktape.fin(o);
        if (fin) f(p + '  __destroy__: ' + fin);
    }
}


/**
 * 获取时间戳
 */
function get_time_stamp() {
    var d = new Date();
    var f = function(t, n) {
        var s = '' + t;
        if (s.length < n) {
            var m = '';
            for (var i = s.length; i < n; ++i) {
                m += '0';
            }
            s = m + s;
        }
        return s;
    };
    return '' + f(d.getFullYear(), 4) + '-' + 
        f(1+d.getMonth(), 2) + '-' + 
        f(d.getDate(), 2) + ' ' + 
        f(d.getHours(), 2) + ':' + 
        f(d.getMinutes(), 2) + ':' + 
        f(d.getSeconds(), 2) + '.' + 
        f(d.getMilliseconds(), 3);
}
