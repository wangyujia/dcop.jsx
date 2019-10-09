/// door.ui.js : ����ԭ��������̬H5Canvas��DOM����



/// �����ģ����
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
 * ȫ�����
 */
var door_global = null;                 // ȫ�ֶ��� (����window����)
var door_phone  = false;                // �Ƿ����ֻ���
var door_touch  = false;                // �Ƿ�֧�ִ���
var door_ratio  = null;                 // ����������Ϣ
var door_mode   = "edit";               // �༭ģʽ
var door_root   = null;                 // �����������
var door_main   = null;                 // �����Ԫ��
var door_data   = null;                 // ��������
var door_done   = null;                 // ��ʼ����ɵĻص�
var door_edit   = null;                 // �༭����



/**
 * ��Date����չ���� Date ת��Ϊָ����ʽ��String
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
        "M+": this.getMonth() + 1,                      // �·�
        "d+": this.getDate(),                           // ��
        "h+": this.getHours(),                          // Сʱ
        "m+": this.getMinutes(),                        // ��
        "s+": this.getSeconds(),                        // ��
        "q+": Math.floor((this.getMonth() + 3) / 3),    // ����
        "S":  milli_sec_str(this)                       // ����
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
 * ���ͺͽ���ajax����
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
 * ��������� *
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
 *                  ...       |                        |   main   |  temp   | (ʹ��˫����)
 *                       +----+----+                   +----------+---------+
 *                       |         |                              |
 *                      ...      object                           | (�滭����)
 *                                                                |
 *                                                              -----
 * (paint) --------------------------------------------------- <ondraw> ----+ (�滭ʱ�ȸ��µ��滭��������ʱ������)
 * (flush) -----------------------------------------------------------------+ (ˢ��ʱ����ʱ�����ϸ��µ���ʵ������)
 * 
 * �¼����ݲ�� *
 *  root        onxxxx|on('xxxx') ָ��������գ����߽��й㲥�����ж���
 *  owner       �����б��зַ��¼���Ȼ�����owner���� (owner�ǵ�һ����)
 *  object/...  ʵ��onxxxx����һ�¼�������ʵ��on���������¼�
 * 
 * �̳й�ϵ��� *
 *  manager �ṩ�����б����ӿں��¼��ַ��ӿڣ�ȫ���и�root�����������
 *  object  �̳в���д��manager�ӿڣ�draw������������root���Ӷ���
 *          �������draw�ڲ�����滭������������root������������ (��
 *          ���и��ֲ�root������)
 */



