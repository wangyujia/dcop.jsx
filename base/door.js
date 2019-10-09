/// js/base/door.js : ������װ



/**
 * ȫ�����
 */
var door_root   = null;                 // �����������


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
 * ��ʼ��ʱ����
 */
(function() {
    door_root = door_manager();
}) ();
