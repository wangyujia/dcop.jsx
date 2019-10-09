/// door.ui.js : 基于原生开发动态H5Canvas和DOM界面



/// 输出到模块中
console.log(' *** load pipeline(version:1.1.5) module (window is ' + typeof(window) + ')');
if (typeof(window) != "undefined") {
    console.log(' *** global_export_module ' + 
        (('global_export_module' in window)? 'in':'not in') + ' window');
    if (window.global_export_module) {
        window.global_export_module('pipeline', {
            door_init: door_init,
            door_event: door_event
        });
        console.log(' *** pipeline module registered!');
    } else {
        console.log(' *** pipeline module not registered!');
    }
}



/**
 * 全局入口
 */
var door_global = null;                 // 全局对象 (就是window本身)
var door_phone  = false;                // 是否在手机上
var door_touch  = false;                // 是否支持触屏
var door_ratio  = null;                 // 像素描述信息
var door_mode   = "edit";               // 编辑模式
var door_root   = null;                 // 根对象管理器
var door_main   = null;                 // 入口主元素
var door_data   = null;                 // 配置数据
var door_done   = null;                 // 初始化完成的回调
var door_edit   = null;                 // 编辑对象



/**
 * 对Date的扩展，将 Date 转化为指定格式的String
 */
Date.prototype.Format = function (fmt) {
    var milli_sec_str = function(t) {
        var s;
        var m = t.getMilliseconds();
        if (m < 10) s = "00" + m.toString();
        else if (m < 100) s = "0" + m.toString();
        else s = m.toString();
        return s;
    };
    var o = {
        "M+": this.getMonth() + 1,                      // 月份
        "d+": this.getDate(),                           // 日
        "h+": this.getHours(),                          // 小时
        "m+": this.getMinutes(),                        // 分
        "s+": this.getSeconds(),                        // 秒
        "q+": Math.floor((this.getMonth() + 3) / 3),    // 季度
        "S":  milli_sec_str(this)                       // 毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1)? 
            (o[k]) : 
            (("00" + o[k]).substr(("" + o[k]).length))
        );
    }
    return fmt;
};


/**
 * 发送和接收ajax请求
 *  door_ajax({
 *      type: "POST",
 *      url: "ajax/data",
 *      dataType: "json",
 *      data: {"val1":"abc","val2":123,"val3":"456"},
 *      beforeSend: function(xhr, url, request) {
 *          /// some js code
 *      },
 *      success: function(response) {
 *          console.log(response)
 *      },
 *      error: function() {
 *          console.log("error")
 *      }
 *  });
 */
function door_ajax() {
    var ajaxData = {
        type: arguments[0].type || "GET", 
        url: arguments[0].url || "", 
        async: arguments[0].async || "true", 
        data: arguments[0].data || null, 
        dataType: arguments[0].dataType || "text", 
        contentType: arguments[0].contentType || "application/x-www-form-urlencoded", 
        beforeSend: arguments[0].beforeSend || function() {}, 
        success: arguments[0].success || function() {}, 
        error: arguments[0].error || function() {} 
    };

    var createXmlHttpRequest = function() {
        var window = door_global;
        if (window && window.ActiveXObject) {
            return new ActiveXObject("Microsoft.XMLHTTP");
        } else if (window && window.XMLHttpRequest) {
            return new XMLHttpRequest();
        }
    };

    var convertData = function(data) {
        if ( typeof(data) === 'object' ) {
            var convertResult = "";
            for (var c in data) {
                convertResult += c + "=" + data[c] + "&";
            }
            convertResult = convertResult.substring(0, convertResult.length - 1);
            return convertResult;
        } else {
            return data; 
        } 
    };

    var appendData = function(url, data) {
        if (!url || !data) return url;
        var index = url.indexOf('?');
        if (index < 0) return url + '?' + data;
        if (index == (url.length - 1)) return url + data;
        return url + '&' + data;
    };

    var xhr = createXmlHttpRequest();
    if (!xhr) return;
    var url = ajaxData.url;
    var request = convertData(ajaxData.data);
    if (ajaxData.type == 'GET') { url = appendData(url, request); request = null; }
    xhr.responseType = ajaxData.dataType;
    xhr.open(ajaxData.type, url, ajaxData.async);
    xhr.setRequestHeader("Content-Type", ajaxData.contentType);
    ajaxData.beforeSend(xhr, url, request);
    xhr.send(request);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if(xhr.status == 200) {
                ajaxData.success(xhr.response);
            } else {
                ajaxData.error();
            }
        }
    };
}


/**
 * 对象管理层次 *
 *      +----------------+
 *      |   door_root    |
 *      +----------------+      [owner]        +--------+
 *      |  door_manager  | ------------------> | window |
 *      +--+----------+--+                     +--------+
 *         |          |          [list]
 * [method]|          +-------------------+
 *    add/del/get/                        |                                                  +-------+
 *    find/clear/        +----------------+----------------+                                 |  DOM  |
 *    debug/dump/        |                |                |                                 +---^---+
 *    front/back/        |                |                v                                     |
 *  publish/subscribe    |         +------v-------+       ...[others]                            |[entry]
 *                       |         |    "tool"    |                                              |
 *                       |         +--------------+             [owner]               +----------+---------+
 *                       |         | door_manager | --------------------------------> | door_objCanvasTool | -----+
 *                       |         +--------------+                                   +----------+---------+      |
 *                       |                                                            |   door_objElement  |      |
 *                       |                                                            +----------+---------+      |
 *                       |                                                            |   type   | element |      |
 *                       |                                                            +----------+---------+      |
 *                       |                                                                                        |
 *                       |                                    +-------+                                           |
 *                       |                                    |  DOM  |                                           |
 *                       |                                    +---^---+                                           |
 *                       |                                        |                                               |
 *                +------v-------+                                |[entry]                                        |
 *                |    "main"    |                                |                                               |
 *                +--------------+       [owner]       +----------+---------+                  [owner]            |
 *                | door_manager | ------------------> | door_objCanvasMain | <-----------------------------------+
 *                +--+--------+--+                     +----------+---------+
 *                   |        |                        |   door_objCanvas   |
 *           [method]|        |[list]                  +----------+---------+
 *                  ...       |                        |   main   |  temp   | (使用双缓冲)
 *                       +----+----+                   +----------+---------+
 *                       |         |                              |
 *                      ...      object                           | (绘画对象)
 *                                                                |
 *                                                              -----
 * (paint) --------------------------------------------------- <ondraw> ----+ (绘画时先更新到绘画管理器临时画布上)
 * (flush) -----------------------------------------------------------------+ (刷新时从临时画布上更新到真实画布上)
 * 
 * 事件传递层次 *
 *  root        onxxxx|on('xxxx') 指定对象接收，或者进行广播到所有对象
 *  owner       先在列表中分发事件，然后调用owner处理 (owner是单一对象)
 *  object/...  实现onxxxx处理单一事件，或者实现on处理所有事件
 * 
 * 继承关系层次 *
 *  manager 提供对象列表管理接口和事件分发接口，全局有个root管理器的入口
 *  object  继承并重写了manager接口，draw管理器本身是root的子对象，
 *          奇妙的是draw内部管理绘画对象又利用了root管理器的能力 (内
 *          部有个局部root管理器)
 */



/**
 * 初始化入口
 * @param {Object} global 窗体对象 (建议为{Window}对象)
 * @param {String} mode "edit" | "show" 编辑还是显示
 * @param {String} main 主元素ID
 * @param {Object} data 已有数据
 *  data 主要内容为: {
 *      bgpicUrl: "...",                // 背景图url
 *      bgpicScale: 1                   // 背景图比例 (1个背景图的像素对应多少米)
 *      showList: "large"|300,          // 列表显示模式: "none":不显示,"small":小显示,"large":大显示(默认),数字代表自定义宽度
 *      showOutline: "large"|300,       // 大纲显示模式: "none":不显示,"small":小显示,"large":大显示(默认),数字代表自定义宽度
 *      showArea: "none",               // 区域显示详情: "none":不显示,其他显示(默认)
 *      zoomLevel: 50,                  // 默认缩放大小
 *      zoomLevelMin: 20,               // 最小缩放大小
 *      zoomLevelMax: 500,              // 最大缩放大小
 *      zoomLevelStep: 10,              // 单步缩放大小
 *      startPos: {x:100,y:0},          // 默认开始位置
 *      pipeLines: [
 *          {
 *              name: "...",            // 名称
 *              id: 101,                // id
 *              points: [{x:0,y:0}],    // 坐标点列表
 *              length: 100             // 长度多少米
 *          }, 
 *          { ... }
 *      ],
 *      editId: 101,                    // 被编辑的管道ID
 *      editMode: "double" | "single",  // 默认双击编辑模式还是单击编辑模式
 *      onsaving: function(data) { ... }
 *      ... ...
 *  }
 * @param {Function} done 初始化完成回调
 */
function door_init(global, mode, main, data, done) {
    door_global = global;
    door_mode = mode;
    door_main = main;
    door_data = data;
    door_done = done;
    door_root = door_manager(global);
    
    if (global && Object.prototype.toString.call(global) == "[object Window]") {
        var window = global;
        window.$door = function(name) {
            if (!name) return door_root;
            return door_root.get(name);
        };

        door_ratio = {devicePixelRatio: window.devicePixelRatio || 1};

        if (/Android|webOS|iPhone|iPod|BlackBerry/i.test(window.navigator.userAgent)) door_phone = true;
        door_touch = ('ontouchstart' in window) || window.DocumentTouch && window.document instanceof DocumentTouch;

        door_elementEvent(window, 'load', door_onload);
        door_elementEvent(window, 'resize', door_onsize);

        if (document.readyState == "complete") door_onload(null);
    }
}


/**
 * 事件入口
 * @param {String}  event 事件名称
 * @param {Object}   para 事件数据 - 为对象类型时发布事件
 * @param {Function} para 事件数据 - 为函数类型时订阅事件
 * @param {String} recver 事件接收者
 * @returns 事件订阅或者发布结果
 */
function door_event(event, para, recver) {
    if (!door_root) return;
    var rc;
    if (typeof(para) == "function") {
        rc = door_root.subscribe(event, para);
    } else {
        rc = door_root.publish(event, para, recver);
    }
    return rc;
}


/**
 * 对象管理器
 * @param {Object} owner 所有者对象
 * @returns {Object} 管理器对象
 */
function door_manager(owner) {
    var debug = 0;
    var list = [];
    var subscribes = {};
    var o = {
        list: list,
        owner: owner,
        add: function(name, object, index) {
            if (!name) return this;
            if (this.find(name) >= 0) return this;
            var o = {name:name,object:object};
            if (typeof(index) == "undefined") list.push(o);
            else list.splice(index, 0, o);
            if (object) object.name = name;
            return this;
        },
        del: function(name) {
            if (!name) return this;
            var index = this.find(name);
            if (index < 0) return this;
            list.splice(index, 1);
            return this;
        },
        get: function(name) {
            if (!name) return list;
            var index = this.find(name);
            if (index < 0) return null;
            return list[index].object;
        },
        find: function(name) {
            var index = -1;
            for (var i = 0; i < list.length; ++i) {
                if (list[i].name == name) {
                    index = i;
                    break;
                }
            }
            return index;
        },
        clear: function() {
            if (!list.length) return this;
            list.slice(0, list.length);
            return this;
        },
        debug: function(level) {
            if (typeof(level) == "undefined") return debug;
            debug = level;
            return this;
        },
        dump: function(print, prefix) {
            if (!print) print = console.log;
            if (!prefix) prefix = '';
            print((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
                prefix + 'list count:' + list.length);
            for (var i = 0; i < list.length; ++i) {
                print((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
                    prefix + '  ' + i + ' name:' + list[i].name);
                if (list[i].object && list[i].object.dump) {
                    list[i].object.dump(print, '    ');
                }
            }
            return this;
        },
        front: function(name) {
            var index = this.find(name);
            if (index < 0) return this;
            var object = list[index].object;
            list.splice(index, 1);
            return this.add(name, object);
        },
        back: function(name) {
            var index = this.find(name);
            if (index < 0) return this;
            var object = list[index].object;
            list.splice(index, 1);
            list.splice(0, 0, {name:name,object:object});
            return this;
        },
        publish: function(event, data, recver, sender) {
            if (!event) return this;
            if (!sender) sender = this;
            var func = 'on' + event;
            /// 处理单个对象的事件
            var proc = function(object) {
                if (!object) return;
                var rc;
                if (typeof(object) == "function") {
                    rc = object({data:data, sender:sender});
                } else if (object[func]) {
                    rc = object[func]({data:data, sender:sender});
                } else if (object.publish) {
                    rc = object.publish(event, data, null, sender);
                }
                return rc;
            };
            var rc;
            /// 有指定接收者，则调用接收者进行事件处理
            if (recver) {
                rc = proc(this.get(recver));
            }
            /// 无指定接收者，则在所有接收者和所有者中进行事件广播
            else {
                for (var i = 0; i < list.length; ++i) {
                    rc = proc(list[i].object);
                    if (typeof(rc) == "boolean" && !rc) {
                        break; // 返回false，不再继续分发
                    }
                }
                /// 广播后再调用owner进行事件处理
                rc = proc(owner);
            }
            if (typeof(rc) == "boolean" && !rc) {
                return rc; // 返回false，不再继续分发
            }
            /// 分发订阅的事件
            var dispatch = function(nodes) {
                if (!nodes) return;
                var rc;
                for (var i = 0; i < nodes.length; ++i) {
                    rc = proc(nodes[i]);
                    if (typeof(rc) == "boolean" && !rc) {
                        break; // 返回false，不再继续分发
                    }
                }
                return rc;
            };
            /// 分发订阅指定的事件
            rc = dispatch(subscribes[event]);
            if (typeof(rc) == "boolean" && !rc) {
                return rc; // 返回false，不再继续分发
            }
            /// 分发订阅所有的事件
            rc = dispatch(subscribes['']);
            return (typeof(rc) == "undefined")? this : rc;
        },
        subscribe: function(event, object) {
            if (typeof(event) == "undefined") return subscribes;
            if (typeof(object) == "undefined") return subscribes[event];
            if (!subscribes[event]) subscribes[event] = [];
            subscribes[event].push(object);
            return this;
        }
    };

    if (owner) {
        owner.manager = o;
        if (owner.onmanaged) {
            owner.onmanaged();
        }
    }

    return o;
}


/**
 * 响应加载事件
 * @param {Event} e 事件
 */
function door_onload(e) {
    console.log("============================================");
    console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        "door_mode: " + door_mode + ", door_main: " + door_main);
    console.log("============================================");
    console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        "on custom loaded: " + navigator.userAgent);

    door_loadEntry();

    door_onsize(null);

    if (door_done) door_done();
}

/**
 * 响应大小改变事件
 * @param {Event} e 事件
 */
function door_onsize(e) {
    var entry = document.getElementById(door_main);
    var size  = door_elementSize(entry);
    console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        "on custom resize: (" + size.w + "," + size.h + ")");

    door_root.publish('size', {size:size});
    door_root.publish('draw', {size:size});
    door_root.publish('show', {size:size});
}


/**
 * 获取可视视图大小
 * @param {Element} element 指定元素
 * @returns {Object} 大小对象
 */
function door_elementSize(element) {
    if (!element) {
        var document = door_global.document;
        if (!document) return;
        return {
            w: document.documentElement.clientWidth  || document.body.clientWidth, 
            h: document.documentElement.clientHeight || document.body.clientHeight
        };
    }

    return {
        w: element.offsetWidth,
        h: element.offsetHeight
    };
}


/**
 * 窗体坐标转换为画布坐标
 * @param {Element} element 画布元素对象
 * @param {Number} x X坐标点
 * @param {Number} y Y坐标点
 */
function door_elementPos(element, x, y){
    /*
        在element对象上调用getBoundingClientRect()方法，
        来获取element元素的边界框，
        该边界框的坐标是相对于整个窗口的。
        然后返回一个对象，该对象的x、y属性分别对应于鼠标在canvas之中的坐标
    */
    var bbox = element.getBoundingClientRect();
    if (!bbox) return;
    return {
        x: Math.round((x - bbox.left) * (element.width  / bbox.width)), 
        y: Math.round((y - bbox.top)  * (element.height / bbox.height))
    };
}


/**
 * 捕获元素事件
 * @param {Element} element 窗体元素
 * @param {String} event 窗体事件
 * @param {Function} handler 处理函数
 */
function door_elementEvent(element, event, handler) {
    if (!element) return;
    if (element.addEventListener) {
        element.addEventListener(event, handler, false);
    } else if (element.attachEvent) {
        element.attachEvent('on' + event, handler);
    } else {
        element['on' + event] = handler;
    }
}


/**
 * 注册管理对象
 * @param {String} owner 所有者对象名
 * @param {Object} object 绘画对象
 * @param {String} name 绘画对象名
 * @returns {Object} 所有者对象或者绘画对象
 *  /// 没有name时，这里会给owner所属的object自动加上manager
 */
