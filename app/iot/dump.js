/// js/app/iot/dump.js
/**
 * DUMP开关设置和获取
 */



/**
 * DUMP开关值
 */
var dump_switch_value = "";
var dump_switch_arglist = [];


/**
 * DUMP路由表
 */
var dump_switch_table = {};


/**
 * 
 * @param {String} value 命令值
 * @param {Function} dump DUMP函数
 */
function dump_switch_command(value, dump) {
    if (typeof(value) == "undefined") {
        return dump_switch_table;
    }

    if (typeof(dump) == "undefined") {
        return dump_switch_table[value];
    }

    dump_switch_table[value] = dump;
}


/**
 * 
 * @param {Stirng} value DUMP命令值
 */
function dump_switch_dispatch(value, arglist) {
    if (!value) value = "";

    if (value != 'test') {
        dump_switch_value = value;
        channel_dump_switch(value);
        dump_switch_arglist = arglist;
    }

    var func = dump_switch_command(value);
    if (func) func(arglist);
}


/**
 * dump控制信息
 */
function dump_switch_dump() {
    print_obj_member(dump_switch_table, printlog, "dump switch list");
}


/**
 * 初始化时加载
 */
(function() {
    var oninit = function() {
        dump_switch_command("dump", dump_switch_dump);

        if (typeof(timer_dump) != "undefined") {
            dump_switch_command("timer", timer_dump);
        }

        dump_switch_command("root", function() {
            print_obj_member(door_root, printlog, "door root manager");
        });
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('dump', {oninit: oninit});
    }
}) ();