/**
 * ��ʼ�����
 * @param {Object} global ������� (����Ϊ{Window}����)
 * @param {String} mode "edit" | "show" �༭������ʾ
 * @param {String} main ��Ԫ��ID
 * @param {Object} data ��������
 *  data ��Ҫ����Ϊ: {
 *      bgpicUrl: "...",                // ����ͼurl
 *      bgpicScale: 1                   // ����ͼ���� (1������ͼ�����ض�Ӧ������)
 *      showList: "large"|300,          // �б���ʾģʽ: "none":����ʾ,"small":С��ʾ,"large":����ʾ(Ĭ��),���ִ����Զ�����
 *      showOutline: "large"|300,       // �����ʾģʽ: "none":����ʾ,"small":С��ʾ,"large":����ʾ(Ĭ��),���ִ����Զ�����
 *      showArea: "none",               // ������ʾ����: "none":����ʾ,������ʾ(Ĭ��)
 *      zoomLevel: 50,                  // Ĭ�����Ŵ�С
 *      zoomLevelMin: 20,               // ��С���Ŵ�С
 *      zoomLevelMax: 500,              // ������Ŵ�С
 *      zoomLevelStep: 10,              // �������Ŵ�С
 *      startPos: {x:100,y:0},          // Ĭ�Ͽ�ʼλ��
 *      pipeLines: [
 *          {
 *              name: "...",            // ����
 *              id: 101,                // id
 *              points: [{x:0,y:0}],    // ������б�
 *              length: 100             // ���ȶ�����
 *          }, 
 *          { ... }
 *      ],
 *      editId: 101,                    // ���༭�Ĺܵ�ID
 *      editMode: "double" | "single",  // Ĭ��˫���༭ģʽ���ǵ����༭ģʽ
 *      onsaving: function(data) { ... }
 *      ... ...
 *  }
 * @param {Function} done ��ʼ����ɻص�
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
 * �¼����
 * @param {String}  event �¼�����
 * @param {Object}   para �¼����� - Ϊ��������ʱ�����¼�
 * @param {Function} para �¼����� - Ϊ��������ʱ�����¼�
 * @param {String} recver �¼�������
 * @returns �¼����Ļ��߷������
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
 * ���������
 * @param {Object} owner �����߶���
 * @returns {Object} ����������
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
            /// ������������¼�
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
            /// ��ָ�������ߣ�����ý����߽����¼�����
            if (recver) {
                rc = proc(this.get(recver));
            }
            /// ��ָ�������ߣ��������н����ߺ��������н����¼��㲥
            else {
                for (var i = 0; i < list.length; ++i) {
                    rc = proc(list[i].object);
                    if (typeof(rc) == "boolean" && !rc) {
                        break; // ����false�����ټ����ַ�
                    }
                }
                /// �㲥���ٵ���owner�����¼�����
                rc = proc(owner);
            }
            if (typeof(rc) == "boolean" && !rc) {
                return rc; // ����false�����ټ����ַ�
            }
            /// �ַ����ĵ��¼�
            var dispatch = function(nodes) {
                if (!nodes) return;
                var rc;
                for (var i = 0; i < nodes.length; ++i) {
                    rc = proc(nodes[i]);
                    if (typeof(rc) == "boolean" && !rc) {
                        break; // ����false�����ټ����ַ�
                    }
                }
                return rc;
            };
            /// �ַ�����ָ�����¼�
            rc = dispatch(subscribes[event]);
            if (typeof(rc) == "boolean" && !rc) {
                return rc; // ����false�����ټ����ַ�
            }
            /// �ַ��������е��¼�
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
 * ��Ӧ�����¼�
 * @param {Event} e �¼�
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
 * ��Ӧ��С�ı��¼�
 * @param {Event} e �¼�
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
 * ��ȡ������ͼ��С
 * @param {Element} element ָ��Ԫ��
 * @returns {Object} ��С����
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
 * ��������ת��Ϊ��������
 * @param {Element} element ����Ԫ�ض���
 * @param {Number} x X�����
 * @param {Number} y Y�����
 */
function door_elementPos(element, x, y){
    /*
        ��element�����ϵ���getBoundingClientRect()������
        ����ȡelementԪ�صı߽��
        �ñ߽���������������������ڵġ�
        Ȼ�󷵻�һ�����󣬸ö����x��y���Էֱ��Ӧ�������canvas֮�е�����
    */
    var bbox = element.getBoundingClientRect();
    if (!bbox) return;
    return {
        x: Math.round((x - bbox.left) * (element.width  / bbox.width)), 
        y: Math.round((y - bbox.top)  * (element.height / bbox.height))
    };
}