function door_regObject(owner, object, name) {
    if (!door_root.get(owner)) {
        door_root.add(owner, door_manager(object));
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "manager('" + owner + "') added!");
    }

    if (typeof(name) != "undefined") {
        door_root.get(owner).add(name, object);
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "object('" + owner + '.' + name + "') added!");
    }

    return object;
}


/**
 * 获取管理对象
 * @param {String} owner 所有者对象名
 * @param {String} name 绘画对象名
 * @returns {Object} 所有者对象或者绘画对象
 * /// 没有name时，这里会返回owner对应的manager的原始对象
 */
function door_getObject(owner, name) {
    var object = door_root.get(owner);
    if (!object) return null;

    if (typeof(name) == "undefined") {
        return (object.owner)? object.owner : object;
    }

    return object.get(name);
}


/**
 * 加载入口
 */
function door_loadEntry() {
    if (!door_main) return;
    var entry = document.getElementById(door_main);
    if (!entry) return;

    entry.innerHTML = "";
    door_root.clear();
    door_edit = null;

    var main = door_objCanvasMain("pipelines_main", entry);
    door_regObject("main", main);
    var mainContext = main.main.context;
    door_ratio.backingStoreRatio = mainContext.webkitBackingStorePixelRatio ||
                                   mainContext.mozBackingStorePixelRatio ||
                                   mainContext.msBackingStorePixelRatio ||
                                   mainContext.oBackingStorePixelRatio ||
                                   mainContext.backingStorePixelRatio || 1;

    var tool = door_objCanvasTool("pipelines_tool", entry, main);
    door_regObject("tool", tool);
    var zoom = door_objCanvasZoom("pipelines_zoom", entry, main);
    door_regObject("zoom", zoom);
    var tips = door_objCanvasTips("pipelines_tips", entry);
    door_regObject("tips", tips);
    var list = door_objCanvasList("pipelines_list", entry, main);
    door_regObject("list", list);
    var outl_entry = door_data.outline;
    if (!outl_entry) outl_entry = entry;
    var outl = door_objCanvasOutl("pipelines_outl", outl_entry, main, list);
    door_regObject("outl", outl);

    var bgpic = door_objCanvasMainBgPic(main);
    door_regObject("main", bgpic, "bgpic");

    list.append_all_lines(door_data.pipeLines);
    door_root.publish('reset', null, "main");

    var area = door_objCanvasArea("pipelines_area", entry, main, list);
    door_regObject("area", area);

    var alarm = door_objCanvasAlarm("pipelines_alarm", entry, main, list);
    door_regObject("alarm", alarm);

    var device = door_objCanvasDevice(main);
    door_regObject("device", device);

    if (door_mode == 'edit') {
        door_edit = door_regObject("edit", door_objCanvasEdit(main));
        door_regObject("line", door_objCanvasLine(main));
        // var tool = door_getObject('tool');
        // if (tool && tool.start_edit_mode) {
        //     tool.start_edit_mode(
        //         (door_data.editMode == "double")? "double" : "single"
        //     );
        // }
    }

    door_event('init');
}


/**
 * 画布对象
 * @param {String} name 画布名称
 * @param {Element} entry 入口对象
 * @returns {Object} 画布对象
 * @description 内部使用主画布和临时画布进行双缓冲绘画
 *      在ondraw事件中，由各个子对象把元素画到临时画布上
 *      在onshow事件中，再统一从临时画布复制到主画布上
 *  (有入口参数entry，会创建一个画布元素(即:主画布)作为entry的子元素，有名称参数name的话会设置这个子元素id为name)
 *  (无入口参数entry，如果有名称参数name的话，会从全局文档中获取id为name的元素作为主画布)
 *  (临时画布元素始终会创建)
 */
function door_objCanvas(name, entry) {
    var document = door_global.document;
    if (!document) return;

    var mainCanvas;
    var mainContext;
    if (entry) {
        mainCanvas = document.createElement("canvas");
        if (name) mainCanvas.id = name;
        entry.appendChild(mainCanvas);
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            'create and append main canvas: ' + name);
    } else {
        if (name) mainCanvas = document.getElementById(name);
    }
    if (mainCanvas) {
        mainContext = mainCanvas.getContext("2d");
    }

    var tempCanvas = document.createElement("canvas");
    var tempContext = tempCanvas.getContext("2d");
    console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        'create temp canvas: ' + name);

    return {
        name: name,
        entry: entry,
        main: {
            canvas: mainCanvas,
            context: mainContext
        },
        temp: {
            canvas: tempCanvas,
            context: tempContext
        }
    };
}


/**
 * 元素对象
 * @param {String} name 画布名称
 * @param {Element} entry 入口对象
 * @param {String} type 标签类型
 * @returns {Object} 画布对象
 * @description 内部创建一个或者获取一个元素对象
 *      (有入口参数entry，创建一个类型为type的元素作为entry的子元素，有名称参数name的话会设置这个子元素id为name)
 *      (无入口参数entry，如果有名称参数name的话，会从全局文档中获取id为name的元素)
 */
function door_objElement(name, entry, type) {
    var document = door_global.document;
    if (!document) return;

    var element;
    if (entry) {
        element = document.createElement(type);
        if (name) element.id = name;
        entry.appendChild(element);
    }
    else {
        if (name) element = document.getElementById(name);
    }

    return {
        name: name,
        entry: entry,
        type: type,
        element: element
    };
}


/**
 * 主画布对象
 * @param {String} name 主画布名称
 * @param {Element} entry 入口对象
 * @returns {String} 主画布对象
 */
function door_objCanvasMain(name, entry) {
    var o = door_objCanvas(name, entry);

    o.onreset = function() {
        o.zoom = 50;
        if (typeof(door_data.zoomLevel) != "undefined" && door_data.zoomLevel > 0) {
            o.zoom = door_data.zoomLevel;
        }

        if (!o.pos) o.pos = {x:0, y:0};
        else { o.pos.x = 0; o.pos.y = 0; }
        if (typeof(door_data.startPos) != "undefined") {
            if (typeof(door_data.startPos.x) != "undefined") {
                o.pos.x = door_data.startPos.x;
            }
            if (typeof(door_data.startPos.y) != "undefined") {
                o.pos.y = door_data.startPos.y;
            }
        }

        if (typeof(door_data.zoomLevel) == "undefined" || door_data.zoomLevel <= 0 || 
            typeof(door_data.startPos) == "undefined" || 
            typeof(door_data.startPos.x) == "undefined" || 
            typeof(door_data.startPos.y) == "undefined") {
            var list = door_getObject('list');
            if (list) {
                var r = list.range_all_lines();
                if (r) {
                    var bstZoomWidth  = parseInt(((o.main.canvas.offsetWidth - 270) * 100) / r.width);
                    var bstZoomHeight = parseInt(((o.main.canvas.offsetHeight - 60) * 100) / r.height);
                    var bstZoom = (bstZoomWidth < bstZoomHeight)? bstZoomWidth : bstZoomHeight;
                    if (bstZoom > 100) bstZoom = 100;
                    else bstZoom = parseInt(bstZoom / 10) * 10;
                    if (typeof(door_data.zoomLevel) == "undefined" || door_data.zoomLevel <= 0) {
                        o.zoom = bstZoom;
                    }
                    if (typeof(door_data.startPos) == "undefined" || typeof(door_data.startPos.x) == "undefined") {
                        o.pos.x += ((o.main.canvas.offsetWidth - 270) / 2) - ((r.center.x * o.zoom) / 100);
                    }
                    if (typeof(door_data.startPos) == "undefined" || typeof(door_data.startPos.y) == "undefined") {
                        o.pos.y += ((o.main.canvas.offsetHeight - 60) / 2) - ((r.center.y * o.zoom) / 100);
                    }
                }
            }
        }

        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "main('" + name + "') onreset:", o.zoom, o.pos);
    };

    o.onreset();

    var scaleCanvas = function(event) {
        event.preventDefault();
        var e = window.event || event; // old IE support
        var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
        if (!delta) return;
        // console.log(delta+"->"+ e.wheelDelta+'->'+ e.detail);
        var zoom = door_getObject('zoom');
        if (zoom) { 
            if (delta > 0) zoom.zoom_in(1);
            else zoom.zoom_out(1);
        }
    };

    var mainCanvas = o.main.canvas;
    door_elementEvent(mainCanvas, 'mousewheel', scaleCanvas);
    mainCanvas.innerHTML = "浏览器不兼容";
    var tempCanvas = o.temp.canvas;
    o.onsize = function(e) {
        var size = e.data.size;
        var w = size.w;
        var h = size.h;
        mainCanvas.style.width  = w + 'px';
        mainCanvas.style.height = h + 'px';
        tempCanvas.style.width  = w + 'px';
        tempCanvas.style.height = h + 'px';
        mainCanvas.width  = w;
        mainCanvas.height = h;
        tempCanvas.width  = w;
        tempCanvas.height = h;
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "main('" + name + "') onsize: " + size.w + ' * ' + size.h + 
        //     ', ' + mainCanvas.width + ' * ' + mainCanvas.height + 
        //     ', ' + tempCanvas.width + ' * ' + tempCanvas.height);
    };

    var mainContext = o.main.context;
    mainContext.lineWidth = 3;
    mainContext.strokeStyle = "royalblue";
    o.onshow = function(e) {
        /// clearRect只能清除矩形，不能清除线段等，需要重设大小才能整体清空
        mainCanvas.width  = mainCanvas.width;
        mainCanvas.height = mainCanvas.height;
        mainContext.beginPath();
        mainContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        mainContext.drawImage(tempCanvas, 0, 0);
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "main('" + name + "') onshow: " + mainCanvas.width + '*' + mainCanvas.height + 
        //     " from temp: " + tempCanvas.width + '*' + tempCanvas.height);
    };

    /// 是否被拖动中
    var dragging = false;
    o.dragging = function() { return dragging; };
    var dragged = false;
    o.dragged = function() { return dragged; };

    var tmpx = 0;
    var tmpy = 0;
    var mousecursor_bak = null;
    var onmousemove = function(e) {
        var pos = door_elementPos(mainCanvas, e.clientX, e.clientY);
        var x = pos.x;
        var y = pos.y;
        o.mouse = {x:x,y:y};
        if (dragging) {
            var offx = x - tmpx;
            var offy = y - tmpy;
            if (offx && offy) {
                /// 坐标变了才是真的拖动
                if (!dragged) {
                    mousecursor_bak = mainCanvas.style.cursor;
                    mainCanvas.style.cursor = 'move';
                    dragged = true;
                }
                o.pos.x += offx;
                o.pos.y += offy;
                tmpx = x;
                tmpy = y;
                door_root.get("main").publish('draw').publish('show');
                door_root.get('main').publish('dragging', {mouse:o.mouse});
                door_root.publish('text', {text:'拖动位置:' + o.pos.x + ',' + o.pos.y}, 'tips');
            }
        } else {
            door_root.get("main").publish('mousemove', {x:x,y:y});
            door_root.publish('text', {text:'鼠标位置:' + x + ',' + y}, 'tips');
        }

        if (door_edit) {
            var last = door_edit.last();
            if (last) {
                var dash_bak = mainContext.getLineDash();
                door_root.get("main").publish('show');
                mainContext.lineWidth = 3;
                mainContext.strokeStyle = 'royalblue';
                mainContext.setLineDash([10, 5]);
                mainContext.lineCap = 'round';
                mainContext.beginPath();
                mainContext.moveTo(last.x, last.y);
                mainContext.lineTo(x, y);
                mainContext.stroke();
                mainContext.setLineDash(dash_bak);
                // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
                //     "main edit last: " + last.x + ',' + last.y + 
                //     " -> " + x + ',' + y);
            }
        }
    };

    var onmouseout = function(e) {
        door_root.get("main").publish('show');
    };

    var onmousemove_bak = null;
    var onmouseup_bak = null;
    var onmousedown = function(e) {
        var window = door_global;
        if (!window) return;
        var document = window.document;
        if (!document) return;
        /// 捕获鼠标事件 (否则无法获取范围外的鼠标事件)
        if (mainCanvas.setCapture) {
            onmousemove_bak = document.onmousemove;
            onmouseup_bak = document.onmouseup;
            document.onmousemove = onmousemove;
            document.onmouseup = onmouseup;
            mainCanvas.setCapture();
        } else if (window.captureEvents) {
            onmousemove_bak = window.onmousemove;
            onmouseup_bak = window.onmouseup;
            window.onmousemove = onmousemove;
            window.onmouseup = onmouseup;
            window.captureEvents(Event.MOUSEMOVE | Event.MOUSEUP);
        }
        var pos = door_elementPos(mainCanvas, e.clientX, e.clientY);
        tmpx = pos.x;
        tmpy = pos.y;
        dragging = true;
        dragged = false;
    };

    var onmouseup = function(e) {
        if (dragging) {
            /// 取消鼠标捕获 (否则会影响范围外的鼠标事件)
            if (mainCanvas.releaseCapture) {
                mainCanvas.releaseCapture();
                document.onmousemove = onmousemove_bak;
                document.onmouseup = onmouseup_bak;
            } else if (window.releaseEvents) {
                window.releaseEvents(Event.MOUSEMOVE | Event.MOUSEUP);
                window.onmousemove = onmousemove_bak;
                window.onmouseup = onmouseup_bak;
            }
            if (dragged) mainCanvas.style.cursor = mousecursor_bak;
            dragging = false;
        }
    };

    mainCanvas.onmousemove = onmousemove;
    mainCanvas.onmouseout = onmouseout;
    mainCanvas.onmousedown = onmousedown;
    mainCanvas.onmouseup = onmouseup;

    return o;
}


/**
 * 画布工具对象
 * @param {String} name 画布工具名称
 * @param {Element} entry 入口对象
 * @param {Object} owner 所有者对象
 * @returns {String} 画布工具对象
 */
