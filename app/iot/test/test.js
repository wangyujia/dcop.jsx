/// js/app/iot/test/test.js
/**
 * 测试设备数据
 */


var iot_test_import = function() {
    load('js/app/iot/test/test_ping.js');
    load('js/app/iot/test/test_radar.js');
    load('js/app/iot/test/test_filetrans.js');
    load('js/app/iot/test/test_device.js');
};



/**
 * 所有IOT测试用例
 */
var iot_test_all = function() {
    var all = {};

    return function() {
        return all;
    };
} ();


/**
 * 
 * @param {String} a 测试用例名称
 * @param {Function} f 测试入口函数
 */
function IOT_TEST_CASE(a, f) {
    printlog("add iot test case '" + a + "'");
    add_obj_method(iot_test_all(), a, f);
}


/**
 * IOT测试入口
 */
function iot_test_entry(arglist) {
    iot_test_import();
    var t = {success:0,failure:0};
    var o = iot_test_all();
    var i = 0;
    var x = function(a) {
        var f = o[a];
        if (!f) {
            printlog("iot testcase(" + i + ") '" + a + "' not found!");
            return;
        }
        printlog("=========== IOT TEST(" + i + ") '" + a + "' START ===========");
        var r = f();
        if ((typeof(r) == "boolean") && (!r)) {
            if (!t.first_fail) t.first_fail = {i:i,a:a};
            printlog("iot testcase(" + i + ") '" + a + "' failed!");
            t.failure++;
        } else {
            t.success++;
        }
        printlog("=========== IOT TEST(" + i + ") '" + a + "' END =============");
        ++i;
    };

    print_obj_member(arglist, printlog, "iot test arglist");
    if (!arglist.length || ((arglist.length == 1) && (!arglist[0]))) {
        for (var a in o) {
            x(a);
        }
    } else {
        for (var i in arglist) {
            var str = arglist[i].split(',');
            for (var m in str) {
                x(str[m]);
            }
        }
    }

    printlog("TOTAL   : " + i);
    printlog("SUCCESS : " + t.success);
    printlog("FAILURE : " + t.failure);
    if (t.failure > 0) {
        printlog("(first failed: iot testcase(" + 
            t.first_fail.i + ")'" + 
            t.first_fail.a + "')");
    }

    return "done!";
}


/**
 * 初始化时加载静态配置
 */
(function() {
    var oninit = function() {
        if (typeof(dump_switch_command) != "undefined") {
            dump_switch_command("test", iot_test_entry);
        }
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('test', {oninit: oninit});
    }
}) ();