/**
 * ����Ԫ���¼�
 * @param {Element} element ����Ԫ��
 * @param {String} event �����¼�
 * @param {Function} handler ������
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
 * ע��������
 * @param {String} owner �����߶�����
 * @param {Object} object �滭����
 * @param {String} name �滭������
 * @returns {Object} �����߶�����߻滭����
 *  /// û��nameʱ��������owner������object�Զ�����manager
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
 * ��ȡ�������
 * @param {String} owner �����߶�����
 * @param {String} name �滭������
 * @returns {Object} �����߶�����߻滭����
 * /// û��nameʱ������᷵��owner��Ӧ��manager��ԭʼ����
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
 * �������
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
 * ��������
 * @param {String} name ��������
 * @param {Element} entry ��ڶ���
 * @returns {Object} ��������
 * @description �ڲ�ʹ������������ʱ��������˫����滭
 *      ��ondraw�¼��У��ɸ����Ӷ����Ԫ�ػ�����ʱ������
 *      ��onshow�¼��У���ͳһ����ʱ�������Ƶ���������
 *  (����ڲ���entry���ᴴ��һ������Ԫ��(��:������)��Ϊentry����Ԫ�أ������Ʋ���name�Ļ������������Ԫ��idΪname)
 *  (����ڲ���entry����������Ʋ���name�Ļ������ȫ���ĵ��л�ȡidΪname��Ԫ����Ϊ������)
 *  (��ʱ����Ԫ��ʼ�ջᴴ��)
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
 * Ԫ�ض���
 * @param {String} name ��������
 * @param {Element} entry ��ڶ���
 * @param {String} type ��ǩ����
 * @returns {Object} ��������
 * @description �ڲ�����һ�����߻�ȡһ��Ԫ�ض���
 *      (����ڲ���entry������һ������Ϊtype��Ԫ����Ϊentry����Ԫ�أ������Ʋ���name�Ļ������������Ԫ��idΪname)
 *      (����ڲ���entry����������Ʋ���name�Ļ������ȫ���ĵ��л�ȡidΪname��Ԫ��)
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
 * ����������
 * @param {String} name ����������
 * @param {Element} entry ��ڶ���
 * @returns {String} ����������
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
    mainCanvas.innerHTML = "�����������";
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
        /// clearRectֻ��������Σ���������߶εȣ���Ҫ�����С�����������
        mainCanvas.width  = mainCanvas.width;
        mainCanvas.height = mainCanvas.height;
        mainContext.beginPath();
        mainContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        mainContext.drawImage(tempCanvas, 0, 0);
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "main('" + name + "') onshow: " + mainCanvas.width + '*' + mainCanvas.height + 
        //     " from temp: " + tempCanvas.width + '*' + tempCanvas.height);
    };

    /// �Ƿ��϶���
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
                /// ������˲�������϶�
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
                door_root.publish('text', {text:'�϶�λ��:' + o.pos.x + ',' + o.pos.y}, 'tips');
            }
        } else {
            door_root.get("main").publish('mousemove', {x:x,y:y});
            door_root.publish('text', {text:'���λ��:' + x + ',' + y}, 'tips');
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
        /// ��������¼� (�����޷���ȡ��Χ�������¼�)
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
            /// ȡ����겶�� (�����Ӱ�췶Χ�������¼�)
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
 * �������߶���
 * @param {String} name ������������
 * @param {Element} entry ��ڶ���
 * @param {Object} owner �����߶���
 * @returns {String} �������߶���
 */
function door_objCanvasTool(name, entry, owner) {
    var o = door_objElement(name, entry, 'div');

    /// ����ģʽ��ʹ�õĸ�λ��ť����ȫ�ַַ�ʱ��
    var onreset_cb;
    var childReset = door_objElement(name+'_reset', o.element, 'div');
    childReset.element.innerHTML = '<i class="fa fa-circle-thin" aria-hidden="true"></i>';
    // childReset.element.title = "��λ";
    childReset.element.onclick = function(e) {
        if (onreset_cb) onreset_cb();
        door_root.publish('reset', null, "main");
        door_root.publish('draw',  null, "main");
        door_root.publish('show',  null, "main");
    };

    /// ��Ϣ��ʾ
    var childTips = door_objElement(name+'_tips', o.element, 'div');
    childTips.element.innerHTML = '';
    entry.onmouseout = function(e) {
        childTips.element.innerHTML = '';
    };
    childReset.element.onmousemove = function(e) {
        childTips.element.innerHTML = '��λ��Ĭ����ͼ��ʽ';
    };

    /// ֻ�ڱ༭ģʽ��ʹ�ñ༭��ť���ڱ������ڽ��зַ�
    /// (���뵽�������вŻῪʼ�����༭ģʽ�İ�ť)
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
                    childTips.element.innerHTML = '����豸�����λ��';
                };
            }

            if (!door_data.editType || door_data.editType == "line") {
                var childEditPipe = door_objElement(name+'_edit_pipe', o.element, 'div');
                childEditPipe.element.innerHTML = '<i class="fa fa-pencil" aria-hidden="true"></i>';
                childEditPipe.element.onclick = function(e) {
                    manager.publish('editpipe', {element:childEditPipe.element});
                };
                childEditPipe.element.onmousemove = function(e) {
                    childTips.element.innerHTML = '��������ǹܵ�����';
                };
            }

            var childUndo = door_objElement(name+'_undo', o.element, 'div');
            childUndo.element.innerHTML = '<i class="fa fa-undo"></i>';
            childUndo.element.onclick = function(e) {
                manager.publish('undo');
            };
            childUndo.element.onmousemove = function(e) {
                childTips.element.innerHTML = '������ǰ�ı༭����';
            };

            var childSave = door_objElement(name+'_save', o.element, 'div');
            childSave.element.innerHTML = '<i class="fa fa-floppy-o" aria-hidden="true"></i>';
            childSave.element.onclick = function(e) {
                manager.publish('save');
            };
            childSave.element.onmousemove = function(e) {
                childTips.element.innerHTML = '���浱ǰ�ı༭����';
            };

            var childDrop = door_objElement(name+'_drop', o.element, 'div');
            childDrop.element.innerHTML = '<i class="fa fa-trash-o" aria-hidden="true"></i>';
            childDrop.element.onclick = function(e) {
                manager.publish('drop');
            };
            childDrop.element.onmousemove = function(e) {
                childTips.element.innerHTML = '������ǰ�ı༭����';
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
        childMark.element.title = "���";

        childEdit = door_objElement(name+'_edit', o.element, 'div');
        childEdit.element.innerHTML = '<i class="fa fa-pencil" aria-hidden="true"></i>';
        childEdit.element.title = "�༭";

        childDevice = door_objElement(name+'_device', o.element, 'div');
        childDevice.element.innerHTML = '<i class="fa fa-window-maximize" aria-hidden="true"></i>';
        childDevice.element.title = "�豸";

        childUndo = door_objElement(name+'_undo', o.element, 'div');
        childUndo.element.innerHTML = '<i class="fa fa-undo"></i>';
        childUndo.element.title = "����";

        childSave = door_objElement(name+'_save', o.element, 'div');
        childSave.element.innerHTML = '<i class="fa fa-floppy-o" aria-hidden="true"></i>';
        childSave.element.title = "����";

        childDrop = door_objElement(name+'_drop', o.element, 'div');
        childDrop.element.innerHTML = '<i class="fa fa-trash-o" aria-hidden="true"></i>';
        childDrop.element.title = "����";

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
    childSetting.element.title = "����";

    var childHelp = door_objElement(name+'_help', o.element, 'div');
    childHelp.element.innerHTML = '<i class="fa fa-question" aria-hidden="true"></i>';
    childHelp.element.title = "����";
    */

    return o;
}