function door_objCanvasTool(name, entry, owner) {
    var o = door_objElement(name, entry, 'div');

    /// 所有模式都使用的复位按钮，在全局分发时间
    var onreset_cb;
    var childReset = door_objElement(name+'_reset', o.element, 'div');
    childReset.element.innerHTML = '<i class="fa fa-circle-thin" aria-hidden="true"></i>';
    // childReset.element.title = "复位";
    childReset.element.onclick = function(e) {
        if (onreset_cb) onreset_cb();
        door_root.publish('reset', null, "main");
        door_root.publish('draw',  null, "main");
        door_root.publish('show',  null, "main");
    };

    /// 信息提示
    var childTips = door_objElement(name+'_tips', o.element, 'div');
    childTips.element.innerHTML = '';
    entry.onmouseout = function(e) {
        childTips.element.innerHTML = '';
    };
    childReset.element.onmousemove = function(e) {
        childTips.element.innerHTML = '复位到默认视图方式';
    };

    /// 只在编辑模式下使用编辑按钮，在本管理内进行分发
    /// (加入到管理器中才会开始创建编辑模式的按钮)
    if (door_mode == 'edit') {
        o.onmanaged = function() {
            var manager = o.manager;
            if (!door_data.editType || door_data.editType == "device") {
                var childMarkDvice = door_objElement(name+'_mark_device', o.element, 'div');
                childMarkDvice.element.innerHTML = '<i class="fa fa-map-marker" aria-hidden="true"></i>';
                childMarkDvice.element.onclick = function(e) {
                    manager.publish('markdevice', {element:childMarkDvice.element});
                };
                childMarkDvice.element.onmousemove = function(e) {
                    childTips.element.innerHTML = '添加设备并标记位置';
                };
            }

            if (!door_data.editType || door_data.editType == "line") {
                var childEditPipe = door_objElement(name+'_edit_pipe', o.element, 'div');
                childEditPipe.element.innerHTML = '<i class="fa fa-pencil" aria-hidden="true"></i>';
                childEditPipe.element.onclick = function(e) {
                    manager.publish('editpipe', {element:childEditPipe.element});
                };
                childEditPipe.element.onmousemove = function(e) {
                    childTips.element.innerHTML = '用线条标记管道走向';
                };
            }

            var childUndo = door_objElement(name+'_undo', o.element, 'div');
            childUndo.element.innerHTML = '<i class="fa fa-undo"></i>';
            childUndo.element.onclick = function(e) {
                manager.publish('undo');
            };
            childUndo.element.onmousemove = function(e) {
                childTips.element.innerHTML = '撤销当前的编辑操作';
            };

            var childSave = door_objElement(name+'_save', o.element, 'div');
            childSave.element.innerHTML = '<i class="fa fa-floppy-o" aria-hidden="true"></i>';
            childSave.element.onclick = function(e) {
                manager.publish('save');
            };
            childSave.element.onmousemove = function(e) {
                childTips.element.innerHTML = '保存当前的编辑操作';
            };

            var childDrop = door_objElement(name+'_drop', o.element, 'div');
            childDrop.element.innerHTML = '<i class="fa fa-trash-o" aria-hidden="true"></i>';
            childDrop.element.onclick = function(e) {
                manager.publish('drop');
            };
            childDrop.element.onmousemove = function(e) {
                childTips.element.innerHTML = '放弃当前的编辑操作';
            };
        };
    }


    /*
    var childMark;
    var childEdit;
    var childUndo;
    var childDevice;
    var childSave;
    var childDrop;
    if (door_mode == 'edit') {
        childMark = door_objElement(name+'_mark', o.element, 'div');
        childMark.element.innerHTML = '<i class="fa fa-map-marker" aria-hidden="true"></i>';
        childMark.element.title = "标记";

        childEdit = door_objElement(name+'_edit', o.element, 'div');
        childEdit.element.innerHTML = '<i class="fa fa-pencil" aria-hidden="true"></i>';
        childEdit.element.title = "编辑";

        childDevice = door_objElement(name+'_device', o.element, 'div');
        childDevice.element.innerHTML = '<i class="fa fa-window-maximize" aria-hidden="true"></i>';
        childDevice.element.title = "设备";

        childUndo = door_objElement(name+'_undo', o.element, 'div');
        childUndo.element.innerHTML = '<i class="fa fa-undo"></i>';
        childUndo.element.title = "撤销";

        childSave = door_objElement(name+'_save', o.element, 'div');
        childSave.element.innerHTML = '<i class="fa fa-floppy-o" aria-hidden="true"></i>';
        childSave.element.title = "保存";

        childDrop = door_objElement(name+'_drop', o.element, 'div');
        childDrop.element.innerHTML = '<i class="fa fa-trash-o" aria-hidden="true"></i>';
        childDrop.element.title = "丢弃";

        var element_bak;
        var background_bak;
        var cursor_bak;
        var enter_edit_mode = function(dblclicked, element) {
            if (door_edit) {
                var ret = door_edit.mark(dblclicked);
                if (!ret) return false;
                element_bak.style.background = background_bak;
                element.style.background = "royalblue";
                element_bak = element;
                return true;
            }
            door_edit = door_getObject("edit");
            if (!door_edit) door_edit = door_regObject("edit", door_objCanvasEdit(owner));
            door_edit.enter(dblclicked);
            background_bak = element.style.background;
            cursor_bak = owner.main.canvas.style.cursor;
            element.style.background = "royalblue";
            owner.main.canvas.style.cursor = "crosshair";
            element_bak = element;
            return true;
        }
        var leave_edit_mode = function() {
            if (!door_edit) return false;
            element_bak.style.background = background_bak;
            owner.main.canvas.style.cursor = cursor_bak;
            door_edit.leave();
            door_edit = null;
            return true;
        }
        onreset_cb = leave_edit_mode;

        childMark.element.onclick = function(e) {
            if (!enter_edit_mode("double", childMark.element)) {
                leave_edit_mode();
                door_root.publish('draw',  null, "main");
                door_root.publish('show',  null, "main");
            }
        };
        childEdit.element.onclick = function(e) {
            if (!enter_edit_mode("single", childEdit.element)) {
                leave_edit_mode();
                door_root.publish('draw',  null, "main");
                door_root.publish('show',  null, "main");
            }
        };
        var editDeviceBgBak;
        childDevice.element.onclick = function(e) {
            var device = door_getObject("device");
            if (!device) return;
            if (!device.isEditMode()) {
                leave_edit_mode();
                editDeviceBgBak = childDevice.element.style.background;
                childDevice.element.style.background = "royalblue";
                device.enterEditMode();
            } else {
                childDevice.element.style.background = editDeviceBgBak;
                device.leaveEditMode();
            }
        };
        childSave.element.onclick = function(e) {
            door_root.publish('saving', {func:door_data.onsaving}, "edit");
        };
        childDrop.element.onclick = function(e) {
            door_root.publish('clear', null, "edit");
        };
        childUndo.element.onclick = function(e) {
            door_root.publish('undo', null, "edit");
        };

        o.start_edit_mode = function(mode) {
            if (mode == "double") {
                childMark.element.click();
            } else if (mode == "single") {
                childEdit.element.click();
            }
        }
    }
    */

    /*
    var childSetting = door_objElement(name+'_setting', o.element, 'div');
    childSetting.element.innerHTML = '<i class="fa fa-cog" aria-hidden="true"></i>';
    childSetting.element.title = "设置";

    var childHelp = door_objElement(name+'_help', o.element, 'div');
    childHelp.element.innerHTML = '<i class="fa fa-question" aria-hidden="true"></i>';
    childHelp.element.title = "帮助";
    */

    return o;
}


/**
 * 画布缩放对象
 * @param {String} name 画布缩放名称
 * @param {Element} entry 入口对象
 * @param {Object} owner 所有者对象
 * @returns {String} 画布缩放对象
 */
function door_objCanvasZoom(name, entry, owner) {
    var o = door_objElement(name, entry, 'div');

    var childAdd = door_objElement(name+'_add', o.element, 'div');
    childAdd.element.innerHTML = '<i class="fa fa-plus" aria-hidden="true"></i>';
    // childAdd.element.title = "放大";

    var childSpt = door_objElement(name+'_spt', o.element, 'div');
    
    var childDel = door_objElement(name+'_del', o.element, 'div');
    childDel.element.innerHTML = '<i class="fa fa-minus" aria-hidden="true"></i>';
    // childDel.element.title = "缩小";

    var childVal = door_objElement(name+'_val', o.element, 'div');
    var showZoomValue = function(val) {
        var pre = (val < 100)? '&nbsp;' : '';
        return '<center>' + pre + val + '%</center>';
    };
    childVal.element.innerHTML = showZoomValue(owner.zoom);

    var zoomLevelMax = 200;
    if (typeof(door_data.zoomLevelMax) != "undefined" && door_data.zoomLevelMax > 0) {
        zoomLevelMax = door_data.zoomLevelMax;
    }
    var zoomLevelMin = 20;
    if (typeof(door_data.zoomLevelMin) != "undefined" && door_data.zoomLevelMin > 0) {
        zoomLevelMin = door_data.zoomLevelMin;
    }
    var zoomLevelStep = 10;
    if (typeof(door_data.zoomLevelStep) != "undefined" && door_data.zoomLevelStep > 0) {
        zoomLevelStep = door_data.zoomLevelStep;
    }
    var keep_center = function(mouse_step) {
        var cx = (mouse_step)? owner.mouse.x : ((owner.main.canvas.offsetWidth - 270) / 2);
        var cy = (mouse_step)? owner.mouse.y : ((owner.main.canvas.offsetHeight - 60) / 2);
        var x = (cx - owner.pos.x) * 100 / owner.zoom;
        var y = (cy - owner.pos.y) * 100 / owner.zoom;
        return {x:x,y:y};
    };
    var zoom_in = function(mouse_step) {
        if (owner.zoom >= zoomLevelMax) return;
        var center_old = keep_center(mouse_step);
        if (!mouse_step) {
            owner.zoom += zoomLevelStep;
            owner.zoom = parseInt(owner.zoom / zoomLevelStep) * zoomLevelStep;
        } else {
            owner.zoom += mouse_step;
        }
        if (owner.zoom > zoomLevelMax) owner.zoom = zoomLevelMax;
        var center_new = keep_center(mouse_step);
        owner.pos.x += (center_new.x - center_old.x) * owner.zoom / 100;
        owner.pos.y += (center_new.y - center_old.y) * owner.zoom / 100;
        childVal.element.innerHTML = showZoomValue(owner.zoom);
        door_root.get("main").publish('draw').publish('show');
    };
    var zoom_out = function(mouse_step) {
        if (owner.zoom <= zoomLevelMin) return;
        var center_old = keep_center(mouse_step);
        if (!mouse_step) {
            owner.zoom -= zoomLevelStep;
            owner.zoom = parseInt(owner.zoom / zoomLevelStep) * zoomLevelStep;
        } else {
            owner.zoom -= mouse_step;
        }
        if (owner.zoom < zoomLevelMin) owner.zoom = zoomLevelMin;
        var center_new = keep_center(mouse_step);
        owner.pos.x += (center_new.x - center_old.x) * owner.zoom / 100;
        owner.pos.y += (center_new.y - center_old.y) * owner.zoom / 100;
        childVal.element.innerHTML = showZoomValue(owner.zoom);
        door_root.get("main").publish('draw').publish('show');
    };
    childAdd.element.onclick = function(e) {
        zoom_in();
        // if (owner.zoom >= zoomLevelMax) return;
        // var center_old = keep_center();
        // owner.zoom += zoomLevelStep;
        // if (owner.zoom > zoomLevelMax) owner.zoom = zoomLevelMax;
        // var center_new = keep_center();
        // owner.pos.x += (center_new.x - center_old.x) * owner.zoom / 100;
        // owner.pos.y += (center_new.y - center_old.y) * owner.zoom / 100;
        // childVal.element.innerHTML = showZoomValue(owner.zoom);
        // door_root.get("main").publish('draw').publish('show');
    };
    childDel.element.onclick = function(e) {
        zoom_out();
        // if (owner.zoom <= zoomLevelMin) return;
        // var center_old = keep_center();
        // owner.zoom -= zoomLevelStep;
        // if (owner.zoom < zoomLevelMin) owner.zoom = zoomLevelMin;
        // var center_new = keep_center();
        // owner.pos.x += (center_new.x - center_old.x) * owner.zoom / 100;
        // owner.pos.y += (center_new.y - center_old.y) * owner.zoom / 100;
        // childVal.element.innerHTML = showZoomValue(owner.zoom);
        // door_root.get("main").publish('draw').publish('show');
    };

    o.onreset = function() {
        childVal.element.innerHTML = showZoomValue(owner.zoom);
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "zoom onreset: " + owner.zoom);
    };
    door_root.get("main").subscribe('reset', o);

    o.zoom_in = zoom_in;
    o.zoom_out = zoom_out;

    return o;
}


/**
 * 主画布背景图片对象
 * @param {Object} owner 所有者对象
 * @returns {Object} 主画布背景图片对象
 */
function door_objCanvasMainBgPic(owner) {
    /// 直接更新到所有者的画布上(临时画布)
    var canvas = owner.temp.canvas;
    var context = owner.temp.context;
    var redraw = function(e) {
        var x = owner.pos.x;
        var y = owner.pos.y;
        var w = canvas.width;
        var h = canvas.height;
        var m = owner.zoom;
        context.clearRect(0, 0, w, h);
        if (e) context.drawImage(e, x, y, e.width*m/100, e.height*m/100);
    };

    var loaded = false;
    var image = new Image();
    if (door_data.bgpicUrl) {
        image.onload = function() {
            console.log('bg pic: ' + door_data.bgpicUrl + ' loaded');
            loaded = true;
            door_root.get("main").publish('bgpic');
            redraw(image);
            door_root.publish('draw').publish('show');
        };
        image.src = door_data.bgpicUrl;
    }

    return {
        image: image,
        ondraw: function() {
            redraw((loaded)? image : null);
        }
    };
}


/**
 * 画布编辑对象
 * @param {Object} owner 所有者对象
 */
function door_objCanvasEdit(owner) {
    var o = door_objCanvas();

    /// 重绘函数
    var m_list = [];
    var m_index = -1;
    var m_flush = false;
    var m_info = {x:0,y:0,m:0};
    var ownerMainCanvas = owner.main.canvas;
    var ownerTempContext = owner.temp.context;
    var selfTempCanvas = o.temp.canvas;
    var selfTempContext = o.temp.context;
    selfTempCanvas.width  = ownerMainCanvas.width;
    selfTempCanvas.height = ownerMainCanvas.height;
    var redraw = function() {
        selfTempContext.lineWidth = 3;
        selfTempContext.strokeStyle = 'royalblue';
        selfTempContext.lineCap = 'round';
        selfTempContext.beginPath();
        selfTempContext.clearRect(0, 0, selfTempCanvas.width, selfTempCanvas.height);
        m_info.x = owner.pos.x;
        m_info.y = owner.pos.y;
        m_info.m = owner.zoom;
        var prex; var prey;
        for (var i = 0; i < m_list.length; ++i) {
            var n = m_list[i];
            var x = n.x * m_info.m / 100 + m_info.x;
            var y = n.y * m_info.m / 100 + m_info.y;
            if (i > 0) {
                selfTempContext.beginPath();
                selfTempContext.moveTo(prex, prey);
                selfTempContext.lineTo(x, y);
                selfTempContext.stroke();
            }
            selfTempContext.beginPath();
            selfTempContext.arc(x, y, 5, 0, 2*Math.PI);
            selfTempContext.stroke();
            prex = x; prey = y;
        }
    };

    /// 初始化进行一次重绘
    redraw();

    o.onsize = function(e) {
        if ((selfTempCanvas.width  == ownerMainCanvas.width) && 
            (selfTempCanvas.height == ownerMainCanvas.height)) {
            return;
        }
        selfTempCanvas.width  = ownerMainCanvas.width;
        selfTempCanvas.height = ownerMainCanvas.height;
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "edit onsize: " + selfTempCanvas.width + ' * ' + selfTempCanvas.height);
        redraw();
    };

    o.ondraw = function() {
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "edit ondraw to main temp: (" + m_info.x + ',' + m_info.y + ')(' + 
        //     owner.pos.x + ',' + owner.pos.y + ')');
        /// 如果偏移位置变了，还是要重绘临时画布
        if ((m_info.x != owner.pos.x) || (m_info.y != owner.pos.y) || (m_info.m != owner.zoom) || m_flush) {
            m_flush = false;
            redraw();
        }

        /// 始终复制整个临时画布
        ownerTempContext.drawImage(selfTempCanvas, 0, 0);
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "edit ondraw to main temp");
    };

    /// 订阅'main'的大小和重绘事件
    door_root.get("main").subscribe('draw', o);

    /// 标记点击处理
    var mark_click_dbl;
    var mark_click_bak;
    var mark_click = function(e) {
        if (owner.dragged()) return;
        m_info.x = owner.pos.x;
        m_info.y = owner.pos.y;
        m_info.m = owner.zoom;
        var pos = door_elementPos(ownerMainCanvas, e.clientX, e.clientY);
        var curx = (pos.x - m_info.x) * 100 / m_info.m;
        var cury = (pos.y - m_info.y) * 100 / m_info.m;
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
                "edit mark_click offset:(" + m_info.x + ',' + m_info.y + 
                '), zoom:' + m_info.m + ', curr:(' + pos.x + ',' + pos.y + 
                '|' + curx + ',' + cury + ')');
        if (m_list.length > 0) {
            var node = m_list[m_list.length - 1];
            if (curx == node.x && cury == node.y) return;
            var prex = node.x * m_info.m / 100 + m_info.x;
            var prey = node.y * m_info.m / 100 + m_info.y;
            console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
                "edit mark_click: from(" + prex + ',' + prey + 
                ')->(' + pos.x + ',' + pos.y + ')');
            selfTempContext.lineCap = 'round';
            selfTempContext.beginPath();
            selfTempContext.moveTo(prex, prey);
            selfTempContext.lineTo(pos.x, pos.y);
            selfTempContext.stroke();
        }

        m_list.push({x:curx,y:cury});
        selfTempContext.beginPath();
        selfTempContext.arc(pos.x, pos.y, 5, 0, 2*Math.PI);
        selfTempContext.stroke();
        door_root.get("main").publish('draw').publish('show');
    };

    /// 编辑对象
    var edit_obj;
    var element_bak;
    var background_bak;
    var cursor_bak;
    var enterEdit = function(elm) {
        if (edit_obj && edit_obj.onenter) {
            edit_obj.onenter(elm);
            element_bak = elm;
            background_bak = elm.style.background;
            cursor_bak = owner.main.canvas.style.cursor;
            elm.style.background = "royalblue";
            owner.main.canvas.style.cursor = "crosshair";
        }
    };
    var leaveEdit = function() {
        if (edit_obj && edit_obj.onleave) {
            edit_obj.onleave();
            if (element_bak) element_bak.style.background = background_bak;
            owner.main.canvas.style.cursor = cursor_bak;
            element_bak = null;
            background_bak = null;
            cursor_bak = null;
        }
    };

    /// 编辑对象选择
    o.onselect = function(obj, elm) {
        leaveEdit();
        if (edit_obj && obj && edit_obj == obj) edit_obj = null;
        else {
            edit_obj = obj;
            enterEdit(elm);
        }
    };
    o.onundo = function() {
        if (edit_obj && edit_obj.onundo) {
            edit_obj.onundo();
        }
    };
    o.onsave = function() {
        if (edit_obj && edit_obj.onsaving) {
            edit_obj.onsaving();
        }
        leaveEdit();
        edit_obj = null;
    };
    o.ondrop = function() {
        if (edit_obj && edit_obj.ondrop) {
            edit_obj.ondrop();
        }
        leaveEdit();
        edit_obj = null;
    };

    /// '初始化'事件
    o.oninit = function() {
        var tool = door_root.get('tool');
        if (tool && tool.subscribe) {
            tool.subscribe('undo', this);
            tool.subscribe('save', this);
            tool.subscribe('drop', this);
        }
    };

    o.enter = function(dblclicked, obj) {
        if (dblclicked == "double") {
            mark_click_bak = ownerMainCanvas.ondblclick;
            ownerMainCanvas.ondblclick = mark_click;
            mark_click_dbl = "double";
        } else {
            mark_click_bak = ownerMainCanvas.onclick;
            ownerMainCanvas.onclick = mark_click;
            mark_click_dbl = "single";
        }
    };
    o.leave = function() {
        if (mark_click_dbl == "double") {
            ownerMainCanvas.ondblclick = mark_click_bak;
            mark_click_dbl = null;
        } else if (mark_click_dbl == "single") {
            ownerMainCanvas.onclick = mark_click_bak;
            mark_click_dbl = null;
        }
    };
    o.mark = function(dblclicked) {
        var ret = false;
        if (mark_click_dbl == "double" && dblclicked == "single") {
            ownerMainCanvas.ondblclick = mark_click_bak;
            mark_click_bak = ownerMainCanvas.onlclick;
            ownerMainCanvas.onclick = mark_click;
            mark_click_dbl = "single";
            ret = true;
        } else if (mark_click_dbl == "single" && dblclicked == "double") {
            ownerMainCanvas.onclick = mark_click_bak;
            mark_click_bak = ownerMainCanvas.ondblclick;
            ownerMainCanvas.ondblclick = mark_click;
            mark_click_dbl = "double";
            ret = true;
        }
        return ret;
    };
    
    /// 默认选择编辑索引
    if ((typeof(door_data.editIndex) != "undefined") || 
        (typeof(door_data.editName) != "undefined") || 
        (typeof(door_data.editId) != "undefined")) {
        var list = door_getObject('list');
        if (!list) return;
        m_index = list.index_one_line({
            index: door_data.editIndex,
            name: door_data.editName,
            id: door_data.editId
        });
        door_root.publish('editing', {index:m_index}, 'list');
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "edit current index:" + m_index);
    }

    /// 编辑结果保存
    // o.onsaving = function(e) {
    //     if (!m_list.length) return;
    //     var f = e.data.func;
    //     if (!f) return;
    //     f(m_list);
    //     console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
    //         "edit onsaving (index:" + m_index + ")");
    // };
    // o.onsaved = function(e) {
    //     var result = e.data.result;
    //     door_root.publish('text', {text:'保存结果:' + result}, 'tips');
    //     console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
    //         "edit onsaved (result:" + result + ")(index:" + m_index + ")");
    //     if (result != 'success') return;
    //     door_root.publish('append', {points:m_list,index:m_index}, 'list');
    //     this.onclear();
    // };

    /// 清除编辑数据
    o.onclear = function(e) {
        m_list = [];
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };

    /// 回退到编辑上一步
    o.onundo = function(e) {
        if (!m_list.length) return;
        m_list.pop();
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };

    /// 获取最后编辑点
    o.last = function() {
        if (!m_list.length) return;
        var x = owner.pos.x;
        var y = owner.pos.y;
        var m = owner.zoom;
        var n = m_list[m_list.length - 1];
        return {
            x: n.x * m / 100 + x,
            y: n.y * m / 100 + y
        };
    };

    return o;
}


