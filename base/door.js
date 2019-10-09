/// js/base/door.js : 基础封装



/**
 * 全局入口
 */
var door_root   = null;                 // 根对象管理器


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
 * 初始化时加载
 */
(function() {
    door_root = door_manager();
}) ();
