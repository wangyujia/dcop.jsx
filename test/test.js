/// js/test/test.js


load('js/base/base.js');
load('js/base/timer.js');
load('js/app/iot/dump.js');
load('js/app/iot/format.js');
load('js/app/iot/channel.js');
load('js/app/iot/config.js');
load('js/app/iot/control.js');
load('js/app/iot/notify.js');
load('js/app/iot/edge/modbus.js');
load('js/app/iot/edge/dl645_1997.js');



/// all test cases
var test_all = function() {
    var all = {};

    return function() {
        return all;
    };
} ();

/// one test case
function TEST_CASE(a, f) {
    printlog("add test case '" + a + "'");
    add_obj_method(test_all(), a, f);
}



/// =================================================================
load('js/test/test_buf.js');
load('js/test/test_channel.js');
load('js/test/test_config.js');
load('js/test/test_control.js');
load('js/test/test_dll.js');
load('js/test/test_fib.js');
load('js/test/test_file.js');
load('js/test/test_gis.js');
load('js/test/test_httpc.js');
load('js/test/test_timer.js');
load('js/test/test_transfer.js');
/// =================================================================



/*
dump-script.js: -p, -f, main.js, -e, test
dump-script.js: -p, -f, main.js, -e, test, -a, test_case
*/
function test() {
    var t = {success:0,failure:0};
    var o = test_all();
    var i = 0;
    var x = function(a) {
        var f = o[a];
        if (!f) {
            printlog("'" + a + "' not found!");
            return;
        }
        printlog("=========== TEST(" + i + ") '" + a + "' START ===========");
        var r = f();
        if ((typeof(r) == "boolean") && (!r)) {
            if (!t.first_fail) t.first_fail = {i:i,a:a};
            printlog("(testcase(" + i + ") '" + a + "' failed!)");
            t.failure++;
        } else {
            t.success++;
        }
        printlog("=========== TEST(" + i + ") '" + a + "' END =============");
        ++i;
    };

    printlog('test arguments.length: ' + arguments.length);
    print_obj_member(arguments, printlog);
    if (!arguments.length || ((arguments.length == 1) && (!arguments[0]))) {
        for (var a in o) {
            x(a);
        }
    } else {
        for (var i in arguments) {
            var str = arguments[i].split(',');
            for (var m in str) {
                x(str[m]);
            }
        }
    }

    printlog("TOTAL   : " + i);
    printlog("SUCCESS : " + t.success);
    printlog("FAILURE : " + t.failure);
    if (t.failure > 0) {
        printlog("(first failed: testcase(" + 
            t.first_fail.i + ")'" + 
            t.first_fail.a + "')");
    }

    return "done!";
}