/**
 * 画布提示对象
 * @param {String} name 画布提示名称
 * @param {Element} entry 入口对象
 */
function door_objCanvasTips(name, entry) {
    var o = door_objElement(name, entry, 'div');

    o.onsize = function(e) {
        var size = e.data.size;
        var w = size.w;
        var h = size.h;
        o.element.style.top = (h - 30) + 'px';
        o.element.innerHTML = '大小改变为:' + w + '*' + h;
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "tips onsize: " + w + '*' + h);
    };

    o.ontext = function(e) {
        o.element.innerHTML = e.data.text;
    };

    return o;
}


/**
 * 画布列表对象
 * @param {String} name 画布提示名称
 * @param {Element} entry 入口对象
 * @param {Object} owner 所有者对象
 */
function door_objCanvasList(name, entry, owner) {
    var o = door_objElement(name, entry, 'div');
    var t = door_objCanvas();

    /// 线列表
    var m_lines = [];

    /// 标题控件
    var childTitle = door_objElement(name+'_title', o.element, 'div');
    childTitle.element.innerHTML = '数量：' + m_lines.length;
    var childContent = door_objElement(name+'_content', o.element, 'div');

    /// 随机颜色列表
    var m_colors = [
        // 'LightSkyBlue', 'LightSalmon', 'LightSteelBlue', 'LightPink', 'YellowGreen', 
        // 'DarkOrchid', 'SteelBlue', 'MediumSlateBlue', 'BurlyWood', 'Blue', 
        // 'BlueViolet', 'Brown', 'MidnightBlue', 'CadetBlue', 'Chartreuse', 
        // 'CornflowerBlue', 'Cyan', 'Gold', 'GoldenRod', 'Gray'
        'rgba(98,65,255,0.9)', 'rgba(21,165,255,0.9)', 
        'rgba(0,196,179,0.9)', 'rgba(33,174,55,0.9)', 
        'rgba(176,93,254,0.9)', 'rgba(160,88,0,0.9)', 
        'rgba(254,133,244,0.9)', 'rgba(228,178,0,0.9)'
    ];
    var color_cur_idx = 0;
    var color_get_next = function() {
        var colors = m_colors;
        if (door_data.lineColors && door_data.lineColors.length) colors = door_data.lineColors;
        if (color_cur_idx >= colors.length) color_cur_idx = 0;
        return colors[color_cur_idx++];
    };

    /// 管道起始图标
    var pipe_start_left_img = new Image();
    if (door_data.pipeStartLeftPic) {
        pipe_start_left_img.onload = function() {
            m_flush = true;
            door_root.get('main').publish('draw').publish('show');
            console.log('pipe start pic: ' + door_data.pipeStartLeftPic + ' loaded');
        };
        pipe_start_left_img.src = door_data.pipeStartLeftPic;
    }
    var pipe_start_right_img = new Image();
    if (door_data.pipeStartRightPic) {
        pipe_start_right_img.onload = function() {
            m_flush = true;
            door_root.get('main').publish('draw').publish('show');
            console.log('pipe start pic: ' + door_data.pipeStartRightPic + ' loaded');
        };
        pipe_start_right_img.src = door_data.pipeStartRightPic;
    }
    var pipe_start_top_img = new Image();
    if (door_data.pipeStartTopPic) {
        pipe_start_top_img.onload = function() {
            m_flush = true;
            door_root.get('main').publish('draw').publish('show');
            console.log('pipe start pic: ' + door_data.pipeStartTopPic + ' loaded');
        };
        pipe_start_top_img.src = door_data.pipeStartTopPic;
    }
    var pipe_start_bottom_img = new Image();
    if (door_data.pipeStartBottomPic) {
        pipe_start_bottom_img.onload = function() {
            m_flush = true;
            door_root.get('main').publish('draw').publish('show');
            console.log('pipe start pic: ' + door_data.pipeStartBottomPic + ' loaded');
        };
        pipe_start_bottom_img.src = door_data.pipeStartBottomPic;
    }

    /// 重绘函数
    var m_flush = false;
    var m_info = {x:0,y:0,m:0};
    var ownerMainCanvas = owner.main.canvas;
    var ownerTempContext = owner.temp.context;
    var selfTempCanvas = t.temp.canvas;
    var selfTempContext = t.temp.context;
    selfTempCanvas.width  = ownerMainCanvas.width;
    selfTempCanvas.height = ownerMainCanvas.height;
    var mouse_inside;
    // var mouse_cursor;
    var mouse_in_line = function(ctx, moveposx, moveposy, offsetx, offsety, level) {
        for (var i = 0; i < m_lines.length; ++i) {
            var line = m_lines[i];
            if (!line) continue;
            var points = line.points;
            var found = move_in_points(ctx, points, 18, moveposx, moveposy, offsetx, offsety, level);
            if (found) {
                if (mouse_inside) mouse_inside.inside = false;
                else {
                    // mouse_cursor = ownerMainCanvas.style.cursor;
                    ownerMainCanvas.style.cursor = "pointer";
                }
                line.inside = true;
                mouse_inside = line;
                return true;
            }
        }
        if (mouse_inside) {
            ownerMainCanvas.style.cursor = "default";
            mouse_inside.inside = false;
            mouse_inside = null;
            return true;
        }
        return false;
    };
    var redraw_stroke_event = {
        onstrokebefore: function(e) {
            if (!this.ctx || (!this.inside && !this.selected)) return;
            this.lineWidth = this.ctx.lineWidth;
            this.ctx.lineWidth = 10;
        },
        onstrokeafter: function(e) {
            if (!this.ctx || (!this.inside && !this.selected) || !this.lineWidth) return;
            this.ctx.lineWidth = this.lineWidth;
        }
    };
    var redraw_start_pos = function(ctx, points, offsetx, offsety, level, info) {
        if (!points || !points.length) return;
        var p0 = points[0];
        var p1 = (points.length > 1)? points[1] : null;
        var img_posx = p0.x * level + offsetx;
        var img_posy = p0.y * level + offsety;
        var img_size = 26;
        var img_obj = pipe_start_left_img;
        var text_box_color = "rgba(62,124,0,0.9)";
        var text_box_sizew = function(e) {return ctx.measureText(e).width + 5;};
        var text_box_sizeh = 17;
        var text_box_posx = function(e) {return img_posx + img_size/2 - text_box_sizew(e)/2;};
        var text_box_posy = function(d) {return img_posy - img_size/2 - 8 + ((d)?(img_size+26):0);};
        var text_color = "white";
        var text_posx = function(e) {return img_posx + img_size/2 - text_box_sizew(e)/2 + 2;};
        var text_posy = function(d) {return img_posy - img_size/2 + 5 + ((d)?(img_size+26):0);};
        if (!p1) {
            img_posx -= img_size+8;
            img_posy -= img_size/2;
            img_obj = pipe_start_right_img;
        } else if (p1.x >= p0.x && Math.abs(p1.x - p0.x) >= Math.abs(p1.y - p0.y)) {
            img_posx -= img_size+8;
            img_posy -= img_size/2;
            img_obj = pipe_start_right_img;
        } else if (p1.x < p0.x && Math.abs(p1.x - p0.x) >= Math.abs(p1.y - p0.y)) {
            img_posx += img_size-16;
            img_posy -= img_size/2;
            img_obj = pipe_start_left_img;
        } else if (p1.y >= p0.y && Math.abs(p1.y - p0.y) >= Math.abs(p1.x - p0.x)) {
            img_posx -= img_size/2;
            img_posy -= img_size+8;
            img_obj = pipe_start_bottom_img;
        } else if (p1.y < p0.y && Math.abs(p1.y - p0.y) >= Math.abs(p1.x - p0.x)) {
            img_posx -= img_size/2;
            img_posy += img_size-16;
            img_obj = pipe_start_top_img;
        }
        ctx.drawImage(img_obj, img_posx, img_posy, img_size, img_size);
        if (info) {
            var down = (img_obj == pipe_start_top_img)? true : false;
            ctx.fillStyle = text_box_color;
            ctx.fillRect(text_box_posx(info), text_box_posy(down), text_box_sizew(info), text_box_sizeh);
            ctx.fillStyle = text_color;
            ctx.fillText(info, text_posx(info), text_posy(down));
        }
    };
    var redraw_all_points = function(ctx, points, offsetx, offsety, level, event) {
        if (!points || !points.length) return;
        ctx.beginPath();
        var para = {ctx:ctx, points:points, offsetx:offsetx, offsety:offsety, level:level};
        for (var i = 0; i < points.length; ++i) {
            var n = points[i];
            var x = n.x * level + offsetx;
            var y = n.y * level + offsety;
            if (!i) {
                ctx.arc(x, y, ctx.lineWidth, 0, 2*Math.PI);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(x, y);
            }
            else ctx.lineTo(x, y);
            // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            //     "list redraw_all_points: (" + offsetx + ',' + offsety + ')(' + 
            //     'level:' + level + ') | ' + x + ',' + y);
        }
        if (event && event.onstrokebefore) event.onstrokebefore({data:para});
        ctx.stroke();
        if (event && event.onstrokeafter) event.onstrokeafter({data:para});
    };
    var redraw_one_line = function(ctx, index, offsetx, offsety, level, outline) {
        if (!m_lines.length) return;
        if (index >= m_lines.length) return;
        var line = m_lines[index];
        var points = line.points;
        if (!points || !points.length) return;
        var color = line.color;
        if (color) {
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
        } else {
            ctx.strokeStyle = "darkorchid";
            ctx.fillStyle = "darkorchid";
        }
        redraw_stroke_event.ctx = ctx;
        redraw_stroke_event.inside = line.inside;
        redraw_stroke_event.selected = line.selected;
        redraw_all_points(ctx, points, offsetx, offsety, level, redraw_stroke_event);
        if (!outline) {
            var info = '';
            if (line.name) info = line.name;
            if (line.id) info += '(' + line.id + ')';
            redraw_start_pos(ctx, points, offsetx, offsety, level, info);
        }
    };
    var redraw_all_lines = function(ctx, offsetx, offsety, level, outline) {
        for (var i = 0; i < m_lines.length; ++i) {
            redraw_one_line(ctx, i, offsetx, offsety, level, outline);
        }
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "list redraw_all_lines: (" + offsetx + ',' + offsety + ')(' + 
        //     'level:' + level + ')');
    };
    var redraw = function() {
        selfTempContext.lineWidth = 6;
        selfTempContext.lineJoin = 'round';
        // selfTempContext.strokeStyle = "darkorchid";
        // selfTempContext.fillStyle = "darkorchid";
        selfTempContext.beginPath();
        selfTempContext.clearRect(0, 0, selfTempCanvas.width, selfTempCanvas.height);
        m_info.x = owner.pos.x;
        m_info.y = owner.pos.y;
        m_info.m = owner.zoom;
        redraw_all_lines(selfTempContext, m_info.x, m_info.y, m_info.m / 100);
    };

    /// 初始化进行一次重绘
    redraw();

    var get_size_by_cfg = function(cfg) {
        var a = parseInt(cfg);
        if (!isNaN(a)) return a;
        if (cfg == 'small') return 100;
        return 200;
    };
    var listShowWidth = get_size_by_cfg(door_data.showList);
    var outlShowWidth = get_size_by_cfg(door_data.showOutline);
    o.onsize = function(e) {
        var size = e.data.size;
        var w = size.w;
        var h = size.h;
        o.element.style.width = listShowWidth + 'px'; // (door_data.showList == 'small')? '100px' : '200px';
        var list_height = outlShowWidth + 90; // (door_data.showOutline == 'small')? 190 : 290;
        o.element.style.height = (h - list_height) + 'px';
        o.element.style.left = (w - o.element.offsetWidth - 30) + 'px';
        childContent.element.style.height = (h - list_height - 38) + 'px';
        if ((selfTempCanvas.width  != ownerMainCanvas.width) || 
            (selfTempCanvas.height != ownerMainCanvas.height)) {
            selfTempCanvas.width  = ownerMainCanvas.width;
            selfTempCanvas.height = ownerMainCanvas.height;
            redraw();
            // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            //     "list temp canvas onsize: " + selfTempCanvas.width + ' * ' + selfTempCanvas.height);
        }
    };

    o.ondraw = function() {
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "list ondraw to main temp: (" + m_info.x + ',' + m_info.y + ')(' + 
        //     owner.pos.x + ',' + owner.pos.y + ')');
        /// 如果偏移位置变了，还是要重绘临时画布
        if ((m_info.x != owner.pos.x) || (m_info.y != owner.pos.y) || (m_info.m != owner.zoom) || m_flush) {
            m_flush = false;
            redraw();
        }

        /// 始终复制整个临时画布
        ownerTempContext.drawImage(selfTempCanvas, 0, 0);
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "list ondraw to main temp: " + selfTempCanvas.width + ' * ' + selfTempCanvas.height);
    };

    /// 鼠标事件处理
    if (door_data.canMouseInLine) {
        door_elementEvent(ownerMainCanvas, 'mousemove', function(e) {
            var pos = door_elementPos(ownerMainCanvas, e.clientX, e.clientY);
            if (mouse_in_line(selfTempContext, pos.x, pos.y, m_info.x, m_info.y, m_info.m / 100)) {
                m_flush = true;
                door_root.get('main').publish('draw').publish('show');
            }
        });
        var click_selected;
        door_elementEvent(ownerMainCanvas, 'click', function(e) {
            if (owner.dragged()) return;
            if (mouse_inside) {
                if (click_selected && click_selected != mouse_inside) {
                    click_selected.selected = false;
                    door_root.get('main').publish('unselectline', {line:click_selected});
                    click_selected = mouse_inside;
                    click_selected.selected = true;
                    door_root.get('main').publish('selectline', {line:click_selected});
                    m_flush = true;
                } else if (!click_selected) {
                    click_selected = mouse_inside;
                    click_selected.selected = true;
                    door_root.get('main').publish('selectline', {line:click_selected});
                    m_flush = true;
                }
            } else {
                if (click_selected) {
                    click_selected.selected = false;
                    door_root.get('main').publish('unselectline', {line:click_selected});
                    click_selected = null;
                    m_flush = true;
                }
            }
            if (m_flush) door_root.get('main').publish('draw').publish('show');
        });
    }

    /// 订阅'main'的大小和重绘事件
    door_root.get("main").subscribe('draw', o);

    /// 获取管道范围
    var range_all_points = function(points, range) {
        if (!points || !points.length) return range;
        for (var i = 0; i < points.length; ++i) {
            var node = points[i];
            if (!node) continue;
            if (!range) range = {
                left: node.x, right: node.x, 
                top: node.y, bottom: node.y, 
                width: 0, height: 0, size:0
            };
            if (node.x < range.left) range.left = node.x;
            if (node.x > range.right) range.right = node.x;
            if (node.y < range.top) range.top = node.y;
            if (node.y > range.bottom) range.bottom = node.y;
        }
        range.width = range.right - range.left;
        range.height = range.bottom - range.top;
        range.size = (range.width > range.height)? range.width : range.height;
        range.center = {x:(range.left + range.width/2), y:(range.top + range.height/2)};
        return range;
    };
    var range_all_lines = function(range) {
        if (!m_lines || !m_lines.length) return range;
        for (var i = 0; i < m_lines.length; ++i) {
            var line = m_lines[i];
            if (!line) continue;
            range = range_all_points(line.points, range);
        }
        if (range) {
            range.width = range.right - range.left;
            range.height = range.bottom - range.top;
            range.size = (range.width > range.height)? range.width : range.height;
        }
        return range;
    };

    /// 获取管道索引
    var index_one_line = function(data) {
        if (!data) return -1;
        if (typeof(data.index) != "undefined") {
            return data.index;
        } else if (typeof(data.id) != "undefined") {
            var id = data.id;
            for (var i = 0; i < m_lines.length; ++i) {
                var line = m_lines[i];
                if (line && line.id && line.id == id) {
                    return i;
                }
            }
        } else if (typeof(data.name) != "undefined") {
            var name = data.name;
            for (var i = 0; i < m_lines.length; ++i) {
                var line = m_lines[i];
                if (line && line.name && line.name == name) {
                    return i;
                }
            }
        }
        return -1;
    };

    /// 获取管道长度
    var length_all_points = function(points) {
        if (!points || points.length <= 1) return 0;
        var length = 0;
        var prex = 0;
        var prey = 0;
        for (var i = 0; i < points.length; ++i) {
            var point = points[i];
            if (!point) return 0;
            var x = point.x;
            var y = point.y;
            if (!i) {
                prex = x;
                prey = y;
                continue;
            }
            var dx = x - prex;
            var dy = y - prey;
            var l = Math.sqrt(dx*dx + dy*dy);
            length += l;
            prex = x;
            prey = y;
        }
        return parseInt(length);
    };

    /// 获取斜率
    var slope_two_points = function(startPos, endPos) {
        if (!startPos || !endPos) return;
        var dx = endPos.x - startPos.x;
        var dy = endPos.y - startPos.y;
        return (!dy)? 100 : (dx / dy);
    };

    /// 获取管道区域 (根据开始和结束长度偏移)
    var area_one_line = function(index, start, end) {
        if (typeof(index) == "undefined") return;
        if (!(index >= 0 && index < m_lines.length)) return;
        var line = m_lines[index];
        if (!line) return;
        var points = line.points;
        if (!points) return;
        var length = 0;
        var prex = 0;
        var prey = 0;
        var area = [];
        var counting = false;
        for (var i = 0; i < points.length; ++i) {
            var point = points[i];
            if (!point) return;
            var x = point.x;
            var y = point.y;
            if (!i) {
                if (!start) {
                    /// 从头开始
                    area.push({x:x,y:y});
                    counting = true;
                }
                prex = x;
                prey = y;
                continue;
            }
            var dx = x - prex;
            var dy = y - prey;
            var l = Math.sqrt(dx*dx + dy*dy);
            if (!l) continue;
            if (!counting) {
                if ((length + l) > start) {
                    /// 从中间开始
                    var offset = (start - length);
                    var nx = dx * offset / l;
                    var ny = dy * offset / l;
                    area.push({
                        x: Number((prex + nx).toFixed(1)),
                        y: Number((prey + ny).toFixed(1))
                    });
                    // area.push({x:x,y:y});
                    counting = true;
                } else if ((length + l) == start) {
                    area.push({x:x,y:y});
                    counting = true;
                }
            }
            if (counting) {
                if ((end && parseInt(length + l) == parseInt(end)) || (i == (point.length - 1))) {
                    /// 开始计数后在尾部结束
                    area.push({x:x,y:y});
                    return area;
                } else if (end && (length + l) > end) {
                    /// 开始计数后在中间位置结束
                    var offset = (end - length);
                    var nx = dx * offset / l;
                    var ny = dy * offset / l;
                    area.push({
                        x: Number((prex + nx).toFixed(1)),
                        y: Number((prey + ny).toFixed(1))
                    });
                    return area;
                }
                /// 未结束时记录下中间点
                area.push({x:x,y:y});
            }
            length += l;
            prex = x;
            prey = y;
        }
        return area;
    };

    /// 获取管道坐标 (根据长度偏移)
    var coor_one_line = function(index, offset) {
        if (typeof(index) == "undefined") return;
        if (!(index >= 0 && index < m_lines.length)) return;
        var line = m_lines[index];
        if (!line) return;
        var points = line.points;
        if (!points) return;
        var length = 0;
        var prex = 0;
        var prey = 0;
        for (var i = 0; i < points.length; ++i) {
            var point = points[i];
            if (!point) return;
            var x = point.x;
            var y = point.y;
            if (!i) {
                if (!offset) {
                    return {x:x,y:y,s:slope_two_points(point,points[1])};
                }
                prex = x;
                prey = y;
                continue;
            }
            var dx = x - prex;
            var dy = y - prey;
            var l = Math.sqrt(dx*dx + dy*dy);
            if (!l) continue;
            if ((length +l) == offset) {
                return {x:x,y:y,s:slope_two_points(points[i-1],point)};
            }
            if ((length +l) > offset) {
                offset -= length;
                var nx = dx * offset / l;
                var ny = dy * offset / l;
                return {
                    x: Number((prex + nx).toFixed(1)),
                    y: Number((prey + ny).toFixed(1)),
                    s: slope_two_points(points[i-1],point)
                };
            }
            length += l;
            prex = x;
            prey = y;
        }
    };

    /// 判断是否移动到点列表组成的线段上
    var move_in_points = function(ctx, points, width, moveposx, moveposy, offsetx, offsety, level) {
        var containStroke = function(x0, y0, x1, y1, lineWidth, x, y) {
            if (!lineWidth) return false;
            var _l = lineWidth;
            var _a = 0;
            var _b = x0;
            if ((y > y0 + _l && y > y1 + _l) || 
                (y < y0 - _l && y < y1 - _l) || 
                (x > x0 + _l && x > x1 + _l) || 
                (x < x0 - _l && x < x1 - _l)) {
                return false;
            }
            if (x0 !== x1) {
                _a = (y0 - y1) / (x0 - x1);
                _b = (x0 * y1 - x1 * y0) / (x0 - x1);
            } else {
                return Math.abs(x - x0) <= _l / 2;
            }
            var tmp = _a * x - y + _b;
            var _s = tmp * tmp / (_a * _a + 1);
            return _s <= _l / 2 * _l / 2;
        }
        if (!points || !points.length) return;
        var prex; var prey; var found;
        for (var k = 0; k < points.length; ++k) {
            var n = points[k];
            var x = n.x * level + offsetx;
            var y = n.y * level + offsety;
            if (!k) {
                prex = x; prey = y;
                continue;
            }
            if (ctx.isPointInStroke) {
                var lineWidth = ctx.lineWidth;
                ctx.lineWidth = width;
                ctx.beginPath();
                ctx.moveTo(prex, prey);
                ctx.lineTo(x, y);
                found = ctx.isPointInStroke(moveposx, moveposy);
                ctx.lineWidth = lineWidth;
            } else {
                found = containStroke(prex, prey, x, y, width, moveposx, moveposy);
            }
            if (found) break;
            prex = x; prey = y;
        }
        return found;
    };

    /// 创建列表节点
    var node_objElement = function(title) {
        var o = door_objElement(null, childContent.element, 'div');
        o.element.classList.add('node');
        o.element.style.height = '50px';

        var childCanvas = door_objCanvas(null, o.element);
        childCanvas.main.canvas.classList.add('canvas');
        childCanvas.main.canvas.style.width = '50px';
        childCanvas.main.canvas.style.height = '50px';
        childCanvas.main.canvas.width = 50;
        childCanvas.main.canvas.height = 50;
        o.canvas = childCanvas;

        var childInfo = door_objElement(null, o.element, 'div');
        childInfo.element.classList.add('info');

        var childTitle = door_objElement(null, childInfo.element, 'div');
        childTitle.element.classList.add('title');
        childTitle.element.innerHTML = '' + title;

        var m_tags = {};
        var childTags = door_objElement(null, childInfo.element, 'div');
        childTags.element.classList.add('tags');
        if (door_data.showList == 'large') childTags.element.style.width = '125px';
        var tag_add_html = function(entry, type, classify, html) {
            var o = door_objElement(null, entry, type);
            o.element.classList.add(classify);
            o.element.innerHTML = html;
            return o;
        };
        o.add_tag = function(name, title, value, color, tips, border) {
            if (name in m_tags) return m_tags[name];
            var o = door_objElement(null, childTags.element, 'div');
            o.element.classList.add('tag');
            if (typeof(title) == "undefined") title = '';
            if (typeof(value) == "undefined") value = '';
            if (color) o.element.style.color = color;
            if (tips) o.element.title = tips;
            o.title = tag_add_html(o.element, 'div', 'tag_title', title);
            o.value = tag_add_html(o.element, 'div', 'tag_value', value);
            if (border == 'noborder') o.title.element.classList.add('noborder');
            m_tags[name] = o;
            return o;
        };
        o.del_tag = function(name) {
            if (!(name in m_tags)) return;
            var o = m_tags[name];
            if (!o) return;
            childTags.element.removeChild(o.element);
            delete m_tags[name];
        };
        o.set_tag = function(name, pair) {
            if (!name || !pair || typeof(pair) != "object") return;
            var o = m_tags[name];
            if (!o) return;
            if ('title' in pair) {
                var title = pair.title;
                if (!title) title = '';
                o.title.element.innerHTML = value;
            }
            if ('value' in pair) {
                var value = pair.value;
                if (!value) value = '';
                o.value.element.innerHTML = value;
            }
            if ('color' in pair) {
                var color = pair.color;
                if (color) o.element.style.color = color;
            }
            if ('tips' in pair) {
                var tips = pair.tips;
                if (!tips) value = '';
                o.element.title = tips;
            }
            if ('border' in pair) {
                var border = pair.border;
                if (o.title.element.classList.contains('noborder'))
                    o.title.element.classList.remove('noborder');
                if (border == 'noborder') o.title.element.classList.add('noborder');
            }
        };

        return o;
    };

    /// 添加单个接点
    var append_one_line = function(points, name, id, length, index) {
        var line;
        var node;
        if ((typeof(index) != "undefined") && (index >= 0) && (index < m_lines.length)) {
            line = m_lines[index];
            node = line.object;
            line.points = points;
            line.length = length_all_points(points);
            line.range = range_all_points(points);
            node.set_tag('pixel_length', {value:line.length});
        } else {
            index = m_lines.length;
            var title = name;
            if (!title) title = id;
            else if (id) title += ' (' + id + ') ';
            if (!title) title = index + 1;
            var length = length_all_points(points);
            var range = range_all_points(points);
            node = node_objElement(title);
            if (door_mode == 'edit') {
                node.add_tag('pixel_length', 
                    '<i class="fa fa-arrows-h" aria-hidden="true"></i>', 
                    length, 
                    'aqua', 
                    '像素长度');
            }
            if (index < door_data.pipeLines.length && door_data.pipeLines[index].length) {
                node.add_tag('meter_length', 
                    '<i class="fa fa-arrows-h" aria-hidden="true"></i>', 
                    door_data.pipeLines[index].length, 
                    'chartreuse', 
                    '实际米数');
            }
            if (index < door_data.pipeLines.length && door_data.pipeLines[index].areas) {
                node.add_tag('area_count', 
                    '<i class="fa fa-sliders" aria-hidden="true"></i>', 
                    door_data.pipeLines[index].areas.length, 
                    'violet', 
                    '区域数量');
            }
            if (index < door_data.pipeLines.length && door_data.pipeLines[index].areas) {
                var areas = door_data.pipeLines[index].areas;
                var alarm = false;
                for (var i = 0; i < areas.length; ++i) {
                    var area = areas[i];
                    if (area && area.level) {
                        alarm = true;
                        break;
                    }
                }
                if (alarm) node.add_tag('alarm_haved', 
                    '<i class="fa fa-bell" aria-hidden="true"></i>', 
                    '', 
                    'orangered', 
                    '产生告警', 
                    'noborder');
            }
            // node.add_tag('test1', '测试', 1234, 'DarkOrchid');
            // node.add_tag('test2', '测试', 123456, 'DarkOrchid');
            // node.add_tag('test3', '测试', '', 'DarkOrchid');
            // node.add_tag('test4', '测试', 1234567, 'DarkOrchid');
            // node.add_tag('test5', '测试', '', 'DarkOrchid');
            // node.add_tag('test6', '测试', '', 'DarkOrchid');
            line = {points:points,object:node,color:color_get_next(),length:length,range:range};
            if (name) line.name = name;
            if (id) line.id = id;
            if (length) line.length = length;
            m_lines.push(line);
        }
        var range = line.range;
        if (range && range.size) {
            var border = 2;
            var level = (50 - border*2) / range.size;
            var cvs = node.canvas.main.canvas;
            var ctx = node.canvas.main.context;
            ctx.lineWidth = 1;
            ctx.lineJoin = 'round';
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            // ctx.strokeStyle = "darkorchid";
            // ctx.fillStyle = "darkorchid";
            var offsetx = range.left*level;
            var offsety = range.top*level;
            if (range.width > range.height) offsety -= (range.width - range.height) * level / 2;
            if (range.height > range.width) offsetx -= (range.height - range.width) * level / 2;
            redraw_one_line(ctx, index, border-offsetx, border-offsety, level);
        }
        childTitle.element.innerHTML = '数量：' + m_lines.length;
        var scrollIdx = (!index)? 0 : (index - 0.5);
        var scrollTop = (childContent.element.scrollHeight / m_lines.length) * scrollIdx;
        childContent.element.scrollTop = scrollTop;
        m_flush = true;
    };

    var append_all_lines = function(lines) {
        if (!lines || !lines.length) return;
        for (var i = 0; i < lines.length; ++i) {
            var line = lines[i];
            if (!line) continue;
            append_one_line(line.points, line.name, line.id, line.length);
        }
    };

    o.onappend = function(e) {
        append_one_line(e.data.points, null, null, null, e.data.index);
    };

    o.onediting = function(e) {
        var index = e.data.index;
        if (index >= 0 && index < m_lines.length) {
            var line = m_lines[index];
            if (!line) return;
            var node = line.object;
            if (!node) return;
            node.element.classList.add('editing');
            var scrollIdx = (!index)? 0 : (index - 0.5);
            var scrollTop = (childContent.element.scrollHeight / m_lines.length) * scrollIdx;
            childContent.element.scrollTop = scrollTop;
            node.add_tag('editing', 
                '<i class="fa fa-pencil" aria-hidden="true"></i>', 
                '', 
                'orange', 
                '正在编辑');
        }
    };

    o.line = function(index) {
        if ((typeof(index) != "undefined") && (index >= 0) && (index < m_lines.length)) {
            return m_lines[index];
        }
        return m_line;
    };

    if (door_data.showList == "none" || !listShowWidth) {
        o.element.style.display = "none";
    }
    o.onhide = function(e) {
        o.element.style.display = (e.data.status)? "black" : "none";
    };

    o.append_all_lines  = append_all_lines;
    o.append_one_line   = append_one_line;
    o.redraw_all_lines  = redraw_all_lines;
    o.redraw_one_line   = redraw_one_line;
    o.redraw_all_points = redraw_all_points;
    o.index_one_line    = index_one_line;
    o.range_all_lines   = range_all_lines;
    o.range_all_points  = range_all_points;
    o.area_one_line     = area_one_line;
    o.coor_one_line     = coor_one_line;
    o.move_in_points    = move_in_points;

    return o;
}