/**
 * �������Ŷ���
 * @param {String} name ������������
 * @param {Element} entry ��ڶ���
 * @param {Object} owner �����߶���
 * @returns {String} �������Ŷ���
 */
function door_objCanvasZoom(name, entry, owner) {
    var o = door_objElement(name, entry, 'div');

    var childAdd = door_objElement(name+'_add', o.element, 'div');
    childAdd.element.innerHTML = '<i class="fa fa-plus" aria-hidden="true"></i>';
    // childAdd.element.title = "�Ŵ�";

    var childSpt = door_objElement(name+'_spt', o.element, 'div');
    
    var childDel = door_objElement(name+'_del', o.element, 'div');
    childDel.element.innerHTML = '<i class="fa fa-minus" aria-hidden="true"></i>';
    // childDel.element.title = "��С";

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
 * ����������ͼƬ����
 * @param {Object} owner �����߶���
 * @returns {Object} ����������ͼƬ����
 */
function door_objCanvasMainBgPic(owner) {
    /// ֱ�Ӹ��µ������ߵĻ�����(��ʱ����)
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
 * �����༭����
 * @param {Object} owner �����߶���
 */
function door_objCanvasEdit(owner) {
    var o = door_objCanvas();

    /// �ػ溯��
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

    /// ��ʼ������һ���ػ�
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
        /// ���ƫ��λ�ñ��ˣ�����Ҫ�ػ���ʱ����
        if ((m_info.x != owner.pos.x) || (m_info.y != owner.pos.y) || (m_info.m != owner.zoom) || m_flush) {
            m_flush = false;
            redraw();
        }

        /// ʼ�ո���������ʱ����
        ownerTempContext.drawImage(selfTempCanvas, 0, 0);
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "edit ondraw to main temp");
    };

    /// ����'main'�Ĵ�С���ػ��¼�
    door_root.get("main").subscribe('draw', o);

    /// ��ǵ������
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

    /// �༭����
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

    /// �༭����ѡ��
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

    /// '��ʼ��'�¼�
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
    
    /// Ĭ��ѡ��༭����
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

    /// �༭�������
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
    //     door_root.publish('text', {text:'������:' + result}, 'tips');
    //     console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
    //         "edit onsaved (result:" + result + ")(index:" + m_index + ")");
    //     if (result != 'success') return;
    //     door_root.publish('append', {points:m_list,index:m_index}, 'list');
    //     this.onclear();
    // };

    /// ����༭����
    o.onclear = function(e) {
        m_list = [];
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };

    /// ���˵��༭��һ��
    o.onundo = function(e) {
        if (!m_list.length) return;
        m_list.pop();
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };

    /// ��ȡ���༭��
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
 * ������ʾ����
 * @param {String} name ������ʾ����
 * @param {Element} entry ��ڶ���
 */
function door_objCanvasTips(name, entry) {
    var o = door_objElement(name, entry, 'div');

    o.onsize = function(e) {
        var size = e.data.size;
        var w = size.w;
        var h = size.h;
        o.element.style.top = (h - 30) + 'px';
        o.element.innerHTML = '��С�ı�Ϊ:' + w + '*' + h;
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "tips onsize: " + w + '*' + h);
    };

    o.ontext = function(e) {
        o.element.innerHTML = e.data.text;
    };

    return o;
}


