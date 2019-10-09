/// js/base/timer.js
/**
 * ��ʱ������
 */



/**
 * ��ʱ��˵��
 *  ���һ�ζ�ʱ�� (���к�ʱ���Զ�ɾ��)
 *      timer_add(func, time)
 *  ���ѭ����ʱ��
 *      timer_add(func, time, true)
 */



/**
 * ��ʱ��ȫ�ֶ���
 */
var timer_idx = 0;
var timer_all = function() {
    var all = {};

    return function() {
        return all;
    };
} ();


/**
 * ��λʱ���ڸ��¶�ʱ��
 * @param {Number} time ��λʱ�� (����)
 */
function timer_tick(time) {
    var o = timer_all();
    var x = function(id) {
        var node = o[id];
        if (!node) return 0;
        if (!node.func) return 0;

        /// ��ʱ����ͣ״ֱ̬�ӷ��� (����ǰʱ��<=0)
        if (node.time <= 0) return 1;

        /// ����ʱ������
        node.run += time;
        if (node.run < node.time) return (node.time - node.run);
        node.count++;
        node.run = 0;
        
        /// ѭ����ʱ��ֱ�ӵ��ã������س�ʱʱ��
        if (node.loop) {
            node.func(id);
            return node.time;
        }
        
        /// ��ʱ��ʱ�������������´γ�ʱʱ��
        var r = node.func(id);
        if (!r) r = 0;
        return (node.time = r);
    };

    /// ѭ�����ж�ʱ�� (ɾ���Ѿ������Ķ�ʱ��)
    for (var id in o) {
        if (x(id) <= 0) delete o[id];
    }
}


/**
 * ��Ӷ�ʱ��
 * @param {Function} func ��ʱ��������
 * @param {Number} time ��ʱ����ʱʱ��
 * @param {Boolean} loop ��ʱ���Ƿ�ѭ�� (Ĭ��:'��')
 * @param {String} name ��ʱ������
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
 * ɾ����ʱȥ
 * @param {Object} id ��ʱ������
 */
function timer_del(id) {
    var o = timer_all();
    if (o[id]) delete o[id];
}


/**
 * ɾ�����ж�ʱ��
 */
function timer_clr() {
    var o = timer_all();
    for (var id in o) {
        delete o[id];
    }
}


/**
 * ���ö�ʱ�� (ʱ��)
 * @param {Object} id ��ʱ������
 * @param {Number} time ��ʱ����ʱʱ��
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
 * ���ö�ʱ�� (�ڵ� {"func":func,"time":time,"loop":loop})
 * @param {Object} id 
 */
function timer_get(id) {
    var o = timer_all();
    return o[id];
}


/**
 * dump��ʱ��
 */
function timer_dump() {
    var o = timer_all();
    print_obj_member(o, printlog, "timer list");
}