/**
 * 画布概览对象
 * @param {String} name 画布提示名称
 * @param {Element} entry 入口对象
 * @param {Object} owner 所有者对象
 */
function door_objCanvasOutl(name, entry, owner, list) {
    var o = door_objCanvas(name, entry);

    var main_w;
    var main_h;
    var view_l;
    var view_x;
    var view_y;
    var view_w;
    var view_h;
    var view_r;
    var mainCanvas = o.main.canvas;
    mainCanvas.innerHTML = "浏览器不兼容";
    var tempCanvas = o.temp.canvas;
    var get_size_by_cfg = function(cfg) {
        var a = parseInt(cfg);
        if (!isNaN(a)) return a;
        if (cfg == 'small') return 100;
        return 200;
    };
    var outlShowWidth = get_size_by_cfg(door_data.showOutline);
    o.onsize = function(e) {
        var size = e.data.size;
        main_w = size.w;
        main_h = size.h;
        mainCanvas.style.width  = ((door_data.outline)? door_data.outline.offsetWidth  : outlShowWidth) + 'px'; // (door_data.showOutline == 'small')? '100px' : '200px';
        mainCanvas.style.height = ((door_data.outline)? door_data.outline.offsetHeight : outlShowWidth) + 'px'; // (door_data.showOutline == 'small')? '100px' : '200px';
        mainCanvas.style.left   = ((door_data.outline)? 0 : (main_w - mainCanvas.offsetWidth  - 30)) + 'px';
        mainCanvas.style.top    = ((door_data.outline)? 0 : (main_h - mainCanvas.offsetHeight - 30)) + 'px';
        var w = mainCanvas.offsetWidth;
        var h = mainCanvas.offsetHeight;
        mainCanvas.style.width  = w + 'px';
        mainCanvas.style.height = h + 'px';
        tempCanvas.style.width  = w + 'px';
        tempCanvas.style.height = h + 'px';
        mainCanvas.width  = w;
        mainCanvas.height = h;
        tempCanvas.width  = w;
        tempCanvas.height = h;
    };

    var border = 2;
    var padding = 2;
    var range = function(w, h) {
        var l;
        var x;
        var y;
        var width = tempCanvas.width   - border*2 - padding*2;
        var height = tempCanvas.height - border*2 - padding*2;
        if (w >= h) {
            l = width / w;
            w = width + padding*2;
            h = parseInt(h * l) + padding*2;
            x = border;
            y = parseInt((height - h) / 2) + border;
        }
        else {
            l = height / h;
            h = height + padding*2;
            w = parseInt(w * l) + padding*2;
            x = parseInt((width - w) / 2) + border;
            y = border;
        }
        return {x:x,y:y,w:w,h:h,l:l};
    };

    var tempContext = o.temp.context;
    var redraw = function() {
        var x = view_x;
        var y = view_y;
        var w = view_w;
        var h = view_h;
        var l = view_l;
        var r = view_r;
        if (!x || !y || !w || !h) {
            r = list.range_all_lines();
            if (!r) return;
            view_r = r;
            var range_out = range(r.width, r.height);
            view_x = x = range_out.x;
            view_y = y = range_out.y;
            view_w = w = range_out.w;
            view_h = h = range_out.h;
            view_l = l = range_out.l;
        }
        tempContext.strokeStyle = "grey"; // "white";
        tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempContext.strokeRect(x, y, w, h);
        tempContext.lineWidth = 2;
        tempContext.lineJoin = 'round';
        // tempContext.strokeStyle = "aquamarine";
        // tempContext.fillStyle = "aquamarine";
        if (r) { x -= r.left*l; y -= r.top*l; }
        list.redraw_all_lines(tempContext, x+padding, y+padding, l, true);
        var device = door_getObject('device');
        if (device) device.redraw_devices_outline(tempContext, x+padding, y+padding, l);
    };
    o.ondraw = redraw;

    var mainContext = o.main.context;
    o.onshow = function() {
        if (mainCanvas.style.display == "none") return;
        mainContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        if (main_w && main_h && view_l && view_x && view_y) {
            var owner_pos_x = owner.pos.x;
            var owner_pos_y = owner.pos.y;
            var owner_zoom = owner.zoom;
            var x = (0 - parseInt(owner_pos_x * view_l * 100 / owner_zoom)) + view_x;
            var y = (0 - parseInt(owner_pos_y * view_l * 100 / owner_zoom)) + view_y;
            var w = parseInt(main_w * view_l * 100 / owner.zoom);
            var h = parseInt(main_h * view_l * 100 / owner.zoom);
            var l = view_l;
            var r = view_r;
            if (r) { x -= r.left*l; y -= r.top*l; }
            mainContext.fillStyle = "rgba(255,255,255,0.1)"; // "grey";
            mainContext.fillRect(x, y, w, h);
        }
        mainContext.drawImage(tempCanvas, 0, 0);
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "outl onshow: " + tempCanvas.width + ' * ' + tempCanvas.height + 
        //     ' -> ' + mainCanvas.width + ' * ' + mainCanvas.height + 
        //     ' | (' + x + ',' + y + ')(' + w + '*' + h + ')');
    };

    o.onbgpic = function() {
        var bgpic = door_getObject('main', 'bgpic');
        if (!bgpic) return;
        var w = bgpic.image.width;
        var h = bgpic.image.height;
        if (!w || !h) return;
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "outl onbgpic: " + w + ' * ' + h);
        var r = range(w, h);
        view_x = r.x;
        view_y = r.y;
        view_l = r.l;
        view_w = r.w;
        view_h = r.h;
        redraw();
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     'outl onbgpic: (' + r.x + ',' + r.y + ')(' + r.w + '*' + r.h + ')' + 
        //     ' | level: ' + r.l);
    };

    if (door_data.showOutline == "none" || !outlShowWidth) {
        mainCanvas.style.display = "none";
    }
    o.onhide = function(e) {
        mainCanvas.style.display = (e.data.status)? "black" : "none";
    };

    /// 订阅'main'的重绘和显示事件
    door_root.get("main").subscribe('bgpic', o).subscribe('draw', o).subscribe('show', o);

    return o;
}