/**
 * �����б����
 * @param {String} name ������ʾ����
 * @param {Element} entry ��ڶ���
 * @param {Object} owner �����߶���
 */
function door_objCanvasList(name, entry, owner) {
    var o = door_objElement(name, entry, 'div');
    var t = door_objCanvas();

    /// ���б�
    var m_lines = [];

    /// ����ؼ�
    var childTitle = door_objElement(name+'_title', o.element, 'div');
    childTitle.element.innerHTML = '������' + m_lines.length;
    var childContent = door_objElement(name+'_content', o.element, 'div');

    /// �����ɫ�б�
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

    /// �ܵ���ʼͼ��
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

    /// �ػ溯��
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

    /// ��ʼ������һ���ػ�
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
        /// ���ƫ��λ�ñ��ˣ�����Ҫ�ػ���ʱ����
        if ((m_info.x != owner.pos.x) || (m_info.y != owner.pos.y) || (m_info.m != owner.zoom) || m_flush) {
            m_flush = false;
            redraw();
        }

        /// ʼ�ո���������ʱ����
        ownerTempContext.drawImage(selfTempCanvas, 0, 0);
        // console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
        //     "list ondraw to main temp: " + selfTempCanvas.width + ' * ' + selfTempCanvas.height);
    };

    /// ����¼�����
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

    /// ����'main'�Ĵ�С���ػ��¼�
    door_root.get("main").subscribe('draw', o);

    /// ��ȡ�ܵ���Χ
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

    /// ��ȡ�ܵ�����
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

    /// ��ȡ�ܵ�����
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

    /// ��ȡб��
    var slope_two_points = function(startPos, endPos) {
        if (!startPos || !endPos) return;
        var dx = endPos.x - startPos.x;
        var dy = endPos.y - startPos.y;
        return (!dy)? 100 : (dx / dy);
    };

    /// ��ȡ�ܵ����� (���ݿ�ʼ�ͽ�������ƫ��)
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
                    /// ��ͷ��ʼ
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
                    /// ���м俪ʼ
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
                    /// ��ʼ��������β������
                    area.push({x:x,y:y});
                    return area;
                } else if (end && (length + l) > end) {
                    /// ��ʼ���������м�λ�ý���
                    var offset = (end - length);
                    var nx = dx * offset / l;
                    var ny = dy * offset / l;
                    area.push({
                        x: Number((prex + nx).toFixed(1)),
                        y: Number((prey + ny).toFixed(1))
                    });
                    return area;
                }
                /// δ����ʱ��¼���м��
                area.push({x:x,y:y});
            }
            length += l;
            prex = x;
            prey = y;
        }
        return area;
    };

    /// ��ȡ�ܵ����� (���ݳ���ƫ��)
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

    /// �ж��Ƿ��ƶ������б���ɵ��߶���
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

    /// �����б�ڵ�
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

    /// ��ӵ����ӵ�
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
                    '���س���');
            }
            if (index < door_data.pipeLines.length && door_data.pipeLines[index].length) {
                node.add_tag('meter_length', 
                    '<i class="fa fa-arrows-h" aria-hidden="true"></i>', 
                    door_data.pipeLines[index].length, 
                    'chartreuse', 
                    'ʵ������');
            }
            if (index < door_data.pipeLines.length && door_data.pipeLines[index].areas) {
                node.add_tag('area_count', 
                    '<i class="fa fa-sliders" aria-hidden="true"></i>', 
                    door_data.pipeLines[index].areas.length, 
                    'violet', 
                    '��������');
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
                    '�����澯', 
                    'noborder');
            }
            // node.add_tag('test1', '����', 1234, 'DarkOrchid');
            // node.add_tag('test2', '����', 123456, 'DarkOrchid');
            // node.add_tag('test3', '����', '', 'DarkOrchid');
            // node.add_tag('test4', '����', 1234567, 'DarkOrchid');
            // node.add_tag('test5', '����', '', 'DarkOrchid');
            // node.add_tag('test6', '����', '', 'DarkOrchid');
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
        childTitle.element.innerHTML = '������' + m_lines.length;
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
                '���ڱ༭');
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
 * ������������
 * @param {String} name ������ʾ����
 * @param {Element} entry ��ڶ���
 * @param {Object} owner �����߶���
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
    mainCanvas.innerHTML = "�����������";
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

    /// ����'main'���ػ����ʾ�¼�
    door_root.get("main").subscribe('bgpic', o).subscribe('draw', o).subscribe('show', o);

    return o;
}