/// =================================================================
TEST_CASE('test_json', function() {
    var str = '{"a":100,"b":[1,2,3,"x"],"c":"ab中文cd"}';
    printlog('input: ' + str);
    var obj = Duktape.dec('jc', str);
    print_obj_member(obj, printlog);
    var out = Duktape.enc('jc', obj);
    printlog('output: ' + out);
    var obj = Duktape.dec('jc', '{"type":"request","command":"update-led-all","arg":[{"content":"\u5ddd\u4e5d\u8defCJ1\u6807\u4e2d\u7530\u5c71\u96a7\u9053\uff0c\u603b\u957f488\u7c73\uff0c\u9884\u8ba1\u6295\u8d44200\u4ebf\u5143\uff0c\u7531\u56db\u5ddd\u5ddd\u4ea4\u8def\u6865\u6709\u9650\u8d23\u4efb\u516c\u53f8\u627f\u4e8e2018-10-01\u5f00\u59cb\u65bd\u5de5\uff0c\u5df2\u5b8c\u62100.4%\uff0c\u5b89\u5168\u751f\u4ea785\u5929\u3002","fontName":"\u9ed1\u4f53","fontSize":"10","height":60.0,"id":2,"model":"proInfo","show":true,"width":480.0,"x":0.0,"y":0.0},{"content":"\u518d\u6b21\u8868\u8fbe\u6b22\u8fce\u4f60","fontName":"\u9ed1\u4f53","fontSize":"10","height":60.0,"id":5,"model":"custom","show":true,"width":480.0,"x":0.0,"y":0.0}]}');
    print_obj_member(obj, printlog, 'decode');
});
/// =================================================================
TEST_CASE('test_get_set', function() {
    var m_i = 100;
    var o = {};
    add_obj_method(o, 'get i', function() {
        return m_i;
    });
    printlog('o.i: ' + o.i);
});
/// =================================================================
TEST_CASE('test_args', function() {
    function test_args1() {
        print_obj_member(arguments, printlog);
    }
    test_args1();
    test_args1("a","b","c");
    function test_args2(a,b) {
        print_obj_member(arguments, printlog);
    }
    test_args2("a","b","c");
});
/// =================================================================
TEST_CASE('test_random', function() {
    for (var i = 0; i < 10; i++) {
        printlog(Math.floor(Math.random()*7));
    }
});
/// =================================================================
TEST_CASE('test_object', function() {
    var o = {
        [1]: 16,
        [7]: 17,
        [6]: 18,
        [5]: 19,
    };
    print_obj_member(o, printlog);
    printlog("o[0]:" + o[0]);
    printlog("o['1']:" + o['1']);
    printlog("o[1]:" + o[1]);
    printlog("o[7]:" + o[7]);
    printlog("o[6]:" + o[6]);
    printlog("o[5]:" + o[5]);
});
/// =================================================================
TEST_CASE('test_eval', function() {
    printlog("test_eval_func123: " + typeof(test_eval_func123));
    var n = 321;
    // var r = eval("(function test_eval_func123(num) {return num+123;})(n);");
    var f = eval("function test_eval_func123(num) {return num+123;}");
    var r = test_eval_func123(n);
    printlog("test_eval_func123: " + typeof(test_eval_func123));
    printlog("eval r: " + r);
});
/// =================================================================
TEST_CASE('test_array_indexof', function() {
    var a = ['a', '123', 'bcd', 'ef', '5rt6'];
    var b = 'bcd';
    var c = a.indexOf(b);
    printlog('indexOf: ' + c);
    if (c < 0) return false;
});
/// =================================================================
TEST_CASE('test_promise', function() {
    printlog('promise: ' + typeof(Promise));
});
/// =================================================================
TEST_CASE('test_func_name', function() {
    function test_local() {}
    printlog('get_func_name: ' + get_func_name(test_local));
});
/// =================================================================
TEST_CASE('test_call_stack', function() {
    printlog('get_call_stack: ' + get_call_stack());
});
/// =================================================================
TEST_CASE('test_global_object', function() {
    if (this.global) {
        print_obj_member(global, printlog, 'global');
    }
    if (typeof(global) != "undefined") {
        printlog('global exists!');
        print_obj_member(global, printlog, 'global');
    } else {
        printlog('global not exists!');
    }
    if (typeof(window) != "undefined") {
        printlog('window exists!');
        print_obj_member(window, printlog, 'window');
    } else {
        printlog('window not exists!');
    }
    if (typeof(window) != "undefined" && window.global_export_module) {
        window.global_export_module('pipeline', {
            door_init: door_init,
            door_event: door_event
        });
    } else {
        printlog("window no 'global_export_module' member!");
    }
    console.log(' *** load pipeline module (window is ' + typeof(window) + ')');
    if (typeof(window) != "undefined") {
        console.log(' *** global_export_module ' + (('global_export_module' in window)? 'in':'not in') + ' window');
        if (window.global_export_module) {
            window.global_export_module('pipeline', {
                door_init: door_init,
                door_event: door_event
            });
            console.log('pipeline module registered!');
        }
    }
});
/// =================================================================
TEST_CASE('test_print', function() {
    print();
    print('');
    print('one');
    print('one', 'two');
    print('one', 'two', 'three');
    println();
    println('');
    println('one');
    println('one', 'two');
    println('one', 'two', 'three');
    printlog();
    printlog('');
    printlog('one');
    printlog('one', 'two');
    printlog('one', 'two', 'three');
    printlog('one', 'two', 'three', 1234);
    printlog(get_time_stamp());
    trace('trace test');
});
/// =================================================================
TEST_CASE('test_spechar', function() {
    var obj = Duktape.dec('jc', '{"a":"\u33a5"}');
    print_obj_member(obj, printlog);
    var out = Duktape.enc('jc', {a:'?',b:'㎡'});
    printlog('output: ' + out);
    printlog('?' + '㎡');
});
/// =================================================================
TEST_CASE('test_closure1', function() {
    var a = [{o:1},{o:2},{o:3},{o:4}];
    function regcb(i, f) {
        a[i].f = f;
    }
    function creator(i, node) {
        regcb(i, function() {
            print_obj_member(node, printlog, 'index: ' + i);
        });
    }
    for (var i = 0; i < a.length; ++i) {
        creator(i, a[i]);
    }
    for (var i = 0; i < a.length; ++i) {
        a[i].f();
    }
});
/// =================================================================
TEST_CASE('test_closure2', function() {
    var a = [{o:1},{o:2},{o:3},{o:4}];
    function regcb(i, f) {
        a[i].f = f;
    }
    for (var i = 0; i < a.length; ++i) {
        var node = a[i];
        regcb(i, function() {
            print_obj_member(node, printlog, 'index: ' + i);
        });
    }
    for (var i = 0; i < a.length; ++i) {
        a[i].f();
    }
});
/// =================================================================
TEST_CASE('test_closure3', function() {
    var a = [];
    function HA_Connect(ip, port, username, password) {
        a.push({ip:ip, port:port, username:username, password:password});
        return a.length - 1;
    }
    function HA_RegFaceRecoCb(cam, cb) {
        a[cam].cb = cb;
    }
    function door_haface_creator(node) {
        print_obj_member(node, trace, 'door_haface_creator node');
        /// 创建设备运行实例
        if (node && node.hard && node.hard.fromip) {
            var ip = node.hard.fromip;
            var port = node.hard.fromport || 9527;
            var username = node.hard.username || "admin";
            var password = node.hard.password || "admin";
            var cam = HA_Connect(ip, port, username, password);
            printlog('door_haface_dll connect ' + ip + ':' + port + ' cam: ' + cam + 
                ' username: ' + username + ' password: ' + password);
            var FaceRecoCb = function(node) {
                return function(cam, name, id, role, matched) {
                    printlog('door_haface_dll getting_face cam: ' + cam + 
                        ' name: ' + name + ' id: ' + id + 
                        ' role: ' + role + ' matched: ' + matched);
                    print_obj_member(node, printlog, 'door_haface_creator node');
                };
            };
            HA_RegFaceRecoCb(cam, // FaceRecoCb(node));
                function(cam, name, id, role, matched) {
                    printlog('door_haface_dll getting_face cam: ' + cam + 
                        ' name: ' + name + ' id: ' + id + 
                        ' role: ' + role + ' matched: ' + matched);
                    print_obj_member(node, printlog, 'door_haface_creator node');
                }
            );
        }
    
        return node;
    }
    var dev_list = [
        {
            hard: {fromip:"127.0.0.1",username:"test1"},
        },
        {
            hard: {fromip:"127.0.0.2",username:"test2"}
        },
        {
            hard: {fromip:"127.0.0.3",username:"test3"}
        },
        {
            hard: {fromip:"127.0.0.4",username:"test4"}
        }
    ];
    for (var i = 0 ; i < dev_list.length; ++i) {
        var node = dev_list[i];
        door_haface_creator(node);
    }
    for (var i = 0; i < a.length; ++i) {
        var f = a[i].cb;
        f(i, a[i].username, a[i].ip+':'+a[i].port, 10+i, 90+i);
    }
});