/**
 * 绘画区域
 * @param {String} name 名称
 * @param {Element} entry 入口元素
 * @param {Object} owner 所有者对象
 * @param {Object} list 画布列表对象
 */
function door_objCanvasArea(name, entry, owner, list) {
    var o = door_objCanvas();
    var area = door_objElement(name, entry, 'div');
    area.element.classList.add('area_tool');
    area.element.classList.add('hide');
    var areaLeft = door_objElement(null, area.element, 'div');
    areaLeft.element.classList.add('left');
    var areaLeftValue = door_objElement(null, areaLeft.element, 'div');
    areaLeftValue.element.classList.add('left_value');
    var areaLeftArrow = door_objElement(null, areaLeft.element, 'div');
    areaLeftArrow.element.classList.add('left_arrow');
    areaLeftArrow.element.innerHTML = '<i class="fa fa-angle-left" aria-hidden="true"></i>';
    var areaContent = door_objElement(null, area.element, 'div');
    areaContent.element.classList.add('content');
    var areaTitle = door_objElement(null, areaContent.element, 'div');
    areaTitle.element.classList.add('title');
    var areaDetail = door_objElement(null, areaContent.element, 'div');
    areaDetail.element.classList.add('detail');
    var areaRight = door_objElement(null, area.element, 'div');
    areaRight.element.classList.add('right');
    var areaRightArrow = door_objElement(null, areaRight.element, 'div');
    areaRightArrow.element.classList.add('right_arrow');
    areaRightArrow.element.innerHTML = '<i class="fa fa-angle-right" aria-hidden="true"></i>';
    var areaRightValue = door_objElement(null, areaRight.element, 'div');
    areaRightValue.element.classList.add('right_value');

    /// 区域点图标
    var area_node_img = new Image();
    if (door_data.areaNodePic) {
        area_node_img.onload = function() {
            m_flush = true;
            door_root.get('main').publish('draw').publish('show');
            console.log('area node pic: ' + door_data.areaNodePic + ' loaded');
        };
        area_node_img.src = door_data.areaNodePic;
    }

    /// 收集区域信息
    var m_areas = [];
    var areas_one_line = function(index, areas, ratio) {
        if (!areas) return;
        for (var i = 0; i < areas.length; ++i) {
            var area = areas[i];
            if (!area) continue;
            var points = list.area_one_line(index, area.start * ratio, area.end * ratio);
            m_areas.push({
                index: m_areas.length,
                line: index,
                area: i,
                id: area.id,
                ratio: ratio,
                start: area.start,
                end: area.end,
                points: points,
                range: list.range_all_points(points),
                tem: area.tem,
                temPos: area.temPos,
                temPosCoor: (typeof(area.temPos) == "undefined")? null : list.coor_one_line(index, area.temPos * ratio),
                speed: area.speed,
                speedPos: area.speedPos,
                speedPosCoor: (typeof(area.speedPos) == "undefined")? null : list.coor_one_line(index, area.speedPos * ratio),
                level: area.level,
                inside: false,
                selected: false,
            });
        }
    };
    var areas_all_line = function() {
        m_areas.length = 0;
        var lines = door_data.pipeLines;
        if (!lines) return;
        for (var i = 0; i < lines.length; ++i) {
            var line = lines[i];
            if (!line) continue;
            var o = list.line(i);
            var ratio = (o && o.length && line.length)? (o.length / line.length) : 1;
            areas_one_line(i, line.areas, ratio);
        }
        console.log('m_areas', m_areas);
    };

    /// 绘制区域信息 (先判断鼠标是否在当前区域)
    var m_changed = true;
    var m_flush = false;
    var m_info = {x:0,y:0,m:0};
    var ownerMainCanvas = owner.main.canvas;
    var ownerTempContext = owner.temp.context;
    var selfTempCanvas = o.temp.canvas;
    var selfTempContext = o.temp.context;
    selfTempCanvas.width  = ownerMainCanvas.width;
    selfTempCanvas.height = ownerMainCanvas.height;
    var mouse_inside;
    // var mouse_cursor;
    var mouse_in_area = function(ctx, moveposx, moveposy, offsetx, offsety, level) {
        for (var i = 0; i < m_areas.length; ++i) {
            var area = m_areas[i];
            if (!area) continue;
            var points = area.points;
            var found = list.move_in_points(ctx, points, 18, moveposx, moveposy, offsetx, offsety, level);
            if (found) {
                if (mouse_inside) mouse_inside.inside = false;
                else {
                    // mouse_cursor = ownerMainCanvas.style.cursor;
                    ownerMainCanvas.style.cursor = "pointer";
                }
                area.inside = true;
                mouse_inside = area;
                return true;
            }
        }
        if (mouse_inside) {
            ownerMainCanvas.style.cursor = "default";
            mouse_inside.inside = false;
            mouse_inside = null;
            return true;
        }
        return false;
    };
    var mouse_in_range = function(ctx, range, moveposx, moveposy) {
        if (!range || !range.x || !range.y || !range.w || !range.h) return;
        var path = new Path2D();
        path.rect(range.x, range.y, range.w, range.h);
        return ctx.isPointInPath(path, moveposx, moveposy);
    };
    var mouse_pic_type;
    var mouse_in_warning = function(ctx, moveposx, moveposy, pic) {
        var index; var type; var found;
        for (var i = 0; i < m_areas.length; ++i) {
            var area = m_areas[i];
            if (!area || !area.temPicRange || !area.speedPicRange) continue;
            if (mouse_in_range(ctx, area.temPicRange[pic], moveposx, moveposy)) {
                index = i;
                type = 'tem';
                found = true;
                break;
            }
            if (mouse_in_range(ctx, area.speedPicRange[pic], moveposx, moveposy)) {
                index = i;
                type = 'speed';
                found = true;
                break;
            }
        }
        /*
        if (found) {
            var area = m_areas[index];
            if (mouse_inside) mouse_inside.inside = false;
            else {
                // mouse_cursor = ownerMainCanvas.style.cursor;
                ownerMainCanvas.style.cursor = "pointer";
            }
            area.inside = true;
            mouse_inside = area;
            mouse_pic_type = type;
            return true;
        }
        if (mouse_inside) {
            ownerMainCanvas.style.cursor = "default";
            mouse_inside.inside = false;
            mouse_inside = null;
            return true;
        }
        */
        return false;
    };
    var redraw_stroke_event = {
        onstrokebefore: function(e) {
            if (!this.ctx || (!this.inside && !this.selected)) return;
            this.lineWidth = this.ctx.lineWidth;
            this.ctx.lineWidth = 10;
        },
        onstrokeafter: function(e) {
            if (!this.ctx || (!this.inside && !this.selected) || !this.lineWidth) return;
            this.ctx.lineWidth = this.lineWidth;
        }
    };
    var redraw_nodes_area = function(ctx, points, offsetx, offsety, level) {
        for (var i = 0; i < points.length; ++i) {
            if (i > 0 && i < (points.length - 1)) continue;
            var n = points[i];
            var x = n.x * level + offsetx;
            var y = n.y * level + offsety;
            var z = 16;
            ctx.drawImage(area_node_img, 
                x - z/2,
                y - z/2,
                z, z);
        }
    };
    var redraw_one_area = function(ctx, area, offsetx, offsety, level) {
        var points = area.points;
        if (!points) return;
        var color = ctx.strokeStyle;
        if (area.level == 1) ctx.strokeStyle = "yellow";
        else if (area.level == 2) ctx.strokeStyle = "orange";
        else if (area.level == 3) ctx.strokeStyle = "red";
        if (area.level && door_data.warningColor && door_data.warningColor['level' + area.level])
            ctx.strokeStyle = door_data.warningColor['level' + area.level];
        redraw_stroke_event.ctx = ctx;
        redraw_stroke_event.inside = area.inside;
        redraw_stroke_event.selected = area.selected;
        list.redraw_all_points(ctx, points, offsetx, offsety, level, redraw_stroke_event);
        redraw_nodes_area(ctx, points, offsetx, offsety, level);
        area.temPicRange = redraw_area_warning(ctx, area.temPosCoor, offsetx, offsety, level, area.level);
        area.speedPicRange = redraw_area_warning(ctx, area.speedPosCoor, offsetx, offsety, level, area.level);
        ctx.strokeStyle = color;
    };
    var redraw_all_area = function(ctx, offsetx, offsety, level) {
        for (var i = 0; i < m_areas.length; ++i) {
            var area = m_areas[i];
            if (!area) continue;
            redraw_one_area(ctx, area, offsetx, offsety, level);
        }
    };
    var redraw = function() {
        if (m_changed) {
            areas_all_line();
            m_changed = false;
        }
        selfTempContext.lineWidth = 1;
        selfTempContext.lineJoin = 'round';
        selfTempContext.beginPath();
        selfTempContext.clearRect(0, 0, selfTempCanvas.width, selfTempCanvas.height);
        selfTempContext.strokeStyle = "chartreuse";
        selfTempContext.fillStyle = "grey";
        m_info.x = owner.pos.x;
        m_info.y = owner.pos.y;
        m_info.m = owner.zoom;
        redraw_all_area(selfTempContext, m_info.x, m_info.y, m_info.m / 100);
    };

    /// 鼠标事件处理
    if (door_data.canMouseInArea) {
        door_elementEvent(ownerMainCanvas, 'mousemove', function(e) {
            var pos = door_elementPos(ownerMainCanvas, e.clientX, e.clientY);
            if (mouse_in_area(selfTempContext, pos.x, pos.y, m_info.x, m_info.y, m_info.m / 100)) {
                m_flush = true;
                door_root.get('main').publish('draw').publish('show');
            }
        });
        var click_selected;
        door_elementEvent(ownerMainCanvas, 'click', function(e) {
            if (owner.dragged()) return;
            if (mouse_inside) {
                if (click_selected && click_selected != mouse_inside) {
                    click_selected.selected = false;
                    door_root.get('main').publish('unselectarea', {area:click_selected,mouse:owner.mouse});
                }
                if (!click_selected || click_selected != mouse_inside) {
                    click_selected = mouse_inside;
                    click_selected.selected = true;
                    door_root.get('main').publish('selectarea', {area:click_selected,mouse:owner.mouse});
                    m_flush = true;
                }
            } else {
                if (click_selected) {
                    click_selected.selected = false;
                    door_root.get('main').publish('unselectarea', {area:click_selected,mouse:owner.mouse});
                    click_selected = null;
                    m_flush = true;
                }
            }
            if (m_flush) door_root.get('main').publish('draw').publish('show');
        });
    }
    if (door_data.canMouseInArrow) {
        door_elementEvent(ownerMainCanvas, 'mousemove', function(e) {
            var pos = door_elementPos(ownerMainCanvas, e.clientX, e.clientY);
            if (mouse_in_warning(selfTempContext, pos.x, pos.y, 'arrow')) {
                m_flush = true;
                door_root.get('main').publish('draw').publish('show');
            }
        });
    }
    if (door_data.canMouseInWarning) {
        door_elementEvent(ownerMainCanvas, 'mousemove', function(e) {
            var pos = door_elementPos(ownerMainCanvas, e.clientX, e.clientY);
            if (mouse_in_warning(selfTempContext, pos.x, pos.y, 'warning')) {
                m_flush = true;
                door_root.get('main').publish('draw').publish('show');
            }
        });
    }
    if (door_data.canMouseInArrow || door_data.canMouseInWarning) {
        var click_selected;
        var click_pic_type;
        door_elementEvent(ownerMainCanvas, 'click', function(e) {
            if (owner.dragged()) return;
            if (mouse_inside) {
                var type = mouse_pic_type;
                var pos;
                if (type == 'tem') pos = mouse_inside.temPos;
                else if (type == 'speed') pos = mouse_inside.speedPos;
                if (click_selected && (click_selected != mouse_inside || click_pic_type != type)) {
                    click_selected.selected = false;
                    door_root.get('main').publish('unselectarea', {area:click_selected});
                }
                if (!click_selected || click_selected != mouse_inside || click_pic_type != type) {
                    click_selected = mouse_inside;
                    click_selected.selected = true;
                    click_pic_type = type;
                    door_root.get('main').publish('selectarea', {area:click_selected,pos:pos,type:type});
                    m_flush = true;
                }
            } else {
                if (click_selected) {
                    click_selected.selected = false;
                    door_root.get('main').publish('unselectarea', {area:click_selected});
                    click_selected = null;
                    m_flush = true;
                }
            }
            if (m_flush) door_root.get('main').publish('draw').publish('show');
        });
    }

    o.ondraw = function() {
        /// 如果偏移位置变了，还是要重绘临时画布
        if ((m_info.x != owner.pos.x) || (m_info.y != owner.pos.y) || (m_info.m != owner.zoom) || 
            m_changed || m_flush) {
            redraw();
            m_flush = false;
        }

        /// 始终复制整个临时画布
        ownerTempContext.drawImage(selfTempCanvas, 0, 0);
    };

    o.onsize = function(e) {
        var listWidth = list.element.offsetWidth;
        area.element.style.left = (ownerMainCanvas.width - 360 - listWidth) / 2 + 'px';
        selfTempCanvas.width  = ownerMainCanvas.width;
        selfTempCanvas.height = ownerMainCanvas.height;
        redraw();
    };

    /// 区域选择处理
    var update_detail = function(a) {
        var html = '';
        var line = door_data.pipeLines[a.line];
        if (line) {
            var line_title = line.name;
            if (!line_title) line_title = line.id;
            else if (line.id) line_title += ' (' + line.id + ') ';
            if (!line_title) line_title = a.line + 1;
            html += "<B>位置</B> 位于管道'" + line_title + "'的第" + (a.area + 1) + "个区域";
            html += " (" + a.start + "米到" + a.end + "米范围)";
            var level = a.level;
            html += "<BR>";
            if (!level) html += "<B>告警</B> 无";
            else html += "<B>告警</B> " + level + "级";
            html += "<BR>";
            if (!a.tem) html += "<B>最高温度</B> 无";
            else html += "<B>最高温度</B> " + a.tem + ' (' + a.temPos + '米处)';
            html += "<BR>";
            if (!a.speed) html += "<B>最快升温速度</B> 无";
            else html += "<B>最快升温速度</B> " + a.speed + ' (' + a.speedPos + '米处)';
        }
        areaDetail.element.innerHTML = html;
    };
    o.onselectarea = function(e) {
        var a = e.data.area;
        areaTitle.element.innerHTML = '<span class="number">' + a.id + '</span>' + 
            '<span class="type">区域</span>';
        update_detail(a);
        if (door_data.showArea != "none") area.element.classList.remove('hide');
        areaLeftValue.element.innerHTML = '';
        areaRightValue.element.innerHTML = '';
        var index = a.index;
        if (index > 0) areaLeftValue.element.innerHTML = m_areas[index - 1].id;
        else areaLeftValue.element.innerHTML = m_areas[m_areas.length - 1].id;
        if (index < (m_areas.length - 1)) areaRightValue.element.innerHTML = m_areas[index + 1].id;
        else areaRightValue.element.innerHTML = m_areas[0].id;
    };
    o.onunselectarea = function(e) {
        area.element.classList.add('hide');
    };
    var select_area_index = function(index) {
        if (typeof(index) == "undefined" || index < 0 || index >= m_areas.length) return;
        if (click_selected) {
            click_selected.selected = false;
            door_root.get('main').publish('unselectarea', {area:click_selected,mouse:owner.mouse});
        }
        click_selected = m_areas[index];
        click_selected.selected = true;
        door_root.get('main').publish('selectarea', {area:click_selected,mouse:owner.mouse});
        m_flush = true;
        door_root.get('main').publish('draw').publish('show');
    };
    areaLeft.element.onselectstart = function() { return false; }
    areaLeft.element.onclick = function(e) {
        if (!click_selected) return;
        var index = click_selected.index;
        if (index > 0) select_area_index(index - 1);
        else select_area_index(m_areas.length - 1);
    };
    areaRight.element.onselectstart = function() { return false; }
    areaRight.element.onclick = function(e) {
        if (!click_selected) return;
        var index = click_selected.index;
        if (index < (m_areas.length - 1)) select_area_index(index + 1);
        else select_area_index(0);
    };

    /// 区域告警绘制
    var arrow_loaded = false;
    var arrow_image = new Image();
    if (door_data.arrowPic) {
        arrow_image.onload = function() {
            arrow_loaded = true;
            m_flush = true;
            door_root.get('main').publish('draw').publish('show');
            console.log('arrow pic: ' + door_data.arrowPic + ' loaded');
        };
        arrow_image.src = door_data.arrowPic;
    }
    var warning_index = 0;
    var warning_loaded = 0;
    var warning_images = [];
    if (door_data.warningPic) {
        for (var i = 0; i < door_data.warningPic.length; ++i) {
            (function(i) {
                var image = new Image();
                var picture = door_data.warningPic[i];
                image.onload = function() {
                    warning_loaded++;
                    if (warning_loaded >= warning_images.length) {
                        m_flush = true;
                        door_root.get('main').publish('draw').publish('show');
                    }
                    console.log('warning pic[' + i + ']: ' + picture + ' loaded: ' + warning_loaded);
                };
                image.src = picture;
                warning_images[i] = image;
            })(i);
        }
    }
    var redraw_area_warning = function(ctx, pos, offsetx, offsety, level, alarm) {
        if (!pos) return;
        var x = pos.x * level + offsetx;
        var y = pos.y * level + offsety;
        var strokeStyle = ctx.strokeStyle;
        var fillStyle = ctx.fillStyle;
        ctx.strokeStyle = "black";
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2*Math.PI);
        ctx.fill();
        ctx.strokeStyle = strokeStyle;
        ctx.fillStyle = fillStyle;
        if (typeof(x) == "undefined" || typeof(y) == "undefined") return;
        var range = {};
        if (arrow_loaded) {
            var startx = x - 25;
            var starty = y - 9;
            var size = 18;
            ctx.drawImage(arrow_image, 
                startx,
                starty,
                size, size);
            range.arrow = {x:startx,y:starty,w:size,h:size};
        }
        if (!alarm) return range;
        if (warning_index >= warning_images.length) warning_index = 0;
        var warning_image = warning_images[warning_index];
        if (warning_image) {
            var startx = x + 6;
            var starty = y - 16;
            var size = 32;
            ctx.drawImage(warning_image, 
                startx, 
                starty, 
                size, size);
            range.warning = {x:startx,y:starty,w:size,h:size};
        }
        return range;
    };
    var window = door_global;
    if (window && window.setInterval) {
        window.setInterval(function() {
            if (warning_loaded < warning_images.length) return;
            warning_index++;
            m_flush = true;
            door_root.get('main').publish('draw').publish('show');
        }, 1000);
    }

    var area_id_index = function(id) {
        for (var i = 0; i < m_areas.length; ++i) {
            var area = m_areas[i];
            if (!area) continue;
            if (id == area.id) return i;
        }
    };
    var area_real_data = function(data, func) {
        if (!data) return;
        var index = area_id_index(data.id);
        if (typeof(index) == "undefined") return;
        if (index < 0 || index >= m_areas.length) return;
        var area = m_areas[index];
        if (!area) return;
        if ((typeof(data.start) != "undefined" && data.start != area.start) || 
            (typeof(data.end) != "undefined" && data.end != area.end)) {
            if (typeof(data.start) != "undefined") area.start = data.start;
            if (typeof(data.end) != "undefined") area.end = data.end;
            var points = list.area_one_line(area.line, area.start * area.ratio, area.end * area.ratio);
            area.points = points;
            area.range = list.range_all_points(points);
        }
        area.tem = data.tem;
        area.temPos = data.temPos;
        area.temPosCoor = list.coor_one_line(area.line, data.temPos * area.ratio);
        area.speed = data.speed;
        area.speedPos = data.speedPos;
        area.speedPosCoor = list.coor_one_line(area.line, data.speedPos * area.ratio);
        area.level = data.level;
        if (func) func(index, area);
        return true;
    };
    o.onalarm = function(e) {
        var areas = e.data.areas;
        if (!areas || !areas.length) return;
        var flush = false;
        var selected = false;
        var alarm = function(index, area) {
            if (!door_data.canAlarmRealShow) return;
            if (selected) return;
            if (area && area.level) {
                selected = true;
                select_area_index(index);
            }
        };
        for (var i = 0; i < areas.length; ++i) {
            var area = areas[i];
            if (!area) continue;
            var r = area_real_data(area, alarm);
            if (r) {
                flush = true;
                if (click_selected && click_selected.id == area.id) {
                    update_detail(click_selected);
                }
            }
        }
        if (flush) {
            m_flush = true;
            door_root.get('main').publish('draw').publish('show');
        }
    };

    door_root.get("main").subscribe('draw', o)
        .subscribe('selectarea', o)
        .subscribe('unselectarea', o);

    return o;
}