/**
 * �滭����
 * @param {String} name ����
 * @param {Element} entry ���Ԫ��
 * @param {Object} owner �����߶���
 * @param {Object} list �����б����
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

    /// �����ͼ��
    var area_node_img = new Image();
    if (door_data.areaNodePic) {
        area_node_img.onload = function() {
            m_flush = true;
            door_root.get('main').publish('draw').publish('show');
            console.log('area node pic: ' + door_data.areaNodePic + ' loaded');
        };
        area_node_img.src = door_data.areaNodePic;
    }

    /// �ռ�������Ϣ
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

    /// ����������Ϣ (���ж�����Ƿ��ڵ�ǰ����)
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

    /// ����¼�����
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
        /// ���ƫ��λ�ñ��ˣ�����Ҫ�ػ���ʱ����
        if ((m_info.x != owner.pos.x) || (m_info.y != owner.pos.y) || (m_info.m != owner.zoom) || 
            m_changed || m_flush) {
            redraw();
            m_flush = false;
        }

        /// ʼ�ո���������ʱ����
        ownerTempContext.drawImage(selfTempCanvas, 0, 0);
    };

    o.onsize = function(e) {
        var listWidth = list.element.offsetWidth;
        area.element.style.left = (ownerMainCanvas.width - 360 - listWidth) / 2 + 'px';
        selfTempCanvas.width  = ownerMainCanvas.width;
        selfTempCanvas.height = ownerMainCanvas.height;
        redraw();
    };

    /// ����ѡ����
    var update_detail = function(a) {
        var html = '';
        var line = door_data.pipeLines[a.line];
        if (line) {
            var line_title = line.name;
            if (!line_title) line_title = line.id;
            else if (line.id) line_title += ' (' + line.id + ') ';
            if (!line_title) line_title = a.line + 1;
            html += "<B>λ��</B> λ�ڹܵ�'" + line_title + "'�ĵ�" + (a.area + 1) + "������";
            html += " (" + a.start + "�׵�" + a.end + "�׷�Χ)";
            var level = a.level;
            html += "<BR>";
            if (!level) html += "<B>�澯</B> ��";
            else html += "<B>�澯</B> " + level + "��";
            html += "<BR>";
            if (!a.tem) html += "<B>����¶�</B> ��";
            else html += "<B>����¶�</B> " + a.tem + ' (' + a.temPos + '�״�)';
            html += "<BR>";
            if (!a.speed) html += "<B>��������ٶ�</B> ��";
            else html += "<B>��������ٶ�</B> " + a.speed + ' (' + a.speedPos + '�״�)';
        }
        areaDetail.element.innerHTML = html;
    };
    o.onselectarea = function(e) {
        var a = e.data.area;
        areaTitle.element.innerHTML = '<span class="number">' + a.id + '</span>' + 
            '<span class="type">����</span>';
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

    /// ����澯����
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
 * �滭�澯
 * @param {String} name ����
 * @param {Element} entry ���Ԫ��
 * @param {Object} owner �����߶���
 * @param {Object} list �����б����
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
 * �豸�༭����ʾ
 * @param {Object} owner �����߶���
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
            if (g == device_abnormal) e += ' [�쳣]';
            selfTempContext.fillStyle = (g == device_abnormal)? text_box_color_abn : text_box_color_nor;
            selfTempContext.fillRect(text_box_posx(x,e), text_box_posy(y), text_box_sizew(e), text_box_sizeh);
            selfTempContext.fillStyle = text_color;
            selfTempContext.fillText(e, text_posx(x,e), text_posy(y));
        }
        if (m_edit && m_edit_pos && typeof(m_edit_pos.x) == "number" && typeof(m_edit_pos.y) == "number") {
            var x = m_edit_pos.x;
            var y = m_edit_pos.y;
            selfTempContext.drawImage(device_normal, img_posn(x), img_posn(y), img_size, img_size);
            var e = "���� [�½�]";
            if (m_index >= 0 && m_index < m_list.length) {
                var n = m_list[m_index];
                e = n.name + "(" + n.id + ") [�༭]";
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
        /// ���ƫ��λ�ñ��ˣ�����Ҫ�ػ���ʱ����
        if ((m_info.x != owner.pos.x) || (m_info.y != owner.pos.y) || (m_info.m != owner.zoom) || m_flush) {
            m_flush = false;
            redraw();
        }

        /// ʼ�ո���������ʱ����
        ownerTempContext.drawImage(selfTempCanvas, 0, 0);
    };

    /// ����'main'�Ĵ�С���ػ��¼�
    door_root.get("main").subscribe('draw', o);

    /// ��ǵ������
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
            m_list.push({id:0,name:"�½�",x:curx,y:cury});
            m_index = m_list.length - 1;
        }
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };

    /// �뿪�ͽ���༭ģʽ
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
        door_root.publish('text', {text:'�����豸���:' + result}, 'tips');
        console.log((new Date()).Format("[yyyy-MM-dd hh:mm:ss.S] ") + 
            "'device' onsaved (result:" + result + ")(index:" + m_index + ")");
    };
    o.ondrop = function() {
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };

    /// '����༭�豸'�¼�
    o.onmarkdevice = function(e) {
        if (door_edit && door_edit.onselect) {
            door_edit.onselect(o, e.data.element);
        }
    };

    /// ����ƶ��¼�
    o.onmousemove = function(e) {
        if (!m_edit) return;
        m_edit_pos = {x:e.data.x,y:e.data.y};
        m_flush = true;
        door_root.get("main").publish('draw').publish('show');
    };

    /// '��ʼ��'�¼�
    o.oninit = function() {
        door_root.get('tool').subscribe('markdevice', this);
        door_root.get('main').subscribe('mousemove', this);
    };

    return o;
}

/**
 * �߶α༭
 * @param {Object} owner �����߶���
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

    /// Ĭ��ѡ��༭����
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

    /// ��ʼ������һ���ػ�
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
        /// ���ƫ��λ�ñ��ˣ�����Ҫ�ػ���ʱ����
        if ((m_info.x != owner.pos.x) || (m_info.y != owner.pos.y) || (m_info.m != owner.zoom) || m_flush) {
            m_flush = false;
            redraw();
        }

        /// ʼ�ո���������ʱ����
        ownerTempContext.drawImage(selfTempCanvas, 0, 0);
    };

    /// ����'main'�Ĵ�С���ػ��¼�
    door_root.get("main").subscribe('draw', o);

    /// ��ǵ������
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

    /// �뿪�ͽ���༭ģʽ
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
        door_root.publish('text', {text:'�����߶ν��:' + result}, 'tips');
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

    /// '����༭�ܵ�'�¼�
    o.oneditpipe = function(e) {
        if (door_edit && door_edit.onselect) {
            door_edit.onselect(o, e.data.element);
        }
    };

    /// ��ȡ���༭��
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

    /// ����ƶ��¼�
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

    /// '��ʼ��'�¼�
    o.oninit = function() {
        door_root.get('tool').subscribe('editpipe', this);
        door_root.get('main').subscribe('mousemove', this);
    };

    return o;
}
