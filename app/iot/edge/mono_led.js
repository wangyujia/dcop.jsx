/// js/app/iot/edge/mono_led.js
/**
 * 物联网边缘侧单色LED对接
 */



/**
 * 单色LED命令参数
 *  arg: {
 *      screen: {
 *          width: 192,
 *          height: 144,
 *          sendType: 0,
 *          sendAddr: "192.168.1.100:6101"
 *      },
 *      areas: [
 *          {
 *              type: "text",
 *              x: 0,
 *              y: 0,
 *              width: 192,
 *              height: 144,
 *              content: "...",
 *              fontName: "Arial",
 *              fontSize: 12,
 *              fontColor: {
 *                  red: 255,
 *                  green: 0,
 *                  blue: 0
 *              },
 *              fontStyle: 4,
 *              showEffect: 0,
 *              showSpeed: 25,
 *              clearType: 201,
 *              stayTime: 3
 *          },
 *          {
 *              type: "time",
 *              x: 0,
 *              y: 0,
 *              width: 192,
 *              height: 144
 *          }
 *      ]
 *  }
 */


 /**
  * 单色LED动态库对象
  */
var mono_led_dll = null;


/**
 * 加载单色LED动态库对象
 */
function mono_led_load_dll() {
    if (!mono_led_dll) {
        var dll = dlls.create();
        if (!dll || !dll.ptr) return null;
        var rc = dll.load('led.dll');
        if (rc != 0) return null;
        mono_led_dll = dll;
    }

    return mono_led_dll;
}


/**
 * 单色LED添加区域
 * @param {Object} dll 动态库对象
 * @param {Number} pid 程序ID
 * @param {Array} areas 区域数组
 * @param {String} dump_switch DUMP开关
 */
function mono_led_add_area(dll, pid, areas, dump_switch) {
    if (!areas) return;

    for (var i in areas) {
        var node = areas[i];
        if (!node) continue;
        var border_path = (node.border)? "1.bmp" : null;
        var aid = dll.Hd_AddArea(pid, node.x, node.y, 
            node.width, node.height, border_path, 3, 5);
        if (!node.type || node.type == "text") {
            mono_led_add_text(dll, aid, node, dump_switch);
        }
        else if (node.type == "time") {
            mono_led_add_time(dll, aid, node, dump_switch);
        }
    }
}


/**
 * 单色LED添加文字
 * @param {Object} dll 动态库对象
 * @param {Number} aid 区域ID
 * @param {Object} node 文字属性
 * @param {String} dump_switch DUMP开关
 */
function mono_led_add_text(dll, aid, node, dump_switch) {
    var text = node.content;
    var red = (node.fontColor && node.fontColor.red)? node.fontColor.red : 255;
    var green = (node.fontColor && node.fontColor.green)? node.fontColor.green : 0;
    var blue = (node.fontColor && node.fontColor.blue)? node.fontColor.blue : 0;
    var color = dll.Hd_GetColor(red, green, blue);
    var background = 0;
    var fontStyle = (node.fontStyle)? node.fontStyle : 4; // 4; // | 0x0100 | 0x0200;
    var fontName = (node.fontName)? node.fontName : "Arial";
    var fontSize = (node.fontSize)? node.fontSize : 9; // 12; // 24;
    var showEffect = (node.showEffect)? node.showEffect : 0;
    var showSpeed = (node.showSpeed)? node.showSpeed : 25;
    var clearType = (node.clearType)? node.clearType : 201;
    var stayTime = (node.stayTime)? node.stayTime : 3;
    var tid = dll.Hd_AddSimpleTextAreaItem(aid, text, color, background, 
        fontStyle, fontName, fontSize, showEffect, showSpeed, clearType, stayTime);
    if (dump_switch == "all" || dump_switch == "led") {
        printlog('Hd_AddSimpleTextAreaItem tid:' + tid);
    }
}


/**
 * 单色LED添加时间
 * @param {Object} dll 动态库对象
 * @param {Number} aid 区域ID
 * @param {Object} node 时间属性
 * @param {String} dump_switch DUMP开关
 */
function mono_led_add_time(dll, aid, node, dump_switch) {
    /*
    var showMode = (node.showMode)? node.showMode : 2;
    var showDate = (node.showDate)? node.showDate : 1;
    var dateStyle = (node.dateStyle)? node.dateStyle : 5;
    var showWeek = (node.showWeek)? node.showWeek : 1;
    var weekStyle = (node.weekStyle)? node.weekStyle : 0;
    var showTime = (node.showTime)? node.showTime : 1;
    var timeStyle = (node.timeStyle)? node.timeStyle : 3;
    var red = (node.fontColor && node.fontColor.red)? node.fontColor.red : 255;
    var green = (node.fontColor && node.fontColor.green)? node.fontColor.green : 0;
    var blue = (node.fontColor && node.fontColor.blue)? node.fontColor.blue : 0;
    var color = dll.Hd_GetColor(red, green, blue);
    var fontName = (node.fontName)? node.fontName : "Arial";
    var fontSize = (node.fontSize)? node.fontSize : 9;
    var tid = dll.Hd_AddTimeAreaItem(aid, showMode, 
        showDate, dateStyle, showWeek, weekStyle, showTime, 
        timeStyle, color, fontName, fontSize);
    if (dump_switch == "all" || dump_switch == "led") {
        printlog('Hd_AddTimeAreaItem tid:' + tid);
    }
    */
}


/**
 * 单色LED添加文字
 * @param {Object} o 命令对象
 * @param {Object} data 响应对象
 * @param {String} dump_switch DUMP开关
 */
function mono_led_update_all(o, data, dump_switch) {
    if (dump_switch == "all" || dump_switch == "led") {
        print_obj_member(o, printlog, 'mono_led_update_all');
    }

    if (dcop.os != "windows") {
        data.error = "windows only";
        return false;
    }

    if (!o || !o.arg || !o.arg.screen || !o.arg.areas) {
        data.error = "led command arg error";
        return false;
    }

    var dll = mono_led_load_dll();
    if (!dll) {
        data.error = "led dll load fail";
        return false;
    }

    if (dump_switch == "all" || dump_switch == "led") {
        print_obj_member(dll, printlog, 'dll load');
    }

    var width = o.arg.screen.width;
    var height = o.arg.screen.height;
    var r = dll.Hd_CreateScreen(width, height, 0, 1, 0);
    if (dump_switch == "all" || dump_switch == "led") {
        printlog('create screen ' + width + '*' + height + ' ret:' + r);
    }

    var pid = dll.Hd_AddProgram(5);
    if (dump_switch == "all" || dump_switch == "led") {
        printlog('Hd_AddProgram pid:' + pid);
    }

    mono_led_add_area(dll, pid, o.arg.areas, dump_switch);

    var sendType = o.arg.screen.sendType;
    var sendAddr = o.arg.screen.sendAddr;
    var r = dll.Hd_SendScreen(sendType, sendAddr);
    if (dump_switch == "all" || dump_switch == "led") {
        printlog('Hd_SendScreen ret:' + r);
    }
    return (r == 0)? true : false;
}



/**
 * 初始化时给控制通道注册命令
 */
(function() {
    var oninit = function() {
        control_command('update-led-all', {
            process: mono_led_update_all
        });
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('mono_led', {oninit: oninit});
    }
}) ();