/**
 * 绘画告警
 * @param {String} name 名称
 * @param {Element} entry 入口元素
 * @param {Object} owner 所有者对象
 * @param {Object} list 画布列表对象
 */
function door_objCanvasAlarm(name, entry, owner, list) {
    var o = {};

    var m_list = {};
    var ownerMainCanvas = owner.main.canvas;
    var ownerTempContext = owner.temp.context;
    var m_info = {x:0,y:0,m:0};

    var get_line_id = function(id) {
        var lines = door_data.pipeLines;
        for (var i = 0; i < lines.length; ++i) {
            var line = lines[i];
            if (line.id == id) return i;
        }
    };

    var get_pos_alarm = function(id, pos) {
        var index = get_line_id(id);
        var line = door_data.pipeLines[index];
        if (typeof(line) == "undefined") return;
        var o = list.line(index);
        var ratio = (o && o.length && line.length)? (o.length / line.length) : 1;
        return list.coor_one_line(index, pos * ratio);
    };

    o.onalarm = function(e) {
        m_list = {};
        var list = e.data.list;
        if (!list || !list.length) return;
        for (var i = 0; i < list.length; ++i) {
            var node = list[i];
            if (!node) continue;
            var id = node.id;
            if (!id) continue;
            // if (!node.level) {
            //     if (m_list[id]) delete m_list[id];
            //     continue;
            // }
            m_list[id] = node;
            m_list[id].coor = get_pos_alarm(node.pipeId, node.pos);
        }
        door_root.get('main').publish('draw').publish('show');
    };

    var alarm_red_img0 = new Image();
    if (door_data.alarmRedPic0) {
        alarm_red_img0.onload = function() {
            door_root.get('main').publish('draw').publish('show');
            console.log('alarm red0 pic: ' + door_data.alarmRedPic0 + ' loaded');
        };
        alarm_red_img0.src = door_data.alarmRedPic0;
    }
    var alarm_red_img1 = new Image();
    if (door_data.alarmRedPic1) {
        alarm_red_img1.onload = function() {
            door_root.get('main').publish('draw').publish('show');
            console.log('alarm red1 pic: ' + door_data.alarmRedPic1 + ' loaded');
        };
        alarm_red_img1.src = door_data.alarmRedPic1;
    }
    var alarm_yellow_img0 = new Image();
    if (door_data.alarmYellowPic0) {
        alarm_yellow_img0.onload = function() {
            door_root.get('main').publish('draw').publish('show');
            console.log('alarm yellow0 pic: ' + door_data.alarmYellowPic0 + ' loaded');
        };
        alarm_yellow_img0.src = door_data.alarmYellowPic0;
    }
    var alarm_yellow_img1 = new Image();
    if (door_data.alarmYellowPic1) {
        alarm_yellow_img1.onload = function() {
            door_root.get('main').publish('draw').publish('show');
            console.log('alarm yellow1 pic: ' + door_data.alarmYellowPic1 + ' loaded');
        };
        alarm_yellow_img1.src = door_data.alarmYellowPic1;
    }

    var alarm_red_img = alarm_red_img0;
    var alarm_yellow_img = alarm_yellow_img0;
    var redraw_one_alarm = function(ctx, node, offsetx, offsety, level) {
        if (!node) return;
        var pos = node.coor;
        if (!pos) return;
        var x = pos.x * level + offsetx;
        var y = pos.y * level + offsety;
        var strokeStyle = ctx.strokeStyle;
        var fillStyle = ctx.fillStyle;
        ctx.strokeStyle = "black";
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, 2*Math.PI);
        ctx.fill();
        ctx.strokeStyle = strokeStyle;
        ctx.fillStyle = fillStyle;
        if (!node.type) return;
        var img_sizw = 26;
        var img_sizh = 30;
        var img_posx = x - img_sizw/2;
        var img_posy = y - img_sizh - 6;
        var img_node = (node.type == 1)? alarm_red_img : alarm_yellow_img;
        ctx.drawImage(img_node, img_posx, img_posy, img_sizw, img_sizh);
        node.range = {x:img_posx, y:img_posy, w:img_sizw, h:img_sizh};
    };
    var redraw_all_alarm = function(ctx, offsetx, offsety, level) {
        for (var i in m_list) {
            var node = m_list[i];
            if (!node) continue;
            redraw_one_alarm(ctx, node, offsetx, offsety, level);
        }
    };

    var timer_count = 0;
    var window = door_global;
    if (window && window.setInterval) {
        window.setInterval(function() {
            if (timer_count) {
                alarm_red_img = alarm_red_img1;
                alarm_yellow_img = alarm_yellow_img1;
                timer_count = 0;
            } else {
                alarm_red_img = alarm_red_img0;
                alarm_yellow_img = alarm_yellow_img0;
                timer_count = 1;
            }
            door_root.get('main').publish('draw').publish('show');
        }, 1000);
    }

    var mouse_in_range = function(ctx, range, moveposx, moveposy) {
        if (!range || !range.x || !range.y || !range.w || !range.h) return;
        var path = new Path2D();
        path.rect(range.x, range.y, range.w, range.h);
        return ctx.isPointInPath(path, moveposx, moveposy);
    };
    var mouse_in_alarm = function(ctx, moveposx, moveposy) {
        var found;
        for (var i in m_list) {
            var node = m_list[i];
            if (!node || !node.range) continue;
            if (mouse_in_range(ctx, node.range, moveposx, moveposy)) {
                found = node;
                break;
            }
        }
        return found;
    };
    var mouse_bak;
    var mouse_inside;
    door_elementEvent(ownerMainCanvas, 'mousemove', function(e) {
        var pos = door_elementPos(ownerMainCanvas, e.clientX, e.clientY);
        var node = mouse_in_alarm(ownerTempContext, pos.x, pos.y);
        if (node) {
            if (!mouse_inside) {
                mouse_inside = node;
                mouse_bak = ownerMainCanvas.style.cursor;
                ownerMainCanvas.style.cursor = "pointer";
            } else if (mouse_inside != node) {
                mouse_inside = node;
            }
        } else {
            mouse_inside = null;
            ownerMainCanvas.style.cursor = mouse_bak;
        }
    });
    var click_selected;
    door_elementEvent(ownerMainCanvas, 'click', function(e) {
        if (owner.dragged()) return;
        if (mouse_inside) {
            if (click_selected && click_selected != mouse_inside) {
                door_root.get('main').publish('unselectalarm', {alarm:click_selected,mouse:owner.mouse});
            }
            if (!click_selected || click_selected != mouse_inside) {
                click_selected = mouse_inside;
                door_root.get('main').publish('selectalarm', {alarm:click_selected,mouse:owner.mouse});
            }
        } else {
            if (click_selected) {
                door_root.get('main').publish('unselectalarm', {alarm:click_selected,mouse:owner.mouse});
                click_selected = null;
            }
        }
    });
    o.onclearselect = function(e) {
        if (click_selected) {
            door_root.get('main').publish('unselectalarm', {alarm:click_selected,mouse:owner.mouse});
            click_selected = null;
        }
    };

    o.ondraw = function() {
        m_info.x = owner.pos.x;
        m_info.y = owner.pos.y;
        m_info.m = owner.zoom;
        redraw_all_alarm(ownerTempContext, m_info.x, m_info.y, m_info.m / 100);
    };

    door_root.get("main").subscribe('draw', o);

    return o;
}


/**
 * 设备编辑和显示
 * @param {Object} owner 所有者对象
 */
function door_objCanvasDevice(owner) {
    var o = door_objCanvas();

    var m_edit = false;
    var m_edit_pos;
    var m_list = (door_data.devices)? door_data.devices : [];
    var m_index = (function() {
        var id = parseInt(door_data.editId);
        for (var i = 0; i < m_list.length; ++i) {
            var n = m_list[i];
            if (n && n.id && n.id == id) {
                return i;
            }
        }
        var name = door_data.editId;
        for (var i = 0; i < m_list.length; ++i) {
            var n = m_list[i];
            if (n && n.name && n.name == name) {
                return i;
            }
        }
        return -1;
    })();
    console.log('device edit index: ' + m_index);
    var m_flush = false;
    var m_info = {x:0,y:0,m:0};
    var ownerMainCanvas = owner.main.canvas;
    var ownerMainContext = owner.main.context;
    var ownerTempContext = owner.temp.context;
    var selfTempCanvas = o.temp.canvas;
    var selfTempContext = o.temp.context;
    selfTempCanvas.width  = ownerMainCanvas.width;
    selfTempCanvas.height = ownerMainCanvas.height;
    var device_normal = new Image();
    if (door_data.deviceNormalPic) {
        device_normal.onload = function() {
            m_flush = true;
            door_root.get('main').publish('draw').publish('show');
            console.log('device normal pic: ' + door_data.deviceNormalPic + ' loaded');
        };
        device_normal.src = door_data.deviceNormalPic;
    }
    var device_abnormal = new Image();
    if (door_data.deviceAbnormalPic) {
        device_abnormal.onload = function() {
            m_flush = true;
            door_root.get('main').publish('draw').publish('show');
            console.log('device abnormal pic: ' + door_data.deviceAbnormalPic + ' loaded');
        };
        device_abnormal.src = door_data.deviceAbnormalPic;
    }
    var redraw = function() {
        selfTempContext.lineWidth = 3;
        selfTempContext.strokeStyle = 'royalblue';
        selfTempContext.lineCap = 'round';
        selfTempContext.beginPath();
        selfTempContext.clearRect(0, 0, selfTempCanvas.width, selfTempCanvas.height);
        m_info.x = owner.pos.x;
        m_info.y = owner.pos.y;
        m_info.m = owner.zoom;
        var img_size = 36;
        var img_posn = function(n) {return n - img_size/2;};
        var text_box_color_nor = "rgba(69,182,231,0.9)";
        var text_box_color_abn = "rgba(254,118,89,0.9)";
        var text_box_sizew = function(e) {return selfTempContext.measureText(e).width + 5;};
        var text_box_sizeh = 17;
        var text_box_posx = function(x,e) {return x - text_box_sizew(e)/2;};
        var text_box_posy = function(y) {return y - img_size/2 - 20;};
        var text_color = "white";
        var text_posx = function(x,e) {return x - text_box_sizew(e)/2 + 2;};
        var text_posy = function(y) {return y - img_size/2 - 7;};
        for (var i = 0; i < m_list.length; ++i) {
            var n = m_list[i];
            if (!n || typeof(n.x) != "number" || typeof(n.y) != "number") continue;
            var x = n.x * m_info.m / 100 + m_info.x;
            var y = n.y * m_info.m / 100 + m_info.y;
            var g = (typeof(n.status) == "undefined" || n.status == null || n.status)? device_normal : device_abnormal;
            selfTempContext.drawImage(g, img_posn(x), img_posn(y), img_size, img_size);
            var e = n.name + "(" + n.id + ")";
            if (g == device_abnormal) e += ' [异常]';
            selfTempContext.fillStyle = (g == device_abnormal)? text_box_color_abn : text_box_color_nor;
            selfTempContext.fillRect(text_box_posx(x,e), text_box_posy(y), text_box_sizew(e), text_box_sizeh);
            selfTempContext.fillStyle = text_color;
            selfTempContext.fillText(e, text_posx(x,e), text_posy(y));
        }
        if (m_edit && m_edit_pos && typeof(m_edit_pos.x) == "number" && typeof(m_edit_pos.y) == "number") {
            var x = m_edit_pos.x;
            var y = m_edit_pos.y;
            selfTempContext.drawImage(device_normal, img_posn(x), img_posn(y), img_size, img_size);
            var e = "…… [新建]";
            if (m_index >= 0 && m_index < m_list.length) {
                var n = m_list[m_index];
                e = n.name + "(" + n.id + ") [编辑]";
            }
            selfTempContext.fillStyle = text_box_color_nor;
            selfTempContext.fillRect(text_box_posx(x,e), text_box_posy(y), text_box_sizew(e), text_box_sizeh);
            selfTempContext.fillStyle = text_color;
            selfTempContext.fillText(e, text_posx(x,e), text_posy(y));
        }
    };
    var redraw_devices_outline = function(ctx, offsetx, offsety, level) {
        for (var i = 0; i < m_list.length; ++i) {
            var n = m_list[i];
            if (!n || typeof(n.x) != "number" || typeof(n.y) != "number") continue;
            var x = n.x * level + offsetx;
            var y = n.y * level + offsety;
            var z = 14;
            var g = (typeof(n.status) == "undefined" || n.status == null || n.status)? device_normal : device_abnormal;
            ctx.drawImage(g, x-z/2, y-z/2, z, z);
        }
    };
    o.redraw_devices_outline = redraw_devices_outline;

    o.onsize = function(e) {
        if ((selfTempCanvas.width  == ownerMainCanvas.width) && 
            (selfTempCanvas.height == ownerMainCanvas.height)) {
            return;
        }
        selfTempCanvas.width  = ownerMainCanvas.width;
        selfTempCanvas.height = ownerMainCanvas.height;
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "edit onsize: " + selfTempCanvas.width + ' * ' + selfTempCanvas.height);
        redraw();
    };

    o.ondraw = function() {
        /// 如果偏移位置变了，还是要重绘临时画布
        if ((m_info.x != owner.pos.x) || (m_info.y != owner.pos.y) || (m_info.m != owner.zoom) || m_flush) {
            m_flush = false;
            redraw();
        }

        /// 始终复制整个临时画布
        ownerTempContext.drawImage(selfTempCanvas, 0, 0);
    };

    /// 订阅'main'的大小和重绘事件
    door_root.get("main").subscribe('draw', o);

    /// 标记点击处理
    var mark_bak;
    var mark = function(e) {
        if (owner.dragged()) return;
        m_info.x = owner.pos.x;
        m_info.y = owner.pos.y;
        m_info.m = owner.zoom;
        var pos = door_elementPos(ownerMainCanvas, e.clientX, e.clientY);
        var curx = (pos.x - m_info.x) * 100 / m_info.m;
        var cury = (pos.y - m_info.y) * 100 / m_info.m;
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
                "'device' mark offset:(" + m_info.x + ',' + m_info.y + 
                '), zoom:' + m_info.m + ', curr:(' + pos.x + ',' + pos.y + 
                '|' + curx + ',' + cury + ')');
        if (m_index >= 0 && m_index < m_list.length) {
            var n = m_list[m_index];
            n.x = curx;
            n.y = cury;
        } else {
            m_list.push({id:0,name:"新建",x:curx,y:cury});
            m_index = m_list.length - 1;
        }
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };

    /// 离开和进入编辑模式
    o.onenter = function() {
        mark_bak = ownerMainCanvas.onclick;
        ownerMainCanvas.onclick = mark;
        m_edit = true;
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };
    o.onleave = function() {
        ownerMainCanvas.onclick = mark_bak;
        m_edit = false;
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };
    o.onundo = function() {
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };
    o.onsaving = function() {
        if (m_index < 0 || m_index >= m_list.length) return;
        var f = door_data.onsaving;
        if (!f) return;
        f("device", m_list[m_index]);
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "edit onsaving (index:" + m_index + ")");
    };
    o.onsaved = function(e) {
        if (e.data.type != "device") return;
        var result = e.data.result;
        door_root.publish('text', {text:'保存设备结果:' + result}, 'tips');
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "'device' onsaved (result:" + result + ")(index:" + m_index + ")");
    };
    o.ondrop = function() {
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };

    /// '点击编辑设备'事件
    o.onmarkdevice = function(e) {
        if (door_edit && door_edit.onselect) {
            door_edit.onselect(o, e.data.element);
        }
    };

    /// 鼠标移动事件
    o.onmousemove = function(e) {
        if (!m_edit) return;
        m_edit_pos = {x:e.data.x,y:e.data.y};
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };

    /// '初始化'事件
    o.oninit = function() {
        door_root.get('tool').subscribe('markdevice', this);
        door_root.get('main').subscribe('mousemove', this);
    };

    return o;
}

/**
 * 线段编辑
 * @param {Object} owner 所有者对象
 */
function door_objCanvasLine(owner) {
    var o = door_objCanvas();

    var m_edit = false;
    var m_list = [];
    var m_index = -1;
    var m_flush = false;
    var m_info = {x:0,y:0,m:0};
    var ownerMainCanvas = owner.main.canvas;
    var ownerMainContext = owner.main.context;
    var ownerTempContext = owner.temp.context;
    var selfTempCanvas = o.temp.canvas;
    var selfTempContext = o.temp.context;
    selfTempCanvas.width  = ownerMainCanvas.width;
    selfTempCanvas.height = ownerMainCanvas.height;
    var redraw = function() {
        selfTempContext.lineWidth = 3;
        selfTempContext.strokeStyle = 'royalblue';
        selfTempContext.lineCap = 'round';
        selfTempContext.beginPath();
        selfTempContext.clearRect(0, 0, selfTempCanvas.width, selfTempCanvas.height);
        m_info.x = owner.pos.x;
        m_info.y = owner.pos.y;
        m_info.m = owner.zoom;
        var prex; var prey;
        for (var i = 0; i < m_list.length; ++i) {
            var n = m_list[i];
            var x = n.x * m_info.m / 100 + m_info.x;
            var y = n.y * m_info.m / 100 + m_info.y;
            if (i > 0) {
                selfTempContext.beginPath();
                selfTempContext.moveTo(prex, prey);
                selfTempContext.lineTo(x, y);
                selfTempContext.stroke();
            }
            selfTempContext.beginPath();
            selfTempContext.arc(x, y, 5, 0, 2*Math.PI);
            selfTempContext.stroke();
            prex = x; prey = y;
        }
    };

    /// 默认选择编辑索引
    if ((typeof(door_data.editIndex) != "undefined") || 
        (typeof(door_data.editName) != "undefined") || 
        (typeof(door_data.editId) != "undefined")) {
        var list = door_getObject('list');
        if (!list) return;
        m_index = list.index_one_line({
            index: door_data.editIndex,
            name: door_data.editName,
            id: door_data.editId
        });
        door_root.publish('editing', {index:m_index}, 'list');
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "edit current index:" + m_index);
    }

    /// 初始化进行一次重绘
    redraw();

    o.onsize = function(e) {
        if ((selfTempCanvas.width  == ownerMainCanvas.width) && 
            (selfTempCanvas.height == ownerMainCanvas.height)) {
            return;
        }
        selfTempCanvas.width  = ownerMainCanvas.width;
        selfTempCanvas.height = ownerMainCanvas.height;
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "edit onsize: " + selfTempCanvas.width + ' * ' + selfTempCanvas.height);
        redraw();
    };

    o.ondraw = function() {
        /// 如果偏移位置变了，还是要重绘临时画布
        if ((m_info.x != owner.pos.x) || (m_info.y != owner.pos.y) || (m_info.m != owner.zoom) || m_flush) {
            m_flush = false;
            redraw();
        }

        /// 始终复制整个临时画布
        ownerTempContext.drawImage(selfTempCanvas, 0, 0);
    };

    /// 订阅'main'的大小和重绘事件
    door_root.get("main").subscribe('draw', o);

    /// 标记点击处理
    var mark_dbl;
    var mark_bak;
    var mark = function(e) {
        if (owner.dragged()) return;
        m_info.x = owner.pos.x;
        m_info.y = owner.pos.y;
        m_info.m = owner.zoom;
        var pos = door_elementPos(ownerMainCanvas, e.clientX, e.clientY);
        var curx = (pos.x - m_info.x) * 100 / m_info.m;
        var cury = (pos.y - m_info.y) * 100 / m_info.m;
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
                "'line' mark offset:(" + m_info.x + ',' + m_info.y + 
                '), zoom:' + m_info.m + ', curr:(' + pos.x + ',' + pos.y + 
                '|' + curx + ',' + cury + ')');
        if (m_list.length > 0) {
            var node = m_list[m_list.length - 1];
            if (curx == node.x && cury == node.y) return;
            var prex = node.x * m_info.m / 100 + m_info.x;
            var prey = node.y * m_info.m / 100 + m_info.y;
            console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
                "'line' mark: from(" + prex + ',' + prey + 
                ')->(' + pos.x + ',' + pos.y + ')');
            selfTempContext.lineCap = 'round';
            selfTempContext.beginPath();
            selfTempContext.moveTo(prex, prey);
            selfTempContext.lineTo(pos.x, pos.y);
            selfTempContext.stroke();
        }

        m_list.push({x:curx,y:cury});
        selfTempContext.beginPath();
        selfTempContext.arc(pos.x, pos.y, 5, 0, 2*Math.PI);
        selfTempContext.stroke();
        door_root.get("main").publish('draw').publish('show');
    };

    /// 离开和进入编辑模式
    o.onenter = function(element) {
        if (door_data.m_edit == "double") {
            mark_bak = ownerMainCanvas.ondblclick;
            ownerMainCanvas.ondblclick = mark;
            mark_dbl = "double";
        } else {
            mark_bak = ownerMainCanvas.onclick;
            ownerMainCanvas.onclick = mark;
            mark_dbl = "single";
        }
        m_edit = true;
    };
    o.onleave = function() {
        if (door_data.m_edit == "double") {
            ownerMainCanvas.ondblclick = mark_bak;
            mark_dbl = null;
        } else if (mark_dbl == "single") {
            ownerMainCanvas.onclick = mark_bak;
            mark_dbl = null;
        }
        m_edit = false;
    };
    o.onundo = function() {
        if (!m_list.length) return;
        m_list.pop();
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };
    o.onsaving = function() {
        if (!m_list.length) return;
        var f = door_data.onsaving;
        if (!f) return;
        f("line", m_list);
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "edit onsaving (index:" + m_index + ")");
    };
    o.onsaved = function(e) {
        if (e.data.type != "line") return;
        var result = e.data.result;
        door_root.publish('text', {text:'保存线段结果:' + result}, 'tips');
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "'line' onsaved (result:" + result + ")(index:" + m_index + ")");
        if (result != 'success') return;
        door_root.publish('append', {points:m_list,index:m_index}, 'list');
        this.ondrop();
    };
    o.ondrop = function() {
        m_list = [];
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };

    /// '点击编辑管道'事件
    o.oneditpipe = function(e) {
        if (door_edit && door_edit.onselect) {
            door_edit.onselect(o, e.data.element);
        }
    };

    /// 获取最后编辑点
    o.last = function() {
        if (!m_list.length) return;
        var x = owner.pos.x;
        var y = owner.pos.y;
        var m = owner.zoom;
        var n = m_list[m_list.length - 1];
        return {
            x: n.x * m / 100 + x,
            y: n.y * m / 100 + y
        };
    };

    /// 鼠标移动事件
    o.onmousemove = function(e) {
        if (!m_edit) return;
        var last = this.last();
        if (!last) return;
        var x = e.data.x;
        var y = e.data.y;
        var dash_bak = ownerMainContext.getLineDash();
        door_root.get("main").publish('show');
        ownerMainContext.lineWidth = 3;
        ownerMainContext.strokeStyle = 'royalblue';
        ownerMainContext.setLineDash([10, 5]);
        ownerMainContext.lineCap = 'round';
        ownerMainContext.beginPath();
        ownerMainContext.moveTo(last.x, last.y);
        ownerMainContext.lineTo(x, y);
        ownerMainContext.stroke();
        ownerMainContext.setLineDash(dash_bak);
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "main edit last: " + last.x + ',' + last.y + 
            " -> " + x + ',' + y);
    };

    /// '初始化'事件
    o.oninit = function() {
        door_root.get('tool').subscribe('editpipe', this);
        door_root.get('main').subscribe('mousemove', this);
    };

    return o;
}
